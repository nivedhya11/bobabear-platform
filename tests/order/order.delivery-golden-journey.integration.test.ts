/**
 * IMP-036H-F — Delivery golden journey (same Order continuity).
 *
 * Canonical Delivery execution path on one paid DELIVERY Order:
 * accept → createDelivery → beginBooking (provider) → BOOKED → confirmPickup
 * → confirmDeliveryWithFulfilCoordination → Order FULFILLED via Delivery
 * coordination (never calling fulfilOrder directly from this proof).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginBooking,
  confirmDeliveryWithFulfilCoordination,
  confirmPickup,
  createDelivery,
  createFakeDeliveryProvider,
} from "../../src/server/delivery";
import {
  acceptOrder,
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
  it("accept → book → deliver → fulfil coordination on the same orderId", async () => {
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
      const created = await createDelivery(
        h.persistence,
        {
          orderId,
          requestFingerprint: `fp-golden-delivery-${orderId}`,
        },
        { provider },
      );
      expect(created.orderId).toBe(orderId);
      expect(created.status).toBe("REQUESTED");
      expect(provider.createBookingCallCount).toBe(0);

      const booked = await beginBooking(
        h.persistence,
        {
          deliveryId: created.id,
          expectedRevision: created.revision,
          provider: provider.name,
        },
        { provider },
      );
      expect(booked.delivery.orderId).toBe(orderId);
      expect(booked.delivery.status).toBe("BOOKED");
      expect(provider.createBookingCallCount).toBe(1);

      const picked = await confirmPickup(h.persistence, {
        deliveryId: booked.delivery.id,
        expectedRevision: booked.delivery.revision,
        handoffReference: `handoff-golden-${orderId}`,
      });
      expect(picked.orderId).toBe(orderId);
      expect(picked.status).toBe("PICKED_UP");

      const coordinated = await confirmDeliveryWithFulfilCoordination(
        h.persistence,
        h.workforce.delivery,
        {
          deliveryId: picked.id,
          expectedRevision: picked.revision,
          proofReference: `proof-golden-${orderId}`,
        },
      );
      expect(coordinated.delivery.orderId).toBe(orderId);
      expect(coordinated.delivery.status).toBe("DELIVERED");
      expect(coordinated.fulfilAttempted).toBe(true);
      expect(coordinated.fulfilSucceeded).toBe(true);
      expect(coordinated.orderStatus).toBe("FULFILLED");

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
          select id::text as id, status::text as status, order_id::text as order_id
          from app.deliveries
          where order_id = ${orderId}::uuid
        `);
        return rows.rows;
      });
      expect(deliveryRows).toHaveLength(1);
      expect(deliveryRows[0]?.order_id).toBe(orderId);
      expect(deliveryRows[0]?.id).toBe(created.id);
      expect(deliveryRows[0]?.status).toBe("DELIVERED");
    });
  });
});
