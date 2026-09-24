/**
 * IMP-036H-F — Pickup cancel / refund continuity (AC-036H-027).
 * Proves existing cancel + refund authorities apply; no V1 no-show penalty.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  acceptOrder,
  cancelOrder,
  getWorkforceOrder,
} from "../../src/server/order";
import { requestRefund } from "../../src/server/refund";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  orderOpts,
  withCompletedPositivePickupOrderHarness,
} from "../database/support/order-fixtures";
import { ensureProviderPaymentReference } from "../database/support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-F Pickup cancel / refund (AC-036H-027)", () => {
  it("accept → cancel Pickup Order under existing authority; no no-show penalty line", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      expect(h.order.status).toBe("PLACED");
      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      expect(accepted.status).toBe("ACCEPTED");

      const cancelled = await cancelOrder(
        h.persistence,
        h.workforce.support,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(accepted.revision),
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        },
        orderOpts(),
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");

      // Snapshot commercial totals unchanged — no no-show / penalty charge invented.
      const snap = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select grand_total_paise::text as total,
                 charges_paise::text as charges
          from app.checkout_snapshots where id = ${h.snapshotId}::uuid
        `);
        return rows.rows[0]!;
      });
      expect(BigInt(snap.total as string)).toBe(h.grandTotalPaise);

      const chargeCodes = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select charge_code from app.checkout_snapshot_charges
          where snapshot_id = ${h.snapshotId}::uuid
        `);
        return rows.rows.map((r) => r.charge_code as string);
      });
      expect(chargeCodes.every((c) => !/no.?show|penalty/i.test(c))).toBe(true);
      expect(chargeCodes).not.toContain("delivery");
    });
  });

  it("full refund on Pickup Payment preserves Order totals; no no-show penalty", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      await ensureProviderPaymentReference(h);
      h.provider.setRefundOutcome("processed");

      const orderBefore = await getWorkforceOrder(
        h.persistence,
        h.workforce.support,
        { orderId: h.order.id },
      );

      const result = await requestRefund(
        h.persistence,
        h.workforce.support,
        {
          paymentId: h.paymentId,
          amountPaise: h.grandTotalPaise,
          reason: "pickup customer cancellation",
        },
        { provider: h.provider },
      );

      expect(result.refund.status).toBe("PROCESSED");
      expect(result.refund.amountPaise).toBe(h.grandTotalPaise);
      expect(result.balance.fullyRefunded).toBe(true);
      // Refund equals paid amount — no extra no-show deduction/penalty.
      expect(result.balance.successfulRefundedAmount).toBe(h.grandTotalPaise);

      const orderAfter = await getWorkforceOrder(
        h.persistence,
        h.workforce.support,
        { orderId: h.order.id },
      );
      expect(orderAfter.status).toBe(orderBefore.status);
      expect(orderAfter.orderNumber).toBe(orderBefore.orderNumber);
      expect(orderAfter.fulfilmentMode).toBe("PICKUP");
    });
  });
});
