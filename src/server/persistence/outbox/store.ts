/**
 * Transactional outbox store (IMP-007).
 *
 * Every operation here accepts an IMP-006 persistence context — never
 * acquires its own pool, never imports `pg` or
 * `drizzle-orm/node-postgres` directly, never publishes or delivers an
 * event. Delivery guarantee is at-least-once: a claimed-but-never-published
 * event is reclaimable once its lease expires (see `claimOutboxBatch`), so a
 * future consumer of this table must be idempotent (see
 * `src/server/persistence/idempotency`).
 */
import { sql } from "drizzle-orm";

import { outboxEventsTable } from "../../../platform/database/schema/outbox-events";
import { isTransactionContext } from "../context-kind";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../types";
import { OutboxDuplicateEventError, OutboxValidationError } from "./errors";
import {
  OUTBOX_DEFAULT_BATCH_LIMIT,
  OUTBOX_DEFAULT_CLEANUP_LIMIT,
  OUTBOX_MAX_CLEANUP_LIMIT,
  type ClaimOutboxBatchInput,
  type ClaimedOutboxBatch,
  type ClaimedOutboxEvent,
  type EnqueueOutboxEventInput,
  type JsonObject,
  type MarkOutboxDeadLetterInput,
  type MarkOutboxPublishedInput,
  type OutboxCleanupOptions,
  type OutboxCleanupResult,
  type OutboxMutationResult,
  type ReleaseOutboxForRetryInput,
  type StoredOutboxEventReference,
} from "./types";
import {
  assertCleanupLimit,
  assertJsonObject,
  assertLeaseExpiresAfterNow,
  assertNonEmptyBoundedText,
  assertOptionalNonEmptyBoundedText,
  assertPositiveInteger,
  assertSafeErrorCode,
  assertUuid,
  assertValidDate,
  freezeJsonObject,
  normalizeBatchLimit,
} from "./validation";

const t = outboxEventsTable;

function assertApplicationRole(context: { readonly role: string }, operation: string): void {
  if (context.role !== "application") {
    throw new OutboxValidationError({
      message: `${operation} requires an application-role persistence context, got role "${context.role}".`,
    });
  }
}

function driverCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code !== undefined) return code;
  // drizzle-orm wraps the raw pg driver error in DrizzleQueryError, whose
  // SQLSTATE lives on `.cause`, not on the wrapper itself.
  const cause = (error as { cause?: unknown }).cause;
  return typeof cause === "object" && cause !== null ? (cause as { code?: unknown }).code : undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return driverCode(error) === "23505";
}

interface RawClaimedOutboxRow extends Record<string, unknown> {
  id: string;
  event_type: string;
  event_version: number;
  aggregate_type: string | null;
  aggregate_id: string | null;
  payload: JsonObject;
  metadata: JsonObject;
  occurred_at: Date;
  available_at: Date;
  attempt_count: number;
  lease_token: string;
  lease_expires_at: Date;
}

function rowToClaimedEvent(row: RawClaimedOutboxRow): ClaimedOutboxEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    metadata: row.metadata,
    // Coerced rather than trusted as already-a-Date: the driver returns a
    // real Date for a plain SELECT, but this query's RETURNING clause runs
    // through a CTE + UPDATE, and `new Date(x)` is a safe no-op if `x` is
    // already a Date.
    occurredAt: new Date(row.occurred_at),
    availableAt: new Date(row.available_at),
    attemptCount: row.attempt_count,
    leaseToken: row.lease_token,
    leaseExpiresAt: new Date(row.lease_expires_at),
  };
}

