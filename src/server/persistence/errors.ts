/**
 * Secret-safe persistence errors (IMP-006).
 *
 * Every error here follows the same rule as `src/platform/database`'s
 * `DatabaseError`: never a connection string, password, username, host, or
 * raw driver message that might echo back connection detail — only a short,
 * value-free description plus a small set of whitelisted, safe fields.
 */
import { toSafeDatabaseError, type DatabaseError } from "../../platform/database";
import type { PersistenceRole } from "./types";

export type PersistenceErrorCode =
  | "configuration"
  | "unavailable"
  | "closed"
  | "operation";

interface BasePersistenceErrorDetails {
  readonly role: PersistenceRole;
  readonly message: string;
  /** Postgres SQLSTATE or driver code, if safely available. */
  readonly code?: string;
  /** Whether the underlying failure may be transient (safe to consider
   * retrying at a higher layer — this module never retries itself). */
  readonly transient?: boolean;
}

abstract class PersistenceError extends Error {
  readonly persistenceErrorCode: PersistenceErrorCode;
  readonly role: PersistenceRole;
  readonly code?: string;
  readonly transient: boolean;

  protected constructor(
    persistenceErrorCode: PersistenceErrorCode,
    details: BasePersistenceErrorDetails,
  ) {
    super(details.message);
    this.persistenceErrorCode = persistenceErrorCode;
    this.role = details.role;
    this.code = details.code;
    this.transient = details.transient ?? false;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, PersistenceError);
    }
  }

  /** Safe, serializable representation — no connection string, no raw
   * driver error object, no environment value. */
  toSafeJSON(): {
    name: string;
    message: string;
    persistenceErrorCode: PersistenceErrorCode;
    role: PersistenceRole;
    code?: string;
    transient: boolean;
  } {
    return {
      name: this.name,
      message: this.message,
      persistenceErrorCode: this.persistenceErrorCode,
      role: this.role,
      code: this.code,
      transient: this.transient,
    };
  }
}

/** Configuration passed to a persistence factory is missing, malformed, or
 * carries the wrong role (e.g. a migration config passed to the
 * application factory). Always fails closed. */
export class PersistenceConfigurationError extends PersistenceError {
  constructor(details: Omit<BasePersistenceErrorDetails, "code" | "transient">) {
    super("configuration", details);
    this.name = "PersistenceConfigurationError";
  }
}

/** The database could not be reached, or a diagnostic/availability
 * operation failed. */
export class PersistenceUnavailableError extends PersistenceError {
  constructor(details: BasePersistenceErrorDetails) {
    super("unavailable", details);
    this.name = "PersistenceUnavailableError";
  }
}

/** An operation was attempted on a handle that has already been closed. */
export class PersistenceClosedError extends PersistenceError {
  constructor(role: PersistenceRole) {
    super("closed", {
      role,
      message: "This persistence handle has already been closed.",
    });
    this.name = "PersistenceClosedError";
  }
}

/** A query or transaction failed for a reason that is neither a
 * configuration problem nor a closed handle — e.g. a constraint violation,
 * a failed BEGIN/COMMIT/ROLLBACK, or a lost connection mid-operation. */
export class PersistenceOperationError extends PersistenceError {
  constructor(details: BasePersistenceErrorDetails) {
    super("operation", details);
    this.name = "PersistenceOperationError";
  }
}

/** SQLSTATE class "08" is the Postgres "Connection Exception" class — safe
 * to classify as transient without inspecting anything else about the
 * error. */
function isTransientCode(code: string | undefined): boolean {
  if (!code) return false;
  return code.startsWith("08") || code === "ECONNREFUSED" || code === "ETIMEDOUT";
}

/** Normalize an arbitrary thrown value (typically a raw `pg`/driver error
 * surfaced through `src/platform/database`) into a secret-safe
 * {@link PersistenceOperationError} or {@link PersistenceUnavailableError}. */
export function toSafePersistenceError(
  role: PersistenceRole,
  error: unknown,
  fallbackMessage: string,
  kind: "operation" | "unavailable" = "operation",
): PersistenceOperationError | PersistenceUnavailableError {
  const safe: DatabaseError = toSafeDatabaseError(error, fallbackMessage);
  const details: BasePersistenceErrorDetails = {
    role,
    message: safe.message,
    code: safe.code,
    transient: isTransientCode(safe.code),
  };
  return kind === "unavailable"
    ? new PersistenceUnavailableError(details)
    : new PersistenceOperationError(details);
}

/**
 * A thrown value "looks like" a Postgres driver error (has a five-character
 * SQLSTATE-shaped `.code`) rather than an application/domain error. Used by
 * the transaction helper to decide whether to normalize an error raised
 * inside a callback, or re-throw it untouched.
 */
export function isDriverShapedError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    /^[0-9A-Za-z]{5}$/.test((error as { code: string }).code)
  );
}
