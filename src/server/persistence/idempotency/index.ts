/**
 * Public entry point for the idempotency store (IMP-007).
 *
 * Server-only, same rule as `src/server/persistence` itself: never
 * reachable from a Client Component or the public static app tree.
 */
import "server-only";

export {
  acquireIdempotencyRecord,
  completeIdempotencyRecord,
  deleteExpiredIdempotencyRecords,
  failIdempotencyRecord,
} from "./store";

export { hashIdempotencyKey, hashRequestFingerprint } from "./hashing";

export { IdempotencyStateError, IdempotencyValidationError } from "./errors";
export type { IdempotencyErrorCode } from "./errors";

export {
  IDEMPOTENCY_DEFAULT_CLEANUP_LIMIT,
  IDEMPOTENCY_MAX_CLEANUP_LIMIT,
  IDEMPOTENCY_STATUSES,
} from "./types";
export type {
  AcquireIdempotencyRecordInput,
  CompleteIdempotencyRecordInput,
  FailIdempotencyRecordInput,
  IdempotencyAcquireOutcome,
  IdempotencyAcquiredOutcome,
  IdempotencyCleanupOptions,
  IdempotencyCleanupResult,
  IdempotencyCompletedOutcome,
  IdempotencyConflictOutcome,
  IdempotencyInProgressOutcome,
  IdempotencyMutationOutcome,
  IdempotencyMutationResult,
  IdempotencyStatus,
  JsonValue,
} from "./types";
