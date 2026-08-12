/**
 * Shared database connectivity-check implementation.
 *
 * `scripts/database/check.ts` is the thin CLI entry point; this module
 * holds the actual query logic so it stays testable without a real
 * Postgres connection (callers can inject a fake client shape in tests).
 */
import type { MigrationConfig, WebConfig, WorkerConfig } from "../config";
import { createDatabaseClient } from "./client";
import { toSafeDatabaseError } from "./database-error";

export type CheckRole = "application" | "migration";

export interface DatabaseCheckResult {
  readonly role: CheckRole;
  readonly currentDatabase: string;
  readonly currentUser: string;
  readonly currentSchema: string;
  readonly serverVersionNum: string;
  readonly sslMode: string;
}

interface CheckRow {
  current_database: string;
  current_user: string;
  current_schema: string;
  current_setting: string;
}

/**
 * Connect using the given process configuration and run a safe, read-only
 * diagnostic query. Never returns the connection string, host, or
 * password — only role/database/schema/version diagnostics.
 */
export async function runDatabaseCheck(
  role: CheckRole,
  config: WebConfig | WorkerConfig | MigrationConfig,
): Promise<DatabaseCheckResult> {
  const connectionString =
    config.processKind === "migration" ? config.databaseMigrationUrl : config.databaseUrl;

  const client = createDatabaseClient({
    connectionString,
    sslMode: config.databaseSslMode,
    applicationName: `boba-bear-check-${role}`,
    poolSize: 1,
  });

  try {
    const result = await client.pool.query<CheckRow>(
      `SELECT
         current_database()  AS current_database,
         current_user        AS current_user,
         current_schema()    AS current_schema,
         current_setting('server_version_num') AS current_setting`,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Diagnostic query returned no row.");
    }
    return {
      role,
      currentDatabase: row.current_database,
      currentUser: row.current_user,
      currentSchema: row.current_schema,
      serverVersionNum: row.current_setting,
      sslMode: config.databaseSslMode,
    };
  } catch (error) {
    throw toSafeDatabaseError(error, `Database connectivity check failed for role "${role}".`);
  } finally {
    await client.close();
  }
}
