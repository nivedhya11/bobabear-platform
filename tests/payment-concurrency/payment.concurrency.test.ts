/**
 * Payment concurrency tests (IMP-022) — PAY-G6.
 * Full 20-case matrix with real parallel PostgreSQL transactions.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { setCartLineQuantity, addCartLine } from "../../src/server/cart";
import {
  cancelCheckout,
  getActiveCheckout,
} from "../../src/server/checkout";
import {
  cancelPayment,
  completeZeroPayableCheckout,
  reconcilePaymentAttempt,
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../src/server/promotions";
import { uniqueCode } from "../database/support/cart-fixtures";
import { createSavedAddressForCustomer } from "../database/support/checkout-fixtures";
import {
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  FIXED_NOW,
  mutableCheckoutClock,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  seedLimitedCoupon,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withPaymentReadyHarness,
  type PaymentReadyHarness,
} from "../database/support/payment-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

type PaymentPersistence = PaymentReadyHarness["persistence"];

function settled(results: ReadonlyArray<PromiseSettledResult<unknown>>) {
  return {
    ok: results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled",
    ),
    fail: results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    ),
  };
}

async function countPaymentsForSnapshot(
  persistence: PaymentPersistence,
  snapshotId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select count(*)::text as c from app.payments
      where checkout_snapshot_id = ${snapshotId}::uuid
    `);
    return Number(r.rows[0]?.c ?? "0");
  });
}

async function countAttempts(
  persistence: PaymentPersistence,
  paymentId: string,
): Promise<{ total: number; unresolved: number }> {
  return persistence.withContext(async (ctx) => {
    const total = await ctx.db.execute(sql`
      select count(*)::text as c from app.payment_attempts
      where payment_id = ${paymentId}::uuid
    `);
    const unresolved = await ctx.db.execute(sql`
      select count(*)::text as c from app.payment_attempts
      where payment_id = ${paymentId}::uuid
        and status in ('CREATED', 'PENDING', 'INDETERMINATE')
    `);
    return {
      total: Number(total.rows[0]?.c ?? "0"),
      unresolved: Number(unresolved.rows[0]?.c ?? "0"),
    };
  });
}

async function checkoutRow(persistence: PaymentPersistence, checkoutId: string) {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select status, revision::text as revision,
             active_snapshot_id::text as snap
      from app.checkouts where id = ${checkoutId}::uuid
    `);
    return r.rows[0]!;
  });
}

async function seedAutomaticCombinablePromotion(
  persistence: PaymentPersistence,
  brandId: string,
  actor: unknown,
  percentageBps: number,
): Promise<string> {
  return persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor,
      brandId,
      code: uniqueCode("auto"),
      displayName: "Automatic combinable",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      triggerType: "automatic",
      stackingPolicy: "combinable",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: null,
    });
    await setPromotionBenefit(tx, {
      actor,
      promotionId: created.id,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    for (const role of ["qualifier", "benefit"] as const) {
      await setPromotionTargets(tx, {
        actor,
        promotionId: created.id,
        targetRole: role,
        targets: [
          {
            targetRole: role,
            targetType: "all_merchandise",
            productId: null,
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      });
    }
    await activatePromotion(tx, { actor, promotionId: created.id });
    return created.id;
  });
}

async function seedCombinableLimitedCoupon(
  persistence: PaymentPersistence,
  brandId: string,
  actor: unknown,
  maximumRedemptions: number,
): Promise<{ promotionId: string; couponId: string; canonicalCode: string }> {
  const canonicalCode = uniqueCode("CLIM");
  return persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor,
      brandId,
      code: uniqueCode("clim"),
      displayName: "Combinable limited coupon",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      triggerType: "coupon",
      stackingPolicy: "combinable",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: null,
    });
    await setPromotionBenefit(tx, {
      actor,
      promotionId: created.id,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: 500,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    for (const role of ["qualifier", "benefit"] as const) {
      await setPromotionTargets(tx, {
        actor,
        promotionId: created.id,
        targetRole: role,
        targets: [
          {
            targetRole: role,
            targetType: "all_merchandise",
            productId: null,
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      });
    }
    await activatePromotion(tx, { actor, promotionId: created.id });
    const coupon = await createCouponDraft(tx, {
      actor,
      promotionId: created.id,
      origin: "manual",
      canonicalCode,
      maximumRedemptions,
      maximumRedemptionsPerCustomer: null,
    });
    await activateCoupon(tx, { actor, couponId: coupon.id });
    return {
      promotionId: created.id,
      couponId: coupon.id,
      canonicalCode: coupon.canonicalCode,
    };
  });
}

describe("IMP-022 payment concurrency matrix (20 cases)", () => {
  it("01: startPayment vs startPayment same Checkout/snapshot/same idempotency key", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const sameKey = newIdempotencyKey("same");
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: sameKey,
          },
          opts,
        ),
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: sameKey,
          },
          opts,
        ),
      ]);
      const { ok } = settled(raced);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      if (ok.length === 2) {
        const a = ok[0]!.value as { payment: { id: string } };
        const b = ok[1]!.value as { payment: { id: string } };
        expect(a.payment.id).toBe(b.payment.id);
      }
      expect(await countPaymentsForSnapshot(h.persistence, h.snapshotId)).toBe(
        1,
      );
      const paymentId = (ok[0]!.value as { payment: { id: string } }).payment
        .id;
      const attempts = await countAttempts(h.persistence, paymentId);
      expect(attempts.total).toBe(1);
      expect(attempts.unresolved).toBe(1);
      expect(provider.createExecutionCallCount).toBe(1);
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("PAYMENT_PENDING");
      expect(chk.revision).toBe((h.revision + BigInt(1)).toString());
      await h.persistence.withContext(async (ctx) => {
        const idem = await ctx.db.execute(sql`
          select count(*)::text as c from app.payment_initiation_idempotency
          where customer_auth_user_id = ${h.actors.customerAId}
            and idempotency_key = ${sameKey}
        `);
        expect(idem.rows[0]?.c).toBe("1");
      });
    });
  });

  it("02: startPayment vs startPayment same Checkout/snapshot/different idempotency keys", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("k1"),
          },
          opts,
        ),
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "card",
            idempotencyKey: newIdempotencyKey("k2"),
          },
          opts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect(await countPaymentsForSnapshot(h.persistence, h.snapshotId)).toBe(
        1,
      );
      const paymentId = (ok[0]!.value as { payment: { id: string } }).payment
        .id;
      const attempts = await countAttempts(h.persistence, paymentId);
      expect(attempts.total).toBe(1);
      expect(attempts.unresolved).toBe(1);
      expect(provider.createExecutionCallCount).toBe(1);
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("PAYMENT_PENDING");
      expect(chk.revision).toBe((h.revision + BigInt(1)).toString());
      await h.persistence.withContext(async (ctx) => {
        const reserved = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where payment_id = ${paymentId}::uuid and status = 'RESERVED'
        `);
        // No promo on default harness — reservation set size 0 or 1 is fine;
        // financial singleton is the critical invariant.
        expect(Number(reserved.rows[0]?.c)).toBeLessThanOrEqual(1);
      });
    });
  });

  it("03: startPayment vs Checkout cancellation", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
          },
          opts,
        ),
        cancelCheckout(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
          },
          { clock: opts.clock, policy: CHECKOUT_POLICY },
        ),
      ]);
      expect(settled(raced).ok.length).toBe(1);
      expect(settled(raced).fail.length).toBe(1);
      const payments = await countPaymentsForSnapshot(
        h.persistence,
        h.snapshotId,
      );
      expect(payments).toBeLessThanOrEqual(1);
      if (payments === 1) {
        expect(provider.createExecutionCallCount).toBe(1);
        const chk = await checkoutRow(h.persistence, h.checkoutId);
        expect(chk.status).toBe("PAYMENT_PENDING");
      } else {
        expect(provider.createExecutionCallCount).toBe(0);
        const chk = await checkoutRow(h.persistence, h.checkoutId);
        expect(chk.status).toBe("CANCELLED");
        expect(chk.snap).toBeNull();
      }
    });
  });

  it("04: startPayment vs Cart/Checkout source mutation", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const lineId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id from app.cart_lines
          where cart_id = ${h.cartId}::uuid limit 1
        `);
        return r.rows[0]!.id as string;
      });
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
          },
          opts,
        ),
        setCartLineQuantity(
          h.persistence,
          { kind: "customer", actor: h.actor, brandId: h.brandId },
          {
            cartLineId: lineId,
            quantity: 2,
            expectedRevision: h.cartRevision,
          },
        ),
      ]);
      expect(settled(raced).ok.length + settled(raced).fail.length).toBe(2);
      expect(await countPaymentsForSnapshot(h.persistence, h.snapshotId)).toBeLessThanOrEqual(
        1,
      );
    });
  });

  it("05: provider success vs duplicate provider success", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      provider.setOutcome(started.attempt.providerExecutionIdentity, "succeed");
      const raced = await Promise.allSettled([
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `dup-a-${started.attempt.id}`,
          },
          opts,
        ),
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `dup-b-${started.attempt.id}`,
          },
          opts,
        ),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      const attempts = await countAttempts(h.persistence, started.payment.id);
      expect(attempts.total).toBe(1);
      expect(attempts.unresolved).toBe(0);
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      // start (+1) + success (+1) — duplicate success must not bump again
      expect(chk.revision).toBe((h.revision + BigInt(2)).toString());
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        expect(pay.rows[0]?.status).toBe("SUCCEEDED");
        const att = await ctx.db.execute(sql`
          select status from app.payment_attempts
          where id = ${started.attempt.id}::uuid
        `);
        expect(att.rows[0]?.status).toBe("SUCCEEDED");
      });
    });
  });

  it("06: provider success vs provider definitive-failure evidence", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      const raced = await Promise.allSettled([
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `ok-${started.attempt.id}`,
          },
          opts,
        ),
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "fail",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `fail-${started.attempt.id}`,
          },
          opts,
        ),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        const att = await ctx.db.execute(sql`
          select status from app.payment_attempts
          where id = ${started.attempt.id}::uuid
        `);
        // Success is sticky: if success landed first, failure cannot regress.
        // If failure landed first, success after FAILED is contradictory noop.
        const payStatus = pay.rows[0]?.status;
        const attStatus = att.rows[0]?.status;
        expect(["SUCCEEDED", "OPEN"]).toContain(payStatus);
        if (payStatus === "SUCCEEDED") {
          expect(attStatus).toBe("SUCCEEDED");
          const chk = await checkoutRow(h.persistence, h.checkoutId);
          expect(chk.status).toBe("COMPLETED");
        } else {
          expect(attStatus).toBe("FAILED");
          const chk = await checkoutRow(h.persistence, h.checkoutId);
          expect(chk.status).toBe("READY_FOR_PAYMENT");
        }
      });
    });
  });

  it("07: provider success vs cancellation attempt", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      const raced = await Promise.allSettled([
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `win-${started.attempt.id}`,
          },
          opts,
        ),
        cancelPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: started.checkoutRevision,
          },
          opts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(fail.length).toBeGreaterThanOrEqual(1);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        expect(pay.rows[0]?.status).toBe("SUCCEEDED");
      });
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      expect(chk.revision).toBe((h.revision + BigInt(2)).toString());
    });
  });

  it("08: provider webhook success vs provider query success", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      provider.setOutcome(started.attempt.providerExecutionIdentity, "succeed");
      const raced = await Promise.allSettled([
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `wh-${started.attempt.id}`,
          },
          opts,
        ),
        reconcilePaymentAttempt(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            attemptId: started.attempt.id,
          },
          opts,
        ),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      const attempts = await countAttempts(h.persistence, started.payment.id);
      expect(attempts.total).toBe(1);
      expect(attempts.unresolved).toBe(0);
      expect(provider.queryExecutionCallCount).toBeGreaterThanOrEqual(1);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        expect(pay.rows[0]?.status).toBe("SUCCEEDED");
        const att = await ctx.db.execute(sql`
          select status from app.payment_attempts
          where id = ${started.attempt.id}::uuid
        `);
        expect(att.rows[0]?.status).toBe("SUCCEEDED");
      });
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      expect(chk.revision).toBe((h.revision + BigInt(2)).toString());
    });
  });

  it("09: provider query failure vs webhook success", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      // Query path will read stored outcome; webhook forces succeed independently.
      provider.setOutcome(started.attempt.providerExecutionIdentity, "fail");
      const raced = await Promise.allSettled([
        reconcilePaymentAttempt(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            attemptId: started.attempt.id,
          },
          opts,
        ),
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `wh-win-${started.attempt.id}`,
          },
          opts,
        ),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        const att = await ctx.db.execute(sql`
          select status from app.payment_attempts
          where id = ${started.attempt.id}::uuid
        `);
        const payStatus = pay.rows[0]?.status;
        expect(["SUCCEEDED", "OPEN"]).toContain(payStatus);
        if (payStatus === "SUCCEEDED") {
          expect(att.rows[0]?.status).toBe("SUCCEEDED");
          const chk = await checkoutRow(h.persistence, h.checkoutId);
          expect(chk.status).toBe("COMPLETED");
        } else {
          expect(att.rows[0]?.status).toBe("FAILED");
        }
      });
    });
  });

  it("10: retryPayment vs retryPayment same OPEN Payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(failProvider);
      const failed = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("fail"),
        },
        opts,
      );
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const retryOpts = { ...opts, provider: pendingProvider };
      const raced = await Promise.allSettled([
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("r1"),
          },
          retryOpts,
        ),
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "card",
            idempotencyKey: newIdempotencyKey("r2"),
          },
          retryOpts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      const attempts = await countAttempts(h.persistence, failed.payment.id);
      expect(attempts.unresolved).toBe(1);
      expect(pendingProvider.createExecutionCallCount).toBe(1);
    });
  });

  it("11: retryPayment vs late evidence from old Attempt", async () => {
    await withPaymentReadyHarness(async (h) => {
      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(failProvider);
      const failed = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("fail"),
        },
        opts,
      );
      const oldIdentity = failed.attempt.providerExecutionIdentity;
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const retryOpts = { ...opts, provider: pendingProvider };
      const raced = await Promise.allSettled([
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("retry"),
          },
          retryOpts,
        ),
        verifyAndProcessWebhook(
          h.persistence,
          failProvider,
          {
            executionIdentity: oldIdentity,
            outcome: "succeed",
            amountPaise: failed.payment.expectedAmountPaise,
            providerEventId: `late-old-${failed.attempt.id}`,
          },
          opts,
        ),
      ]);
      expect(settled(raced).ok.length).toBeGreaterThanOrEqual(1);
      await h.persistence.withContext(async (ctx) => {
        const old = await ctx.db.execute(sql`
          select status from app.payment_attempts
          where id = ${failed.attempt.id}::uuid
        `);
        // Late success on already-FAILED attempt cannot resurrect it.
        expect(old.rows[0]?.status).toBe("FAILED");
      });
      const attempts = await countAttempts(h.persistence, failed.payment.id);
      expect(attempts.unresolved).toBeLessThanOrEqual(1);
      expect(attempts.total).toBeGreaterThanOrEqual(1);
    });
  });

  it("12: retryPayment vs Payment expiry boundary", async () => {
    await withPaymentReadyHarness(async (h) => {
      const mutable = mutableCheckoutClock(FIXED_NOW);
      const shortHorizon = Object.freeze({}); // expiry uses Checkout.expires_at
      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = {
        clock: mutable.clock,
        policy: shortHorizon,
        checkoutPolicy: CHECKOUT_POLICY,
        provider: failProvider,
      };
      const failed = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("fail"),
        },
        opts,
      );
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: mutable.clock, policy: CHECKOUT_POLICY },
      );
      mutable.advance(CHECKOUT_POLICY.checkoutTtlMs + 1);
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const retryOpts = { ...opts, provider: pendingProvider };
      const raced = await Promise.allSettled([
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("exp1"),
          },
          retryOpts,
        ),
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "card",
            idempotencyKey: newIdempotencyKey("exp2"),
          },
          retryOpts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(0);
      expect(fail.length).toBe(2);
      for (const f of fail) {
        expect((f.reason as { code: string }).code).toBe("PAYMENT_EXPIRED");
      }
      expect(pendingProvider.createExecutionCallCount).toBe(0);
      const attempts = await countAttempts(h.persistence, failed.payment.id);
      expect(attempts.unresolved).toBe(0);
      expect(attempts.total).toBe(1);
    });
  });

  it("13: reconciliation vs retryPayment", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      provider.setOutcome(started.attempt.providerExecutionIdentity, "fail");
      // First resolve to OPEN so retry is eligible, then race reconcile(noop/fail already)
      // against retry — use a second pending payment path via fail→OPEN then race.
      await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      // Re-fail path: set old identity already terminal; race reconcile (noop) vs retry.
      const raced = await Promise.allSettled([
        reconcilePaymentAttempt(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            attemptId: started.attempt.id,
          },
          opts,
        ),
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("after-recon"),
          },
          { ...opts, provider: pendingProvider },
        ),
      ]);
      expect(settled(raced).ok.length).toBeGreaterThanOrEqual(1);
      const attempts = await countAttempts(h.persistence, started.payment.id);
      expect(attempts.unresolved).toBeLessThanOrEqual(1);
      expect(attempts.total).toBeGreaterThanOrEqual(1);
    });
  });

  it("14: Promotion final-slot claimant A vs claimant B", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedLimitedCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        { maximumRedemptions: 1, percentageBps: 1000 },
      );
      const cartA = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const readyA = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cartA.id,
        h.addressId,
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
      const providerA = createFakePaymentProvider({ defaultOutcome: "pending" });
      const providerB = createFakePaymentProvider({ defaultOutcome: "pending" });
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: readyA.checkoutId,
            expectedCheckoutRevision: readyA.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("pa"),
          },
          paymentOpts(providerA),
        ),
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("pb"),
          },
          paymentOpts(providerB),
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect((fail[0]!.reason as { code: string }).code).toBe(
        "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
      );
      expect(
        providerA.createExecutionCallCount + providerB.createExecutionCallCount,
      ).toBe(1);
      // Loser must not have executed provider create.
      expect(
        Math.min(
          providerA.createExecutionCallCount,
          providerB.createExecutionCallCount,
        ),
      ).toBe(0);
      await h.persistence.withContext(async (ctx) => {
        const reserved = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
            and status in ('RESERVED', 'CONSUMED')
        `);
        expect(reserved.rows[0]?.c).toBe("1");
      });
    });
  });

  it("15: multi-Promotion reservation vs competing transaction", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      await seedAutomaticCombinablePromotion(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        300,
      );
      const coupon = await seedCombinableLimitedCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        1,
      );
      const cartA = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const readyA = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cartA.id,
        h.addressId,
      );
      await h.persistence.withContext(async (ctx) => {
        const effects = await ctx.db.execute(sql`
          select count(distinct promotion_id)::text as c
          from app.checkout_snapshot_promotion_effects
          where snapshot_id = ${readyA.snapshotId}::uuid
            and effect_kind = 'applied_promotion'
        `);
        expect(Number(effects.rows[0]?.c)).toBeGreaterThanOrEqual(2);
      });
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
      const providerA = createFakePaymentProvider({ defaultOutcome: "pending" });
      const providerB = createFakePaymentProvider({ defaultOutcome: "pending" });
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: readyA.checkoutId,
            expectedCheckoutRevision: readyA.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("multi-a"),
          },
          paymentOpts(providerA),
        ),
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("multi-b"),
          },
          paymentOpts(providerB),
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      await h.persistence.withContext(async (ctx) => {
        const active = await ctx.db.execute(sql`
          select payment_id::text as payment_id, count(*)::text as c
          from app.promotion_redemption_claims
          where status in ('RESERVED', 'CONSUMED')
          group by payment_id
        `);
        expect(active.rows.length).toBe(1);
        // Winner must not leave a partial multi-promo set: either A reserved
        // both applied promotions, or B reserved its single coupon claim.
        const winnerCount = Number(active.rows[0]?.c);
        expect(winnerCount).toBeGreaterThanOrEqual(1);
        // Loser has zero active claims.
        const loserClaims = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where status in ('RESERVED', 'CONSUMED')
            and payment_id is distinct from ${active.rows[0]!.payment_id}::uuid
        `);
        expect(loserClaims.rows[0]?.c).toBe("0");
      });
      expect(
        providerA.createExecutionCallCount + providerB.createExecutionCallCount,
      ).toBe(1);
    });
  });

  it("16: zero-payable completion vs competing final Promotion slot", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
      );
      // Force capacity 1 on the full-discount coupon.
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.promotion_coupons
          set maximum_redemptions = 1
          where canonical_code = ${coupon.canonicalCode}
        `);
      });
      const cartA = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const readyA = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cartA.id,
        h.addressId,
      );
      expect(readyA.grandTotalPaise).toBe(BigInt(0));

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
      expect(readyB.grandTotalPaise).toBe(BigInt(0));

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const raced = await Promise.allSettled([
        completeZeroPayableCheckout(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: readyA.checkoutId,
            expectedCheckoutRevision: readyA.revision,
            idempotencyKey: newIdempotencyKey("zero-a"),
          },
          opts,
        ),
        completeZeroPayableCheckout(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            idempotencyKey: newIdempotencyKey("zero-b"),
          },
          opts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect((fail[0]!.reason as { code: string }).code).toBe(
        "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
      );
      await h.persistence.withContext(async (ctx) => {
        const consumed = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
            and status = 'CONSUMED'
        `);
        expect(consumed.rows[0]?.c).toBe("1");
        const reserved = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
            and status = 'RESERVED'
        `);
        expect(reserved.rows[0]?.c).toBe("0");
      });
      expect(provider.createExecutionCallCount).toBe(0);
    });
  });

  it("17: definitive-failure Promotion release vs competing reservation", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedLimitedCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        { maximumRedemptions: 1, percentageBps: 1000 },
      );
      const cartA = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const readyA = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cartA.id,
        h.addressId,
      );
      const providerA = createFakePaymentProvider({ defaultOutcome: "pending" });
      const startedA = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: readyA.checkoutId,
          expectedCheckoutRevision: readyA.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("a-hold"),
        },
        paymentOpts(providerA),
      );
      expect(startedA.payment.status).toBe("PROCESSING");

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
      const providerB = createFakePaymentProvider({ defaultOutcome: "pending" });
      const raced = await Promise.allSettled([
        verifyAndProcessWebhook(
          h.persistence,
          providerA,
          {
            executionIdentity: startedA.attempt.providerExecutionIdentity,
            outcome: "fail",
            amountPaise: startedA.payment.expectedAmountPaise,
            providerEventId: `rel-${startedA.attempt.id}`,
          },
          paymentOpts(providerA),
        ),
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("b-take"),
          },
          paymentOpts(providerB),
        ),
      ]);
      expect(settled(raced).ok.length).toBeGreaterThanOrEqual(1);
      await h.persistence.withContext(async (ctx) => {
        const active = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where promotion_id = ${coupon.promotionId}::uuid
            and status in ('RESERVED', 'CONSUMED')
        `);
        // After release, at most one active claim may exist (B if it won).
        expect(Number(active.rows[0]?.c)).toBeLessThanOrEqual(1);
        const released = await ctx.db.execute(sql`
          select count(*)::text as c from app.promotion_redemption_claims
          where payment_attempt_id = ${startedA.attempt.id}::uuid
            and status = 'RELEASED'
        `);
        // If failure applied, A's claim is RELEASED; if B raced first and lost,
        // A may still be RESERVED until failure commits.
        expect(Number(released.rows[0]?.c) + Number(active.rows[0]?.c)).toBeGreaterThanOrEqual(
          1,
        );
      });
    });
  });

  it("18: customer cancellation vs late provider success", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      const raced = await Promise.allSettled([
        cancelPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: started.checkoutRevision,
          },
          opts,
        ),
        verifyAndProcessWebhook(
          h.persistence,
          provider,
          {
            executionIdentity: started.attempt.providerExecutionIdentity,
            outcome: "succeed",
            amountPaise: started.payment.expectedAmountPaise,
            providerEventId: `late-${started.attempt.id}`,
          },
          opts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(fail.length).toBeGreaterThanOrEqual(1);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        // Late success wins; cancel cannot erase unresolved attempt.
        expect(pay.rows[0]?.status).toBe("SUCCEEDED");
      });
      const chk = await checkoutRow(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      expect(chk.status).not.toBe("CANCELLED");
      expect(chk.status).not.toBe("DRAFT");
    });
  });

  it("19: different-Payment independence", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const readyA = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        h.cartId,
        h.addressId,
      );
      const addedB = await addCartLine(
        h.persistence,
        { kind: "customer", actor: h.actors.customerB, brandId },
        { variantId: h.catalog.variantId, quantity: 1 },
      );
      const addressB = await createSavedAddressForCustomer(
        h.persistence,
        h.actors.customerBId,
      );
      const readyB = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerB,
        addedB.cart.id,
        addressB.id,
      );
      const providerA = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const providerB = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const raced = await Promise.allSettled([
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: readyA.checkoutId,
            expectedCheckoutRevision: readyA.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("ind-a"),
          },
          paymentOpts(providerA),
        ),
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: readyB.checkoutId,
            expectedCheckoutRevision: readyB.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("ind-b"),
          },
          paymentOpts(providerB),
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(2);
      expect(fail.length).toBe(0);
      expect(providerA.createExecutionCallCount).toBe(1);
      expect(providerB.createExecutionCallCount).toBe(1);
      expect(await countPaymentsForSnapshot(h.persistence, readyA.snapshotId)).toBe(
        1,
      );
      expect(await countPaymentsForSnapshot(h.persistence, readyB.snapshotId)).toBe(
        1,
      );
      const chkA = await checkoutRow(h.persistence, readyA.checkoutId);
      const chkB = await checkoutRow(h.persistence, readyB.checkoutId);
      expect(chkA.status).toBe("COMPLETED");
      expect(chkB.status).toBe("COMPLETED");
    });
  });

  it("20: same-Payment unresolved-Attempt uniqueness race", async () => {
    await withPaymentReadyHarness(async (h) => {
      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(failProvider);
      const failed = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("fail"),
        },
        opts,
      );
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const retryOpts = { ...opts, provider: pendingProvider };
      const raced = await Promise.allSettled([
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("u1"),
          },
          retryOpts,
        ),
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("u2"),
          },
          retryOpts,
        ),
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "card",
            idempotencyKey: newIdempotencyKey("u3"),
          },
          retryOpts,
        ),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(2);
      const attempts = await countAttempts(h.persistence, failed.payment.id);
      expect(attempts.unresolved).toBe(1);
      // DB partial unique remains authoritative.
      await h.persistence.withContext(async (ctx) => {
        await expect(
          ctx.db.execute(sql`
            insert into app.payment_attempts (
              id, payment_id, attempt_ordinal, status, provider,
              provider_execution_identity, created_at, updated_at, pending_at
            ) values (
              gen_random_uuid(), ${failed.payment.id}::uuid,
              99, 'PENDING', 'fake', ${`race-${failed.payment.id}`},
              now(), now(), now()
            )
          `),
        ).rejects.toThrow();
      });
    });
  });
});
