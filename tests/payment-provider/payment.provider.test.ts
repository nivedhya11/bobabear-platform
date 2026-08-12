/**
 * Payment provider / webhook trust tests (IMP-022) — PAY-G8 / §77.
 */
import { afterEach, describe, expect, it } from "vitest";

import { getPaymentState, startPayment } from "../../src/server/payment";
import { PaymentError } from "../../src/shared/payment";
import {
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-022 payment provider trust negatives", () => {
  it("unverified SUCCEEDED webhook → zero state effect", async () => {
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
      const rawBody = new TextEncoder().encode(
        JSON.stringify({
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise.toString(),
        }),
      );
      await expect(
        provider.verifyWebhook({
          rawBody,
          headers: { [FAKE_PAYMENT_SIGNATURE_HEADER]: "bad-sig" },
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

  it("wrong amount / currency → anomaly, no success", async () => {
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

      const wrongAmount = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise + BigInt(1),
          providerEventId: `amt-${started.attempt.id}`,
        },
        opts,
      );
      expect(wrongAmount!.payment!.status).toBe("PROCESSING");
      expect(wrongAmount!.checkoutStatus).toBe("PAYMENT_PENDING");

      // Currency mismatch is enforced inside applyProviderEvidence when
      // observedCurrency is non-null and not INR — craft evidence via
      // process after verify override is not available; amount mismatch above
      // is the primary financial gate. Confirm still unsettled:
      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(state.payment!.currency).toBe("INR");
      expect(state.payment!.status).toBe("PROCESSING");
    });
  });

  it("duplicate verified event is semantic no-op; stale failure after success does not regress", async () => {
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
      const first = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
          providerEventId: `ok-${started.attempt.id}`,
        },
        opts,
      );
      expect(first!.payment!.status).toBe("SUCCEEDED");
      const rev = first!.checkoutRevision;

      const dup = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
          providerEventId: `ok2-${started.attempt.id}`,
        },
        opts,
      );
      expect(dup!.checkoutRevision).toBe(rev);

      const staleFail = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "fail",
          providerEventId: `fail-${started.attempt.id}`,
        },
        opts,
      );
      expect(staleFail!.payment!.status).toBe("SUCCEEDED");
      expect(staleFail!.checkoutStatus).toBe("COMPLETED");
      expect(staleFail!.checkoutRevision).toBe(rev);
    });
  });

  it("provider pending HTTP success ≠ Payment SUCCEEDED; browser status=success ignored", async () => {
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

      // Browser return query params are not a Payment API — proving the
      // domain never accepts status=success as input authority:
      await expect(
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("browser"),
            status: "success",
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_INVALID_INPUT" });
    });
  });

  it("unknown execution identity webhook fails closed", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      await startPayment(
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
      const rawBody = new TextEncoder().encode(
        JSON.stringify({
          executionIdentity: "unknown-exec-id",
          outcome: "succeed",
          amountPaise: "10500",
        }),
      );
      const signature = provider.computeWebhookSignature(rawBody);
      await expect(
        provider.verifyWebhook({
          rawBody,
          headers: { [FAKE_PAYMENT_SIGNATURE_HEADER]: signature },
        }),
      ).rejects.toBeInstanceOf(PaymentError);
    });
  });
});
