/**
 * Idempotency store (IMP-007).
 *
 * Deduplicates future command/request execution by hashed key. Every
 * operation accepts an IMP-006 application-role persistence context — never
 * acquires its own pool, never imports `pg` or `drizzle-orm/node-postgres`
 * directly. Raw idempotency keys and raw canonical request material never
 * reach this module — callers must hash them first (see `hashing.ts`) and
 * pass only hashes in; this module never receives, stores, logs, or returns
 * either raw value.
 */
import { sql } from "drizzle-orm";

import { idempotencyRecordsTable } from "../../../platform/database/schema/idempotency-records";
import type { PersistenceQueryContext } from "../types";
import { hashIdempotencyKey, hashRequestFingerprint } from "./hashing";
import { IdempotencyValidationError } from "./errors";
import {
  IDEMPOTENCY_MAX_CLEANUP_LIMIT,
  type AcquireIdempotencyRecordInput,
  type CompleteIdempotencyRecordInput,
  type FailIdempotencyRecordInput,
  type IdempotencyAcquireOutcome,
  type IdempotencyCleanupOptions,
  type IdempotencyCleanupResult,
  type IdempotencyMutationResult,
  type JsonValue,
} from "./types";
import {
  assertAfterNow,
  assertCleanupLimit,
  assertJsonSafeResult,
  assertLeaseBeforeExpiry,
  assertNamespace,
  assertOptionalSafeResultCode,
  assertSafeResultCode,
  assertUuid,
  assertValidDate,
} from "./validation";

const t = idempotencyRecordsTable;

function assertApplicationRole(context: { readonly role: string }, operation: string): void {
  if (context.role !== "application") {
    throw new IdempotencyValidationError({
      message: `${operation} requires an application-role persistence context, got role "${context.role}".`,
    });
  }
}

interface AcquireUpsertRow extends Record<string, unknown> {
  id: string;
}

interface ExistingRecordRow extends Record<string, unknown> {
  id: string;
  status: string;
  request_hash: string;
  owner_token: string | null;
  lease_expires_at: Date | null;
  result: JsonValue | null;
  result_code: string | null;
  completed_at: Date | null;
  expires_at: Date;
}

/**
 * Atomically acquire, reclaim, or replay an idempotency record identified by
 * `(namespace, hash(rawKey))`. One PostgreSQL statement performs the
 * insert-or-conditional-update; a follow-up read only ever runs to classify
 * a no-op outcome (`in_progress` / `completed` / `conflict`) — the
 * mutation's correctness never depends on that second read.
 */
