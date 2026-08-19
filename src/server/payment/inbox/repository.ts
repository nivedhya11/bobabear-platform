/**
 * Durable Payment provider webhook inbox persistence (IMP-026A / D-363).
 *
 * Small claim/process store. Not a general queue framework.
 */
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { paymentProviderEventInboxTable } from "../../../platform/database/schema/payment-provider-event-inbox";
import type { PaymentProviderWebhookEvidence } from "../provider/types";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "../assert-role";
import { sanitizeInboxErrorMessage, serializeInboxEvidence } from "./evidence";

export const PAYMENT_INBOX_DEFAULT_BATCH_LIMIT = 8;
export const PAYMENT_INBOX_DEFAULT_LEASE_MS = 30_000;
export const PAYMENT_INBOX_MAX_ATTEMPTS = 16;
export const PAYMENT_INBOX_RETRY_DELAY_MS = 5_000;

export type PaymentInboxProcessingState = "pending" | "processing" | "processed" | "poison";

export type PaymentInboxRow = typeof paymentProviderEventInboxTable.$inferSelect;

export type EnqueueInboxResult =
  | Readonly<{ kind: "inserted"; row: PaymentInboxRow }>
  | Readonly<{ kind: "duplicate"; row: PaymentInboxRow }>;

export type ClaimedInboxEvent = Readonly<{
  id: string;
  provider: string;
  providerEventId: string;
  providerExecutionIdentity: string | null;
  processingAttemptCount: bigint;
  evidenceJson: string;
  claimToken: string;
}>;

function newInboxId(): string {
  return randomUUID();
}

export async function enqueueVerifiedProviderEvent(
  context: PersistenceTransactionContext,
  input: {
    provider: string;
    providerEventId: string;
    evidence: PaymentProviderWebhookEvidence;
    now: Date;
  },
): Promise<EnqueueInboxResult> {
  assertTransactionContext(context, "enqueueVerifiedProviderEvent");
  const executionIdentity =
    "providerExecutionIdentity" in input.evidence &&
    typeof input.evidence.providerExecutionIdentity === "string" &&
    input.evidence.providerExecutionIdentity.trim().length > 0
      ? input.evidence.providerExecutionIdentity
      : "providerRefundId" in input.evidence
        ? input.evidence.providerRefundId
        : null;
  const values = {
    id: newInboxId(),
    provider: input.provider,
    providerEventId: input.providerEventId,
    providerExecutionIdentity: executionIdentity,
    processingState: "pending" as const,
    processingAttemptCount: BigInt(0),
    receivedAt: input.now,
    availableAt: input.now,
    claimedAt: null,
    claimLeaseExpiresAt: null,
    claimToken: null,
    processedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    evidenceJson: serializeInboxEvidence(input.evidence),
  };

  const inserted = await context.db
    .insert(paymentProviderEventInboxTable)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) {
    return Object.freeze({ kind: "inserted", row: inserted[0] });
  }

  const existing = await context.db
    .select()
    .from(paymentProviderEventInboxTable)
    .where(
      sql`${paymentProviderEventInboxTable.provider} = ${input.provider}
        and ${paymentProviderEventInboxTable.providerEventId} = ${input.providerEventId}`,
    )
    .limit(1);
  if (!existing[0]) {
    throw new Error("Inbox duplicate lookup failed after conflict.");
  }
  return Object.freeze({ kind: "duplicate", row: existing[0] });
}

