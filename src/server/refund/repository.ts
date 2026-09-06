/**
 * Refund persistence primitives (IMP-027 / D-364).
 *
 * Lock order: Payment FOR UPDATE, then Refund rows for that Payment.
 * Never hold these locks across provider I/O.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { checkoutSnapshotsTable } from "../../platform/database/schema/checkout";
import { ordersTable } from "../../platform/database/schema/order";
import {
  paymentProviderReferencesTable,
} from "../../platform/database/schema/payment";
import {
  refundProviderObservationsTable,
  refundProviderReferencesTable,
  refundsTable,
} from "../../platform/database/schema/refund";
import { RAZORPAY_PAYMENT_REFERENCE_KIND } from "../../shared/payment";
import {
  computeRefundBalance,
  type Refund,
  type RefundBalanceView,
  type RefundObservationOutcome,
  type RefundObservationSource,
  type RefundStatus,
} from "../../shared/refund";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import {
  lockPaymentForUpdate,
  type PaymentRow,
} from "../payment/repository";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type RefundRow = typeof refundsTable.$inferSelect;

export function newRefundId(): string {
  return randomUUID();
}

export function newRefundReferenceId(): string {
  return randomUUID();
}

export function newRefundObservationId(): string {
  return randomUUID();
}

export function mapRefundRow(row: RefundRow): Refund {
  return Object.freeze({
    id: row.id,
    paymentId: row.paymentId,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    orderId: row.orderId,
    amountPaise: row.amountPaise,
    currency: "INR",
    status: row.status as RefundStatus,
    provider: row.provider,
    providerIdempotencyKey: row.providerIdempotencyKey,
    providerRefundId: row.providerRefundId,
    providerPaymentId: row.providerPaymentId,
    providerStatusCode: row.providerStatusCode,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    acquirerReference: row.acquirerReference,
    reason: row.reason,
    operatorNote: row.operatorNote,
    initiatedByActorKind: "workforce",
    initiatedByActorId: row.initiatedByActorId,
    authorizedPermission: "payment.refund",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    acceptedAt: row.acceptedAt,
    pendingAt: row.pendingAt,
    indeterminateAt: row.indeterminateAt,
    processedAt: row.processedAt,
    failedAt: row.failedAt,
  });
}

export async function findRefundById(
  context: PersistenceQueryContext,
  refundId: string,
): Promise<RefundRow | null> {
  assertApplicationRole(context, "findRefundById");
  const rows = await context.db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.id, refundId))
    .limit(1);
  return rows[0] ?? null;
}

export async function lockPaymentAndRefunds(
  context: PersistenceTransactionContext,
  paymentId: string,
): Promise<{ payment: PaymentRow | null; refunds: readonly RefundRow[] }> {
  assertTransactionContext(context, "lockPaymentAndRefunds");
  const payment = await lockPaymentForUpdate(context, paymentId);
  if (!payment) return { payment: null, refunds: [] };
  const refunds = await context.db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.paymentId, paymentId))
    .orderBy(asc(refundsTable.createdAt))
    .for("update");
  return { payment, refunds };
}

export async function listRefundsForPayment(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<readonly RefundRow[]> {
  assertApplicationRole(context, "listRefundsForPayment");
  return context.db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.paymentId, paymentId))
    .orderBy(asc(refundsTable.createdAt));
}

export async function findRefundByProviderRefundId(
  context: PersistenceQueryContext,
  input: { provider: string; providerRefundId: string },
): Promise<RefundRow | null> {
  assertApplicationRole(context, "findRefundByProviderRefundId");
  const byColumn = await context.db
    .select()
    .from(refundsTable)
    .where(
      and(
        eq(refundsTable.provider, input.provider),
        eq(refundsTable.providerRefundId, input.providerRefundId),
      ),
    )
    .limit(1);
  if (byColumn[0]) return byColumn[0];
  const refs = await context.db
    .select()
    .from(refundProviderReferencesTable)
    .where(
      and(
        eq(refundProviderReferencesTable.provider, input.provider),
        eq(refundProviderReferencesTable.referenceKind, "razorpay_refund_id"),
        eq(refundProviderReferencesTable.referenceValue, input.providerRefundId),
      ),
    )
    .limit(1);
  const ref = refs[0];
  if (!ref) return null;
  return findRefundById(context, ref.refundId);
}

export async function findNonTerminalRefundsByProviderPaymentId(
  context: PersistenceQueryContext,
  input: { provider: string; providerPaymentId: string },
): Promise<readonly RefundRow[]> {
  assertApplicationRole(context, "findNonTerminalRefundsByProviderPaymentId");
  return context.db
    .select()
    .from(refundsTable)
    .where(
      and(
        eq(refundsTable.provider, input.provider),
        eq(refundsTable.providerPaymentId, input.providerPaymentId),
        inArray(refundsTable.status, ["ACCEPTED", "PENDING", "INDETERMINATE"]),
      ),
    )
    .orderBy(asc(refundsTable.createdAt));
}

export async function listNonTerminalRefunds(
  context: PersistenceQueryContext,
  limit: number,
): Promise<readonly RefundRow[]> {
  assertApplicationRole(context, "listNonTerminalRefunds");
  return context.db
    .select()
    .from(refundsTable)
    .where(inArray(refundsTable.status, ["ACCEPTED", "PENDING", "INDETERMINATE"]))
    .orderBy(asc(refundsTable.updatedAt))
    .limit(limit);
}

export function balanceFromRefundRows(
  capturedAmount: bigint,
  rows: readonly RefundRow[],
): RefundBalanceView {
  return computeRefundBalance(
    capturedAmount,
    rows.map((row) => ({ amountPaise: row.amountPaise, status: row.status as RefundStatus })),
  );
}

export async function findPaymentCapturedFacts(
  context: PersistenceQueryContext,
  payment: PaymentRow,
): Promise<{
  grandTotalPaise: bigint;
  currency: "INR";
  checkoutId: string;
  checkoutSnapshotId: string;
  outletId: string;
  orderId: string | null;
} | null> {
  assertApplicationRole(context, "findPaymentCapturedFacts");
  const snapshots = await context.db
    .select({
      id: checkoutSnapshotsTable.id,
      checkoutId: checkoutSnapshotsTable.checkoutId,
      grandTotalPaise: checkoutSnapshotsTable.grandTotalPaise,
      currency: checkoutSnapshotsTable.currency,
      selectedOutletId: checkoutSnapshotsTable.selectedOutletId,
    })
    .from(checkoutSnapshotsTable)
    .where(eq(checkoutSnapshotsTable.id, payment.checkoutSnapshotId))
    .limit(1);
  const snapshot = snapshots[0];
  if (!snapshot || snapshot.checkoutId !== payment.checkoutId) return null;
  if (snapshot.currency !== "INR") return null;
  const orders = await context.db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.paymentId, payment.id))
    .limit(1);
  return {
    grandTotalPaise: snapshot.grandTotalPaise,
    currency: "INR",
    checkoutId: snapshot.checkoutId,
    checkoutSnapshotId: snapshot.id,
    outletId: snapshot.selectedOutletId,
    orderId: orders[0]?.id ?? null,
  };
}

export async function findProviderPaymentId(
  context: PersistenceQueryContext,
  paymentId: string,
  provider: string,
): Promise<string | null> {
  assertApplicationRole(context, "findProviderPaymentId");
  const rows = await context.db
    .select({
      value: paymentProviderReferencesTable.referenceValue,
    })
    .from(paymentProviderReferencesTable)
    .where(
      and(
        eq(paymentProviderReferencesTable.paymentId, paymentId),
        eq(paymentProviderReferencesTable.provider, provider),
        eq(paymentProviderReferencesTable.referenceKind, RAZORPAY_PAYMENT_REFERENCE_KIND),
      ),
    )
    .limit(1);
  return rows[0]?.value ?? null;
}

/**
 * Derive the authoritative captured provider Payment reference without composing
 * a PaymentProvider. Fail closed when missing or ambiguous.
 */
