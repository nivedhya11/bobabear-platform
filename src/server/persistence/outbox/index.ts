/**
 * Public entry point for the transactional outbox store (IMP-007).
 *
 * Server-only, same rule as `src/server/persistence` itself: never
 * reachable from a Client Component or the public static app tree.
 */
import "server-only";

export {
  claimOutboxBatch,
  deleteDeadLetterOutboxEvents,
  deletePublishedOutboxEvents,
  enqueueOutboxEvent,
  markOutboxDeadLetter,
  markOutboxPublished,
  releaseOutboxForRetry,
} from "./store";

export { OutboxDuplicateEventError, OutboxStateError, OutboxValidationError } from "./errors";
export type { OutboxErrorCode } from "./errors";

export {
  OUTBOX_DEFAULT_BATCH_LIMIT,
  OUTBOX_DEFAULT_CLEANUP_LIMIT,
  OUTBOX_EVENT_STATUSES,
  OUTBOX_MAX_BATCH_LIMIT,
  OUTBOX_MAX_CLEANUP_LIMIT,
} from "./types";
export type {
  ClaimOutboxBatchInput,
  ClaimedOutboxBatch,
  ClaimedOutboxEvent,
  EnqueueOutboxEventInput,
  JsonObject,
  JsonValue,
  MarkOutboxDeadLetterInput,
  MarkOutboxPublishedInput,
  OutboxCleanupOptions,
  OutboxCleanupResult,
  OutboxEventStatus,
  OutboxMutationOutcome,
  OutboxMutationResult,
  ReleaseOutboxForRetryInput,
  StoredOutboxEventReference,
} from "./types";
