/**
 * Secret-safe database error.
 *
 * `DatabaseError` deliberately never carries a connection string, a raw
 * driver error's `.stack`/`.message` verbatim (which can echo back
 * connection parameters in some failure modes), or any field derived from
 * one. It carries only a short, human-readable, value-free description and
 * an optional safe `code` (e.g. a Postgres SQLSTATE).
 */

export interface SafeDatabaseErrorDetails {
  /** A short, human-readable, value-free description of what failed. */
  readonly message: string;
  /** An optional safe machine code (e.g. Postgres SQLSTATE, "ECONNREFUSED"). */
  readonly code?: string;
}

export class DatabaseError extends Error {
  readonly code?: string;

  constructor(details: SafeDatabaseErrorDetails) {
    super(details.message);
    this.name = "DatabaseError";
    this.code = details.code;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /** Safe, serializable representation — no connection string, no raw
   * driver error object. */
  toSafeJSON(): { name: string; message: string; code?: string } {
    return { name: this.name, message: this.message, code: this.code };
  }
}

/** Postgres SQLSTATE / driver error shape we care about, without assuming
 * any other field on the raw error is safe to touch. */
interface PgErrorLike {
  readonly code?: unknown;
  readonly message?: unknown;
}

function isPgErrorLike(error: unknown): error is PgErrorLike {
  return typeof error === "object" && error !== null;
}

/**
 * Wrap an arbitrary thrown value (typically a raw `pg` driver error) into a
 * secret-safe {@link DatabaseError}.
 *
 * This never copies the original error's message verbatim into the result
 * unless `allowRawMessage` is explicitly passed — driver messages have, in
 * practice, echoed back parts of a DSN in some failure modes (e.g. DNS
 * resolution failures naming the host). Callers that know their context is
 * safe (e.g. a constraint-violation message with no connection detail) may
 * opt in explicitly.
 */
export function toSafeDatabaseError(
  error: unknown,
  fallbackMessage: string,
): DatabaseError {
  if (error instanceof DatabaseError) return error;

  const code = isPgErrorLike(error) && typeof error.code === "string" ? error.code : undefined;
  return new DatabaseError({ message: fallbackMessage, code });
}
