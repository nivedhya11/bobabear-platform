/**
 * IMP-036H-F — Delivery golden journey (same Order continuity).
 *
 * withCompletedPositiveOrderHarness → acceptOrder → createDelivery → fulfilOrder
 * on the SAME orderId; destination/serviceability semantics unchanged.
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
  withCompletedPositiveOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-036H-F Delivery golden journey (same Order continuity)", () => {
  it("accept → createDelivery → fulfil on the same orderId", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const orderId = h.order.id;
      const before = await getCustomerOrder(h.persistence, h.actor, { orderId });
      expect(before.fulfilmentMode).toBe("DELIVERY");
      expect(before.destination?.addressLine1).toBeTruthy();
      const destinationBefore = before.destination;

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
      const delivery = await createDelivery(
        h.persistence,
        {
          orderId,
          requestFingerprint: `fp-golden-delivery-${orderId}`,
        },
        { provider },
      );
      expect(delivery.orderId).toBe(orderId);
      expect(delivery.status).toBe("REQUESTED");
      // createDelivery persists the row; booking I/O is a separate beginBooking step.
      expect(provider.createBookingCallCount).toBe(0);

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

      const after = await getCustomerOrder(h.persistence, h.actor, { orderId });
      expect(after.status).toBe("FULFILLED");
      expect(after.fulfilmentMode).toBe("DELIVERY");
      expect(after.destination).toEqual(destinationBefore);
      expect(after.pickupLocation ?? null).toBeNull();

      const workforce = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId },
      );
      expect(workforce.status).toBe("FULFILLED");
      expect(workforce.fulfilmentMode).toBe("DELIVERY");

      const deliveryRows = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::text as c from app.deliveries
          where order_id = ${orderId}::uuid
        `);
        return Number(rows.rows[0]?.c ?? 0);
      });
      expect(deliveryRows).toBe(1);
    });
  });
});
