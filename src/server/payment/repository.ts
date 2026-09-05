/**
 * Payment persistence primitives (IMP-022).
 *
 * Not exported as domain CRUD. Lock helpers use FOR UPDATE.
 * Lock order when Checkout + Payment + Attempt are all locked:
 * Checkout → Payment → Attempt.
 */

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  checkoutSnapshotPromotionEffectsTable,
  checkoutSnapshotsTable,
  checkoutsTable,
} from "../../platform/database/schema/checkout";
import {
  paymentAttemptsTable,
  paymentInitiationIdempotencyTable,
  paymentProviderObservationsTable,
  paymentProviderReferencesTable,
  paymentsTable,
} from "../../platform/database/schema/payment";
import type {
  Payment,
  PaymentAttempt,
  PaymentObservationSource,
  PaymentStatus,
  PaymentAttemptStatus,
} from "../../shared/payment";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import type { CheckoutRow } from "../checkout/repository";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type PaymentRow = typeof paymentsTable.$inferSelect;
export type PaymentAttemptRow = typeof paymentAttemptsTable.$inferSelect;
export type PaymentIdempotencyRow =
  typeof paymentInitiationIdempotencyTable.$inferSelect;
export type PaymentProviderReferenceRow =
  typeof paymentProviderReferencesTable.$inferSelect;
export type PaymentProviderObservationRow =
  typeof paymentProviderObservationsTable.$inferSelect;

export function newPaymentId(): string {
  return randomUUID();
}

export function newPaymentAttemptId(): string {
  return randomUUID();
}

export function newProviderExecutionIdentity(): string {
  return `payexec_${randomUUID()}`;
}

export function newIdempotencyRecordId(): string {
  return randomUUID();
}

export function newObservationId(): string {
  return randomUUID();
}

export function newProviderReferenceId(): string {
  return randomUUID();
}

export type PaymentObligation = Readonly<{
  expectedAmountPaise: bigint;
  currency: "INR";
}>;

export function mapPaymentRow(
  row: PaymentRow,
  obligation: PaymentObligation,
): Payment {
  return Object.freeze({
    id: row.id,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    expectedAmountPaise: obligation.expectedAmountPaise,
    currency: obligation.currency,
    status: row.status as PaymentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    succeededAt: row.succeededAt,
    cancelledAt: row.cancelledAt,
    expiredAt: row.expiredAt,
    supersededAt: row.supersededAt,
  });
}

export function obligationFromSnapshot(snapshot: {
  grandTotalPaise: bigint;
  currency: string;
}): PaymentObligation {
  if (snapshot.currency !== "INR") {
    throw new Error("Payment obligation requires INR Checkout snapshot currency.");
  }
  return Object.freeze({
    expectedAmountPaise: snapshot.grandTotalPaise,
    currency: "INR" as const,
  });
}

export function mapAttemptRow(row: PaymentAttemptRow): PaymentAttempt {
  return Object.freeze({
    id: row.id,
    paymentId: row.paymentId,
    attemptOrdinal: row.attemptOrdinal,
    provider: row.provider,
    methodIntent: row.methodIntent,
    providerExecutionIdentity: row.providerExecutionIdentity,
    status: row.status as PaymentAttemptStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pendingAt: row.pendingAt,
    indeterminateAt: row.indeterminateAt,
    succeededAt: row.succeededAt,
    failedAt: row.failedAt,
    cancelledAt: row.cancelledAt,
  });
}

export async function findPaymentById(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<PaymentRow | null> {
  assertApplicationRole(context, "findPaymentById");
  const rows = await context.db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPaymentBySnapshotId(
  context: PersistenceQueryContext,
  checkoutSnapshotId: string,
): Promise<PaymentRow | null> {
  assertApplicationRole(context, "findPaymentBySnapshotId");
  const rows = await context.db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.checkoutSnapshotId, checkoutSnapshotId))
    .limit(1);
  return rows[0] ?? null;
}

export async function lockPaymentForUpdate(
  context: PersistenceTransactionContext,
  paymentId: string,
): Promise<PaymentRow | null> {
  assertTransactionContext(context, "lockPaymentForUpdate");
  const rows = await context.db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, paymentId))
    .for("update");
  return rows[0] ?? null;
}

