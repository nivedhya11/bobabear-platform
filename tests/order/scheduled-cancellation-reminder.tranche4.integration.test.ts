/**
 * IMP-036I Tranche 4 — purchased cancellation cutoff and scheduled reminder.
 */
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { deliveriesTable } from "../../src/platform/database/schema/delivery";
import { notificationRequestsTable } from "../../src/platform/database/schema/notifications";
import { ordersTable } from "../../src/platform/database/schema/order";
import { outboxEventsTable } from "../../src/platform/database/schema/outbox-events";
import { paymentsTable } from "../../src/platform/database/schema/payment";
import { refundsTable } from "../../src/platform/database/schema/refund";
import { refundStatutoryDecisionsTable } from "../../src/platform/database/schema/refund-statutory-decision";
import { addCartLine } from "../../src/server/cart";
import {
  evaluateCheckout,
  listCheckoutScheduledWindows,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import {
  beginBooking,
  confirmPickup,
  createDelivery,
  createFakeDeliveryProvider,
  recordProofAndDeliver,
} from "../../src/server/delivery";
import {
  createNotificationRequestFromDomainEvent,
  processPendingNotification,
} from "../../src/server/notifications";
import { enqueueScheduledFulfilmentReminder } from "../../src/server/notifications/enqueue";
import { NotificationOutboxProcessor } from "../../src/server/notifications/processor";
import { evaluateScheduledReminderSendEligibility } from "../../src/server/notifications/reminder-gate";
import type { NotificationOutboxPayload } from "../../src/server/notifications/outbox-events";
import {
  cancelCustomerScheduledOrder,
  cancelOrder,
  materializeOrderForCompletedCheckout,
} from "../../src/server/order";
import { completeZeroPayableCheckout, startPayment } from "../../src/server/payment";
import { requestRefund } from "../../src/server/refund";
import { refundProviderIdempotencyKey } from "../../src/shared/refund";
import {
  saveOutletSchedulingProfile,
  updateBrandScheduledFulfilmentPolicy,
} from "../../src/server/scheduled-fulfilment/foundations";
import { scheduledReminderDueAt } from "../../src/shared/scheduled-fulfilment/reminder";
import {
  mintCustomerSessionCookieHeader,
  withCustomerCommerceHttpService,
} from "../customer-commerce/support/service-harness";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { checkoutOpts, withCheckoutReadyHarness } from "../database/support/checkout-fixtures";
import { ensureProviderPaymentReference } from "../database/support/refund-fixtures";
import {
  applyCouponToCustomerCart,
  createFakePaymentProvider,
  newIdempotencyKey,
  ORDER_POLICY,
  paymentOpts,
  seedFullDiscountCoupon,
  seedPickupEligibleOutlet,
  verifyAndProcessWebhook,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const LIVE = { now: () => new Date() };

type Harness = Parameters<Parameters<typeof withCheckoutReadyHarness>[0]>[0];

async function reminderRows(persistence: Harness["persistence"], orderId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({
        id: outboxEventsTable.id,
        availableAt: outboxEventsTable.availableAt,
        payload: outboxEventsTable.payload,
      })
      .from(outboxEventsTable)
      .where(eq(outboxEventsTable.eventType, "notification.domain.scheduled_fulfilment_reminder")),
  );
  return rows.filter((row) => {
    const payload = row.payload as { orderId?: string };
    return payload.orderId === orderId;
  });
}

async function orderRow(persistence: Harness["persistence"], checkoutId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db.select().from(ordersTable).where(eq(ordersTable.checkoutId, checkoutId)),
  );
  const order = rows[0];
  if (!order) throw new Error("Order was not materialized.");
  return order;
}

async function chooseWindow(
  h: Harness,
  checkoutId: string,
  predicate: (start: Date, now: Date) => boolean,
) {
  const listed = await listCheckoutScheduledWindows(
    h.persistence,
    h.actors.customerA,
    { checkoutId },
    checkoutOpts(LIVE),
  );
  if (!("windows" in listed)) throw new Error("Scheduled windows were not listed.");
  const now = new Date();
  const match = listed.windows.find((window) => predicate(window.startAt, now));
  if (!match) throw new Error("No scheduled window matched the required boundary.");
  return match;
}

async function discountCart(h: Harness) {
  const coupon = await seedFullDiscountCoupon(
    h.persistence,
    h.actors.tree.brand.id,
    h.actors.brandAdminActor,
  );
  return applyCouponToCustomerCart(
    h.persistence,
    h.actors.customerA,
    h.actors.tree.brand.id,
    h.cartRevision,
    coupon.canonicalCode,
  );
}

