/**
 * IMP-036H-F — Pickup golden journey (same Order continuity).
 *
 * withCompletedPositivePickupOrderHarness → getWorkforceOrder (customer verification)
 * → acceptOrder → fulfilOrder on SAME orderId → FULFILLED; zero Delivery rows;
 * createDelivery blocked with zero provider I/O.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  createDelivery,
  createFakeDeliveryProvider,
} from "../../src/server/delivery";
import {
  acceptOrder,
  fulfilOrder,
  getCustomerOrder,
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

describe("IMP-036H-F Pickup golden journey (same Order continuity)", () => {
  it("verify → accept → fulfil same orderId; zero Delivery; createDelivery blocked", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const orderId = h.order.id;

      const workforceBefore = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId },
      );
      expect(workforceBefore.fulfilmentMode).toBe("PICKUP");
      expect(workforceBefore.customer).toMatchObject({
        displayName: "Customer",
      });
      expect(workforceBefore.customer?.verifiedPhoneE164).toMatch(/^\+91\d{10}$/);
      expect(workforceBefore.destination).toBeNull();

      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      expect(accepted.status).toBe("ACCEPTED");
      expect(accepted.orderId).toBe(orderId);

      const provider = createFakeDeliveryProvider({ defaultOutcome: "booked" });
      await expect(
        createDelivery(
          h.persistence,
          {
            orderId,
            requestFingerprint: `fp-golden-pickup-blocked-${orderId}`,
          },
          { provider },
        ),
      ).rejects.toMatchObject({ code: "DELIVERY_ORDER_NOT_ELIGIBLE" });
      expect(provider.createBookingCallCount).toBe(0);
      expect(provider.queryBookingCallCount).toBe(0);

      const fulfilled = await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId,
          expectedOrderRevision: BigInt(accepted.revision),
        },
        orderOpts(),
      );
      expect(fulfilled.status).toBe("FULFILLED");
      expect(fulfilled.orderId).toBe(orderId);

      const customer = await getCustomerOrder(h.persistence, h.actor, {
        orderId,
      });
      expect(customer.status).toBe("FULFILLED");
      expect(customer.fulfilmentMode).toBe("PICKUP");
      expect(customer.destination).toBeNull();
      expect(customer.pickupLocation?.displayName).toBe("Pickup Counter");
      expect(customer.delivery).toBeNull();

      const workforceAfter = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId },
      );
      expect(workforceAfter.status).toBe("FULFILLED");
      expect(workforceAfter).not.toHaveProperty("delivery");

      const deliveryRows = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::text as c from app.deliveries
          where order_id = ${orderId}::uuid
        `);
        return Number(rows.rows[0]?.c ?? 0);
      });
      expect(deliveryRows).toBe(0);
    });
  });
});
