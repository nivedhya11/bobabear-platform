/**
 * Payment security tests (IMP-022) — PAY-G4.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { prepareCheckoutForPayment } from "../../src/server/checkout";
import {
  cancelPayment,
  getPayment,
  getPaymentState,
  processVerifiedProviderEvent,
  reconcilePaymentAttempt,
  retryPayment,
  startPayment,
} from "../../src/server/payment";
import { PaymentError } from "../../src/shared/payment";
import {
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FAKE_PAYMENT_WEBHOOK_SECRET,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
  withPaymentReadyHarness,
} from "../database/support/payment-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-022 payment security", () => {
  it("IDOR: Customer B cannot read, retry, cancel, or reconcile Customer A's payment", async () => {
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

      await expect(
        getPayment(
          h.persistence,
          h.actors.customerB,
          { paymentId: started.payment.id },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        getPaymentState(
          h.persistence,
          h.actors.customerB,
          { paymentId: started.payment.id },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        reconcilePaymentAttempt(
          h.persistence,
          h.actors.customerB,
          {
            paymentId: started.payment.id,
            attemptId: started.attempt.id,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        retryPayment(
          h.persistence,
          h.actors.customerB,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: started.checkoutRevision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("b-retry"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        cancelPayment(
          h.persistence,
          h.actors.customerB,
          {
            paymentId: started.payment.id,
            expectedCheckoutRevision: started.checkoutRevision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });

      await expect(
        startPayment(
          h.persistence,
          h.actors.customerB,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("b"),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
    });
  });

  it("actor forgery: plain object / null cannot start payment or prepare checkout", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const opts = paymentOpts(provider);
      const input = {
        checkoutId: h.checkoutId,
        expectedCheckoutRevision: h.revision,
        paymentMethodIntent: "upi" as const,
        idempotencyKey: newIdempotencyKey(),
      };
      await expect(
        startPayment(h.persistence, null, input, opts),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        startPayment(
          h.persistence,
          { kind: "customer", authUserId: h.actors.customerAId },
          input,
          opts,
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
      await expect(
        prepareCheckoutForPayment(
          h.persistence,
          { kind: "customer", authUserId: h.actors.customerAId },
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
          },
          { clock: opts.clock, policy: CHECKOUT_POLICY },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });

  it("monetary forgery: amount/currency fields rejected", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      const opts = paymentOpts(provider);
      for (const forged of [
        { amountPaise: 1 },
        { currency: "USD" },
        { expectedAmountPaise: "1" },
        { grandTotalPaise: 0 },
      ]) {
        await expect(
          startPayment(
            h.persistence,
            h.actor,
            {
              checkoutId: h.checkoutId,
              expectedCheckoutRevision: h.revision,
              paymentMethodIntent: "upi",
              idempotencyKey: newIdempotencyKey(),
              ...forged,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "PAYMENT_INVALID_INPUT" });
      }
    });
  });

  it("customer-supplied provider success/status and plain VerifiedProviderEvent forgery rejected", async () => {
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

      await expect(
        startPayment(
          h.persistence,
          h.actor,
          {
            checkoutId: h.checkoutId,
            expectedCheckoutRevision: h.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("status"),
            status: "SUCCEEDED",
            providerStatus: "success",
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_INVALID_INPUT" });

      const forgedPlain = {
        provider: provider.name,
        rawBody: new Uint8Array(),
        headers: {},
        evidence: {
          outcome: "SUCCEEDED",
          provider: provider.name,
          providerExecutionIdentity: started.attempt.providerExecutionIdentity,
          observedAmountPaise: started.payment.expectedAmountPaise,
          observedCurrency: "INR" as const,
          providerStatusCode: "SUCCESS",
          providerTimestamp: new Date(),
          providerEventId: "forged",
          payloadDigest: null,
        },
      };
      await expect(
        processVerifiedProviderEvent(h.persistence, forgedPlain, opts),
      ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_EVIDENCE_INVALID" });

      // TypeScript cast alone cannot create runtime provider authority.
      const castForged = forgedPlain as unknown as Parameters<
        typeof processVerifiedProviderEvent
      >[1];
      await expect(
        processVerifiedProviderEvent(h.persistence, castForged, opts),
      ).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_EVIDENCE_INVALID" });

      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
    });
  });

  it("public barrel cannot mint sealed provider evidence; deep seal is not on public export", async () => {
    const paymentIndex = await import("../../src/server/payment");
    expect(
      Object.prototype.hasOwnProperty.call(
        paymentIndex,
        "sealVerifiedProviderEvent",
      ),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        paymentIndex,
        "requireVerifiedProviderEvent",
      ),
    ).toBe(false);

    const indexSource = readFileSync(
      path.join(process.cwd(), "src/server/payment/index.ts"),
      "utf8",
    );
    expect(indexSource).not.toMatch(
      /\bexport\s+\{[^}]*\bsealVerifiedProviderEvent\b/,
    );
    expect(indexSource).toMatch(
      /Intentionally NOT re-exported: sealVerifiedProviderEvent/,
    );
  });

  it("unverified webhook has zero effect; secrets never appear in errors", async () => {
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
      let caught: unknown;
      try {
        await provider.verifyWebhook({
          rawBody,
          headers: { [FAKE_PAYMENT_SIGNATURE_HEADER]: "forged" },
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PaymentError);
      const safe = (caught as PaymentError).toSafeJSON();
      expect(JSON.stringify(safe)).not.toContain(FAKE_PAYMENT_WEBHOOK_SECRET);
      expect(JSON.stringify(safe)).not.toContain("forged");

      const state = await getPaymentState(
        h.persistence,
        h.actor,
        { paymentId: started.payment.id },
        opts,
      );
      expect(state.payment!.status).toBe("PROCESSING");
      expect(state.payment!.expectedAmountPaise).toBe(h.grandTotalPaise);
      expect(state.checkoutStatus).toBe("PAYMENT_PENDING");

      const ok = await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
          providerEventId: `sec-${started.attempt.id}`,
        },
        opts,
      );
      expect(ok!.payment!.status).toBe("SUCCEEDED");
    });
  });
});
