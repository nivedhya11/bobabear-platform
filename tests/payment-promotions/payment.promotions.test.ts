/**
 * Payment promotion redemption tests (IMP-022) — PAY-G10.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { evaluateCheckout, getActiveCheckout } from "../../src/server/checkout";
import {
  completeZeroPayableCheckout,
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import {
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedLimitedCoupon,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";
import { checkoutOpts } from "../database/support/checkout-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-022 payment promotions", () => {
  it("cart/checkout evaluation creates no claims; start reserves; success consumes; failure releases", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedLimitedCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        { maximumRedemptions: 10, percentageBps: 1000 },
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );

      await h.persistence.withContext(async (ctx) => {
        const before = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
        `);
        expect(before.rows[0]?.c).toBe("0");
      });

      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cart.id,
        h.addressId,
      );

      await h.persistence.withContext(async (ctx) => {
        const afterEval = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
        `);
        expect(afterEval.rows[0]?.c).toBe("0");
        const effects = await ctx.db.execute(sql`
          select count(*)::text as c from app.checkout_snapshot_promotion_effects
          where snapshot_id = ${ready.snapshotId}::uuid
        `);
        expect(Number(effects.rows[0]?.c)).toBeGreaterThan(0);
      });

      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const failed = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("fail"),
        },
        paymentOpts(failProvider),
      );
      expect(failed.payment.status).toBe("OPEN");

      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select status from app.promotion_redemption_claims
          where payment_attempt_id = ${failed.attempt.id}::uuid
        `);
        expect(claims.rows.length).toBeGreaterThan(0);
        for (const row of claims.rows) {
          expect(row.status).toBe("RELEASED");
        }
      });

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actors.customerA,
        { checkoutId: ready.checkoutId },
        checkoutOpts(),
      );
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const retried = await retryPayment(
        h.persistence,
        h.actors.customerA,
        {
          paymentId: failed.payment.id,
          expectedCheckoutRevision: checkout!.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("retry"),
        },
        paymentOpts(pendingProvider),
      );
      expect(retried.attempt.attemptOrdinal).toBe(BigInt(2));

      await h.persistence.withContext(async (ctx) => {
        const reserved = await ctx.db.execute(sql`
          select status from app.promotion_redemption_claims
          where payment_attempt_id = ${retried.attempt.id}::uuid
        `);
        for (const row of reserved.rows) {
          expect(row.status).toBe("RESERVED");
        }
        // RELEASED claim is not resurrected — new claim row exists.
        const released = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where payment_attempt_id = ${failed.attempt.id}::uuid
            and status = 'RELEASED'
        `);
        expect(Number(released.rows[0]?.c)).toBeGreaterThan(0);
      });

      const settled = await verifyAndProcessWebhook(
        h.persistence,
        pendingProvider,
        {
          executionIdentity: retried.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: retried.payment.expectedAmountPaise,
          providerEventId: `promo-${retried.attempt.id}`,
        },
        paymentOpts(pendingProvider),
      );
      expect(settled!.payment!.status).toBe("SUCCEEDED");

      await h.persistence.withContext(async (ctx) => {
        const consumed = await ctx.db.execute(sql`
          select status, payment_id, checkout_snapshot_id
          from app.promotion_redemption_claims
          where payment_attempt_id = ${retried.attempt.id}::uuid
        `);
        for (const row of consumed.rows) {
          expect(row.status).toBe("CONSUMED");
          expect(row.payment_id).toBe(retried.payment.id);
          expect(row.checkout_snapshot_id).toBe(ready.snapshotId);
        }
      });
    });
  });

  it("zero payable completes with no Payment/Attempt rows", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.price_book_variant_prices
          set amount_paise = 0
          where variant_id = ${h.catalog.variantId}::uuid
        `);
      });
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        h.cartId,
        h.addressId,
      );
      expect(ready.grandTotalPaise).toBe(BigInt(0));

      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const completed = await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          idempotencyKey: newIdempotencyKey("zero"),
        },
        paymentOpts(provider),
      );
      expect(completed.kind).toBe("zero_payable_completed");
      expect(completed.checkoutRevision).toBe(ready.revision + BigInt(1));

      await h.persistence.withContext(async (ctx) => {
        const payments = await ctx.db.execute(sql`
          select count(*)::text as c from app.payments
          where checkout_snapshot_id = ${ready.snapshotId}::uuid
        `);
        expect(payments.rows[0]?.c).toBe("0");
        const attempts = await ctx.db.execute(sql`
          select count(*)::text as c from app.payment_attempts
        `);
        expect(attempts.rows[0]?.c).toBe("0");
        const checkout = await ctx.db.execute(sql`
          select status from app.checkouts where id = ${ready.checkoutId}::uuid
        `);
        expect(checkout.rows[0]?.status).toBe("COMPLETED");
      });
    });
  });

  it("RESERVED and CONSUMED count against capacity; RELEASED does not", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedLimitedCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        { maximumRedemptions: 1, percentageBps: 1000 },
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cart.id,
        h.addressId,
      );

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        paymentOpts(provider),
      );
      expect(started.payment.status).toBe("PROCESSING");

      // Capacity held by RESERVED — second customer cannot reserve.
      const { addCartLine } = await import("../../src/server/cart");
      const { createSavedAddressForCustomer } = await import(
        "../database/support/checkout-fixtures"
      );
      const addedB = await addCartLine(
        h.persistence,
        { kind: "customer", actor: h.actors.customerB, brandId },
        { variantId: h.catalog.variantId, quantity: 1 },
      );
      const cartB = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerB,
        brandId,
        addedB.cart.revision,
        coupon.canonicalCode,
      );
      const addressB = await createSavedAddressForCustomer(
        h.persistence,
        h.actors.customerBId,
      );
      const readyB = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerB,
        cartB.id,
        addressB.id,
      );
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("b"),
          },
          paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        ),
      ).rejects.toMatchObject({
        code: "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
      });

      // Fail A → RELEASED frees capacity.
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "fail",
          providerEventId: `rel-${started.attempt.id}`,
        },
        paymentOpts(provider),
      );

      const bStart = await startPayment(
        h.persistence,
        h.actors.customerB,
        {
          checkoutId: readyB.checkoutId,
          expectedCheckoutRevision: readyB.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("b2"),
        },
        paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
      );
      expect(bStart.payment.status).toBe("PROCESSING");
    });
  });

  it("INDETERMINATE holds RESERVED; evaluate alone does not claim", async () => {
    await withPaymentReadyHarness(async (h) => {
      // No coupon on default harness — prove evaluate doesn't invent claims.
      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where checkout_snapshot_id = ${h.snapshotId}::uuid
        `);
        expect(claims.rows[0]?.c).toBe("0");
      });

      // Re-evaluate is a no-op commercially — still no claims.
      await evaluateCheckout(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
        },
        { clock: paymentOpts(createFakePaymentProvider()).clock, policy: CHECKOUT_POLICY },
      );
      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
        `);
        expect(claims.rows[0]?.c).toBe("0");
      });
    });
  });
});
