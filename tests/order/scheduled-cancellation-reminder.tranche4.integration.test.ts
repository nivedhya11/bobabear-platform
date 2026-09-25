/**
 * IMP-036I Tranche 4 — purchased cancellation cutoff and scheduled reminder.
 */
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { deliveriesTable } from "../../src/platform/database/schema/delivery";
import { notificationRequestsTable } from "../../src/platform/database/schema/notifications";
import { ordersTable } from "../../src/platform/database/schema/order";
import { outboxEventsTable } from "../../src/platform/database/schema/outbox-events";
import { refundsTable } from "../../src/platform/database/schema/refund";
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
});
