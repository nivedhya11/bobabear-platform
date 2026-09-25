/**
 * Send-time eligibility for SCHEDULED_FULFILMENT_REMINDER (IMP-036I).
 *
 * Re-reads Order and the immutable Checkout Snapshot. Delivery completion is
 * consulted only for DELIVERY mode, and only as a read of Delivery.status.
 * Suppression does not mutate Order or Delivery.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { ordersTable } from "../../platform/database/schema/order";
import type { NotificationSuppressionReason } from "../../shared/notifications";
import { evaluateScheduledReminderSendFacts } from "../../shared/scheduled-fulfilment/reminder";
import { loadActiveSnapshot } from "../checkout/repository";
import { findDeliveredDeliveryForOrder } from "../delivery/repository";
import type { PersistenceQueryContext } from "../persistence/types";

export type ScheduledReminderSuppression = Readonly<{
  suppress: boolean;
  reason: Extract<NotificationSuppressionReason, "ORDER_NO_LONGER_REMINDER_ELIGIBLE"> | null;
}>;

const ELIGIBLE: ScheduledReminderSuppression = Object.freeze({
  suppress: false,
  reason: null,
});

const SUPPRESS: ScheduledReminderSuppression = Object.freeze({
  suppress: true,
  reason: "ORDER_NO_LONGER_REMINDER_ELIGIBLE",
});

export async function evaluateScheduledReminderSendEligibility(
  context: PersistenceQueryContext,
  input: Readonly<{ orderId: string | null; now: Date }>,
  deps: Readonly<{
    orderHasDeliveredDelivery?: (orderId: string) => Promise<boolean>;
  }> = {},
): Promise<ScheduledReminderSuppression> {
  if (!input.orderId) return SUPPRESS;
  const orderRows = await context.db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      checkoutSnapshotId: ordersTable.checkoutSnapshotId,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, input.orderId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return SUPPRESS;

  const snapshot = await loadActiveSnapshot(context, order.checkoutSnapshotId);
  const facts = evaluateScheduledReminderSendFacts({
    orderStatus: order.status,
    fulfilmentTiming: snapshot?.fulfilmentTiming ?? null,
    windowStartAt: snapshot?.scheduledWindowStartAt ?? null,
    windowEndAt: snapshot?.scheduledWindowEndAt ?? null,
    timeZone: snapshot?.scheduledTimezone ?? null,
    cutoffMinutes: snapshot?.scheduledCancellationCutoffMinutes ?? null,
    now: input.now,
  });
  if (facts === "SUPPRESS") return SUPPRESS;

  if (snapshot?.fulfilmentMode === "DELIVERY") {
    const delivered = deps.orderHasDeliveredDelivery
      ? await deps.orderHasDeliveredDelivery(order.id)
      : Boolean(await findDeliveredDeliveryForOrder(context, order.id));
    if (delivered) return SUPPRESS;
  }

  return ELIGIBLE;
}
