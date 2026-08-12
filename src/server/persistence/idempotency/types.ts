/**
 * Typed contracts for the idempotency store (IMP-007).
 *
 * These describe technical deduplication records only. Raw idempotency
 * keys and raw canonical request material never appear in any of these
 * types — only their SHA-256 hashes ever reach the store (see `hashing.ts`).
 */
import type { JsonValue } from "../outbox/types";

export type { JsonValue };

export const IDEMPOTENCY_STATUSES = ["in_progress", "completed", "failed"] as const;
export type IdempotencyStatus = (typeof IDEMPOTENCY_STATUSES)[number];

export const IDEMPOTENCY_DEFAULT_CLEANUP_LIMIT = 500;
export const IDEMPOTENCY_MAX_CLEANUP_LIMIT = 500;

/** Input to {@link acquireIdempotencyRecord}. `rawKey` and
 * `canonicalRequestFingerprint` are hashed before ever reaching the store's
 * SQL — neither is persisted, logged, or returned. */
export type AcquireIdempotencyRecordInput = Readonly<{
  recordId: string;
  namespace: string;
  rawKey: string;
  canonicalRequestFingerprint: string;
  ownerToken: string;
  now: Date;
  leaseExpiresAt: Date;
  expiresAt: Date;
}>;

export type IdempotencyAcquiredOutcome = Readonly<{
  outcome: "acquired";
  recordId: string;
  ownerToken: string;
  leaseExpiresAt: Date;
  reclaimed: boolean;
}>;

export type IdempotencyCompletedOutcome = Readonly<{
  outcome: "completed";
  recordId: string;
  terminalStatus: "completed" | "failed";
  result: JsonValue | null;
  resultCode: string | null;
  completedAt: Date;
  expiresAt: Date;
}>;

export type IdempotencyInProgressOutcome = Readonly<{
  outcome: "in_progress";
  recordId: string;
  leaseExpiresAt: Date;
}>;

export type IdempotencyConflictOutcome = Readonly<{
  outcome: "conflict";
  recordId: string;
}>;

export type IdempotencyAcquireOutcome =
  | IdempotencyAcquiredOutcome
  | IdempotencyCompletedOutcome
  | IdempotencyInProgressOutcome
  | IdempotencyConflictOutcome;

export type CompleteIdempotencyRecordInput = Readonly<{
  recordId: string;
  ownerToken: string;
  result: JsonValue | null;
  resultCode: string | null;
  completedAt: Date;
}>;

export type FailIdempotencyRecordInput = Readonly<{
  recordId: string;
  ownerToken: string;
  result?: JsonValue | null;
  resultCode: string;
  failedAt: Date;
  expiresAt: Date;
}>;

export type IdempotencyMutationOutcome = "updated" | "not_found" | "stale_owner" | "invalid_state";
export type IdempotencyMutationResult = Readonly<{ outcome: IdempotencyMutationOutcome }>;

export type IdempotencyCleanupOptions = Readonly<{ cutoff: Date; limit: number }>;
export type IdempotencyCleanupResult = Readonly<{ deletedIds: readonly string[] }>;