export async function findAttemptById(
  context: PersistenceQueryContext,
  attemptId: string,
): Promise<PaymentAttemptRow | null> {
  assertApplicationRole(context, "findAttemptById");
  const rows = await context.db
    .select()
    .from(paymentAttemptsTable)
    .where(eq(paymentAttemptsTable.id, attemptId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findAttemptByExecutionIdentity(
  context: PersistenceQueryContext,
  executionIdentity: string,
): Promise<PaymentAttemptRow | null> {
  assertApplicationRole(context, "findAttemptByExecutionIdentity");
  const rows = await context.db
    .select()
    .from(paymentAttemptsTable)
    .where(
      eq(paymentAttemptsTable.providerExecutionIdentity, executionIdentity),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listProviderReferencesForAttempt(
  context: PersistenceQueryContext,
  attemptId: string,
): Promise<readonly Readonly<{ kind: string; value: string }>[]> {
  assertApplicationRole(context, "listProviderReferencesForAttempt");
  const rows = await context.db
    .select({
      kind: paymentProviderReferencesTable.referenceKind,
      value: paymentProviderReferencesTable.referenceValue,
    })
    .from(paymentProviderReferencesTable)
    .where(eq(paymentProviderReferencesTable.attemptId, attemptId));
  return Object.freeze(
    rows.map((row) => Object.freeze({ kind: row.kind, value: row.value })),
  );
}

export async function findAttemptByProviderReference(
  context: PersistenceQueryContext,
  input: {
    provider: string;
    referenceKind: string;
    referenceValue: string;
  },
): Promise<PaymentAttemptRow | null> {
  assertApplicationRole(context, "findAttemptByProviderReference");
  const refs = await context.db
    .select()
    .from(paymentProviderReferencesTable)
    .where(
      and(
        eq(paymentProviderReferencesTable.provider, input.provider),
        eq(paymentProviderReferencesTable.referenceKind, input.referenceKind),
        eq(paymentProviderReferencesTable.referenceValue, input.referenceValue),
      ),
    )
    .limit(1);
  const ref = refs[0];
  if (!ref?.attemptId) return null;
  return findAttemptById(context, ref.attemptId);
}

export async function lockAttemptForUpdate(
  context: PersistenceTransactionContext,
  attemptId: string,
): Promise<PaymentAttemptRow | null> {
  assertTransactionContext(context, "lockAttemptForUpdate");
  const rows = await context.db
    .select()
    .from(paymentAttemptsTable)
    .where(eq(paymentAttemptsTable.id, attemptId))
    .for("update");
  return rows[0] ?? null;
}

export async function listAttemptsForPayment(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<PaymentAttemptRow[]> {
  assertApplicationRole(context, "listAttemptsForPayment");
  return context.db
    .select()
    .from(paymentAttemptsTable)
    .where(eq(paymentAttemptsTable.paymentId, paymentId))
    .orderBy(asc(paymentAttemptsTable.attemptOrdinal));
}

export async function findUnresolvedAttempt(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<PaymentAttemptRow | null> {
  assertApplicationRole(context, "findUnresolvedAttempt");
  const rows = await context.db
    .select()
    .from(paymentAttemptsTable)
    .where(
      and(
        eq(paymentAttemptsTable.paymentId, paymentId),
        inArray(paymentAttemptsTable.status, [
          "CREATED",
          "PENDING",
          "INDETERMINATE",
        ]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findLatestAttempt(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<PaymentAttemptRow | null> {
  assertApplicationRole(context, "findLatestAttempt");
  const rows = await context.db
    .select()
    .from(paymentAttemptsTable)
    .where(eq(paymentAttemptsTable.paymentId, paymentId))
    .orderBy(desc(paymentAttemptsTable.attemptOrdinal))
    .limit(1);
  return rows[0] ?? null;
}

export async function nextAttemptOrdinal(
  context: PersistenceTransactionContext,
  paymentId: string,
): Promise<bigint> {
  assertTransactionContext(context, "nextAttemptOrdinal");
  const latest = await findLatestAttempt(context, paymentId);
  return latest ? latest.attemptOrdinal + BigInt(1) : BigInt(1);
}

export async function insertPayment(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    checkoutId: string;
    checkoutSnapshotId: string;
    now: Date;
    status?: PaymentStatus;
  },
): Promise<PaymentRow> {
  assertTransactionContext(context, "insertPayment");
  const status = input.status ?? "OPEN";
  const rows = await context.db
    .insert(paymentsTable)
    .values({
      id: input.id,
      checkoutId: input.checkoutId,
      checkoutSnapshotId: input.checkoutSnapshotId,
      status,
      createdAt: input.now,
      updatedAt: input.now,
      succeededAt: null,
      cancelledAt: null,
      expiredAt: null,
      supersededAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function insertAttempt(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    paymentId: string;
    attemptOrdinal: bigint;
    provider: string;
    methodIntent: string;
    providerExecutionIdentity: string;
    now: Date;
    status?: PaymentAttemptStatus;
  },
): Promise<PaymentAttemptRow> {
  assertTransactionContext(context, "insertAttempt");
  const status = input.status ?? "CREATED";
  const rows = await context.db
    .insert(paymentAttemptsTable)
    .values({
      id: input.id,
      paymentId: input.paymentId,
      attemptOrdinal: input.attemptOrdinal,
      provider: input.provider,
      methodIntent: input.methodIntent,
      providerExecutionIdentity: input.providerExecutionIdentity,
      status,
      createdAt: input.now,
      updatedAt: input.now,
      pendingAt: null,
      indeterminateAt: null,
      succeededAt: null,
      failedAt: null,
      cancelledAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function updatePaymentRow(
  context: PersistenceTransactionContext,
  paymentId: string,
  patch: Partial<{
    status: PaymentStatus;
    updatedAt: Date;
    succeededAt: Date | null;
    cancelledAt: Date | null;
    expiredAt: Date | null;
    supersededAt: Date | null;
  }>,
): Promise<PaymentRow> {
  assertTransactionContext(context, "updatePaymentRow");
  const rows = await context.db
    .update(paymentsTable)
    .set(patch)
    .where(eq(paymentsTable.id, paymentId))
    .returning();
  return rows[0]!;
}

export async function updateAttemptRow(
  context: PersistenceTransactionContext,
  attemptId: string,
  patch: Partial<{
    status: PaymentAttemptStatus;
    updatedAt: Date;
    pendingAt: Date | null;
    indeterminateAt: Date | null;
    succeededAt: Date | null;
    failedAt: Date | null;
    cancelledAt: Date | null;
  }>,
): Promise<PaymentAttemptRow> {
  assertTransactionContext(context, "updateAttemptRow");
  const rows = await context.db
    .update(paymentAttemptsTable)
    .set(patch)
    .where(eq(paymentAttemptsTable.id, attemptId))
    .returning();
  return rows[0]!;
}

export async function insertProviderReferences(
  context: PersistenceTransactionContext,
  input: {
    paymentId: string;
    attemptId: string | null;
    provider: string;
    references: readonly Readonly<{ kind: string; value: string }>[];
    now: Date;
  },
): Promise<void> {
  assertTransactionContext(context, "insertProviderReferences");
  for (const ref of input.references) {
    await context.db
      .insert(paymentProviderReferencesTable)
      .values({
        id: newProviderReferenceId(),
        paymentId: input.paymentId,
        attemptId: input.attemptId,
        provider: input.provider,
        referenceKind: ref.kind,
        referenceValue: ref.value,
        createdAt: input.now,
      })
      .onConflictDoNothing({
        target: [
          paymentProviderReferencesTable.provider,
          paymentProviderReferencesTable.referenceKind,
          paymentProviderReferencesTable.referenceValue,
        ],
      });
  }
}

/**
 * Latest observation produced by provider query / reconciliation for an Attempt.
 * Used to bound secondary reconcile cadence on payment-state reads (D-362).
 */
export async function findLatestQueryObservationForAttempt(
  context: PersistenceQueryContext,
  attemptId: string,
): Promise<PaymentProviderObservationRow | null> {
  assertApplicationRole(context, "findLatestQueryObservationForAttempt");
  const rows = await context.db
    .select()
    .from(paymentProviderObservationsTable)
    .where(
      and(
        eq(paymentProviderObservationsTable.attemptId, attemptId),
        inArray(paymentProviderObservationsTable.observationSource, [
          "query",
          "reconciliation",
        ]),
      ),
    )
    .orderBy(desc(paymentProviderObservationsTable.observedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertObservation(
  context: PersistenceTransactionContext,
  input: {
    id?: string;
    attemptId: string;
    observationSource: PaymentObservationSource;
    provider: string;
    providerEventId: string | null;
    normalizedOutcome: string;
    observedAmountPaise: bigint | null;
    observedCurrency: string | null;
    providerStatusCode: string | null;
    providerTimestamp: Date | null;
    payloadDigest: string | null;
    reconciliationAnomaly: string | null;
    observedAt: Date;
  },
): Promise<PaymentProviderObservationRow> {
  assertTransactionContext(context, "insertObservation");
  const rows = await context.db
    .insert(paymentProviderObservationsTable)
    .values({
      id: input.id ?? newObservationId(),
      attemptId: input.attemptId,
      observationSource: input.observationSource,
      provider: input.provider,
      providerEventId: input.providerEventId,
      normalizedOutcome: input.normalizedOutcome,
      observedAmountPaise: input.observedAmountPaise,
      observedCurrency: input.observedCurrency,
      providerStatusCode: input.providerStatusCode,
      providerTimestamp: input.providerTimestamp,
      payloadDigest: input.payloadDigest,
      reconciliationAnomaly: input.reconciliationAnomaly,
      observedAt: input.observedAt,
    })
    .onConflictDoNothing()
    .returning();
  if (rows[0]) return rows[0];
  // Duplicate provider event — load existing
  if (input.providerEventId) {
    const existing = await context.db
      .select()
      .from(paymentProviderObservationsTable)
      .where(
        and(
          eq(paymentProviderObservationsTable.provider, input.provider),
          eq(
            paymentProviderObservationsTable.providerEventId,
            input.providerEventId,
          ),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
  }
  const fallback = await context.db
    .select()
    .from(paymentProviderObservationsTable)
    .where(eq(paymentProviderObservationsTable.attemptId, input.attemptId))
    .orderBy(desc(paymentProviderObservationsTable.observedAt))
    .limit(1);
  return fallback[0]!;
}

export async function findCheckoutAndSnapshotForPayment(
  context: PersistenceQueryContext,
  payment: PaymentRow,
): Promise<{
  checkout: CheckoutRow;
  snapshotId: string;
  grandTotalPaise: bigint;
  currency: "INR";
  obligation: PaymentObligation;
} | null> {
  assertApplicationRole(context, "findCheckoutAndSnapshotForPayment");
  const rows = await context.db
    .select({
      checkout: checkoutsTable,
      snapshotId: checkoutSnapshotsTable.id,
      snapshotCheckoutId: checkoutSnapshotsTable.checkoutId,
      grandTotalPaise: checkoutSnapshotsTable.grandTotalPaise,
      currency: checkoutSnapshotsTable.currency,
    })
    .from(checkoutSnapshotsTable)
    .innerJoin(
      checkoutsTable,
      eq(checkoutsTable.id, checkoutSnapshotsTable.checkoutId),
    )
    .where(eq(checkoutSnapshotsTable.id, payment.checkoutSnapshotId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (
    row.snapshotCheckoutId !== payment.checkoutId ||
    row.checkout.id !== payment.checkoutId
  ) {
    return null;
  }
  if (row.currency !== "INR") {
    return null;
  }
  const obligation = obligationFromSnapshot({
    grandTotalPaise: row.grandTotalPaise,
    currency: row.currency,
  });
  return {
    checkout: row.checkout,
    snapshotId: row.snapshotId,
    grandTotalPaise: row.grandTotalPaise,
    currency: "INR",
    obligation,
  };
}

export async function updateCheckoutStatus(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  patch: {
    status: string;
    activeSnapshotId: string | null;
    now: Date;
  },
): Promise<CheckoutRow> {
  assertTransactionContext(context, "updateCheckoutStatus");
  const rows = await context.db
    .update(checkoutsTable)
    .set({
      status: patch.status,
      activeSnapshotId: patch.activeSnapshotId,
      revision: checkout.revision + BigInt(1),
      updatedAt: patch.now,
    })
    .where(eq(checkoutsTable.id, checkout.id))
    .returning();
  return rows[0]!;
}

export async function loadAppliedPromotionEffects(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<
  ReadonlyArray<{
    promotionId: string;
    couponId: string | null;
  }>
> {
  assertApplicationRole(context, "loadAppliedPromotionEffects");
  const rows = await context.db
    .select({
      promotionId: checkoutSnapshotPromotionEffectsTable.promotionId,
      couponId: checkoutSnapshotPromotionEffectsTable.couponId,
    })
    .from(checkoutSnapshotPromotionEffectsTable)
    .where(
      and(
        eq(checkoutSnapshotPromotionEffectsTable.snapshotId, snapshotId),
        eq(
          checkoutSnapshotPromotionEffectsTable.effectKind,
          "applied_promotion",
        ),
      ),
    )
    .orderBy(asc(checkoutSnapshotPromotionEffectsTable.promotionId));

  const byPromotion = new Map<
    string,
    { promotionId: string; couponId: string | null }
  >();
  for (const row of rows) {
    const existing = byPromotion.get(row.promotionId);
    if (!existing) {
      byPromotion.set(row.promotionId, {
        promotionId: row.promotionId,
        couponId: row.couponId,
      });
      continue;
    }
    // Prefer a coupon id when present on any applied_promotion effect.
    if (existing.couponId === null && row.couponId !== null) {
      byPromotion.set(row.promotionId, {
        promotionId: row.promotionId,
        couponId: row.couponId,
      });
    }
  }
  return Object.freeze(
    [...byPromotion.values()].sort((a, b) =>
      a.promotionId < b.promotionId ? -1 : a.promotionId > b.promotionId ? 1 : 0,
    ),
  );
}

export async function findSnapshotRow(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<typeof checkoutSnapshotsTable.$inferSelect | null> {
  assertApplicationRole(context, "findSnapshotRow");
  const rows = await context.db
    .select()
    .from(checkoutSnapshotsTable)
    .where(eq(checkoutSnapshotsTable.id, snapshotId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findIdempotencyRecord(
  context: PersistenceQueryContext,
  input: {
    customerAuthUserId: string;
    operationKind: string;
    idempotencyKey: string;
  },
): Promise<PaymentIdempotencyRow | null> {
  assertApplicationRole(context, "findIdempotencyRecord");
  const rows = await context.db
    .select()
    .from(paymentInitiationIdempotencyTable)
    .where(
      and(
        eq(
          paymentInitiationIdempotencyTable.customerAuthUserId,
          input.customerAuthUserId,
        ),
        eq(
          paymentInitiationIdempotencyTable.operationKind,
          input.operationKind,
        ),
        eq(
          paymentInitiationIdempotencyTable.idempotencyKey,
          input.idempotencyKey,
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function lockIdempotencyRecord(
  context: PersistenceTransactionContext,
  input: {
    customerAuthUserId: string;
    operationKind: string;
    idempotencyKey: string;
  },
): Promise<PaymentIdempotencyRow | null> {
  assertTransactionContext(context, "lockIdempotencyRecord");
  const rows = await context.db
    .select()
    .from(paymentInitiationIdempotencyTable)
    .where(
      and(
        eq(
          paymentInitiationIdempotencyTable.customerAuthUserId,
          input.customerAuthUserId,
        ),
        eq(
          paymentInitiationIdempotencyTable.operationKind,
          input.operationKind,
        ),
        eq(
          paymentInitiationIdempotencyTable.idempotencyKey,
          input.idempotencyKey,
        ),
      ),
    )
    .for("update");
  return rows[0] ?? null;
}

export async function insertIdempotencyRecord(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    customerAuthUserId: string;
    operationKind: string;
    idempotencyKey: string;
    requestFingerprint: string;
    paymentId: string | null;
    paymentAttemptId: string | null;
    checkoutId: string | null;
    zeroPayableCheckoutId: string | null;
    now: Date;
    completedAt: Date | null;
  },
): Promise<PaymentIdempotencyRow> {
  assertTransactionContext(context, "insertIdempotencyRecord");
  const rows = await context.db
    .insert(paymentInitiationIdempotencyTable)
    .values({
      id: input.id,
      customerAuthUserId: input.customerAuthUserId,
      operationKind: input.operationKind,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      paymentId: input.paymentId,
      paymentAttemptId: input.paymentAttemptId,
      checkoutId: input.checkoutId,
      zeroPayableCheckoutId: input.zeroPayableCheckoutId,
      createdAt: input.now,
      completedAt: input.completedAt,
    })
    .returning();
  return rows[0]!;
}
