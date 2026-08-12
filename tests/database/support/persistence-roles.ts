/**
 * Role-separated PostgreSQL fixtures for the persistence integration tests
 * (IMP-006).
 *
 * The existing database integration-test harness (IMP-005) only ever uses
 * one administrator role inside its Testcontainers database. To prove that
 * the application-role persistence factory is actually *restricted* (not
 * merely typed differently), these tests need a real, unprivileged
 * PostgreSQL role inside the isolated test database — created here,
 * scoped to a single ephemeral schema, and dropped along with the whole
 * database in `withIsolatedTestDatabase`'s own cleanup. Never touches the
 * local Compose database, never touches a committed migration.
 */
import { randomBytes } from "node:crypto";

import { assertSafeIdentifier, quoteIdentifier } from "./identifiers";
import { withTestDatabaseClient } from "./test-database";
import type { AdminConnectionInfo } from "./test-container";

export interface PersistenceRoleFixture {
  readonly databaseName: string;
  readonly applicationConnectionString: string;
  readonly migrationConnectionString: string;
  readonly probeSchema: string;
  readonly probeTable: string;
}

function randomSuffix(): string {
  return randomBytes(6).toString("hex");
}

function withCredentials(connectionString: string, username: string, password: string): string {
  const url = new URL(connectionString);
  url.username = encodeURIComponent(username);
  url.password = encodeURIComponent(password);
  return url.toString();
}

/**
 * Inside the already-isolated database at `connectionString` (an admin
 * connection scoped to one disposable database), create:
 *   - a restricted "migrator-like" role that owns one ephemeral schema
 *   - a restricted "app-like" role granted only DML on one probe table in
 *     that schema
 * and hand back per-role connection strings. Everything created here is
 * dropped when the caller drops the isolated database — this never writes
 * to the local Compose database and is never a migration.
 */
export async function withPersistenceRoleFixture<T>(
  databaseName: string,
  connectionString: string,
  callback: (fixture: PersistenceRoleFixture) => Promise<T>,
): Promise<T> {
  const suffix = randomSuffix();
  const migrationRole = `boba_test_migrator_${suffix}`;
  const applicationRole = `boba_test_app_${suffix}`;
  const probeSchema = `probe_${suffix}`;
  const probeTable = "probe";
  assertSafeIdentifier(migrationRole);
  assertSafeIdentifier(applicationRole);
  assertSafeIdentifier(probeSchema);

  const migrationPassword = randomBytes(24).toString("hex");
  const applicationPassword = randomBytes(24).toString("hex");

  await withTestDatabaseClient(connectionString, async (admin) => {
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(migrationRole)} WITH LOGIN PASSWORD '${migrationPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(
      `CREATE ROLE ${quoteIdentifier(applicationRole)} WITH LOGIN PASSWORD '${applicationPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    await admin.pool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(migrationRole)}, ${quoteIdentifier(applicationRole)}`,
    );
    await admin.pool.query(
      `CREATE SCHEMA ${quoteIdentifier(probeSchema)} AUTHORIZATION ${quoteIdentifier(migrationRole)}`,
    );
    await admin.pool.query(`REVOKE ALL ON SCHEMA ${quoteIdentifier(probeSchema)} FROM PUBLIC`);
    await admin.pool.query(
      `GRANT USAGE ON SCHEMA ${quoteIdentifier(probeSchema)} TO ${quoteIdentifier(applicationRole)}`,
    );
    await admin.pool.query(
      `CREATE TABLE ${quoteIdentifier(probeSchema)}.${quoteIdentifier(probeTable)} (id serial primary key, value text not null)`,
    );
    await admin.pool.query(
      `ALTER TABLE ${quoteIdentifier(probeSchema)}.${quoteIdentifier(probeTable)} OWNER TO ${quoteIdentifier(migrationRole)}`,
    );
    await admin.pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${quoteIdentifier(probeSchema)}.${quoteIdentifier(probeTable)} TO ${quoteIdentifier(applicationRole)}`,
    );
    await admin.pool.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${quoteIdentifier(probeSchema)} TO ${quoteIdentifier(applicationRole)}`,
    );
  });

  try {
    return await callback({
      databaseName,
      applicationConnectionString: withCredentials(
        connectionString,
        applicationRole,
        applicationPassword,
      ),
      migrationConnectionString: withCredentials(
        connectionString,
        migrationRole,
        migrationPassword,
      ),
      probeSchema,
      probeTable,
    });
  } finally {
    // The isolated database itself is dropped by the caller
    // (`withIsolatedTestDatabase`), which removes the schema/table. The
    // roles are cluster-wide objects, though, so they must be dropped
    // explicitly here — the caller must close every connection using them
    // before this returns, or these statements will fail.
    await withTestDatabaseClient(connectionString, async (admin) => {
      await admin.pool.query(`DROP OWNED BY ${quoteIdentifier(applicationRole)}`);
      await admin.pool.query(`DROP OWNED BY ${quoteIdentifier(migrationRole)}`);
      await admin.pool.query(`DROP ROLE ${quoteIdentifier(applicationRole)}`);
      await admin.pool.query(`DROP ROLE ${quoteIdentifier(migrationRole)}`);
    });
  }
}

export type { AdminConnectionInfo };
