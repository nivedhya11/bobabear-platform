/**
 * IMP-027 concurrent over-refund prevention (RF-05).
 *
 * Real PostgreSQL FOR UPDATE serialization — no sleep as the core proof.
 */
import { afterEach, describe, expect, it } from "vitest";

import { requestRefund } from "../../src/server/refund";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import { withRefundReadyHarness } from "../database/support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-027 concurrent refund reservation", () => {
  it("RF-05 exactly one of two concurrent oversubscribing refunds reserves", async () => {
    await withRefundReadyHarness(async (h) => {
      const captured = h.grandTotalPaise;
      const processed = captured / BigInt(5);
      if (processed <= BigInt(0)) {
        throw new Error("Fixture captured amount too small for concurrent refund test.");
      }
      h.provider.setRefundOutcome("processed");
      await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: processed,
          reason: "existing processed",
        },
        { provider: h.provider },
      );

      const remaining = captured - processed;
      const concurrentAmount = remaining / BigInt(2) + BigInt(1);
      const results = await Promise.allSettled([
        requestRefund(
          h.persistence,
          h.workforce.support,
          {
            paymentId: h.paymentId,
            amountPaise: concurrentAmount,
            reason: "concurrent A",
          },
          { provider: h.provider },
        ),
        requestRefund(
          h.persistence,
          h.workforce.support,
          {
            paymentId: h.paymentId,
            amountPaise: concurrentAmount,
            reason: "concurrent B",
          },
          { provider: h.provider },
        ),
      ]);

      const ok = results.filter((row) => row.status === "fulfilled");
      const fail = results.filter((row) => row.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(fail).toHaveLength(1);
      expect((fail[0] as PromiseRejectedResult).reason).toMatchObject({
        code: "REFUND_AMOUNT_EXCEEDS_REMAINING",
      });

      const winner = (ok[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof requestRefund>>>).value;
      expect(winner.balance.successfulRefundedAmount + winner.balance.reservedRefundAmount).toBeLessThanOrEqual(
        captured,
      );
      expect(winner.paymentStatus).toBe("SUCCEEDED");
    });
  });
});
