/**
 * IMP-036H-C — Delivery create fail-closed for Pickup Orders (AF-036H-08).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  arrangeDelivery,
  createDelivery,
  createFakeDeliveryProvider,
} from "../../src/server/delivery";
import { DeliveryError } from "../../src/shared/delivery";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  withCompletedPositiveOrderHarness,
  withCompletedPositivePickupOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

type OrderHarnessPersistence = Parameters<
  Parameters<typeof withCompletedPositivePickupOrderHarness>[0]
>[0]["persistence"];

async function countDeliveriesForOrder(
  persistence: OrderHarnessPersistence,
  orderId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select count(*)::text as c
      from app.deliveries
      where order_id = ${orderId}::uuid
    `);
    return Number((result.rows[0] as { c: string } | undefined)?.c ?? 0);
  });
}

describe("IMP-036H-C createDelivery fail-closed for PICKUP", () => {
  it("rejects direct create against Pickup Order with zero Delivery row and zero provider I/O", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      expect(await countDeliveriesForOrder(h.persistence, h.order.id)).toBe(0);

      await expect(
        createDelivery(
          h.persistence,
          {
            orderId: h.order.id,
            requestFingerprint: "fp-pickup-blocked",
          },
          { provider },
        ),
      ).rejects.toMatchObject({
        code: "DELIVERY_ORDER_NOT_ELIGIBLE",
      });

      expect(await countDeliveriesForOrder(h.persistence, h.order.id)).toBe(0);
      expect(provider.createBookingCallCount).toBe(0);
      expect(provider.queryBookingCallCount).toBe(0);
    });
  });

  it("workforce arrangeDelivery is gated by the same createDelivery choke point", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      await expect(
        arrangeDelivery(
          h.persistence,
          h.workforce.delivery,
          {
            orderId: h.order.id,
            requestFingerprint: "fp-pickup-arrange",
          },
          { provider },
        ),
      ).rejects.toBeInstanceOf(DeliveryError);

      expect(await countDeliveriesForOrder(h.persistence, h.order.id)).toBe(0);
      expect(provider.createBookingCallCount).toBe(0);
    });
  });

  it("Delivery Orders remain eligible for createDelivery", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const delivery = await createDelivery(h.persistence, {
        orderId: h.order.id,
        requestFingerprint: "fp-delivery-ok",
      });
      expect(delivery.status).toBe("REQUESTED");
      expect(await countDeliveriesForOrder(h.persistence, h.order.id)).toBe(1);
    });
  });
});
