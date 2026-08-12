/**
 * Shared migration-runner implementation.
 *
 * `scripts/database/migrate.ts` is the thin CLI entry point; this module
 * holds the actual logic so it can be unit-tested (with a fake client) and
 * so no other module needs to import `drizzle-orm/node-postgres/migrator`
 * directly.
 */
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";

import type { MigrationConfig } from "../config";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { toSafeDatabaseError } from "./database-error";

export const MIGRATIONS_FOLDER = "./drizzle";
export const MIGRATIONS_SCHEMA = "drizzle";
export const MIGRATIONS_TABLE = "__drizzle_migrations";

export interface RunMigrationsResult {
  readonly ok: true;
}

/**
 * Apply every pending repository migration in `./drizzle` using the
 * migration role's connection. Idempotent — Drizzle's migration-history
 * table (`drizzle.__drizzle_migrations`) prevents a migration that was
 * already applied from running again.
 */
export async function runMigrations(
  config: MigrationConfig,
): Promise<RunMigrationsResult> {
  const client: DatabaseClient = createDatabaseClient({
    connectionString: config.databaseMigrationUrl,
    sslMode: config.databaseSslMode,
    applicationName: "boba-bear-migrate",
    poolSize: 1,
  });

  try {
    await drizzleMigrate(client.db, {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsSchema: MIGRATIONS_SCHEMA,
      migrationsTable: MIGRATIONS_TABLE,
    });
    return { ok: true };
  } catch (error) {
    throw toSafeDatabaseError(error, "Database migration failed.");
  } finally {
    await client.close();
  }
}
