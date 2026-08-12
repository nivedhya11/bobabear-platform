/**
 * Typed contracts for the transactional outbox store (IMP-007).
 *
 * These describe technical persistence records only — never a domain event
 * class, never a publisher payload contract. See AGENTS.md.
 */

/** A JSON-safe value — the shape every `payload`/`metadata`/`result` field
 * must satisfy before it reaches PostgreSQL's `jsonb` columns. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = Readonly<Record<string, JsonValue>>;

export const OUTBOX_EVENT_STATUSES = ["pending", "processing", "published", "dead_letter"] as const;
export type OutboxEventStatus = (typeof OUTBOX_EVENT_STATUSES)[number];

export const OUTBOX_DEFAULT_BATCH_LIMIT = 25;
export const OUTBOX_MAX_BATCH_LIMIT = 100;
export const OUTBOX_DEFAULT_CLEANUP_LIMIT = 500;
export const OUTBOX_MAX_CLEANUP_LIMIT = 500;

/** Input to {@link enqueueOutboxEvent}. Never mutated by the store. */
export type EnqueueOutboxEventInput = Readonly<{
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload: JsonObject;
  metadata?: JsonObject;
  occurredAt: Date;
  availableAt: Date;
  createdAt: Date;
}>;

/** What {@link enqueueOutboxEvent} hands back — a safe reference, never the
 * full row (the caller already has the payload/metadata it supplied). */
export type StoredOutboxEventReference = Readonly<{
  id: string;
  eventType: string;
  eventVersion: number;
  status: "pending";
  createdAt: Date;
}>;

export type ClaimOutboxBatchInput = Readonly<{
  now: Date;
  leaseToken: string;
  leaseExpiresAt: Date;
  limit?: number;
}>;

export type ClaimedOutboxEvent = Readonly<{
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string | null;
  aggregateId: string | null;
  payload: JsonObject;
  metadata: JsonObject;
  occurredAt: Date;
  availableAt: Date;
  attemptCount: number;
  leaseToken: string;
  leaseExpiresAt: Date;
}>;

export type ClaimedOutboxBatch = Readonly<{
  leaseToken: string;
  events: readonly ClaimedOutboxEvent[];
}>;

export type OutboxMutationOutcome = "updated" | "not_found" | "stale_lease" | "invalid_state";

export type OutboxMutationResult = Readonly<{ outcome: OutboxMutationOutcome }>;

export type MarkOutboxPublishedInput = Readonly<{
  eventId: string;
  leaseToken: string;
  publishedAt: Date;
}>;

export type ReleaseOutboxForRetryInput = Readonly<{
  eventId: string;
  leaseToken: string;
  nextAvailableAt: Date;
  errorCode: string;
  updatedAt: Date;
}>;

export type MarkOutboxDeadLetterInput = Readonly<{
  eventId: string;
  leaseToken: string;
  errorCode: string;
  updatedAt: Date;
}>;

export type OutboxCleanupOptions = Readonly<{
  cutoff: Date;
  limit: number;
}>;

export type OutboxCleanupResult = Readonly<{
  deletedIds: readonly string[];
}>;
