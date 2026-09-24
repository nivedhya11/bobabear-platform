/**
 * IMP-036H-F — Handover mismatch safety (AC-036H-040).
 *
 * Wrong expectedRevision → ORDER_CONFLICT; wrong / unknown orderId → ORDER_NOT_FOUND.
 * Workforce cannot fulfil Order A by presenting mismatched confirmation identity.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  acceptOrder,
  fulfilOrder,
  getWorkforceOrder,
} from "../../src/server/order";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  orderOpts,
  withCompletedPositivePickupOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-F Pickup handover mismatch safety (AC-036H-040)", () => {
  it("stale expectedOrderRevision on Pickup fulfil → ORDER_CONFLICT (Order unchanged)", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
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
      const revisionAtAccept = BigInt(accepted.revision);

      await expect(
        fulfilOrder(
          h.persistence,
          h.workforce.kitchen,
          {
            orderId: h.order.id,
            // Stale revision as if confirming an outdated Order card.
            expectedOrderRevision: h.order.revision,
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({
        code: "ORDER_CONFLICT",
        field: "expectedOrderRevision",
      });

      const current = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(current.status).toBe("ACCEPTED");
      expect(BigInt(current.revision)).toBe(revisionAtAccept);
    });
  });

  it("unknown orderId fulfil → ORDER_NOT_FOUND; intended Pickup Order untouched", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );

      await expect(
        fulfilOrder(
          h.persistence,
          h.workforce.kitchen,
          {
            orderId: "00000000-0000-4000-8000-000000000099",
            expectedOrderRevision: BigInt(accepted.revision),
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });

      const current = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(current.status).toBe("ACCEPTED");
      expect(current.orderId).toBe(h.order.id);
    });
  });
});
