#!/usr/bin/env -S node --import tsx
/**
 * Database role and privilege verification CLI (IMP-004).
 *
 * Proves the locked-down role/schema/privilege contract in
 * docker/postgres/init/001-bootstrap.sh and drizzle/0000_database-foundation.sql
 * actually holds against a running local Postgres instance. Read-only with
 * respect to real data — the only objects it creates are clearly namespaced
 * temporary probe objects under `app`, and it always attempts to remove them
 * before exiting (including on failure).
 *
 * Never prints a password, connection string, or full environment.
 *
 * Usage: tsx scripts/database/verify.ts
 * Exits 0 only if every assertion passes.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { randomBytes } from "node:crypto";

import { loadEnvConfig } from "@next/env";

import { loadConfig } from "../../src/platform/config/load-config";
import { createDatabaseClient, type DatabaseClient } from "../../src/platform/database/client";

interface Assertion {
  readonly name: string;
  readonly passed: boolean;
  readonly detail?: string;
}

const assertions: Assertion[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  assertions.push({ name, passed, detail });
}

async function scalar<T = unknown>(
  client: DatabaseClient,
  sql: string,
  params: readonly unknown[] = [],
): Promise<T> {
  const result = await client.pool.query(sql, params as unknown[]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Expected exactly one row.");
  const [value] = Object.values(row);
  return value as T;
}

/** True if the given SQL succeeds, false if it throws — used for "role X
 * cannot do Y" assertions, where failure of the probe statement IS success
 * of the assertion. Never surfaces the underlying error message (which
 * could, in principle, echo back query text). */
