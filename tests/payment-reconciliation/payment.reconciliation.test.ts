/**
 * Payment reconciliation / recovery tests (IMP-022) — PAY-G9.
 * IMP-036C: bounded secondary reconcile on getPaymentState (D-362).
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  getPaymentState,
  reconcilePaymentAttempt,
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import { getActiveCheckout } from "../../src/server/checkout";
import { PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS } from "../../src/shared/payment";
import {
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  mutableCheckoutClock,
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

describe("IMP-036C bounded secondary reconcile via getPaymentState", () => {
  it("provider DEFINITIVE_FAILURE converges attempt FAILED / payment OPEN / checkout READY_FOR_PAYMENT", async () => {
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
      expect(started.attempt.status).toBe("PENDING");

      provider.setOutcome(started.attempt.providerExecutionIdentity, "fail");
      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.attempt!.status).toBe("FAILED");
      expect(state.payment!.status).toBe("OPEN");
      expect(state.checkoutStatus).toBe("READY_FOR_PAYMENT");
      expect(state.attempts).toHaveLength(1);
    });
  });

  it("provider PENDING stays unresolved and does not invent FAILED", async () => {
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
      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.attempt!.status).toBe("PENDING");
      expect(state.checkoutStatus).toBe("PAYMENT_PENDING");
    });
  });

  it("provider INDETERMINATE stays unresolved without second Pay eligibility", async () => {
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
      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.attempt!.status).toBe("INDETERMINATE");

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
            idempotencyKey: newIdempotencyKey("still-blocked"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_PROCESSING" });
    });
  });

  it("provider SUCCEEDED materializes success on state read without new Attempt", async () => {
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
      const attemptId = started.attempt.id;
      provider.setOutcome(started.attempt.providerExecutionIdentity, "succeed");
      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("SUCCEEDED");
      expect(state.attempt!.id).toBe(attemptId);
      expect(state.attempts).toHaveLength(1);
      expect(state.checkoutStatus).toBe("COMPLETED");
    });
  });

  it("duplicate getPaymentState reconcile remains idempotent", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const clock = mutableCheckoutClock();
      const opts = paymentOpts(provider, clock.clock);
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
      const first = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      clock.advance(PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS + 1);
      const second = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(first.attempt!.status).toBe("FAILED");
      expect(second.attempt!.status).toBe("FAILED");
      expect(second.payment!.status).toBe("OPEN");
      expect(second.attempts).toHaveLength(1);
      expect(second.attempt!.id).toBe(first.attempt!.id);
    });
  });

  it("respects secondary reconcile cooldown between provider queries", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const clock = mutableCheckoutClock();
      const opts = paymentOpts(provider, clock.clock);
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
      const before = provider.queryExecutionCallCount;
      await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      const mid = provider.queryExecutionCallCount;
      await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      const afterImmediate = provider.queryExecutionCallCount;
      expect(mid).toBe(before + 1);
      expect(afterImmediate).toBe(mid);

      clock.advance(PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS + 1);
      provider.setOutcome(started.attempt.providerExecutionIdentity, "fail");
      const converged = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(provider.queryExecutionCallCount).toBe(afterImmediate + 1);
      expect(converged.attempt!.status).toBe("FAILED");
      expect(converged.payment!.status).toBe("OPEN");
    });
  });

  it("without provider option remains read-only (no invented FAILED)", async () => {
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
      const state = await getPaymentState(h.persistence, h.actor, {
        paymentId: started.payment.id,
      });
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.attempt!.status).toBe("PENDING");
    });
  });
});