export async function acquireIdempotencyRecord(
  context: PersistenceQueryContext,
  input: AcquireIdempotencyRecordInput,
): Promise<IdempotencyAcquireOutcome> {
  assertApplicationRole(context, "acquireIdempotencyRecord");
  assertUuid(input.recordId, "recordId");
  assertNamespace(input.namespace);
  assertUuid(input.ownerToken, "ownerToken");
  assertValidDate(input.now, "now");
  assertValidDate(input.leaseExpiresAt, "leaseExpiresAt");
  assertValidDate(input.expiresAt, "expiresAt");
  assertAfterNow(input.leaseExpiresAt, input.now, "leaseExpiresAt");
  assertLeaseBeforeExpiry(input.leaseExpiresAt, input.expiresAt);

  const keyHash = hashIdempotencyKey(input.rawKey);
  const requestHash = hashRequestFingerprint(input.canonicalRequestFingerprint);

  const upsertResult = await context.db.execute<AcquireUpsertRow>(sql`
    insert into ${t} (
      id, namespace, key_hash, request_hash, status, owner_token, lease_expires_at,
      result, result_code, created_at, updated_at, completed_at, expires_at
    )
    values (
      ${input.recordId}, ${input.namespace}, ${keyHash}, ${requestHash}, 'in_progress',
      ${input.ownerToken}, ${input.leaseExpiresAt}, null, null, ${input.now}, ${input.now}, null, ${input.expiresAt}
    )
    on conflict (namespace, key_hash) do update set
      id = case when ${t.expiresAt} <= ${input.now} then excluded.id else ${t.id} end,
      request_hash = case when ${t.expiresAt} <= ${input.now} then excluded.request_hash else ${t.requestHash} end,
      status = 'in_progress',
      owner_token = excluded.owner_token,
      lease_expires_at = excluded.lease_expires_at,
      result = case when ${t.expiresAt} <= ${input.now} then null else ${t.result} end,
      result_code = case when ${t.expiresAt} <= ${input.now} then null else ${t.resultCode} end,
      completed_at = null,
      created_at = case when ${t.expiresAt} <= ${input.now} then excluded.created_at else ${t.createdAt} end,
      updated_at = excluded.updated_at,
      expires_at = case when ${t.expiresAt} <= ${input.now} then excluded.expires_at else ${t.expiresAt} end
    where
      (${t.status} = 'in_progress' and ${t.requestHash} = excluded.request_hash
        and ${t.leaseExpiresAt} <= ${input.now} and ${t.expiresAt} > ${input.now})
      or (${t.expiresAt} <= ${input.now})
    returning ${t.id} as id
  `);

  const upserted = upsertResult.rows[0];
  if (upserted) {
    return {
      outcome: "acquired",
      recordId: upserted.id,
      ownerToken: input.ownerToken,
      leaseExpiresAt: input.leaseExpiresAt,
      reclaimed: upserted.id !== input.recordId,
    };
  }

  const existingResult = await context.db.execute<ExistingRecordRow>(sql`
    select
      ${t.id} as id,
      ${t.status} as status,
      ${t.requestHash} as request_hash,
      ${t.ownerToken} as owner_token,
      ${t.leaseExpiresAt} as lease_expires_at,
      ${t.result} as result,
      ${t.resultCode} as result_code,
      ${t.completedAt} as completed_at,
      ${t.expiresAt} as expires_at
    from ${t}
    where ${t.namespace} = ${input.namespace} and ${t.keyHash} = ${keyHash}
  `);
  const existing = existingResult.rows[0];
  if (!existing) {
    // Structurally unreachable: a 0-row upsert only happens on a genuine
    // conflict, which implies a row exists. Treated as a conflict rather
    // than thrown, to fail closed without leaking internal state.
    return { outcome: "conflict", recordId: input.recordId };
  }

  if (existing.request_hash !== requestHash) {
    return { outcome: "conflict", recordId: existing.id };
  }

  if (existing.status === "in_progress") {
    return {
      outcome: "in_progress",
      recordId: existing.id,
      // Coerced rather than trusted as already-a-Date — see the equivalent
      // comment in outbox/store.ts's rowToClaimedEvent.
      leaseExpiresAt: new Date(existing.lease_expires_at as Date),
    };
  }

  return {
    outcome: "completed",
    recordId: existing.id,
    terminalStatus: existing.status as "completed" | "failed",
    result: existing.result,
    resultCode: existing.result_code,
    completedAt: new Date(existing.completed_at as Date),
    expiresAt: new Date(existing.expires_at),
  };
}

interface MutationMissRow extends Record<string, unknown> {
  status: string;
  owner_token: string | null;
}

async function classifyMutationMiss(
  context: PersistenceQueryContext,
  recordId: string,
  ownerToken: string,
): Promise<"not_found" | "stale_owner" | "invalid_state"> {
  const result = await context.db.execute<MutationMissRow>(
    sql`select ${t.status} as status, ${t.ownerToken} as owner_token from ${t} where ${t.id} = ${recordId}`,
  );
  const row = result.rows[0];
  if (!row) return "not_found";
  if (row.status !== "in_progress") return "invalid_state";
  if (row.owner_token !== ownerToken) return "stale_owner";
  return "invalid_state";
}

/** Transitions `recordId` from `in_progress` to `completed`, only if
 * `ownerToken` still owns it. Never changes `namespace`, `key_hash`,
 * `request_hash`, `created_at`, or `expires_at`. */
