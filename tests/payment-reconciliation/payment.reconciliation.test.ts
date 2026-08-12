/**
 * Payment reconciliation / recovery tests (IMP-022) — PAY-G9.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getPaymentState,
  reconcilePaymentAttempt,
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import { getActiveCheckout } from "../../src/server/checkout";
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

describe("IMP-022 payment reconciliation", () => {
  it("CREATED/PENDING recovery via query without new Attempt", async () => {
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
      expect(started.attempt.status).toBe("PENDING");
      const attemptId = started.attempt.id;
      const e1 = started.attempt.providerExecutionIdentity;

      provider.setOutcome(e1, "succeed");
      const recovered = await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id, attemptId },
        opts,
      );
      expect(recovered.payment!.status).toBe("SUCCEEDED");
      expect(recovered.attempt!.id).toBe(attemptId);
      expect(recovered.attempt!.providerExecutionIdentity).toBe(e1);
      expect(recovered.attempts).toHaveLength(1);
      expect(recovered.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(recovered.checkoutStatus).toBe("COMPLETED");
    });
  });

  it("INDETERMINATE recovery via query; retry remains blocked until resolved", async () => {
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
      expect(started.attempt.status).toBe("INDETERMINATE");

      const checkout = await getActiveCheckout(
        h.persistence,
        h.actor,
        { checkoutId: h.checkoutId },
        { clock: opts.clock, policy: CHECKOUT_POLICY },
      );
      await expect(
        retryPayment(
          h.persistence,
          h.actor,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: checkout!.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("blocked"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_PROCESSING" });

      provider.setOutcome(
        started.attempt.providerExecutionIdentity,
        "succeed",
      );
      const recovered = await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );
      expect(recovered.payment!.status).toBe("SUCCEEDED");
      expect(recovered.attempts).toHaveLength(1);
    });
  });

  it("query failure leaves PROCESSING; later success recovers same attempt", async () => {
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
      const failed = await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );
      expect(failed.payment!.status).toBe("OPEN");
      expect(failed.attempt!.status).toBe("FAILED");
      expect(failed.checkoutStatus).toBe("READY_FOR_PAYMENT");

      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.attempts).toHaveLength(1);
      expect(state.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
    });
  });
});
