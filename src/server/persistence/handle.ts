/**
 * Lazy, role-scoped persistence handle implementation shared by the
 * application and migration factories (`application.ts` / `migration.ts`).
 *
 * This module holds the only logic in `src/server/persistence` that knows
 * about the underlying database client shape — everything else deals in
 * the typed {@link Persistence} contract. It never imports `pg` or
 * `drizzle-orm/node-postgres` itself; it reuses `src/platform/database`'s
 * client factory, satisfying the "no second Postgres driver" rule.
 */
import { sql } from "drizzle-orm";

import type { DatabaseSslMode } from "../../platform/config";
import {
  createDatabaseClient,
  type DatabaseClient,
} from "../../platform/database";
import { brandAsTransactionContext } from "./context-kind";
import {
  isDriverShapedError,
  PersistenceClosedError,
  toSafePersistenceError,
} from "./errors";
import type {
  Persistence,
  PersistenceAvailabilityResult,
  PersistenceQueryContext,
  PersistenceRole,
  PersistenceTransactionContext,
} from "./types";

export interface PersistenceHandleOptions {
  readonly role: PersistenceRole;
  readonly connectionString: string;
  readonly sslMode: DatabaseSslMode;
  readonly applicationName: string;
  /** Called exactly once, synchronously, when `close()` is first invoked —
   * used by the application/migration registries to drop this handle so a
   * fresh one can be created for the same configuration identity later. */
  readonly onClose?: () => void;
}

/** Narrow seam for tests: never exported from the public boundary
 * (`index.ts`). Lets a unit test count pool-creation calls or fail them
 * without a real PostgreSQL server. */
export interface PersistenceHandleDependencies {
  readonly createClient: typeof createDatabaseClient;
}

const defaultDependencies: PersistenceHandleDependencies = {
  createClient: createDatabaseClient,
};

/**
 * Create a lazily-initialized persistence handle. Creating this object
 * does not open a socket or construct a pool — that happens on the first
 * call to `withContext`, `transaction`, or `checkAvailability`, whichever
 * comes first, across however many concurrent callers there are (pool
 * creation is synchronous, so there is no race between "check" and
 * "create").
 */
export function createPersistenceHandle(
  options: PersistenceHandleOptions,
  dependencies: PersistenceHandleDependencies = defaultDependencies,
): Persistence {
  const { role, connectionString, sslMode, applicationName, onClose } = options;

  let client: DatabaseClient | null = null;
  let closed = false;

  function assertNotClosed(): void {
    if (closed) {
      throw new PersistenceClosedError(role);
    }
  }

  function ensureClient(): DatabaseClient {
    assertNotClosed();
    if (!client) {
      try {
        client = dependencies.createClient({
          connectionString,
          sslMode,
          applicationName,
          poolSize: 1,
        });
      } catch (error) {
        throw toSafePersistenceError(
          role,
          error,
          `Failed to initialize the ${role} persistence pool.`,
          "unavailable",
        );
      }
    }
    return client;
  }

  function toQueryContext(client: DatabaseClient): PersistenceQueryContext {
    return { role, db: client.db };
  }

  return {
    role,

    async withContext<T>(fn: (context: PersistenceQueryContext) => Promise<T>): Promise<T> {
      const activeClient = ensureClient();
      try {
        return await fn(toQueryContext(activeClient));
      } catch (error) {
        if (isDriverShapedError(error)) {
          throw toSafePersistenceError(role, error, `A ${role} database query failed.`);
        }
        throw error;
      }
    },

    async transaction<T>(
      fn: (context: PersistenceTransactionContext) => Promise<T>,
    ): Promise<T> {
      const activeClient = ensureClient();
      try {
        return await activeClient.db.transaction(async (tx) =>
          fn(brandAsTransactionContext<PersistenceTransactionContext>({ role, db: tx })),
        );
      } catch (error) {
        if (isDriverShapedError(error)) {
          throw toSafePersistenceError(role, error, `A ${role} database transaction failed.`);
        }
        throw error;
      }
    },

    async checkAvailability(): Promise<PersistenceAvailabilityResult> {
      const activeClient = ensureClient();
      try {
        await activeClient.db.execute(sql`select 1`);
        return { ok: true };
      } catch (error) {
        throw toSafePersistenceError(
          role,
          error,
          `The ${role} database availability check failed.`,
          "unavailable",
        );
      }
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      onClose?.();
      const activeClient = client;
      client = null;
      if (activeClient) {
        await activeClient.close();
      }
    },
  };
}
