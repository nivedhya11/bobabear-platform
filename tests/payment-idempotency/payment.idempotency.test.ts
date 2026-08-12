/**
 * Payment idempotency tests (IMP-022) — PAY-G7.
 */
import { afterEach, describe, expect, it } from "vitest";

import { getActiveCheckout } from "../../src/server/checkout";
import {
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import {
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-022 payment idempotency", () => {
  it("replay same key+request returns same Payment; conflict on different material", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const key = newIdempotencyKey("replay");
      const first = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: key,
        },
        opts,
      );
      const replay = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: key,
        },
        opts,
      );
      expect(replay.payment.id).toBe(first.payment.id);
      expect(replay.attempt.id).toBe(first.attempt.id);
      expect(replay.payment.expectedAmountPaise).toBe(h.grandTotalPaise);

      await expect(
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "card",
            idempotencyKey: key,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_IDEMPOTENCY_CONFLICT" });
    });
  });

  it("cross-customer key isolation", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const sharedKey = newIdempotencyKey("shared");
      const a = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: sharedKey,
        },
        opts,
      );
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: sharedKey,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });

      const stateProbe = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: sharedKey,
        },
        opts,
      );
      expect(stateProbe.payment.id).toBe(a.payment.id);
    });
  });

  it("E1 reused on transport retry; E2 on genuine financial retry", async () => {
    await withPaymentReadyHarness(async (h) => {
      const failProvider = createFakePaymentProvider({ defaultOutcome: "fail" });
      const opts = paymentOpts(failProvider);
      const startKey = newIdempotencyKey("e1");
      const first = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: startKey,
        },
        opts,
      );
      const e1 = first.attempt.providerExecutionIdentity;
      const transportRetry = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: startKey,
        },
        opts,
      );
      expect(transportRetry.attempt.providerExecutionIdentity).toBe(e1);

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      const retryKey = newIdempotencyKey("e2");
      const pendingProvider = createFakePaymentProvider({
        defaultOutcome: "pending",
      });
      const second = await retryPayment(
        h.persistence,
        h.actor,
        {
          paymentId: first.payment.id,
          expectedCheckoutRevision: checkout!.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: retryKey,
        },
        { ...opts, provider: pendingProvider },
      );
      expect(second.attempt.providerExecutionIdentity).not.toBe(e1);
      expect(second.attempt.attemptOrdinal).toBe(BigInt(2));
      expect(second.payment.id).toBe(first.payment.id);
      expect(second.payment.expectedAmountPaise).toBe(
        first.payment.expectedAmountPaise,
      );
    });
  });
});
