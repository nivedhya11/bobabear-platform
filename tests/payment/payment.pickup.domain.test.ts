/**
 * IMP-036H-C — Payment prepare / start / webhook / zero-payable on Pickup.
 *
 * Relies on mode-aware prepareCheckoutForPayment from IMP-036H-B.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  prepareCheckoutForPayment,
} from "../../src/server/checkout";
import {
  completeZeroPayableCheckout,
  startPayment,
} from "../../src/server/payment";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  CHECKOUT_POLICY,
  applyCouponToCustomerCart,
  bringCheckoutToPickupReady,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  seedPickupEligibleOutlet,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withCompletedPositivePickupOrderHarness,
  withCompletedZeroPickupOrderHarness,
} from "../database/support/order-fixtures";
import { checkoutOpts } from "../database/support/checkout-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-C payment — Pickup golden paths", () => {
  it("prepareCheckoutForPayment succeeds for READY PICKUP checkout", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(
        h.persistence,
        h.actors.brandAdminActor,
        outletId,
      );
      const ready = await bringCheckoutToPickupReady(
        h.persistence,
        h.actors.customerA,
        h.cartId,
        outletId,
      );
      const prepared = await prepareCheckoutForPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
        },
        checkoutOpts(),
      );
      expect(prepared.checkoutId).toBe(ready.checkoutId);
      expect(prepared.snapshot.fulfilmentMode).toBe("PICKUP");
      expect(prepared.snapshot.destination).toBeNull();
      expect(prepared.snapshot.pickupLocation).toBeTruthy();
    });
  });

  it("paid Pickup: startPayment + webhook materializes one Order", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      expect(h.order.paymentProvenanceKind).toBe("PAYMENT");
      expect(h.paymentId).toBeTruthy();
      expect(h.grandTotalPaise).toBeGreaterThan(BigInt(0));
      expect(h.order.status).toBe("PLACED");
    });
  });

  it("zero-payable Pickup: completeZeroPayableCheckout materializes Order", async () => {
    await withCompletedZeroPickupOrderHarness(async (h) => {
      expect(h.order.paymentProvenanceKind).toBe("NO_PAYMENT_REQUIRED");
      expect(h.paymentId).toBeNull();
      expect(h.grandTotalPaise).toBe(BigInt(0));
      expect(h.order.status).toBe("PLACED");
    });
  });

  it("Pickup startPayment retry path reuses pending Payment identity", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(
        h.persistence,
        h.actors.brandAdminActor,
        outletId,
      );
      const ready = await bringCheckoutToPickupReady(
        h.persistence,
        h.actors.customerA,
        h.cartId,
        outletId,
      );
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const key = newIdempotencyKey("pickup-retry");
      const first = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: key,
        },
        opts,
      );
      const second = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: key,
        },
        opts,
      );
      expect(second.payment.id).toBe(first.payment.id);
      expect(second.attempt.id).toBe(first.attempt.id);

      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: first.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: first.payment.expectedAmountPaise,
        },
        opts,
      );
    });
  });

  it("Pickup coupon path still reaches zero-payable complete", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const outletId = h.actors.tree.outletA.id;
      await seedPickupEligibleOutlet(
        h.persistence,
        h.actors.brandAdminActor,
        outletId,
      );
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const ready = await bringCheckoutToPickupReady(
        h.persistence,
        h.actors.customerA,
        cart.id,
        outletId,
      );
      expect(ready.grandTotalPaise).toBe(BigInt(0));

      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const completed = await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          idempotencyKey: newIdempotencyKey("pickup-zero-direct"),
        },
        paymentOpts(provider),
      );
      expect(completed.kind).toBe("zero_payable_completed");
      expect(completed.checkoutId).toBe(ready.checkoutId);
      expect(CHECKOUT_POLICY).toBeTruthy();
    });
  });
});