function compareClaimedEvents(a: ClaimedOutboxEvent, b: ClaimedOutboxEvent): number {
  const availableDelta = a.availableAt.getTime() - b.availableAt.getTime();
  if (availableDelta !== 0) return availableDelta;
  const occurredDelta = a.occurredAt.getTime() - b.occurredAt.getTime();
  if (occurredDelta !== 0) return occurredDelta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Insert one pending outbox row atomically with whatever domain change the
 * caller's transaction also makes. Requires a transaction context obtained
 * from `Persistence.transaction()` — a plain `withContext` query context (or
 * a migration-role context) is rejected before any query runs.
 */
export async function enqueueOutboxEvent(
  context: PersistenceTransactionContext,
  input: EnqueueOutboxEventInput,
): Promise<StoredOutboxEventReference> {
  assertApplicationRole(context, "enqueueOutboxEvent");
  if (!isTransactionContext(context)) {
    throw new OutboxValidationError({
      message:
        "enqueueOutboxEvent requires a transaction context from Persistence.transaction(), not a withContext query context.",
    });
  }

  assertUuid(input.id, "id");
  assertNonEmptyBoundedText(input.eventType, "eventType");
  assertPositiveInteger(input.eventVersion, "eventVersion");
  assertOptionalNonEmptyBoundedText(input.aggregateType ?? null, "aggregateType");
  assertOptionalNonEmptyBoundedText(input.aggregateId ?? null, "aggregateId");
  assertJsonObject(input.payload, "payload");
  const metadataInput = input.metadata ?? {};
  assertJsonObject(metadataInput, "metadata");
  assertValidDate(input.occurredAt, "occurredAt");
  assertValidDate(input.availableAt, "availableAt");
  assertValidDate(input.createdAt, "createdAt");

  const payload = freezeJsonObject(input.payload);
  const metadata = freezeJsonObject(metadataInput);

  try {
    await context.db.insert(t).values({
      id: input.id,
      eventType: input.eventType,
      eventVersion: input.eventVersion,
      aggregateType: input.aggregateType ?? null,
      aggregateId: input.aggregateId ?? null,
      payload: payload as Record<string, unknown>,
      metadata: metadata as Record<string, unknown>,
      status: "pending",
      occurredAt: input.occurredAt,
      availableAt: input.availableAt,
      attemptCount: 0,
      leaseToken: null,
      leaseExpiresAt: null,
      publishedAt: null,
      lastErrorCode: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OutboxDuplicateEventError(input.id);
    }
    throw error;
  }

  return {
    id: input.id,
    eventType: input.eventType,
    eventVersion: input.eventVersion,
    status: "pending",
    createdAt: input.createdAt,
  };
}

/**
 * Atomically select and claim up to `limit` eligible events (pending and
 * due, or processing with an expired lease) using `FOR UPDATE SKIP LOCKED`
 * inside a single statement — two concurrent callers never receive the same
 * live-leased event. Returns events in deterministic order
 * (`available_at`, `occurred_at`, `id`).
 */
export async function claimOutboxBatch(
  context: PersistenceQueryContext,
  options: ClaimOutboxBatchInput,
): Promise<ClaimedOutboxBatch> {
  assertApplicationRole(context, "claimOutboxBatch");
  assertUuid(options.leaseToken, "leaseToken");
  assertLeaseExpiresAfterNow(options.leaseExpiresAt, options.now, "leaseExpiresAt");
  const limit = normalizeBatchLimit(options.limit, OUTBOX_DEFAULT_BATCH_LIMIT);

  const result = await context.db.execute<RawClaimedOutboxRow>(sql`
    with claimable as (
      select ${t.id} as id
      from ${t}
      where (${t.status} = 'pending' and ${t.availableAt} <= ${options.now})
         or (${t.status} = 'processing' and ${t.leaseExpiresAt} <= ${options.now})
      order by ${t.availableAt}, ${t.occurredAt}, ${t.id}
      limit ${limit}
      for update skip locked
    )
    update ${t} as o
    set status = 'processing',
        lease_token = ${options.leaseToken},
        lease_expires_at = ${options.leaseExpiresAt},
        attempt_count = o.attempt_count + 1,
        updated_at = ${options.now}
    from claimable c
    where o.id = c.id
    returning
      o.id as id,
      o.event_type as event_type,
      o.event_version as event_version,
      o.aggregate_type as aggregate_type,
      o.aggregate_id as aggregate_id,
      o.payload as payload,
      o.metadata as metadata,
      o.occurred_at as occurred_at,
      o.available_at as available_at,
      o.attempt_count as attempt_count,
      o.lease_token as lease_token,
      o.lease_expires_at as lease_expires_at
  `);

  const events = result.rows.map(rowToClaimedEvent).sort(compareClaimedEvents);
  return { leaseToken: options.leaseToken, events };
}

interface LeaseCheckRow extends Record<string, unknown> {
  status: string;
  lease_token: string | null;
}

/** Classifies why an owner-scoped UPDATE affected zero rows: the id does not
 * exist, the row is not in the expected state, or the lease token is stale.
 * Best-effort/advisory only — the mutation's correctness never depends on
 * this, only on the UPDATE's own WHERE clause. */
async function classifyMutationMiss(
  context: PersistenceQueryContext,
  eventId: string,
  leaseToken: string,
): Promise<"not_found" | "stale_lease" | "invalid_state"> {
  const result = await context.db.execute<LeaseCheckRow>(
    sql`select ${t.status} as status, ${t.leaseToken} as lease_token from ${t} where ${t.id} = ${eventId}`,
  );
  const row = result.rows[0];
  if (!row) return "not_found";
  if (row.status !== "processing") return "invalid_state";
  if (row.lease_token !== leaseToken) return "stale_lease";
  return "invalid_state";
}

/** Transitions a claimed event to `published`, only if `leaseToken` still
 * owns it. Never performs external delivery. */
export async function markOutboxPublished(
  context: PersistenceQueryContext,
  input: MarkOutboxPublishedInput,
): Promise<OutboxMutationResult> {
  assertApplicationRole(context, "markOutboxPublished");
  assertUuid(input.eventId, "eventId");
  assertUuid(input.leaseToken, "leaseToken");
  assertValidDate(input.publishedAt, "publishedAt");

  const result = await context.db.execute<{ id: string }>(sql`
    update ${t}
    set status = 'published',
        lease_token = null,
        lease_expires_at = null,
        published_at = ${input.publishedAt},
        updated_at = ${input.publishedAt}
    where ${t.id} = ${input.eventId}
      and ${t.status} = 'processing'
      and ${t.leaseToken} = ${input.leaseToken}
    returning ${t.id} as id
  `);

  if (result.rows.length > 0) return { outcome: "updated" };
  return { outcome: await classifyMutationMiss(context, input.eventId, input.leaseToken) };
}

/** Releases a claimed event back to `pending` for a caller-chosen future
 * retry time. Never schedules the retry itself — the caller decides when. */
export async function releaseOutboxForRetry(
  context: PersistenceQueryContext,
  input: ReleaseOutboxForRetryInput,
): Promise<OutboxMutationResult> {
  assertApplicationRole(context, "releaseOutboxForRetry");
  assertUuid(input.eventId, "eventId");
  assertUuid(input.leaseToken, "leaseToken");
  assertValidDate(input.nextAvailableAt, "nextAvailableAt");
  assertValidDate(input.updatedAt, "updatedAt");
  assertSafeErrorCode(input.errorCode, "errorCode");

  const result = await context.db.execute<{ id: string }>(sql`
    update ${t}
    set status = 'pending',
        available_at = ${input.nextAvailableAt},
        lease_token = null,
        lease_expires_at = null,
        last_error_code = ${input.errorCode},
        updated_at = ${input.updatedAt}
    where ${t.id} = ${input.eventId}
      and ${t.status} = 'processing'
      and ${t.leaseToken} = ${input.leaseToken}
    returning ${t.id} as id
  `);

  if (result.rows.length > 0) return { outcome: "updated" };
  return { outcome: await classifyMutationMiss(context, input.eventId, input.leaseToken) };
}

/** Transitions a claimed event to `dead_letter`. Adds no publisher, API, or
 * UI for dead-lettered events — this slice only records the state. */
export async function markOutboxDeadLetter(
  context: PersistenceQueryContext,
  input: MarkOutboxDeadLetterInput,
): Promise<OutboxMutationResult> {
  assertApplicationRole(context, "markOutboxDeadLetter");
  assertUuid(input.eventId, "eventId");
  assertUuid(input.leaseToken, "leaseToken");
  assertValidDate(input.updatedAt, "updatedAt");
  assertSafeErrorCode(input.errorCode, "errorCode");

  const result = await context.db.execute<{ id: string }>(sql`
    update ${t}
    set status = 'dead_letter',
        lease_token = null,
        lease_expires_at = null,
        last_error_code = ${input.errorCode},
        updated_at = ${input.updatedAt}
    where ${t.id} = ${input.eventId}
      and ${t.status} = 'processing'
      and ${t.leaseToken} = ${input.leaseToken}
    returning ${t.id} as id
  `);

  if (result.rows.length > 0) return { outcome: "updated" };
  return { outcome: await classifyMutationMiss(context, input.eventId, input.leaseToken) };
}

/** Deletes up to `options.limit` `published` events with `published_at <=
 * options.cutoff`. Never touches `pending` or `processing` rows — the
 * `status = 'published'` predicate is non-negotiable. */
export async function deletePublishedOutboxEvents(
  context: PersistenceQueryContext,
  options: OutboxCleanupOptions,
): Promise<OutboxCleanupResult> {
  assertApplicationRole(context, "deletePublishedOutboxEvents");
  assertValidDate(options.cutoff, "cutoff");
  assertCleanupLimit(options.limit, OUTBOX_MAX_CLEANUP_LIMIT);

  const result = await context.db.execute<{ id: string }>(sql`
    with targets as (
      select ${t.id} as id
      from ${t}
      where ${t.status} = 'published' and ${t.publishedAt} <= ${options.cutoff}
      order by ${t.publishedAt}, ${t.id}
      limit ${options.limit}
    )
    delete from ${t} using targets
    where ${t.id} = targets.id
    returning ${t.id} as id
  `);

  return { deletedIds: result.rows.map((row) => row.id) };
}

/** Deletes up to `options.limit` `dead_letter` events with `updated_at <=
 * options.cutoff`. A separate, explicitly named operation from
 * {@link deletePublishedOutboxEvents} — cleaning up published events never
 * removes dead-lettered ones and vice versa. */
export async function deleteDeadLetterOutboxEvents(
  context: PersistenceQueryContext,
  options: OutboxCleanupOptions,
): Promise<OutboxCleanupResult> {
  assertApplicationRole(context, "deleteDeadLetterOutboxEvents");
  assertValidDate(options.cutoff, "cutoff");
  assertCleanupLimit(options.limit, OUTBOX_MAX_CLEANUP_LIMIT);

  const result = await context.db.execute<{ id: string }>(sql`
    with targets as (
      select ${t.id} as id
      from ${t}
      where ${t.status} = 'dead_letter' and ${t.updatedAt} <= ${options.cutoff}
      order by ${t.updatedAt}, ${t.id}
      limit ${options.limit}
    )
    delete from ${t} using targets
    where ${t.id} = targets.id
    returning ${t.id} as id
  `);

  return { deletedIds: result.rows.map((row) => row.id) };
}

export { OUTBOX_DEFAULT_CLEANUP_LIMIT };
