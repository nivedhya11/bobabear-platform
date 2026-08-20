/**
 * Upstream authority consistency for Financial Document issuance
 * (IMP-028 Slice 2 / D-365).
 *
 * Proves relationships from durable repository facts only.
 * Does not modify Checkout / Payment / Refund / Order.
 */
import { eq } from "drizzle-orm";

import { checkoutSnapshotsTable } from "../../platform/database/schema/checkout";
import { FinancialDocumentError } from "../../shared/financial-document";
import { findCheckoutRowById } from "../checkout/repository";
import { findOrderById } from "../order/repository";
import {
  findCheckoutAndSnapshotForPayment,
  findPaymentById,
} from "../payment/repository";
import type {
  PersistenceQueryContext,
} from "../persistence/types";
import { findRefundById } from "../refund/repository";
import { assertApplicationRole } from "./assert-role";

export type ResolvedUpstreamAuthorities = Readonly<{
  checkoutId: string | null;
  checkoutSnapshotId: string | null;
  paymentId: string | null;
  refundId: string | null;
  orderId: string | null;
}>;

async function loadSnapshotOwnership(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<{ id: string; checkoutId: string } | null> {
  assertApplicationRole(context, "loadSnapshotOwnership");
  const rows = await context.db
    .select({
      id: checkoutSnapshotsTable.id,
      checkoutId: checkoutSnapshotsTable.checkoutId,
    })
    .from(checkoutSnapshotsTable)
    .where(eq(checkoutSnapshotsTable.id, snapshotId))
    .limit(1);
  return rows[0] ?? null;
}

function rejectUnrelated(message: string): never {
  throw new FinancialDocumentError("UPSTREAM_REFERENCE_INVALID", message);
}

/**
 * Validate and normalize optional upstream identities into one commercial
 * transaction graph. Arbitrary combinations of valid UUIDs are rejected.
 */
export async function resolveUpstreamAuthoritiesForIssuance(
  context: PersistenceQueryContext,
  input: {
    checkoutId?: string | null;
    checkoutSnapshotId?: string | null;
    paymentId?: string | null;
    refundId?: string | null;
    orderId?: string | null;
    documentType: string;
  },
): Promise<ResolvedUpstreamAuthorities> {
  let checkoutId = input.checkoutId ?? null;
  let checkoutSnapshotId = input.checkoutSnapshotId ?? null;
  let paymentId = input.paymentId ?? null;
  const refundId = input.refundId ?? null;
  let orderId = input.orderId ?? null;

  if (
    (checkoutId == null) !== (checkoutSnapshotId == null)
  ) {
    rejectUnrelated(
      "checkoutId and checkoutSnapshotId must both be provided or both omitted.",
    );
  }

  if (checkoutSnapshotId && checkoutId) {
    const snapshot = await loadSnapshotOwnership(context, checkoutSnapshotId);
    if (!snapshot) {
      rejectUnrelated(`Checkout Snapshot not found: ${checkoutSnapshotId}`);
    }
    if (snapshot.checkoutId !== checkoutId) {
      rejectUnrelated(
        "Checkout Snapshot does not belong to the supplied Checkout.",
      );
    }
    const checkout = await findCheckoutRowById(context, checkoutId);
    if (!checkout) {
      rejectUnrelated(`Checkout not found: ${checkoutId}`);
    }
  }

  if (paymentId) {
    const payment = await findPaymentById(context, paymentId);
    if (!payment) {
      rejectUnrelated(`Payment not found: ${paymentId}`);
    }
    const linked = await findCheckoutAndSnapshotForPayment(context, payment);
    if (!linked) {
      rejectUnrelated(
        "Payment is not linked to a consistent Checkout / Checkout Snapshot.",
      );
    }
    if (checkoutId && payment.checkoutId !== checkoutId) {
      rejectUnrelated("Payment does not belong to the supplied Checkout.");
    }
    if (checkoutSnapshotId && payment.checkoutSnapshotId !== checkoutSnapshotId) {
      rejectUnrelated(
        "Payment does not belong to the supplied Checkout Snapshot.",
      );
    }
    checkoutId = payment.checkoutId;
    checkoutSnapshotId = payment.checkoutSnapshotId;
  }

  if (orderId) {
    const order = await findOrderById(context, orderId);
    if (!order) {
      rejectUnrelated(`Order not found: ${orderId}`);
    }
    if (checkoutId && order.checkoutId !== checkoutId) {
      rejectUnrelated("Order does not belong to the supplied Checkout.");
    }
    if (checkoutSnapshotId && order.checkoutSnapshotId !== checkoutSnapshotId) {
      rejectUnrelated(
        "Order does not belong to the supplied Checkout Snapshot.",
      );
    }
    if (paymentId && order.paymentId && order.paymentId !== paymentId) {
      rejectUnrelated("Order payment provenance does not match supplied Payment.");
    }
    if (paymentId && !order.paymentId) {
      rejectUnrelated(
        "Order has no Payment provenance but Payment was supplied for issuance.",
      );
    }
    checkoutId = order.checkoutId;
    checkoutSnapshotId = order.checkoutSnapshotId;
    if (order.paymentId) {
      paymentId = order.paymentId;
    }
  }

  if (refundId) {
    const refund = await findRefundById(context, refundId);
    if (!refund) {
      rejectUnrelated(`Refund not found: ${refundId}`);
    }
    if (paymentId && refund.paymentId !== paymentId) {
      rejectUnrelated("Refund does not belong to the supplied Payment.");
    }
    paymentId = refund.paymentId;
    const payment = await findPaymentById(context, refund.paymentId);
    if (!payment) {
      rejectUnrelated(
        `Refund Payment not found: ${refund.paymentId}`,
      );
    }
    const linked = await findCheckoutAndSnapshotForPayment(context, payment);
    if (!linked) {
      rejectUnrelated(
        "Refund Payment is not linked to a consistent Checkout / Checkout Snapshot.",
      );
    }
    if (checkoutId && payment.checkoutId !== checkoutId) {
      rejectUnrelated("Refund Payment does not belong to the supplied Checkout.");
    }
    if (
      checkoutSnapshotId &&
      payment.checkoutSnapshotId !== checkoutSnapshotId
    ) {
      rejectUnrelated(
        "Refund Payment does not belong to the supplied Checkout Snapshot.",
      );
    }
    if (refund.checkoutId && checkoutId && refund.checkoutId !== checkoutId) {
      rejectUnrelated("Refund denormalized Checkout does not match commercial authority.");
    }
    if (
      refund.checkoutSnapshotId &&
      checkoutSnapshotId &&
      refund.checkoutSnapshotId !== checkoutSnapshotId
    ) {
      rejectUnrelated(
        "Refund denormalized Checkout Snapshot does not match commercial authority.",
      );
    }
    if (refund.orderId && orderId && refund.orderId !== orderId) {
      rejectUnrelated("Refund denormalized Order does not match supplied Order.");
    }
    checkoutId = payment.checkoutId;
    checkoutSnapshotId = payment.checkoutSnapshotId;
    if (refund.orderId && !orderId) {
      orderId = refund.orderId;
    }
  }

  if (input.documentType === "REFUND_VOUCHER" && !refundId) {
    throw new FinancialDocumentError(
      "INVALID_ISSUANCE_INPUT",
      "REFUND_VOUCHER requires a Refund identity.",
    );
  }

  return Object.freeze({
    checkoutId,
    checkoutSnapshotId,
    paymentId,
    refundId,
    orderId,
  });
}
