/**
 * Secret-safe idempotency errors (IMP-007). Same rule as
 * `src/server/persistence/errors.ts` and `outbox/errors.ts`: only a short,
 * value-free message plus whitelisted safe fields. Never a raw idempotency
 * key, raw request fingerprint material, or stored result.
 */

export type IdempotencyErrorCode = "validation" | "state";

interface BaseIdempotencyErrorDetails {
  readonly message: string;
}

abstract class IdempotencyError extends Error {
  readonly idempotencyErrorCode: IdempotencyErrorCode;

  protected constructor(idempotencyErrorCode: IdempotencyErrorCode, details: BaseIdempotencyErrorDetails) {
    super(details.message);
    this.idempotencyErrorCode = idempotencyErrorCode;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, IdempotencyError);
    }
  }

  toSafeJSON(): { name: string; message: string; idempotencyErrorCode: IdempotencyErrorCode } {
    return { name: this.name, message: this.message, idempotencyErrorCode: this.idempotencyErrorCode };
  }
}

/** Caller input failed validation (bad UUID, empty namespace/key,
 * non-JSON-safe result, invalid lease/expiry ordering, wrong context role,
 * invalid cleanup limit, etc.). Always fails closed, before any query. */
export class IdempotencyValidationError extends IdempotencyError {
  constructor(details: BaseIdempotencyErrorDetails) {
    super("validation", details);
    this.name = "IdempotencyValidationError";
  }
}

/** A state-transition operation (complete/fail) could not proceed for a
 * reason other than validation — surfaced only through the discriminated
 * {@link IdempotencyMutationResult} return value in normal use; reserved
 * for genuinely unexpected internal-invariant violations. */
export class IdempotencyStateError extends IdempotencyError {
  constructor(details: BaseIdempotencyErrorDetails) {
    super("state", details);
    this.name = "IdempotencyStateError";
  }
}
