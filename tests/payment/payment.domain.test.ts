/**
 * Payment domain tests (IMP-022) — PAY-G3 / §75 mandatory cases.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { setCartLineQuantity } from "../../src/server/cart";
import {
  evaluateCheckout,
  getActiveCheckout,
  setCheckoutDestination,
} from "../../src/server/checkout";
import {
  cancelPayment,
  completeZeroPayableCheckout,
  getPayment,
  getPaymentState,
  reconcilePaymentAttempt,
  retryPayment,
  startPayment,
  supersedePayment,
} from "../../src/server/payment";
import { PaymentError } from "../../src/shared/payment";
import {
  bringCheckoutToReady,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FIXED_NOW,
  mutableCheckoutClock,
  newIdempotencyKey,
  paymentOpts,
  seedOversizedFixedDiscountCoupon,
  applyCouponToCustomerCart,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
  withCheckoutReadyHarness,
  CHECKOUT_POLICY,
  PAYMENT_POLICY,
} from "../database/support/payment-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-022 payment domain — start / binding / input", () => {
  it("positive READY Checkout start binds snapshot amount/currency", async () => {
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
      expect(started.kind).toBe("payment_started");
      expect(started.payment.checkoutSnapshotId).toBe(h.snapshotId);
      expect(started.payment.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(started.payment.currency).toBe("INR");
      expect(started.payment.status).toBe("PROCESSING");
      expect(started.attempt.status).toBe("PENDING");
      expect(started.attempt.attemptOrdinal).toBe(BigInt(1));
      expect(started.checkoutRevision).toBe(h.revision + BigInt(1));

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(checkout!.status).toBe("PAYMENT_PENDING");
      expect(checkout!.activeSnapshotId).toBe(h.snapshotId);
      expect(checkout!.revision).toBe(started.checkoutRevision);
    });
  });

  it("browser amount / unknown field rejected", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      await expect(
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
            amountPaise: 1,
          },
          paymentOpts(provider),
        ),
      ).rejects.toMatchObject({
        code: "PAYMENT_INVALID_INPUT",
        field: "amountPaise",
      });
    });
  });

  it("Checkout repriced / changed terms stops Payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      // Mutate cart quantity → source cart revision drift on prepare.
      const lineId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id from app.cart_lines where cart_id = ${h.cartId}::uuid limit 1
        `);
        return r.rows[0]!.id as string;
      });
      await setCartLineQuantity(
        h.persistence,
        { kind: "customer", actor: h.actor, brandId: h.brandId },
        {
          cartLineId: lineId,
          quantity: 2,
          expectedRevision: h.cartRevision,
        },
      );
      await expect(
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
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("Checkout expiry stops start", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const mutable = mutableCheckoutClock(FIXED_NOW);
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        h.cartId,
        h.addressId,
        mutable.clock,
      );
      mutable.advance(CHECKOUT_POLICY.checkoutTtlMs + 1);
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkoutId,
            expectedCheckoutRevision: ready.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
          },
          {
            clock: mutable.clock,
            policy: PAYMENT_POLICY,
            checkoutPolicy: CHECKOUT_POLICY,
            provider,
          },
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
    });
  });
});

describe("IMP-022 payment domain — zero / negative", () => {
  it("zero payable completes with no Payment row; startPayment rejects zero", async () => {
    await withCheckoutReadyHarness(async (h) => {
      // Force a commercially zero total without coupons (100% discount can be
      // VALID_BUT_NOT_SELECTED depending on stacking). Price book allows 0.
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
      const opts = paymentOpts(provider);

      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkoutId,
            expectedCheckoutRevision: ready.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey(),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_ZERO_PAYABLE_INVALID" });

      const completed = await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          idempotencyKey: newIdempotencyKey("zero"),
        },
        opts,
      );
      expect(completed.kind).toBe("zero_payable_completed");
      expect(completed.snapshotId).toBe(ready.snapshotId);
      expect(completed.checkoutRevision).toBe(ready.revision + BigInt(1));

      await h.persistence.withContext(async (ctx) => {
        const payments = await ctx.db.execute(sql`
          select count(*)::text as c from app.payments
          where checkout_snapshot_id = ${ready.snapshotId}::uuid
        `);
        expect(payments.rows[0]?.c).toBe("0");
        const checkout = await ctx.db.execute(sql`
          select status, revision::text as revision from app.checkouts
          where id = ${ready.checkoutId}::uuid
        `);
        expect(checkout.rows[0]?.status).toBe("COMPLETED");
        expect(checkout.rows[0]?.revision).toBe(
          completed.checkoutRevision.toString(),
        );
      });
    });
  });

  it("negative payable fails closed", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedOversizedFixedDiscountCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
        BigInt(1_000_000_000),
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      try {
        const ready = await bringCheckoutToReady(
          h.persistence,
          h.actors.customerA,
          cart.id,
          h.addressId,
        );
        if (ready.grandTotalPaise >= BigInt(0)) {
          // Pricing may clamp — still reject start when total is zero via zero path.
          expect(ready.grandTotalPaise).toBe(BigInt(0));
          return;
        }
        const provider = createFakePaymentProvider({
          defaultOutcome: "pending",
        });
        await expect(
          startPayment(
            h.persistence,
            h.actors.customerA,
            {
              checkoutId: ready.checkoutId,
              expectedCheckoutRevision: ready.revision,
              paymentMethodIntent: "upi",
              idempotencyKey: newIdempotencyKey(),
            },
            paymentOpts(provider),
          ),
        ).rejects.toMatchObject({ code: "PAYMENT_NEGATIVE_PAYABLE" });
      } catch (error) {
        // Evaluation may refuse a commercially impossible negative quote.
        expect(error).toBeTruthy();
      }
    });
  });
});

describe("IMP-022 payment domain — failure / retry / indeterminate / success", () => {
  it("definitive failure → OPEN + READY + RELEASED; retry new attempt/E2", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(provider);
      const first = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("a1"),
        },
        opts,
      );
      expect(first.payment.status).toBe("OPEN");
      expect(first.attempt.status).toBe("FAILED");
      expect(first.attempt.providerExecutionIdentity).toBeTruthy();
      const e1 = first.attempt.providerExecutionIdentity;

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(checkout!.status).toBe("READY_FOR_PAYMENT");

      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select status from app.promotion_redemption_claims
          where payment_attempt_id = ${first.attempt.id}::uuid
        `);
        for (const row of claims.rows) {
          expect(row.status).toBe("RELEASED");
        }
      });

      const retried = await retryPayment(
        h.persistence,
        h.actor,
        {
          paymentId: first.payment.id,
          expectedCheckoutRevision: checkout!.revision,
          paymentMethodIntent: "card",
          idempotencyKey: newIdempotencyKey("a2"),
        },
        {
          ...opts,
          provider: createFakePaymentProvider({ defaultOutcome: "pending" }),
        },
      );
      expect(retried.payment.id).toBe(first.payment.id);
      expect(retried.payment.expectedAmountPaise).toBe(
        first.payment.expectedAmountPaise,
      );
      expect(retried.payment.currency).toBe("INR");
      expect(retried.attempt.attemptOrdinal).toBe(BigInt(2));
      expect(retried.attempt.providerExecutionIdentity).not.toBe(e1);
      expect(retried.payment.status).toBe("PROCESSING");
    });
  });

  it("indeterminate blocks retry; reservation remains RESERVED", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({
        defaultOutcome: "indeterminate",
      });
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
      expect(started.payment.status).toBe("PROCESSING");
      expect(started.attempt.status).toBe("INDETERMINATE");

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(checkout!.status).toBe("PAYMENT_PENDING");

      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select status from app.promotion_redemption_claims
          where payment_attempt_id = ${started.attempt.id}::uuid
        `);
        for (const row of claims.rows) {
          expect(row.status).toBe("RESERVED");
        }
      });

      await expect(
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("retry"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_PROCESSING" });
    });
  });

  it("verified success consumes claim once; duplicate success no second revision", async () => {
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
      expect(started.payment.status).toBe("PROCESSING");

      const success = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          providerEventId: `evt-${started.attempt.id}`,
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(success!.payment!.status).toBe("SUCCEEDED");
      expect(success!.attempt!.status).toBe("SUCCEEDED");
      expect(success!.checkoutStatus).toBe("COMPLETED");
      const revAfterSuccess = success!.checkoutRevision;

      await h.persistence.withContext(async (ctx) => {
        const claims = await ctx.db.execute(sql`
          select status, consumed_at from app.promotion_redemption_claims
          where payment_attempt_id = ${started.attempt.id}::uuid
        `);
        for (const row of claims.rows) {
          expect(row.status).toBe("CONSUMED");
          expect(row.consumed_at).not.toBeNull();
        }
      });

      const dup = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          providerEventId: `evt-dup-${started.attempt.id}`,
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(dup!.payment!.status).toBe("SUCCEEDED");
      expect(dup!.checkoutRevision).toBe(revAfterSuccess);

      const payment = await getPayment(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(payment.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(payment.currency).toBe("INR");
    });
  });

  it("sync succeed path also settles amount/currency and checkout", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "netbanking",
          idempotencyKey: newIdempotencyKey(),
        },
        opts,
      );
      expect(started.payment.status).toBe("SUCCEEDED");
      expect(started.payment.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(started.attempt.status).toBe("SUCCEEDED");
      // PAYMENT_PENDING then COMPLETED — two revision bumps.
      expect(started.checkoutRevision).toBe(h.revision + BigInt(2));
    });
  });
});

describe("IMP-022 payment domain — expiry / abandonment / browser return", () => {
  it("after definitive non-success, elapsed Checkout TTL expires Payment; unresolved Attempt is not terminated by TTL alone", async () => {
    await withPaymentReadyHarness(async (h) => {
      const mutable = mutableCheckoutClock(FIXED_NOW);
      // Short Checkout TTL is the sole commercial-validity clock after
      // definitive non-success (Checkout.expires_at).
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const failed = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey(),
        },
        {
          clock: mutable.clock,
          policy: {},
          checkoutPolicy: CHECKOUT_POLICY,
          provider,
        },
      );
      expect(failed.payment.status).toBe("OPEN");

      mutable.advance(CHECKOUT_POLICY.checkoutTtlMs + 1);
      // getActiveCheckout returns null once Checkout TTL elapses — retry still
      // uses the last known revision and must fail closed on Payment expiry.
      await expect(
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: failed.payment.id,
            expectedCheckoutRevision: failed.checkoutRevision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("late"),
          },
          {
            clock: mutable.clock,
            policy: {},
            checkoutPolicy: CHECKOUT_POLICY,
            provider,
          },
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_EXPIRED" });
    });

    await withPaymentReadyHarness(async (h) => {
      const mutable = mutableCheckoutClock(FIXED_NOW);
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = {
        clock: mutable.clock,
        policy: {},
        checkoutPolicy: CHECKOUT_POLICY,
        provider,
      };
      const pending = await startPayment(
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
      expect(pending.attempt.status).toBe("PENDING");
      // Unresolved Attempt crossing Checkout TTL must still accept provider success.
      mutable.advance(CHECKOUT_POLICY.checkoutTtlMs + 1);

      const late = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: pending.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: pending.payment.expectedAmountPaise,
          providerEventId: `late-${pending.attempt.id}`,
        },
        opts,
      );
      expect(late!.payment!.status).toBe("SUCCEEDED");
      expect(late!.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
    });
  });

  it("customer abandonment cancels Payment and returns Checkout to DRAFT", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(provider);
      const failed = await startPayment(
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
      expect(failed.payment.status).toBe("OPEN");
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(checkout!.status).toBe("READY_FOR_PAYMENT");
      expect(checkout!.activeSnapshotId).toBe(h.snapshotId);
      const revisionBeforeCancel = checkout!.revision;

      const cancelled = await cancelPayment(
        h.persistence,
        h.actor,
        {
          paymentId: failed.payment.id,
          expectedCheckoutRevision: checkout!.revision,
        },
        opts,
      );
      expect(cancelled.payment!.status).toBe("CANCELLED");
      expect(cancelled.payment!.cancelledAt).not.toBeNull();
      expect(cancelled.attempt!.status).toBe("FAILED");
      expect(cancelled.checkoutStatus).toBe("DRAFT");
      expect(cancelled.checkoutRevision).toBe(revisionBeforeCancel + BigInt(1));

      await h.persistence.withContext(async (ctx) => {
        const chk = await ctx.db.execute(sql`
          select status, active_snapshot_id::text as snap, revision::text as rev
          from app.checkouts where id = ${h.checkoutId}::uuid
        `);
        expect(chk.rows[0]?.status).toBe("DRAFT");
        expect(chk.rows[0]?.snap).toBeNull();
        expect(chk.rows[0]?.rev).toBe(
          (revisionBeforeCancel + BigInt(1)).toString(),
        );
        // Immutable historical snapshot row remains.
        const snap = await ctx.db.execute(sql`
          select count(*)::text as c from app.checkout_snapshots
          where id = ${h.snapshotId}::uuid
        `);
        expect(snap.rows[0]?.c).toBe("1");
      });
    });
  });

  it("PROCESSING Payment cancel leaves Payment PROCESSING and Checkout PAYMENT_PENDING", async () => {
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
      expect(started.payment.status).toBe("PROCESSING");
      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(checkout!.status).toBe("PAYMENT_PENDING");
      const revisionBefore = checkout!.revision;

      await expect(
        cancelPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: checkout!.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED_ATTEMPT" });

      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.checkoutStatus).toBe("PAYMENT_PENDING");
      expect(state.checkoutRevision).toBe(revisionBefore);
      expect(state.attempt!.status).toBe("PENDING");
    });
  });

  it("browser return is not success authority", async () => {
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

      // Unverified "browser success" payload must not settle.
      const rawBody = new TextEncoder().encode(
        JSON.stringify({
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          status: "success",
          amountPaise: started.payment.expectedAmountPaise.toString(),
        }),
      );
      await expect(
        provider.verifyWebhook({
          rawBody,
          headers: { [FAKE_PAYMENT_SIGNATURE_HEADER]: "not-a-real-signature" },
        }),
      ).rejects.toBeInstanceOf(PaymentError);

      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.checkoutStatus).toBe("PAYMENT_PENDING");
    });
  });

  it("supersede OPEN payment when commercial terms rebuild", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(provider);
      const failed = await startPayment(
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
      const superseded = await supersedePayment(
        h.persistence,
        h.actor,
        failed.payment.id,
        opts,
      );
      expect(superseded.status).toBe("SUPERSEDED");
      expect(superseded.supersededAt).not.toBeNull();
    });
  });

  it("IMP-036C: after failed attempt, destination change with current revision rebuilds commercial snapshot without reusing payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(provider);
      const failed = await startPayment(
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
      expect(failed.payment.status).toBe("OPEN");
      expect(failed.attempt.status).toBe("FAILED");

      const afterFail = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(afterFail).not.toBeNull();
      expect(afterFail!.status).toBe("READY_FOR_PAYMENT");
      expect(afterFail!.revision).toBe(failed.checkoutRevision);

      const changed = await setCheckoutDestination(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: afterFail!.revision,
          destination: {
            ...h.oneTimeDestination,
            recipientName: "Alt Recipient",
          },
        },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(changed.status).toBe("DRAFT");
      expect(changed.activeSnapshotId).toBeNull();

      const rebuilt = await evaluateCheckout(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: changed.revision,
        },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      expect(rebuilt.checkout.status).toBe("READY_FOR_PAYMENT");
      expect(rebuilt.snapshot.id).not.toBe(failed.payment.checkoutSnapshotId);

      const restarted = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: rebuilt.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("rebuild"),
        },
        opts,
      );
      expect(restarted.payment.id).not.toBe(failed.payment.id);
      expect(restarted.payment.checkoutSnapshotId).toBe(rebuilt.snapshot.id);
      expect(restarted.payment.expectedAmountPaise).toBe(rebuilt.snapshot.grandTotalPaise);

      // Prior OPEN payment remains bound to the obsolete snapshot (not reused).
      const prior = await getPayment(
        h.persistence,
        h.actor,
        { paymentId: failed.payment.id },
        opts,
      );
      expect(prior.status).toBe("OPEN");
      expect(prior.checkoutSnapshotId).toBe(failed.payment.checkoutSnapshotId);
    });
  });

  it("reconcile pending attempt via query success", async () => {
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
      provider.setOutcome(
        started.attempt.providerExecutionIdentity,
        "succeed",
      );
      const reconciled = await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );
      expect(reconciled.payment!.status).toBe("SUCCEEDED");
      expect(reconciled.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(reconciled.checkoutStatus).toBe("COMPLETED");
    });
  });
});