async function fails(client: DatabaseClient, sql: string): Promise<boolean> {
  try {
    await client.pool.query(sql);
    return false;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");
  loadEnvConfig(projectRoot, true);

  const migrationConfig = loadConfig({ processKind: "migration", source: process.env });
  const appConfig = loadConfig({ processKind: "worker", source: process.env });

  const migrator = createDatabaseClient({
    connectionString: migrationConfig.databaseMigrationUrl,
    sslMode: migrationConfig.databaseSslMode,
    applicationName: "boba-bear-verify-migrator",
    poolSize: 1,
  });
  const app = createDatabaseClient({
    connectionString: appConfig.databaseUrl,
    sslMode: appConfig.databaseSslMode,
    applicationName: "boba-bear-verify-app",
    poolSize: 1,
  });

  const probeTable = `__boba_bear_verify_probe_${randomBytes(6).toString("hex")}`;
  const qualifiedProbe = `app."${probeTable}"`;
  let probeCreated = false;

  try {
    // 1. Server version is 18.4.x
    const serverVersion = await scalar<string>(migrator, "SHOW server_version");
    record(
      "PostgreSQL server reports version 18.4",
      /^18\.4(\D|$)/.test(serverVersion),
      `server_version=${serverVersion}`,
    );

    // 2. Current database is boba_bear_local
    const currentDb = await scalar<string>(migrator, "SELECT current_database()");
    record("Current database is boba_bear_local", currentDb === "boba_bear_local");

    // 3/4. Neither role is superuser
    const migratorRole = await migrator.pool.query(
      "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1",
      ["boba_bear_migrator"],
    );
    const appRole = await migrator.pool.query(
      "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1",
      ["boba_bear_app"],
    );
    record("Migration role is not superuser", migratorRole.rows[0]?.rolsuper === false);
    record("Application role is not superuser", appRole.rows[0]?.rolsuper === false);

    // 5/6. Application role cannot create databases/roles
    record("Application role cannot create databases", appRole.rows[0]?.rolcreatedb === false);
    record("Application role cannot create roles", appRole.rows[0]?.rolcreaterole === false);

    // 7/8. Schemas exist
    const appSchemaExists = await scalar<boolean>(
      migrator,
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')",
    );
    const drizzleSchemaExists = await scalar<boolean>(
      migrator,
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle')",
    );
    record('"app" schema exists', appSchemaExists === true);
    record('"drizzle" schema exists (after migration)', drizzleSchemaExists === true);

    // 9. PUBLIC cannot CREATE in public
    const publicCreateOnPublic = await scalar<boolean>(
      migrator,
      "SELECT has_schema_privilege('public', 'public', 'CREATE')",
    );
    record("PUBLIC cannot CREATE in public schema", publicCreateOnPublic === false);

    // 10. PUBLIC has no privileges on app
    const publicUsageOnApp = await scalar<boolean>(
      migrator,
      "SELECT has_schema_privilege('public', 'app', 'USAGE')",
    );
    record("PUBLIC has no USAGE privilege on app schema", publicUsageOnApp === false);

    // 11/12. Application role USAGE (yes) / CREATE (no) on app
    const appUsageOnApp = await scalar<boolean>(
      migrator,
      "SELECT has_schema_privilege('boba_bear_app', 'app', 'USAGE')",
    );
    const appCreateOnApp = await scalar<boolean>(
      migrator,
      "SELECT has_schema_privilege('boba_bear_app', 'app', 'CREATE')",
    );
    record("Application role has USAGE on app schema", appUsageOnApp === true);
    record("Application role lacks CREATE on app schema", appCreateOnApp === false);

    // 13. Application role cannot access drizzle schema
    const appUsageOnDrizzle = await scalar<boolean>(
      migrator,
      "SELECT has_schema_privilege('boba_bear_app', 'drizzle', 'USAGE')",
    );
    record("Application role cannot access drizzle schema", appUsageOnDrizzle === false);

    // 14. Migration metadata table exists
    const migrationTableExists = await scalar<boolean>(
      migrator,
      "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'drizzle' AND tablename = '__drizzle_migrations')",
    );
    record("Migration metadata table exists", migrationTableExists === true);

    // 15/16/17. Probe table: migrator creates/drops; app role gets default-privilege DML only.
    await migrator.pool.query(
      `CREATE TABLE ${qualifiedProbe} (id integer PRIMARY KEY, note text NOT NULL)`,
    );
    probeCreated = true;
    record("Migration role can create an app-schema probe table", true);

    await migrator.pool.query(`INSERT INTO ${qualifiedProbe} (id, note) VALUES (1, 'seed')`);

    const appCanSelect = !(await fails(app, `SELECT * FROM ${qualifiedProbe}`));
    const appCanInsert = !(await fails(
      app,
      `INSERT INTO ${qualifiedProbe} (id, note) VALUES (2, 'app-insert')`,
    ));
    const appCanUpdate = !(await fails(
      app,
      `UPDATE ${qualifiedProbe} SET note = 'app-update' WHERE id = 1`,
    ));
    const appCanDelete = !(await fails(app, `DELETE FROM ${qualifiedProbe} WHERE id = 2`));
    record(
      "Default privileges allow application role SELECT/INSERT/UPDATE/DELETE on migrator-created probe table",
      appCanSelect && appCanInsert && appCanUpdate && appCanDelete,
    );

    const appCannotAlter = await fails(
      app,
      `ALTER TABLE ${qualifiedProbe} ADD COLUMN extra text`,
    );
    const appCannotDrop = await fails(app, `DROP TABLE ${qualifiedProbe}`);
    record(
      "Application role cannot ALTER or DROP the probe table",
      appCannotAlter && appCannotDrop,
    );
  } finally {
    if (probeCreated) {
      try {
        await migrator.pool.query(`DROP TABLE IF EXISTS ${qualifiedProbe}`);
        record("Probe objects removed before exit", true);
      } catch {
        record("Probe objects removed before exit", false, "cleanup query failed");
      }
    }
    await migrator.close();
    await app.close();
  }

  const failed = assertions.filter((a) => !a.passed);
  console.log("db:verify — database privilege verification");
  console.log("=".repeat(60));
  for (const assertion of assertions) {
    const marker = assertion.passed ? "PASS" : "FAIL";
    const detail = assertion.detail ? ` (${assertion.detail})` : "";
    console.log(`  [${marker}] ${assertion.name}${detail}`);
  }
  console.log("=".repeat(60));

  if (failed.length > 0) {
    console.error(`${failed.length} of ${assertions.length} assertion(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`All ${assertions.length} assertions passed.`);
  process.exitCode = 0;
}

main().catch((error) => {
  console.error(
    `db:verify: unexpected failure: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
