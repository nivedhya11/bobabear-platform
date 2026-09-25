/**
 * IMP-036I Tranche 2 — Scheduled Snapshot payment bind and revalidation.
 */
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { deliveriesTable } from "../../src/platform/database/schema/delivery";
import { ordersTable } from "../../src/platform/database/schema/order";
import {
  evaluateCheckout,
  getActiveCheckout,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  setCheckoutFulfilment,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { completeZeroPayableCheckout, startPayment } from "../../src/server/payment";
import { saveOutletSchedulingProfile, updateBrandScheduledFulfilmentPolicy } from "../../src/server/scheduled-fulfilment/foundations";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { checkoutOpts, FIXED_NOW, withCheckoutReadyHarness } from "../database/support/checkout-fixtures";
import {
  applyCouponToCustomerCart,
  CHECKOUT_POLICY,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  seedPickupEligibleOutlet,
  verifyAndProcessWebhook,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const WINDOW_START = new Date("2026-08-09T12:30:00.000Z");
const WINDOW_END = new Date("2026-08-09T13:00:00.000Z");

async function orderForCheckout(
  persistence: Parameters<typeof startCheckout>[0],
  checkoutId: string,
) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        checkoutSnapshotId: ordersTable.checkoutSnapshotId,
      })
      .from(ordersTable)
      .where(eq(ordersTable.checkoutId, checkoutId)),
  );
  const order = rows[0];
  if (!order) throw new Error("Order was not materialized.");
  return order;
}

async function scheduledDeliveryReady(h: {
  persistence: Parameters<typeof startCheckout>[0];
  actors: {
    customerA: Parameters<typeof startCheckout>[1];
    tree: { outletA: { id: string }; brand: { id: string } };
  };
  cartId: string;
  addressId: string;
}) {
  await saveOutletSchedulingProfile(h.persistence, {
    outletId: h.actors.tree.outletA.id,
    pickupMinLeadMinutes: 30,
    deliveryMinLeadMinutes: 30,
    now: FIXED_NOW,
  });
  const opts = checkoutOpts();
  const started = await startCheckout(h.persistence, h.actors.customerA, { cartId: h.cartId }, opts);
  const withDest = await setCheckoutDestination(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: started.id,
      expectedCheckoutRevision: started.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
    },
    opts,
  );
  const timed = await setCheckoutFulfilmentTiming(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: withDest.id,
      expectedCheckoutRevision: withDest.revision,
      fulfilmentTiming: "SCHEDULED",
      scheduledWindowStartAt: WINDOW_START,
      scheduledWindowEndAt: WINDOW_END,
    },
    opts,
  );
  return evaluateCheckout(
    h.persistence,
    h.actors.customerA,
    { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
    opts,
  );
}

describe("IMP-036I tranche 2 scheduled payment bind", () => {
  it("binds a positive Scheduled Snapshot and leaves it immutable after success", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      expect(ready.snapshot.grandTotalPaise).toBeGreaterThan(BigInt(0));
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("sched-pos"),
        },
        opts,
      );
      expect(started.payment.checkoutSnapshotId).toBe(ready.snapshot.id);
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
      const order = await orderForCheckout(h.persistence, ready.checkout.id);
      expect(order.status).toBe("PLACED");
      expect(order.checkoutSnapshotId).toBe(ready.snapshot.id);
      const preparedAgain = prepareCheckoutForPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
        },
        checkoutOpts(),
      );
      await expect(preparedAgain).rejects.toBeTruthy();
      const deliveries = await h.persistence.withContext((ctx) =>
        ctx.db.select({ id: deliveriesTable.id }).from(deliveriesTable).where(eq(deliveriesTable.orderId, order.id)),
      );
      expect(deliveries).toEqual([]);
    });
  });

  it("completes a zero-payable Scheduled Pickup without creating a Delivery", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(h.persistence, h.actors.brandAdminActor, outletId);
      await saveOutletSchedulingProfile(h.persistence, {
        outletId,
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 30,
        now: FIXED_NOW,
      });
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        h.actors.tree.brand.id,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        h.actors.tree.brand.id,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const opts = checkoutOpts();
      const started = await startCheckout(h.persistence, h.actors.customerA, { cartId: cart.id }, opts);
      const pickup = await setCheckoutFulfilment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: started.id,
          expectedCheckoutRevision: started.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: outletId,
        },
        opts,
      );
      const timed = await setCheckoutFulfilmentTiming(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: pickup.id,
          expectedCheckoutRevision: pickup.revision,
          fulfilmentTiming: "SCHEDULED",
          scheduledWindowStartAt: WINDOW_START,
          scheduledWindowEndAt: WINDOW_END,
        },
        opts,
      );
      const ready = await evaluateCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
        opts,
      );
      expect(ready.snapshot.grandTotalPaise).toBe(BigInt(0));
      expect(ready.snapshot.fulfilmentTiming).toBe("SCHEDULED");
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const completed = await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          idempotencyKey: newIdempotencyKey("sched-zero"),
        },
        paymentOpts(provider),
      );
      expect(completed.kind).toBe("zero_payable_completed");
      expect(completed.snapshotId).toBe(ready.snapshot.id);
      const order = await orderForCheckout(h.persistence, ready.checkout.id);
      const deliveries = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ id: deliveriesTable.id })
          .from(deliveriesTable)
          .where(eq(deliveriesTable.orderId, order.id)),
      );
      expect(deliveries).toEqual([]);
      expect(order.status).toBe("PLACED");
    });
  });

  it("does not bind a new attempt to stale cancellation policy or a timing mutation", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(provider);
      const failed = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("sched-fail"),
        },
        opts,
      );
      expect(failed.attempt.status).toBe("FAILED");
      const afterFail = await getActiveCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: ready.checkout.id },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(afterFail?.status).toBe("READY_FOR_PAYMENT");
      await updateBrandScheduledFulfilmentPolicy(h.persistence, {
        brandId: h.actors.tree.brand.id,
        expectedRevision: BigInt(0),
        pickupCancellationCutoffMinutes: 30,
        deliveryCancellationCutoffMinutes: 120,
        now: FIXED_NOW,
      });
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: afterFail!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("sched-retry"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("rejects a timing change while payment is pending", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("sched-pending"),
        },
        opts,
      );
      const pending = await getActiveCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: ready.checkout.id },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(pending?.status).toBe("PAYMENT_PENDING");
      await expect(
        setCheckoutFulfilmentTiming(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: pending!.revision,
            fulfilmentTiming: "ASAP",
          },
          checkoutOpts(),
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });
      expect(started.payment.id).toBeTruthy();
    });
  });
});
