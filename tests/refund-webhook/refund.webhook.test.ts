/**
 * IMP-027 Refund webhook / inbox tests (RF-13, RF-14, RF-15, RF-17).
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  enqueueVerifiedProviderEvent,
  getInboxByProviderEvent,
  isRefundInboxEvidence,
  PaymentInboxProcessor,
} from "../../src/server/payment/inbox";
import { FAKE_PAYMENT_SIGNATURE_HEADER } from "../../src/server/payment/provider";
import {
  applyRefundProviderEvidence,
  getRefund,
  getRefundBalanceForPayment,
  requestRefund,
} from "../../src/server/refund";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { withRefundReadyHarness } from "../database/support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function fakeRefundEvidence(
  provider: {
    verifyWebhook(input: {
      rawBody: Uint8Array;
      headers: Readonly<Record<string, string>>;
    }): Promise<unknown>;
    computeWebhookSignature(rawBody: Uint8Array): string;
  },
  body: Record<string, unknown>,
) {
  const rawBody = new TextEncoder().encode(JSON.stringify(body));
  const evidence = await provider.verifyWebhook({
    rawBody,
    headers: { [FAKE_PAYMENT_SIGNATURE_HEADER]: provider.computeWebhookSignature(rawBody) },
  });
  if (!isRefundInboxEvidence(evidence as never)) {
    throw new Error("expected refund evidence");
  }
  return evidence as ReturnType<typeof isRefundInboxEvidence> extends true
    ? never
    : import("../../src/shared/refund").NormalizedRefundEvidence;
}

describe("IMP-027 refund webhooks", () => {
  it("RF-13 duplicate event id is one inbox row; duplicate processed does not double-count", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("pending");
      const created = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(400),
          reason: "duplicate webhook",
        },
        { provider: h.provider },
      );

      const evidence = await fakeRefundEvidence(h.provider, {
        family: "refund",
        providerRefundId: created.refund.providerRefundId,
        providerPaymentId: h.providerPaymentId,
        outcome: "processed",
        providerEventId: "evt_refund_dup_1",
        amountPaise: 400,
      });

      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: h.provider.name,
          providerEventId: "evt_refund_dup_1",
          evidence,
          now: new Date(),
        }),
      );
      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: h.provider.name,
          providerEventId: "evt_refund_dup_1",
          evidence,
          now: new Date(),
        }),
      );
      const inbox = await h.persistence.withContext((ctx) =>
        getInboxByProviderEvent(ctx, {
          provider: h.provider.name,
          providerEventId: "evt_refund_dup_1",
        }),
      );
      expect(inbox).not.toBeNull();

      await applyRefundProviderEvidence(h.persistence, evidence);
      await applyRefundProviderEvidence(h.persistence, evidence);
      const balance = await getRefundBalanceForPayment(h.persistence, h.paymentId!);
      expect(balance.successfulRefundedAmount).toBe(BigInt(400));
    });
  });

  it("RF-14 out-of-order created after processed does not regress", async () => {
    await withRefundReadyHarness(async (h) => {
      const created = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(500),
          reason: "out of order",
        },
        { provider: h.provider },
      );
      expect(created.refund.status).toBe("PROCESSED");
      const evidence = await fakeRefundEvidence(h.provider, {
        family: "refund",
        providerRefundId: created.refund.providerRefundId,
        providerPaymentId: h.providerPaymentId,
        outcome: "pending",
        providerEventId: "evt_refund_late_created",
        amountPaise: 500,
      });
      await applyRefundProviderEvidence(h.persistence, evidence);
      const after = await getRefund(h.persistence, h.workforce.support, {
        refundId: created.refund.id,
      });
      expect(after.refund.status).toBe("PROCESSED");
    });
  });

  it("RF-15 webhook before createRefund response persistence correlates by payment id", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setCreateRefundHook(async () => {
        const evidence = await fakeRefundEvidence(h.provider, {
          family: "refund",
          providerRefundId: "rfnd_before_http",
          providerPaymentId: h.providerPaymentId,
          outcome: "processed",
          providerEventId: "evt_refund_before_http",
          amountPaise: 175,
        });
        const applied = await applyRefundProviderEvidence(h.persistence, evidence);
        expect(applied).toBe(true);
      });
      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(175),
          reason: "webhook first",
        },
        { provider: h.provider },
      );
      expect(result.refund.status).toBe("PROCESSED");
      expect(result.balance.successfulRefundedAmount).toBe(BigInt(175));
    });
  });

  it("RF-17 unknown refund correlation does not invent a Refund", async () => {
    await withRefundReadyHarness(async (h) => {
      const evidence = await fakeRefundEvidence(h.provider, {
        family: "refund",
        providerRefundId: "rfnd_unknown",
        providerPaymentId: "pay_does_not_exist",
        outcome: "processed",
        providerEventId: "evt_refund_unknown",
        amountPaise: 100,
      });
      const applied = await applyRefundProviderEvidence(h.persistence, evidence);
      expect(applied).toBe(false);

      const processor = new PaymentInboxProcessor({
        persistence: h.persistence,
        maxAttempts: 1,
        retryDelayMs: 1,
      });
      await h.persistence.transaction((tx) =>
        enqueueVerifiedProviderEvent(tx, {
          provider: h.provider.name,
          providerEventId: "evt_refund_unknown",
          evidence,
          now: new Date(),
        }),
      );
      await processor.tick();
      const inbox = await h.persistence.withContext((ctx) =>
        getInboxByProviderEvent(ctx, {
          provider: h.provider.name,
          providerEventId: "evt_refund_unknown",
        }),
      );
      expect(inbox?.processingState).toBe("poison");
    });
  });
});