async function scheduleCheckout(
  h: Harness,
  mode: "DELIVERY" | "PICKUP",
  predicate: (start: Date, now: Date) => boolean,
  cartId = h.cartId,
) {
  const opts = checkoutOpts(LIVE);
  const started = await startCheckout(h.persistence, h.actors.customerA, { cartId }, opts);
  let current = started;
  if (mode === "DELIVERY") {
    current = await setCheckoutDestination(
      h.persistence,
      h.actors.customerA,
      {
        checkoutId: started.id,
        expectedCheckoutRevision: started.revision,
        destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
      },
      opts,
    );
  } else {
    await seedPickupEligibleOutlet(
      h.persistence,
      h.actors.brandAdminActor,
      h.actors.tree.outletA.id,
    );
    current = await setCheckoutFulfilment(
      h.persistence,
      h.actors.customerA,
      {
        checkoutId: started.id,
        expectedCheckoutRevision: started.revision,
        fulfilmentMode: "PICKUP",
        pickupOutletId: h.actors.tree.outletA.id,
      },
      opts,
    );
  }
  const window = await chooseWindow(h, current.id, predicate);
  const timed = await setCheckoutFulfilmentTiming(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: current.id,
      expectedCheckoutRevision: current.revision,
      fulfilmentTiming: "SCHEDULED",
      scheduledWindowStartAt: window.startAt,
      scheduledWindowEndAt: window.endAt,
    },
    opts,
  );
  const ready = await evaluateCheckout(
    h.persistence,
    h.actors.customerA,
    { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
    opts,
  );
  return { ready, window };
}

async function purchaseZero(h: Harness, checkoutId: string, revision: bigint) {
  const completed = await completeZeroPayableCheckout(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId,
      expectedCheckoutRevision: revision,
      idempotencyKey: newIdempotencyKey("tranche4-zero"),
    },
    paymentOpts(createFakePaymentProvider({ defaultOutcome: "succeed" }), LIVE),
  );
  expect(completed.kind).toBe("zero_payable_completed");
}

async function purchasePositive(h: Harness, checkoutId: string, revision: bigint) {
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const opts = paymentOpts(provider, LIVE);
  const started = await startPayment(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId,
      expectedCheckoutRevision: revision,
      paymentMethodIntent: "upi",
      idempotencyKey: newIdempotencyKey("tranche4-pos"),
    },
    opts,
  );
  await verifyAndProcessWebhook(
    h.persistence,
    provider,
    {
      executionIdentity: started.attempt.providerExecutionIdentity,
      outcome: "succeed",
      amountPaise: started.payment.expectedAmountPaise,
    },
    opts,
  );
  return {
    provider,
    paymentId: started.payment.id,
    amountPaise: started.payment.expectedAmountPaise,
  };
}

