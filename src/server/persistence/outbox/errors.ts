/**
 * Secret-safe outbox errors (IMP-007). Follows the same rule as
 * `src/server/persistence/errors.ts`: only a short, value-free message plus
 * a small set of whitelisted, safe fields. Never a payload, metadata,
 * connection string, or raw driver error.
 */

export type OutboxErrorCode = "validation" | "duplicate_event" | "state";

interface BaseOutboxErrorDetails {
  readonly message: string;
}

abstract class OutboxError extends Error {
  readonly outboxErrorCode: OutboxErrorCode;

  protected constructor(outboxErrorCode: OutboxErrorCode, details: BaseOutboxErrorDetails) {
    super(details.message);
    this.outboxErrorCode = outboxErrorCode;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, OutboxError);
    }
  }

  toSafeJSON(): { name: string; message: string; outboxErrorCode: OutboxErrorCode } {
    return { name: this.name, message: this.message, outboxErrorCode: this.outboxErrorCode };
  }
}

/** Caller input failed validation (bad UUID, non-positive event version,
 * non-JSON-safe payload/metadata, invalid batch size, invalid lease time,
 * wrong context role/kind, etc.). Always fails closed, before any query. */
export class OutboxValidationError extends OutboxError {
  constructor(details: BaseOutboxErrorDetails) {
    super("validation", details);
    this.name = "OutboxValidationError";
  }
}

/** `enqueueOutboxEvent` was called with an `id` that already exists. */
export class OutboxDuplicateEventError extends OutboxError {
  readonly eventId: string;

  constructor(eventId: string) {
    super("duplicate_event", { message: "An outbox event with this id already exists." });
    this.name = "OutboxDuplicateEventError";
    this.eventId = eventId;
  }

  override toSafeJSON(): { name: string; message: string; outboxErrorCode: OutboxErrorCode; eventId: string } {
    return { ...super.toSafeJSON(), eventId: this.eventId };
  }
}

/** A state-transition operation (publish/retry/dead-letter) could not
 * proceed for a reason other than validation — surfaced only through the
 * discriminated {@link OutboxMutationResult} return value in normal use;
 * reserved for genuinely unexpected internal-invariant violations. */
export class OutboxStateError extends OutboxError {
  constructor(details: BaseOutboxErrorDetails) {
    super("state", details);
    this.name = "OutboxStateError";
  }
}
