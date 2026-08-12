/**
 * Shared typed contracts for the persistence boundary (IMP-006).
 *
 * These types describe what a *future* repository module receives — a
 * query or transaction context — never a raw pool, a raw driver client, or
 * `any`. Repositories accept a context; they never acquire a client
 * themselves.
 */
import type { DatabaseClient } from "../../platform/database";

export type PersistenceRole = "application" | "migration";

/** The Drizzle executor type `src/platform/database`'s client already
 * exposes — derived from it (rather than importing `NodePgDatabase` from
 * `drizzle-orm/node-postgres` here directly) so this module never needs an
 * exception to the "no driver imports outside the database boundary" rule
 * (see AGENTS.md / `no-restricted-imports`). */
type DrizzleExecutor = DatabaseClient["db"];

/**
 * A typed Drizzle executor a repository can run queries against — either
 * the normal database executor or (inside {@link PersistenceTransactionContext})
 * a transaction-scoped one.
 *
 * `transaction` is intentionally omitted from this type (though present at
 * runtime on the underlying Drizzle object) so that accepting a context
 * does not, at the type level, invite a repository to start a *nested*
 * transaction through it. Nested transactions are unsupported in this
 * slice — start a new transaction from the top-level {@link Persistence}
 * handle instead.
 */
export type PersistenceQueryContext = {
  readonly role: PersistenceRole;
  readonly db: Omit<DrizzleExecutor, "transaction">;
};

/** The context passed to a {@link Persistence.transaction} callback. Same
 * shape as {@link PersistenceQueryContext} — a transaction context is a
 * query context, not a second place to start a transaction. */
export type PersistenceTransactionContext = PersistenceQueryContext;

export interface PersistenceAvailabilityResult {
  readonly ok: true;
}

/**
 * A role-scoped, lazily-initialized persistence handle. Obtained only
 * through {@link getApplicationPersistence} or {@link getMigrationPersistence}
 * — never constructed directly.
 */
export interface Persistence {
  readonly role: PersistenceRole;

  /** Run `fn` against a typed query context. Initializes the underlying
   * pool on first call (from any handle method), not at handle-creation
   * time. Throws {@link PersistenceClosedError} if this handle was closed. */
  withContext<T>(fn: (context: PersistenceQueryContext) => Promise<T>): Promise<T>;

  /**
   * Run `fn` inside a single database transaction. Commits when `fn`
   * resolves and returns its result; rolls back and re-throws when `fn`
   * throws. A caller/domain error thrown by `fn` is re-thrown unchanged. A
   * genuine PostgreSQL/driver failure (including a failed COMMIT/ROLLBACK)
   * is normalized into a {@link PersistenceOperationError}. Never retried,
   * never runs `fn` more than once. Nested transactions are unsupported —
   * do not call `transaction` again from within `fn`.
   */
  transaction<T>(fn: (context: PersistenceTransactionContext) => Promise<T>): Promise<T>;

  /** Run a minimal `SELECT 1`-equivalent query. Never runs migrations,
   * never inspects business tables. */
  checkAvailability(): Promise<PersistenceAvailabilityResult>;

  /** Idempotent, explicit shutdown. Safe before first use, safe to call
   * more than once. After closing, retrieving persistence again for the
   * same configuration identity creates a fresh handle. */
  close(): Promise<void>;
}
