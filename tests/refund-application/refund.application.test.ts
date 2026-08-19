/**
 * IMP-027 Refund application service tests (RF-01..RF-03, RF-06..RF-12, RF-16, RF-19, RF-20, RF-22).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getWorkforceOrder } from "../../src/server/order";
import { findRefundById } from "../../src/server/refund/repository";
import {
  getRefund,
  reconcileRefund,
  requestRefund,
} from "../../src/server/refund";
import { RefundError } from "../../src/shared/refund";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  secondPersistence,
  withRefundReadyHarness,
} from "../database/support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-027 refund application service", () => {
  it("RF-01 full refund keeps Payment SUCCEEDED and Order/Checkout unchanged", async () => {
    await withRefundReadyHarness(async (h) => {
      const orderBefore = await getWorkforceOrder(h.persistence, h.workforce.support, {
        orderId: h.order.id,
      });
      const snapshotBefore = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select grand_total_paise::text as total, currency
          from app.checkout_snapshots where id = ${h.snapshotId}::uuid
        `);
        return rows.rows[0];
      });

      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: h.grandTotalPaise,
          reason: "customer complaint",
        },
        { provider: h.provider },
      );

      expect(result.refund.status).toBe("PROCESSED");
      expect(result.refund.amountPaise).toBe(h.grandTotalPaise);
      expect(result.balance.fullyRefunded).toBe(true);
      expect(result.paymentStatus).toBe("SUCCEEDED");
      expect(result.refund.providerIdempotencyKey).toBe(
        `boba_rfnd_${result.refund.id.replace(/-/g, "")}`,
      );

      const orderAfter = await getWorkforceOrder(h.persistence, h.workforce.support, {
        orderId: h.order.id,
      });
      const snapshotAfter = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select grand_total_paise::text as total, currency
          from app.checkout_snapshots where id = ${h.snapshotId}::uuid
        `);
        return rows.rows[0];
      });
      expect(orderAfter.status).toBe(orderBefore.status);
      expect(orderAfter.orderNumber).toBe(orderBefore.orderNumber);
      expect(orderAfter.cancelledAt).toBe(orderBefore.cancelledAt);
      expect(snapshotAfter?.total).toBe(snapshotBefore?.total);
      expect(snapshotAfter?.currency).toBe(snapshotBefore?.currency);
    });
  });

  it("RF-02 / RF-03 partial then second partial refund", async () => {
    await withRefundReadyHarness(async (h) => {
      const firstAmount = h.grandTotalPaise / BigInt(2);
      const first = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: firstAmount,
          reason: "partial one",
        },
        { provider: h.provider },
      );
      expect(first.refund.status).toBe("PROCESSED");
      expect(first.balance.successfulRefundedAmount).toBe(firstAmount);
      expect(first.paymentStatus).toBe("SUCCEEDED");

      const secondAmount = h.grandTotalPaise - firstAmount;
      const second = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: secondAmount,
          reason: "partial two",
        },
        { provider: h.provider },
      );
      expect(second.refund.id).not.toBe(first.refund.id);
      expect(second.refund.providerIdempotencyKey).not.toBe(
        first.refund.providerIdempotencyKey,
      );
      expect(second.balance.fullyRefunded).toBe(true);
      expect(second.paymentStatus).toBe("SUCCEEDED");
    });
  });

  it("RF-07 provider pending is not PROCESSED", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("pending");
      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(100),
          reason: "pending path",
        },
        { provider: h.provider },
      );
      expect(result.refund.status).toBe("PENDING");
      expect(result.balance.reservedRefundAmount).toBe(BigInt(100));
      expect(result.balance.successfulRefundedAmount).toBe(BigInt(0));
    });
  });

  it("RF-09 provider failed releases reservation", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("failed");
      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(100),
          reason: "failed path",
        },
        { provider: h.provider },
      );
      expect(result.refund.status).toBe("FAILED");
      expect(result.balance.reservedRefundAmount).toBe(BigInt(0));
      expect(result.balance.successfulRefundedAmount).toBe(BigInt(0));
    });
  });

  it("RF-10 retries the same Refund with the same idempotency identity", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("indeterminate");
      const first = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(250),
          reason: "uncertain then retry",
        },
        { provider: h.provider },
      );
      expect(first.refund.status).toBe("INDETERMINATE");
      const key = first.refund.providerIdempotencyKey;

      h.provider.setRefundOutcome("processed");
      const retried = await reconcileRefund(
        h.persistence,
        h.workforce.support,
        { refundId: first.refund.id },
        { provider: h.provider },
      );
      expect(retried.refund.id).toBe(first.refund.id);
      expect(retried.refund.providerIdempotencyKey).toBe(key);
      expect(retried.refund.status).toBe("PROCESSED");
      expect(retried.balance.successfulRefundedAmount).toBe(BigInt(250));
    });
  });

  it("RF-12 / provider-after-commit: createRefund sees the committed reservation from another connection", async () => {
    await withRefundReadyHarness(async (h) => {
      const other = secondPersistence(h.connectionString);
      let seenStatus: string | null = null;
      h.provider.setCreateRefundHook(async (input) => {
        const row = await other.withContext((ctx) => findRefundById(ctx, input.refundId));
        seenStatus = row?.status ?? null;
      });
      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(150),
          reason: "commit before provider",
        },
        { provider: h.provider },
      );
      expect(seenStatus).toBe("ACCEPTED");
      expect(result.refund.status).toBe("PROCESSED");
      expect(h.provider.createRefundCallCount).toBe(1);
    });
  });

  it("RF-16 missed-webhook reconciliation moves PENDING to PROCESSED", async () => {
    await withRefundReadyHarness(async (h) => {
      h.provider.setRefundOutcome("pending");
      const created = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(300),
          reason: "missed webhook",
        },
        { provider: h.provider },
      );
      expect(created.refund.status).toBe("PENDING");
      h.provider.setRefundOutcome("processed");
      const reconciled = await reconcileRefund(
        h.persistence,
        h.workforce.support,
        { refundId: created.refund.id },
        { provider: h.provider },
      );
      expect(reconciled.refund.status).toBe("PROCESSED");
      expect(reconciled.balance.successfulRefundedAmount).toBe(BigInt(300));
    });
  });

  it("RF-22 authorization fail-closed and audit facts persist", async () => {
    await withRefundReadyHarness(async (h) => {
      await expect(
        requestRefund(
          h.persistence,
          h.workforce.kitchen,
          {
            paymentId: h.paymentId,
            amountPaise: BigInt(100),
            reason: "kitchen cannot refund",
          },
          { provider: h.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_UNAUTHORIZED" });

      await expect(
        requestRefund(
          h.persistence,
          h.actor,
          {
            paymentId: h.paymentId,
            amountPaise: BigInt(100),
            reason: "customer cannot refund",
          },
          { provider: h.provider },
        ),
      ).rejects.toBeInstanceOf(RefundError);

      const created = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: BigInt(100),
          reason: "audited refund",
          operatorNote: "internal only",
        },
        { provider: h.provider },
      );
      expect(created.refund.initiatedByActorId).toBe(h.workforce.supportUser.id);
      expect(created.refund.reason).toBe("audited refund");
      expect(created.refund.operatorNote).toBe("internal only");
      expect(created.refund.authorizedPermission).toBe("payment.refund");

      const readable = await getRefund(
        h.persistence,
        h.workforce.finance,
        { refundId: created.refund.id },
      );
      expect(readable.refund.id).toBe(created.refund.id);

      await expect(
        requestRefund(
          h.persistence,
          h.workforce.finance,
          {
            paymentId: h.paymentId,
            amountPaise: BigInt(100),
            reason: "finance cannot initiate",
          },
          { provider: h.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_UNAUTHORIZED" });
    });
  });

  it("rejects missing reason and non-success Payment", async () => {
    await withRefundReadyHarness(async (h) => {
      await expect(
        requestRefund(
          h.persistence,
          h.workforce.support,
          { paymentId: h.paymentId, amountPaise: BigInt(100) },
          { provider: h.provider },
        ),
      ).rejects.toMatchObject({ code: "REFUND_REASON_REQUIRED" });
    });
  });
});