async function purchasedCommercialTruth(persistence: Harness["persistence"], snapshotId: string) {
  const rows = await persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select fulfilment_mode,
             fulfilment_timing,
             scheduled_window_start_at,
             scheduled_window_end_at,
             scheduled_timezone,
             scheduled_cancellation_cutoff_minutes,
             selected_outlet_id,
             base_paise::text as base_paise,
             modifier_adjustments_paise::text as modifier_adjustments_paise,
             bundle_adjustments_paise::text as bundle_adjustments_paise,
             charges_paise::text as charges_paise,
             promotion_discount_paise::text as promotion_discount_paise,
             taxable_paise::text as taxable_paise,
             tax_paise::text as tax_paise,
             grand_total_paise::text as grand_total_paise
      from app.checkout_snapshots
      where id = ${snapshotId}::uuid
    `);
    return result.rows;
  });
  return rows[0];
}

async function cancelledNotifications(persistence: Harness["persistence"], orderId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({ payload: outboxEventsTable.payload })
      .from(outboxEventsTable)
      .where(eq(outboxEventsTable.eventType, "notification.domain.order_cancelled")),
  );
  return rows.filter((row) => {
    const payload = row.payload as { orderId?: string; semanticType?: string };
    return payload.orderId === orderId && payload.semanticType === "ORDER_CANCELLED";
  });
}

const FAR_WINDOW = (start: Date, now: Date) =>
  start.getTime() - now.getTime() > 2 * 60 * 60 * 1000;

async function waitForInsideReminderSlot(): Promise<void> {
  const step = 30 * 60 * 1000;
  const now = Date.now();
  const next = Math.ceil(now / step) * step;
  const delta = next === now ? step : next - now;
  if (delta < 90_000) {
    await new Promise((resolve) => setTimeout(resolve, delta + 1_000));
  }
}

describe("IMP-036I tranche 4 scheduled cancellation and reminder", () => {
  it("cancels a zero-payable scheduled pickup before the purchased cutoff", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const cart = await discountCart(h);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "PICKUP", FAR_WINDOW, cart.id);
      expect(ready.snapshot.grandTotalPaise).toBe(BigInt(0));
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(30);
      await purchaseZero(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const before = new Date(window.startAt.getTime() - 30 * 60 * 1000 - 1000);
      const cancelled = await cancelCustomerScheduledOrder(
        h.persistence,
        h.actors.customerA,
        { orderId: order.id, expectedOrderRevision: order.revision },
        { clock: { now: () => before } },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");
      const refunds = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: refundsTable.id }).from(refundsTable).where(eq(refundsTable.orderId, order.id)),
      );
      expect(refunds).toEqual([]);
      const totals = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select grand_total_paise::text as total
          from app.checkout_snapshots where id = ${order.checkoutSnapshotId}::uuid
        `);
        return rows.rows[0] as { total: string };
      });
      expect(totals.total).toBe("0");

      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerB,
          { orderId: order.id, expectedOrderRevision: order.revision },
          { clock: { now: () => before } },
        ),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
      await expect(
        cancelCustomerScheduledOrder(h.persistence, h.actors.customerA, {
          orderId: "00000000-0000-4000-8000-000000000099",
          expectedOrderRevision: BigInt(1),
        }),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    });
  });

  it("denies self-service exactly at and after the sealed delivery cutoff after Brand policy changes", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 15,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(
        h,
        "DELIVERY",
        (start, now) => start.getTime() - now.getTime() > 80 * 60 * 1000,
      );
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(60);
      expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
      await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 0,
        deliveryCancellationCutoffMinutes: 0,
        now: new Date(),
      });
      const sealedDeadline = new Date(window.startAt.getTime() - 60 * 60 * 1000);
      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerA,
          { orderId: order.id, expectedOrderRevision: order.revision },
          { clock: { now: () => sealedDeadline } },
        ),
      ).rejects.toMatchObject({
        code: "ORDER_CANCEL_CUTOFF_CLOSED",
        resolutionOptions: ["CONTACT_OUTLET_OR_SUPPORT"],
      });
      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerA,
          { orderId: order.id, expectedOrderRevision: order.revision },
          { clock: { now: () => new Date(sealedDeadline.getTime() + 1000) } },
        ),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_CUTOFF_CLOSED" });
      const stillOpen = await h.persistence.withContext((ctx) =>
        ctx.db.select({ status: ordersTable.status }).from(ordersTable).where(eq(ordersTable.id, order.id)),
      );
      expect(stillOpen[0]?.status).toBe("PLACED");
    });
  });

  it("allows a zero sealed pickup cutoff only before the window start", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const cart = await discountCart(h);
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 0,
        deliveryCancellationCutoffMinutes: 240,
        now: new Date(),
      });
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "PICKUP", FAR_WINDOW, cart.id);
      expect(ready.snapshot.scheduledCancellationCutoffMinutes).toBe(0);
      await purchaseZero(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(1),
        pickupCancellationCutoffMinutes: 120,
        deliveryCancellationCutoffMinutes: 240,
        now: new Date(),
      });
      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerA,
          { orderId: order.id, expectedOrderRevision: order.revision },
          { clock: { now: () => window.startAt } },
        ),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_CUTOFF_CLOSED" });
      const allowed = await cancelCustomerScheduledOrder(
        h.persistence,
        h.actors.customerA,
        { orderId: order.id, expectedOrderRevision: order.revision },
        { clock: { now: () => new Date(window.startAt.getTime() - 1) } },
      );
      expect(allowed.status).toBe("CANCELLED");
    });
  });

  it("denies customer cancellation of an ASAP order and still allows workforce cancellation after cutoff", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const opts = checkoutOpts(LIVE);
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: h.cartId },
        opts,
      );
      const destination = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: destination.id, expectedCheckoutRevision: destination.revision },
        opts,
      );
      expect(ready.checkout.fulfilmentTiming).toBe("ASAP");
      await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      expect(await reminderRows(h.persistence, order.id)).toHaveLength(0);
      await expect(
        cancelCustomerScheduledOrder(h.persistence, h.actors.customerA, {
          orderId: order.id,
          expectedOrderRevision: order.revision,
        }),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_CUTOFF_CLOSED" });
      await expect(
        cancelOrder(h.persistence, h.actors.brandAdminActor, {
          orderId: order.id,
          expectedOrderRevision: order.revision,
          cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
        }),
      ).resolves.toMatchObject({ status: "CANCELLED" });
    });
  });

  it("enqueues exactly one future reminder and skips a purchase inside the reminder window", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const future = await scheduleCheckout(h, "PICKUP", FAR_WINDOW);
      await purchasePositive(h, future.ready.checkout.id, future.ready.checkout.revision);
      const order = await orderRow(h.persistence, future.ready.checkout.id);
      const reminders = await reminderRows(h.persistence, order.id);
      expect(reminders).toHaveLength(1);
      const payload = reminders[0]!.payload as NotificationOutboxPayload;
      expect(payload.domainEventRef).toBe(`order:${order.id}:scheduled_fulfilment_reminder`);
      expect(payload.semanticType).toBe("SCHEDULED_FULFILMENT_REMINDER");
      expect(reminders[0]!.availableAt.toISOString()).toBe(
        scheduledReminderDueAt(future.window.startAt).toISOString(),
      );
      await materializeOrderForCompletedCheckout(h.persistence, future.ready.checkout.id, {
        policy: ORDER_POLICY,
      });
      expect(await reminderRows(h.persistence, order.id)).toHaveLength(1);

      await expect(
        h.persistence.transaction(async (tx) => {
          await enqueueScheduledFulfilmentReminder(tx, {
            customerId: h.actors.customerAId,
            orderId: order.id,
            occurredAt: new Date(future.window.startAt.getTime() - 3 * 60 * 60 * 1000),
            snapshot: future.ready.snapshot,
          });
          throw new Error("rollback reminder");
        }),
      ).rejects.toThrow("rollback reminder");
      expect(await reminderRows(h.persistence, order.id)).toHaveLength(1);

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.orders
          set status = 'FULFILLED',
              accepted_at = now(),
              accepted_by_workforce_user_id = ${h.actors.brandAdmin.id},
              fulfilled_at = now(),
              fulfilled_by_workforce_user_id = ${h.actors.brandAdmin.id},
              revision = revision + 1,
              updated_at = now()
          where id = ${order.id}::uuid
        `);
      });
      const fulfilled = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(ctx, {
          orderId: order.id,
          now: new Date(future.window.startAt.getTime() - 20 * 60 * 1000),
        }),
      );
      expect(fulfilled.suppress).toBe(true);
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.orders
          set status = 'PLACED',
              accepted_at = null,
              accepted_by_workforce_user_id = null,
              fulfilled_at = null,
              fulfilled_by_workforce_user_id = null,
              revision = revision + 1,
              updated_at = now()
          where id = ${order.id}::uuid
        `);
        await ctx.db.execute(sql`
          update app.checkout_snapshots
          set scheduled_window_start_at = ${new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()}::timestamptz,
              scheduled_window_end_at = ${new Date(Date.now() + 36 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()}::timestamptz
          where id = ${order.checkoutSnapshotId}::uuid
        `);
        await ctx.db.execute(sql`
          update app.outbox_events
          set available_at = now()
          where id = ${reminders[0]!.id}::uuid
        `);
      });
      await new NotificationOutboxProcessor({ persistence: h.persistence }).tick();
      await new NotificationOutboxProcessor({ persistence: h.persistence }).tick();
      const requests = await h.persistence.withContext((ctx) =>
        ctx.db
          .select()
          .from(notificationRequestsTable)
          .where(eq(notificationRequestsTable.orderId, order.id)),
      );
      const reminderRequests = requests.filter(
        (row) => row.semanticType === "SCHEDULED_FULFILMENT_REMINDER",
      );
      expect(reminderRequests).toHaveLength(1);
      expect(reminderRequests[0]!.expiresAt.getTime() - Date.now()).toBeGreaterThan(
        24 * 60 * 60 * 1000,
      );
      const pickupGate = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(
          ctx,
          { orderId: order.id, now: new Date() },
          {
            orderHasDeliveredDelivery: async () => {
              throw new Error("pickup reminder queried delivery");
            },
          },
        ),
      );
      expect(pickupGate.suppress).toBe(false);
      const deliveries = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: deliveriesTable.id }).from(deliveriesTable).where(eq(deliveriesTable.orderId, order.id)),
      );
      expect(deliveries).toEqual([]);
    });
  });

  it("does not enqueue a reminder when the purchase is inside the reminder window", async () => {
    await waitForInsideReminderSlot();
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 1,
        deliveryMinLeadMinutes: 1,
        now: new Date(),
      });
      const inside = await scheduleCheckout(
        h,
        "DELIVERY",
        (start, now) => {
          const lead = start.getTime() - now.getTime();
          return lead >= 60_000 && lead < 30 * 60 * 1000;
        },
      );
      await purchasePositive(h, inside.ready.checkout.id, inside.ready.checkout.revision);
      const order = await orderRow(h.persistence, inside.ready.checkout.id);
      expect(await reminderRows(h.persistence, order.id)).toHaveLength(0);
      const deliveries = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: deliveriesTable.id }).from(deliveriesTable).where(eq(deliveriesTable.orderId, order.id)),
      );
      expect(deliveries).toEqual([]);
    });
  });

  it("suppresses a delivery reminder when the exact order is delivered or the window has started", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "DELIVERY", FAR_WINDOW);
      await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const reminders = await reminderRows(h.persistence, order.id);
      expect(reminders).toHaveLength(1);
      const payload = reminders[0]!.payload as NotificationOutboxPayload;
      const beforeWindow = new Date(window.startAt.getTime() - 20 * 60 * 1000);
      const request = await createNotificationRequestFromDomainEvent(
        h.persistence,
        payload,
        { clock: { now: () => beforeWindow } },
      );
      expect(request?.expiresAt.toISOString()).toBe(window.startAt.toISOString());
      const sent = await processPendingNotification(h.persistence, request!.id, {
        clock: { now: () => beforeWindow },
      });
      expect(sent.status).not.toBe("SUPPRESSED");

      const open = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(ctx, { orderId: order.id, now: beforeWindow }),
      );
      expect(open.suppress).toBe(false);

      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      const created = await createDelivery(h.persistence, {
        orderId: order.id,
        requestFingerprint: "fp-tranche4-reminder",
      });
      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: created.id,
          expectedRevision: created.revision,
          provider: provider.name,
        },
        { provider },
      );
      const picked = await confirmPickup(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        handoffReference: "handoff-tranche4",
      });
      await recordProofAndDeliver(h.persistence, {
        deliveryId: picked.id,
        expectedRevision: picked.revision,
        proofReference: "proof-tranche4",
      });
      const deliveredGate = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(ctx, { orderId: order.id, now: beforeWindow }),
      );
      expect(deliveredGate).toMatchObject({
        suppress: true,
        reason: "ORDER_NO_LONGER_REMINDER_ELIGIBLE",
      });
      const windowGate = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(ctx, { orderId: order.id, now: window.startAt }),
      );
      expect(windowGate.suppress).toBe(true);

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.orders
          set status = 'CANCELLED',
              cancelled_at = now(),
              cancelled_by_customer_auth_user_id = ${h.actors.customerAId},
              cancellation_reason_code = 'CUSTOMER_REQUESTED',
              revision = revision + 1,
              updated_at = now()
          where id = ${order.id}::uuid
        `);
      });
      const cancelledGate = await h.persistence.withContext((ctx) =>
        evaluateScheduledReminderSendEligibility(ctx, { orderId: order.id, now: beforeWindow }),
      );
      expect(cancelledGate.suppress).toBe(true);
    });
  });

  it("keeps owner and foreign cancellation responses distinct and has no reschedule route", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "PICKUP", FAR_WINDOW);
      await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const cookie = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerAId,
      );
      const foreign = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerBId,
      );
      await withCustomerCommerceHttpService(h.database.connectionString, async ({ baseUrl }) => {
        const path = `${baseUrl}/api/v1/orders/${order.id}/cancel`;
        const missingAuth = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(missingAuth.status).toBe(401);
        const foreignResponse = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: foreign },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(foreignResponse.status).toBe(404);
        expect((await foreignResponse.json()).code).toBe("ORDER_NOT_FOUND");
        const missing = await fetch(
          `${baseUrl}/api/v1/orders/00000000-0000-4000-8000-000000000099/cancel`,
          {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ expectedOrderRevision: "1" }),
          },
        );
        expect(missing.status).toBe(404);
        expect((await missing.json()).code).toBe("ORDER_NOT_FOUND");
        const reschedule = await fetch(`${baseUrl}/api/v1/orders/${order.id}/reschedule`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(reschedule.status).toBe(404);
      });
      const afterCutoff = await cancelOrder(h.persistence, h.actors.brandAdminActor, {
        orderId: order.id,
        expectedOrderRevision: order.revision,
        cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
      }, { clock: { now: () => new Date(window.startAt.getTime() + 60 * 60 * 1000) } });
      expect(afterCutoff.status).toBe("CANCELLED");
    });
  });

  it("cancels a positive-paid scheduled delivery before the purchased cutoff", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "DELIVERY", FAR_WINDOW);
      expect(ready.snapshot.fulfilmentMode).toBe("DELIVERY");
      expect(ready.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
      const purchased = await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      expect(order.checkoutSnapshotId).toBe(ready.snapshot.id);
      expect(purchased.amountPaise).toBe(ready.snapshot.grandTotalPaise);
      const payment = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ status: paymentsTable.status })
          .from(paymentsTable)
          .where(eq(paymentsTable.id, purchased.paymentId)),
      );
      expect(payment[0]?.status).toBe("SUCCEEDED");
      const before = await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId);
      const cutoffAt = new Date(
        window.startAt.getTime() - ready.snapshot.scheduledCancellationCutoffMinutes! * 60_000,
      );
      const now = new Date(cutoffAt.getTime() - 1000);
      expect(now.getTime()).toBeLessThan(cutoffAt.getTime());
      const cancelled = await cancelCustomerScheduledOrder(
        h.persistence,
        h.actors.customerA,
        { orderId: order.id, expectedOrderRevision: order.revision },
        { clock: { now: () => now } },
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");
      expect(cancelled.revision).toBe((order.revision + BigInt(1)).toString());
      const persisted = await h.persistence.withContext((ctx) =>
        ctx.db.select().from(ordersTable).where(eq(ordersTable.id, order.id)),
      );
      expect(persisted[0]).toMatchObject({
        status: "CANCELLED",
        cancellationReasonCode: "CUSTOMER_REQUESTED",
        cancelledByCustomerAuthUserId: h.actors.customerAId,
        cancelledByWorkforceUserId: null,
        revision: order.revision + BigInt(1),
        checkoutSnapshotId: ready.snapshot.id,
      });
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
      const refunds = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: refundsTable.id }).from(refundsTable).where(eq(refundsTable.orderId, order.id)),
      );
      expect(refunds).toEqual([]);
      const notices = await cancelledNotifications(h.persistence, order.id);
      expect(notices).toHaveLength(1);
      expect((notices[0]!.payload as { domainEventRef: string }).domainEventRef).toBe(
        `order:${order.id}:cancelled:${cancelled.revision}`,
      );
    });
  });

  it("cancels a positive-paid scheduled delivery for the authenticated owner over HTTP", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "DELIVERY", FAR_WINDOW);
      expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
      const cutoffAt = new Date(
        window.startAt.getTime() - ready.snapshot.scheduledCancellationCutoffMinutes! * 60_000,
      );
      expect(Date.now()).toBeLessThan(cutoffAt.getTime());
      await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const before = await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId);
      const owner = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerAId,
      );
      const foreign = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerBId,
      );
      await withCustomerCommerceHttpService(h.database.connectionString, async ({ baseUrl }) => {
        const path = `${baseUrl}/api/v1/orders/${order.id}/cancel`;
        const missingAuth = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(missingAuth.status).toBe(401);
        expect((await missingAuth.json()).code).toBe("CUSTOMER_AUTH_REQUIRED");
        const foreignResponse = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: foreign },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(foreignResponse.status).toBe(404);
        expect((await foreignResponse.json()).code).toBe("ORDER_NOT_FOUND");
        const missing = await fetch(
          `${baseUrl}/api/v1/orders/00000000-0000-4000-8000-000000000099/cancel`,
          {
            method: "POST",
            headers: { "content-type": "application/json", cookie: owner },
            body: JSON.stringify({ expectedOrderRevision: "1" }),
          },
        );
        expect(missing.status).toBe(404);
        expect((await missing.json()).code).toBe("ORDER_NOT_FOUND");
        const stale = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: owner },
          body: JSON.stringify({ expectedOrderRevision: (order.revision + BigInt(1)).toString() }),
        });
        expect(stale.status).toBe(409);
        expect((await stale.json()).code).toBe("ORDER_CONFLICT");
        const wrongMethod = await fetch(path, {
          method: "GET",
          headers: { cookie: owner },
        });
        expect(wrongMethod.status).toBe(405);
        expect((await wrongMethod.json()).code).toBe("METHOD_NOT_ALLOWED");
        const reschedule = await fetch(`${baseUrl}/api/v1/orders/${order.id}/reschedule`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: owner },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(reschedule.status).toBe(404);
        const success = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: owner },
          body: JSON.stringify({ expectedOrderRevision: order.revision.toString() }),
        });
        expect(success.status).toBe(200);
        const body = (await success.json()) as {
          ok: boolean;
          order: { status: string; cancellationReasonCode: string; revision: string };
        };
        expect(body.ok).toBe(true);
        expect(body.order.status).toBe("CANCELLED");
        expect(body.order.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");
        expect(body.order.revision).toBe((order.revision + BigInt(1)).toString());
      });
      const persisted = await h.persistence.withContext((ctx) =>
        ctx.db.select().from(ordersTable).where(eq(ordersTable.id, order.id)),
      );
      expect(persisted[0]).toMatchObject({
        status: "CANCELLED",
        cancellationReasonCode: "CUSTOMER_REQUESTED",
        cancelledByCustomerAuthUserId: h.actors.customerAId,
        cancelledByWorkforceUserId: null,
      });
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
    });
  });

  it("refunds a customer-cancelled positive-paid scheduled delivery through existing workforce authority", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "DELIVERY", FAR_WINDOW);
      const purchased = await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const order = await orderRow(h.persistence, ready.checkout.id);
      const before = await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId);
      const cutoffAt = new Date(
        window.startAt.getTime() - ready.snapshot.scheduledCancellationCutoffMinutes! * 60_000,
      );
      await cancelCustomerScheduledOrder(
        h.persistence,
        h.actors.customerA,
        { orderId: order.id, expectedOrderRevision: order.revision },
        { clock: { now: () => new Date(cutoffAt.getTime() - 1000) } },
      );
      const beforeRefund = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: refundsTable.id }).from(refundsTable).where(eq(refundsTable.orderId, order.id)),
      );
      expect(beforeRefund).toEqual([]);
      await ensureProviderPaymentReference({
        persistence: h.persistence,
        paymentId: purchased.paymentId,
        provider: purchased.provider,
      } as Parameters<typeof ensureProviderPaymentReference>[0]);
      await expect(
        requestRefund(
          h.persistence,
          h.actors.brandAdminActor,
          {
            paymentId: purchased.paymentId,
            amountPaise: purchased.amountPaise + BigInt(1),
            reason: "exceeds captured scheduled payment",
          },
          { provider: purchased.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_AMOUNT_EXCEEDS_REMAINING" });
      const refunded = await requestRefund(
        h.persistence,
        h.actors.brandAdminActor,
        {
          paymentId: purchased.paymentId,
          amountPaise: purchased.amountPaise,
          reason: "customer cancelled scheduled order",
        },
        { provider: purchased.provider },
      );
      expect(refunded.refund.status).toBe("PROCESSED");
      expect(refunded.refund.amountPaise).toBe(purchased.amountPaise);
      expect(refunded.paymentStatus).toBe("SUCCEEDED");
      expect(refunded.refund.providerIdempotencyKey).toBe(
        refundProviderIdempotencyKey(refunded.refund.id),
      );
      expect(purchased.provider.createRefundCallCount).toBe(1);
      await expect(
        requestRefund(
          h.persistence,
          h.actors.brandAdminActor,
          {
            paymentId: purchased.paymentId,
            amountPaise: BigInt(1),
            reason: "second scheduled refund",
          },
          { provider: purchased.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_FULLY_REFUNDED" });
      expect(await purchasedCommercialTruth(h.persistence, order.checkoutSnapshotId)).toEqual(before);
      const stillCancelled = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ status: ordersTable.status, revision: ordersTable.revision })
          .from(ordersTable)
          .where(eq(ordersTable.id, order.id)),
      );
      expect(stillCancelled[0]?.status).toBe("CANCELLED");
      const statutory = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({
            status: refundStatutoryDecisionsTable.status,
            disposition: refundStatutoryDecisionsTable.disposition,
          })
          .from(refundStatutoryDecisionsTable)
          .where(eq(refundStatutoryDecisionsTable.refundId, refunded.refund.id)),
      );
      expect(statutory).toEqual([{ status: "PENDING", disposition: null }]);
    });
  });

  it("recovers an unhonourable paid scheduled order without rewriting the purchased promise", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await saveOutletSchedulingProfile(h.persistence, {
        outletId: h.actors.tree.outletA.id,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: new Date(),
      });
      const { ready, window } = await scheduleCheckout(h, "DELIVERY", FAR_WINDOW);
      const purchased = await purchasePositive(h, ready.checkout.id, ready.checkout.revision);
      const original = await orderRow(h.persistence, ready.checkout.id);
      const before = await purchasedCommercialTruth(h.persistence, original.checkoutSnapshotId);
      const closed = new Date(window.startAt.getTime());
      await expect(
        cancelCustomerScheduledOrder(
          h.persistence,
          h.actors.customerA,
          { orderId: original.id, expectedOrderRevision: original.revision },
          { clock: { now: () => closed } },
        ),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_CUTOFF_CLOSED" });
      const workforceCancelled = await cancelOrder(
        h.persistence,
        h.actors.brandAdminActor,
        {
          orderId: original.id,
          expectedOrderRevision: original.revision,
          cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
        },
        { clock: { now: () => closed } },
      );
      expect(workforceCancelled.status).toBe("CANCELLED");
      const persisted = await h.persistence.withContext((ctx) =>
        ctx.db.select().from(ordersTable).where(eq(ordersTable.id, original.id)),
      );
      expect(persisted[0]).toMatchObject({
        status: "CANCELLED",
        cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
        cancelledByWorkforceUserId: h.actors.brandAdmin.id,
        cancelledByCustomerAuthUserId: null,
        checkoutSnapshotId: ready.snapshot.id,
      });
      await ensureProviderPaymentReference({
        persistence: h.persistence,
        paymentId: purchased.paymentId,
        provider: purchased.provider,
      } as Parameters<typeof ensureProviderPaymentReference>[0]);
      const refunded = await requestRefund(
        h.persistence,
        h.actors.brandAdminActor,
        {
          paymentId: purchased.paymentId,
          amountPaise: purchased.amountPaise,
          reason: "unhonourable scheduled fulfilment",
        },
        { provider: purchased.provider },
      );
      expect(refunded.refund.status).toBe("PROCESSED");
      expect(refunded.refund.amountPaise).toBe(purchased.amountPaise);
      expect(await purchasedCommercialTruth(h.persistence, original.checkoutSnapshotId)).toEqual(before);
      const owner = await mintCustomerSessionCookieHeader(
        h.database.connectionString,
        h.actors.customerAId,
      );
      await withCustomerCommerceHttpService(h.database.connectionString, async ({ baseUrl }) => {
        const reschedule = await fetch(`${baseUrl}/api/v1/orders/${original.id}/reschedule`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie: owner },
          body: JSON.stringify({ expectedOrderRevision: workforceCancelled.revision }),
        });
        expect(reschedule.status).toBe(404);
      });
      const openCart = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ revision: string }>(sql`
          select revision::text as revision
          from app.carts
          where id = ${h.cartId}::uuid
        `);
        return rows.rows[0];
      });
      if (!openCart) throw new Error("Customer cart was not available for a separate Order.");
      const replacementCart = await addCartLine(
        h.persistence,
        {
          kind: "customer",
          actor: h.actors.customerA,
          brandId: h.actors.tree.brand.id,
        },
        {
          variantId: h.catalog.variantId,
          quantity: 1,
          expectedRevision: BigInt(openCart.revision),
        },
      );
      expect(replacementCart.cart.id).toBe(h.cartId);
      const opts = checkoutOpts(LIVE);
      const started = await startCheckout(
        h.persistence,
        h.actors.customerA,
        { cartId: replacementCart.cart.id },
        opts,
      );
      const destination = await setCheckoutDestination(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
        },
        opts,
      );
      const replacementReady = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: destination.id,
          expectedCheckoutRevision: destination.revision,
        },
        opts,
      );
      expect(replacementReady.checkout.id).not.toBe(ready.checkout.id);
      await purchasePositive(
        h,
        replacementReady.checkout.id,
        replacementReady.checkout.revision,
      );
      const replacement = await orderRow(h.persistence, replacementReady.checkout.id);
      expect(replacement.id).not.toBe(original.id);
      expect(replacement.checkoutId).not.toBe(original.checkoutId);
      expect(replacement.checkoutSnapshotId).not.toBe(original.checkoutSnapshotId);
      const originalAfter = await h.persistence.withContext((ctx) =>
        ctx.db.select().from(ordersTable).where(eq(ordersTable.id, original.id)),
      );
      expect(originalAfter[0]?.status).toBe("CANCELLED");
      expect(originalAfter[0]?.checkoutSnapshotId).toBe(ready.snapshot.id);
      expect(await purchasedCommercialTruth(h.persistence, original.checkoutSnapshotId)).toEqual(before);
    });
  });
});
