/**
 * Public entry point for the BOBA Bear shared persistence primitives
 * (IMP-006).
 *
 * Server-only: this module (and everything it re-exports) must never be
 * reachable from a Client Component or any browser bundle. `import
 * "server-only"` makes Next.js's build fail loudly if that ever happens;
 * `npm run audit:persistence` catches the same problem statically (and
 * across untracked files, which the Next.js build alone would not see
 * during local development).
 *
 * There is deliberately no generic `getPersistence(role, config)` and no
 * bootstrap/admin factory exported here — see `application.ts` /
 * `migration.ts` and AGENTS.md.
 */
import "server-only";

export { getApplicationPersistence } from "./application";
export type { ApplicationPersistenceConfig } from "./application";

export { getMigrationPersistence } from "./migration";
export type { MigrationPersistenceConfig } from "./migration";

export type {
  Persistence,
  PersistenceAvailabilityResult,
  PersistenceQueryContext,
  PersistenceRole,
  PersistenceTransactionContext,
} from "./types";

export {
  PersistenceClosedError,
  PersistenceConfigurationError,
  PersistenceOperationError,
  PersistenceUnavailableError,
} from "./errors";
export type { PersistenceErrorCode } from "./errors";