export async function claimInboxBatch(
  context: PersistenceQueryContext,
  options: {
    now: Date;
    leaseToken: string;
    leaseExpiresAt: Date;
    limit?: number;
  },
): Promise<readonly ClaimedInboxEvent[]> {
  assertApplicationRole(context, "claimInboxBatch");
  const limit = Math.max(
    1,
    Math.min(options.limit ?? PAYMENT_INBOX_DEFAULT_BATCH_LIMIT, 32),
  );
  const t = paymentProviderEventInboxTable;
  const result = await context.db.execute<{
    id: string;
    provider: string;
    provider_event_id: string;
    provider_execution_identity: string | null;
    processing_attempt_count: string | number | bigint;
    evidence_json: string;
    claim_token: string;
  }>(sql`
    with claimable as (
      select ${t.id} as id
      from ${t}
      where (
        ${t.processingState} = 'pending' and ${t.availableAt} <= ${options.now}
      ) or (
        ${t.processingState} = 'processing' and ${t.claimLeaseExpiresAt} <= ${options.now}
      )
      order by ${t.availableAt}, ${t.receivedAt}, ${t.id}
      limit ${limit}
      for update skip locked
    )
    update ${t} as inbox
    set processing_state = 'processing',
        claim_token = ${options.leaseToken},
        claim_lease_expires_at = ${options.leaseExpiresAt},
        claimed_at = ${options.now},
        processing_attempt_count = inbox.processing_attempt_count + 1,
        processed_at = null
    from claimable c
    where inbox.id = c.id
    returning
      inbox.id as id,
      inbox.provider as provider,
      inbox.provider_event_id as provider_event_id,
      inbox.provider_execution_identity as provider_execution_identity,
      inbox.processing_attempt_count as processing_attempt_count,
      inbox.evidence_json as evidence_json,
      inbox.claim_token as claim_token
  `);

  return Object.freeze(
    result.rows.map((row) =>
      Object.freeze({
        id: row.id,
        provider: row.provider,
        providerEventId: row.provider_event_id,
        providerExecutionIdentity: row.provider_execution_identity,
        processingAttemptCount: BigInt(row.processing_attempt_count),
        evidenceJson: row.evidence_json,
        claimToken: row.claim_token,
      }),
    ),
  );
}

export async function markInboxProcessed(
  context: PersistenceQueryContext,
  input: { id: string; claimToken: string; now: Date },
): Promise<boolean> {
  assertApplicationRole(context, "markInboxProcessed");
  const t = paymentProviderEventInboxTable;
  const result = await context.db.execute(sql`
    update ${t}
    set processing_state = 'processed',
        claim_token = null,
        claim_lease_expires_at = null,
        processed_at = ${input.now},
        last_error_code = null,
        last_error_message = null
    where ${t.id} = ${input.id}
      and ${t.claimToken} = ${input.claimToken}
      and ${t.processingState} = 'processing'
  `);
  return (result.rowCount ?? 0) > 0;
}

export async function releaseInboxForRetry(
  context: PersistenceQueryContext,
  input: {
    id: string;
    claimToken: string;
    now: Date;
    availableAt: Date;
    errorCode: string;
    errorMessage: string;
  },
): Promise<boolean> {
  assertApplicationRole(context, "releaseInboxForRetry");
  const t = paymentProviderEventInboxTable;
  const result = await context.db.execute(sql`
    update ${t}
    set processing_state = 'pending',
        claim_token = null,
        claim_lease_expires_at = null,
        available_at = ${input.availableAt},
        last_error_code = ${input.errorCode.slice(0, 64)},
        last_error_message = ${sanitizeInboxErrorMessage(input.errorMessage)}
    where ${t.id} = ${input.id}
      and ${t.claimToken} = ${input.claimToken}
      and ${t.processingState} = 'processing'
  `);
  return (result.rowCount ?? 0) > 0;
}

export async function markInboxPoison(
  context: PersistenceQueryContext,
  input: {
    id: string;
    claimToken: string;
    now: Date;
    errorCode: string;
    errorMessage: string;
  },
): Promise<boolean> {
  assertApplicationRole(context, "markInboxPoison");
  const t = paymentProviderEventInboxTable;
  const result = await context.db.execute(sql`
    update ${t}
    set processing_state = 'poison',
        claim_token = null,
        claim_lease_expires_at = null,
        last_error_code = ${input.errorCode.slice(0, 64)},
        last_error_message = ${sanitizeInboxErrorMessage(input.errorMessage)}
    where ${t.id} = ${input.id}
      and ${t.claimToken} = ${input.claimToken}
      and ${t.processingState} = 'processing'
  `);
  return (result.rowCount ?? 0) > 0;
}

export async function getInboxByProviderEvent(
  context: PersistenceQueryContext,
  input: { provider: string; providerEventId: string },
): Promise<PaymentInboxRow | null> {
  assertApplicationRole(context, "getInboxByProviderEvent");
  const rows = await context.db
    .select()
    .from(paymentProviderEventInboxTable)
    .where(
      sql`${paymentProviderEventInboxTable.provider} = ${input.provider}
        and ${paymentProviderEventInboxTable.providerEventId} = ${input.providerEventId}`,
    )
    .limit(1);
  return rows[0] ?? null;
}
