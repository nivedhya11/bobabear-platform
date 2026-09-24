/**
 * IMP-036H-F — Notification gating for Pickup (AC-036H-029 / AF-036H-11).
 *
 * Pickup Orders must never enqueue OUT_FOR_DELIVERY / DELIVERED (Delivery-lifecycle
 * only). Accept / fulfil emit ORDER_ACCEPTED — no rider / delivery-progress templates.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { acceptOrder, fulfilOrder } from "../../src/server/order";
import type { Persistence } from "../../src/server/persistence/types";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  orderOpts,
  withCompletedPositivePickupOrderHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function notificationEventTypesForOrder(
  persistence: Persistence,
  orderId: string,
): Promise<string[]> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select event_type
      from app.outbox_events
      where event_type like 'notification.domain.%'
        and (
          aggregate_id = ${orderId}
          or payload->>'orderId' = ${orderId}
        )
      order by event_type, id
    `);
    return rows.rows.map((r) => String(r.event_type));
  });
}

describe("IMP-036H-F Pickup notification gating (AC-036H-029)", () => {
  it("accept + fulfil Pickup never enqueue out_for_delivery / delivered", async () => {
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

      const fulfilled = await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(accepted.revision),
        },
        orderOpts(),
      );
      expect(fulfilled.status).toBe("FULFILLED");

      const events = await notificationEventTypesForOrder(
        h.persistence,
        h.order.id,
      );
      expect(events).toContain("notification.domain.order_accepted");
      expect(events).not.toContain("notification.domain.out_for_delivery");
      expect(events).not.toContain("notification.domain.delivered");

      const deliveryRows = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::text as c from app.deliveries
          where order_id = ${h.order.id}::uuid
        `);
        return Number(rows.rows[0]?.c ?? 0);
      });
      expect(deliveryRows).toBe(0);
    });
  });

  it("Order lifecycle does not export Delivery-progress enqueue (structural gate)", async () => {
    const orderLifecycle = await import("../../src/server/order/lifecycle");
    expect(orderLifecycle).not.toHaveProperty(
      "enqueueDeliveryProgressNotification",
    );
  });
});
