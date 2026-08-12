/**
 * Public entry point for the BOBA Bear database boundary.
 *
 * Application code (outside `src/platform/database/**` and the
 * `scripts/database/**` CLI entry points) should import from here rather
 * than from individual modules, and must never import `pg` or
 * `drizzle-orm/node-postgres` directly, or read `BOBA_BEAR_DATABASE_*`
 * environment variables directly.
 */
export { appSchema } from "./schema";

export {
  createConnectionOptions,
  toSafeConnectionOptionsSummary,
  assertSafeApplicationName,
} from "./connection-options";
export type {
  CreateConnectionOptionsInput,
  SafeConnectionOptionsSummary,
} from "./connection-options";

export { createDatabaseClient } from "./client";
export type { CreateDatabaseClientInput, DatabaseClient } from "./client";

export { DatabaseError, toSafeDatabaseError } from "./database-error";
export type { SafeDatabaseErrorDetails } from "./database-error";

export { runDatabaseCheck } from "./check";
export type { CheckRole, DatabaseCheckResult } from "./check";

export {
  runMigrations,
  MIGRATIONS_FOLDER,
  MIGRATIONS_SCHEMA,
  MIGRATIONS_TABLE,
} from "./migrate";
export type { RunMigrationsResult } from "./migrate";
