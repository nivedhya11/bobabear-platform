/**
 * Database client factory — the *only* module allowed to construct a raw
 * `pg.Pool` (see the `no-restricted-imports` ESLint rule for `pg` and
 * `drizzle-orm/node-postgres`, and `scripts/audit-database.mjs`).
 *
 * No application module outside `src/platform/database/**` may import `pg`
 * or `drizzle-orm/node-postgres` directly, or hold a raw `Pool`.
 */
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import type { DatabaseSslMode } from "../config";
import {
  createConnectionOptions,
  type CreateConnectionOptionsInput,
} from "./connection-options";
import { toSafeDatabaseError } from "./database-error";
import * as schema from "./schema";

export interface CreateDatabaseClientInput {
  readonly connectionString: string;
  readonly sslMode: DatabaseSslMode;
  readonly applicationName: string;
  readonly poolSize?: number;
  readonly connectionTimeoutMillis?: number;
  readonly idleTimeoutMillis?: number;
}

export interface DatabaseClient {
  readonly db: NodePgDatabase<typeof schema>;
  readonly pool: Pool;
  /** Explicitly close the underlying pool. Every script must call this in
   * a `finally` block — no client is closed implicitly. */
  close(): Promise<void>;
}

/**
 * Create a Drizzle client backed by a fresh `pg.Pool`.
 *
 * Never logs the connection string. Pool-level errors (e.g. an idle client
 * that failed after being returned to the pool) are caught and converted to
 * a secret-safe {@link DatabaseError} rather than being allowed to crash the
 * process with a raw driver error that might carry connection detail.
 */
export function createDatabaseClient(
  input: CreateDatabaseClientInput,
): DatabaseClient {
  const connectionOptionsInput: CreateConnectionOptionsInput = {
    connectionString: input.connectionString,
    sslMode: input.sslMode,
    applicationName: input.applicationName,
    poolSize: input.poolSize,
    connectionTimeoutMillis: input.connectionTimeoutMillis,
    idleTimeoutMillis: input.idleTimeoutMillis,
  };

  const pool = new Pool(createConnectionOptions(connectionOptionsInput));

  // A Pool emits "error" for problems on idle clients in the background.
  // Without a handler, Node treats this as an uncaught exception and can
  // crash the process. Never attach the connection string to the error.
  pool.on("error", (error: unknown) => {
    const safeError = toSafeDatabaseError(
      error,
      "Unexpected error on an idle database connection.",
    );
    console.error(safeError.message, safeError.code ? { code: safeError.code } : undefined);
  });

  const db = drizzle(pool, { schema });

  let closed = false;
  return {
    db,
    pool,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