export async function completeIdempotencyRecord(
  context: PersistenceQueryContext,
  input: CompleteIdempotencyRecordInput,
): Promise<IdempotencyMutationResult> {
  assertApplicationRole(context, "completeIdempotencyRecord");
  assertUuid(input.recordId, "recordId");
  assertUuid(input.ownerToken, "ownerToken");
  assertValidDate(input.completedAt, "completedAt");
  assertJsonSafeResult(input.result, "result");
  assertOptionalSafeResultCode(input.resultCode, "resultCode");

  const result = await context.db.execute<{ id: string }>(sql`
    update ${t}
    set status = 'completed',
        owner_token = null,
        lease_expires_at = null,
        result = ${input.result === null ? null : JSON.stringify(input.result)}::jsonb,
        result_code = ${input.resultCode},
        completed_at = ${input.completedAt},
        updated_at = ${input.completedAt}
    where ${t.id} = ${input.recordId}
      and ${t.status} = 'in_progress'
      and ${t.ownerToken} = ${input.ownerToken}
    returning ${t.id} as id
  `);

  if (result.rows.length > 0) return { outcome: "updated" };
  return { outcome: await classifyMutationMiss(context, input.recordId, input.ownerToken) };
}

/** Transitions `recordId` from `in_progress` to `failed`, only if
 * `ownerToken` still owns it. Sets a new terminal `expires_at`, so the
 * failed result remains replayable through `acquireIdempotencyRecord`'s
 * `completed` outcome until that expiry. */
export async function failIdempotencyRecord(
  context: PersistenceQueryContext,
  input: FailIdempotencyRecordInput,
): Promise<IdempotencyMutationResult> {
  assertApplicationRole(context, "failIdempotencyRecord");
  assertUuid(input.recordId, "recordId");
  assertUuid(input.ownerToken, "ownerToken");
  assertValidDate(input.failedAt, "failedAt");
  assertValidDate(input.expiresAt, "expiresAt");
  assertSafeResultCode(input.resultCode, "resultCode");
  const result = input.result ?? null;
  assertJsonSafeResult(result, "result");
  assertAfterNow(input.expiresAt, input.failedAt, "expiresAt");

  const updateResult = await context.db.execute<{ id: string }>(sql`
    update ${t}
    set status = 'failed',
        owner_token = null,
        lease_expires_at = null,
        result = ${result === null ? null : JSON.stringify(result)}::jsonb,
        result_code = ${input.resultCode},
        completed_at = ${input.failedAt},
        updated_at = ${input.failedAt},
        expires_at = ${input.expiresAt}
    where ${t.id} = ${input.recordId}
      and ${t.status} = 'in_progress'
      and ${t.ownerToken} = ${input.ownerToken}
    returning ${t.id} as id
  `);

  if (updateResult.rows.length > 0) return { outcome: "updated" };
  return { outcome: await classifyMutationMiss(context, input.recordId, input.ownerToken) };
}

/** Deletes up to `options.limit` records with `expires_at <= options.cutoff`.
 * A record that was atomically reset (re-acquired) after `cutoff` was
 * computed is protected by re-evaluating `expires_at` at delete time within
 * the same statement — it is never removed if its expiry has since moved
 * into the future. */
export async function deleteExpiredIdempotencyRecords(
  context: PersistenceQueryContext,
  options: IdempotencyCleanupOptions,
): Promise<IdempotencyCleanupResult> {
  assertApplicationRole(context, "deleteExpiredIdempotencyRecords");
  assertValidDate(options.cutoff, "cutoff");
  assertCleanupLimit(options.limit, IDEMPOTENCY_MAX_CLEANUP_LIMIT);

  const result = await context.db.execute<{ id: string }>(sql`
    with targets as (
      select ${t.id} as id
      from ${t}
      where ${t.expiresAt} <= ${options.cutoff}
      order by ${t.expiresAt}, ${t.id}
      limit ${options.limit}
    )
    delete from ${t} using targets
    where ${t.id} = targets.id and ${t.expiresAt} <= ${options.cutoff}
    returning ${t.id} as id
  `);

  return { deletedIds: result.rows.map((row) => row.id) };
}