export async function findAuthoritativeProviderPaymentReference(
  context: PersistenceQueryContext,
  paymentId: string,
): Promise<{ provider: string; providerPaymentId: string } | null> {
  assertApplicationRole(context, "findAuthoritativeProviderPaymentReference");
  const rows = await context.db
    .select({
      provider: paymentProviderReferencesTable.provider,
      value: paymentProviderReferencesTable.referenceValue,
    })
    .from(paymentProviderReferencesTable)
    .where(
      and(
        eq(paymentProviderReferencesTable.paymentId, paymentId),
        eq(paymentProviderReferencesTable.referenceKind, RAZORPAY_PAYMENT_REFERENCE_KIND),
      ),
    );
  if (rows.length === 0) return null;
  const first = rows[0]!;
  for (const row of rows) {
    if (row.provider !== first.provider || row.value !== first.value) {
      return null;
    }
  }
  if (!first.provider || !first.value) return null;
  return { provider: first.provider, providerPaymentId: first.value };
}

export async function listRefundsForOrder(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<readonly RefundRow[]> {
  assertApplicationRole(context, "listRefundsForOrder");
  return context.db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.orderId, orderId))
    .orderBy(asc(refundsTable.createdAt));
}

export async function insertRefund(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    paymentId: string;
    checkoutId: string | null;
    checkoutSnapshotId: string | null;
    orderId: string | null;
    amountPaise: bigint;
    currency: "INR";
    provider: string;
    providerIdempotencyKey: string;
    providerPaymentId: string | null;
    reason: string;
    operatorNote: string | null;
    initiatedByActorId: string;
    now: Date;
  },
): Promise<RefundRow> {
  assertTransactionContext(context, "insertRefund");
  const rows = await context.db
    .insert(refundsTable)
    .values({
      id: input.id,
      paymentId: input.paymentId,
      checkoutId: input.checkoutId,
      checkoutSnapshotId: input.checkoutSnapshotId,
      orderId: input.orderId,
      amountPaise: input.amountPaise,
      currency: input.currency,
      status: "ACCEPTED",
      provider: input.provider,
      providerIdempotencyKey: input.providerIdempotencyKey,
      providerRefundId: null,
      providerPaymentId: input.providerPaymentId,
      providerStatusCode: null,
      failureCode: null,
      failureReason: null,
      acquirerReference: null,
      reason: input.reason,
      operatorNote: input.operatorNote,
      initiatedByActorKind: "workforce",
      initiatedByActorId: input.initiatedByActorId,
      authorizedPermission: "payment.refund",
      createdAt: input.now,
      updatedAt: input.now,
      acceptedAt: input.now,
      pendingAt: null,
      indeterminateAt: null,
      processedAt: null,
      failedAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function updateRefundRow(
  context: PersistenceTransactionContext,
  refundId: string,
  patch: Partial<
    Pick<
      RefundRow,
      | "status"
      | "updatedAt"
      | "pendingAt"
      | "indeterminateAt"
      | "processedAt"
      | "failedAt"
      | "providerRefundId"
      | "providerPaymentId"
      | "providerStatusCode"
      | "failureCode"
      | "failureReason"
      | "acquirerReference"
    >
  >,
): Promise<RefundRow> {
  assertTransactionContext(context, "updateRefundRow");
  const rows = await context.db
    .update(refundsTable)
    .set(patch)
    .where(eq(refundsTable.id, refundId))
    .returning();
  if (!rows[0]) {
    throw new Error("Refund row disappeared during update.");
  }
  return rows[0];
}

export async function insertRefundProviderReferences(
  context: PersistenceTransactionContext,
  input: {
    refundId: string;
    provider: string;
    references: readonly Readonly<{ kind: string; value: string }>[];
    now: Date;
  },
): Promise<void> {
  assertTransactionContext(context, "insertRefundProviderReferences");
  for (const ref of input.references) {
    await context.db
      .insert(refundProviderReferencesTable)
      .values({
        id: newRefundReferenceId(),
        refundId: input.refundId,
        provider: input.provider,
        referenceKind: ref.kind,
        referenceValue: ref.value,
        createdAt: input.now,
      })
      .onConflictDoNothing({
        target: [
          refundProviderReferencesTable.provider,
          refundProviderReferencesTable.referenceKind,
          refundProviderReferencesTable.referenceValue,
        ],
      });
  }
}

export async function insertRefundObservation(
  context: PersistenceTransactionContext,
  input: {
    refundId: string;
    observationSource: RefundObservationSource;
    provider: string;
    providerEventId: string | null;
    normalizedOutcome: RefundObservationOutcome;
    observedAmountPaise: bigint | null;
    observedCurrency: string | null;
    providerStatusCode: string | null;
    payloadDigest: string | null;
    reconciliationAnomaly: string | null;
    observedAt: Date;
  },
): Promise<void> {
  assertTransactionContext(context, "insertRefundObservation");
  await context.db
    .insert(refundProviderObservationsTable)
    .values({
      id: newRefundObservationId(),
      refundId: input.refundId,
      observationSource: input.observationSource,
      provider: input.provider,
      providerEventId: input.providerEventId,
      normalizedOutcome: input.normalizedOutcome,
      observedAmountPaise: input.observedAmountPaise,
      observedCurrency: input.observedCurrency,
      providerStatusCode: input.providerStatusCode,
      payloadDigest: input.payloadDigest,
      reconciliationAnomaly: input.reconciliationAnomaly,
      observedAt: input.observedAt,
    })
    .onConflictDoNothing();
}
