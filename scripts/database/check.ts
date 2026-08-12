#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Database connectivity-check CLI (IMP-004, refactored onto the shared
 * persistence primitives in IMP-006).
 *
 * Usage:
 *   node --conditions=react-server --import tsx scripts/database/check.ts --role application
 *   node --conditions=react-server --import tsx scripts/database/check.ts --role migration
 *
 * `--conditions=react-server` is required because this CLI now imports
 * `src/server/persistence`, whose public entry point carries the
 * `server-only` marker — the same guard Next.js applies to real Server
 * Component code. Node only treats that marker as a no-op when the
 * `react-server` export condition is active; see AGENTS.md (IMP-006).
 *
 * Connects using the corresponding central configuration (web/worker's
 * BOBA_BEAR_DATABASE_URL for "application", migration's
 * BOBA_BEAR_DATABASE_MIGRATION_URL for "migration") through the shared
 * application/migration persistence factories, runs a safe, read-only
 * diagnostic query, and always closes its persistence handle before
 * exiting. Never prints a password, connection string, or full
 * environment.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import {
  getApplicationPersistence,
  getMigrationPersistence,
  type Persistence,
} from "../../src/server/persistence";

type CheckRole = "application" | "migration";

interface CheckRow extends Record<string, unknown> {
  current_database: string;
  current_user: string;
  current_schema: string;
  current_setting: string;
}

function parseRole(argv: readonly string[]): CheckRole {
  let raw = "application";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--role") {
      raw = argv[i + 1] ?? raw;
      i += 1;
    } else if (arg.startsWith("--role=")) {
      raw = arg.slice("--role=".length);
    }
  }
  if (raw !== "application" && raw !== "migration") {
    throw new Error(`Invalid --role value "${raw}". Must be "application" or "migration".`);
  }
  return raw;
}

async function runDiagnosticQuery(persistence: Persistence): Promise<CheckRow> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute<CheckRow>(sql`
      SELECT
        current_database()  AS current_database,
        current_user        AS current_user,
        current_schema()    AS current_schema,
        current_setting('server_version_num') AS current_setting
    `);
    const row = result.rows[0];
    if (!row) {
      throw new Error("Diagnostic query returned no row.");
    }
    return row;
  });
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..", "..");

  loadEnvConfig(projectRoot, true);

  let role: CheckRole;
  try {
    role = parseRole(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    process.exitCode = 1;
    return;
  }

  let persistence: Persistence | undefined;
  try {
    if (role === "migration") {
      const config = loadConfig({ processKind: "migration", source: process.env });
      persistence = getMigrationPersistence(config);
    } else {
      const config = loadConfig({ processKind: "worker", source: process.env });
      persistence = getApplicationPersistence(config);
    }

    const row = await runDiagnosticQuery(persistence);
    console.log(
      `db:check (${role}): OK — database=${row.current_database}, ` +
        `user=${row.current_user}, schema=${row.current_schema}, ` +
        `serverVersionNum=${row.current_setting}`,
    );
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message);
    } else if (error instanceof Error) {
      console.error(`db:check (${role}): ${error.message}`);
    } else {
      console.error(`db:check (${role}): connectivity check failed.`);
    }
    process.exitCode = 1;
  } finally {
    if (persistence) {
      await persistence.close();
    }
  }
}

main();
