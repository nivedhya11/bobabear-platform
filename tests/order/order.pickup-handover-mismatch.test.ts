/**
 * IMP-036H-F — Handover mismatch safety (AC-036H-040).
 *
 * Wrong expectedRevision → ORDER_CONFLICT; wrong / unknown orderId → ORDER_NOT_FOUND.
 * Workforce cannot fulfil Order A by presenting mismatched confirmation identity.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { addCartLine } from "../../src/server/cart";
import { startPayment } from "../../src/server/payment";
import {
  acceptOrder,
  fulfilOrder,
  getWorkforceOrder,
} from "../../src/server/order";
import { closeTrackedPersistenceHandles } from "../database/support/cart-fixtures";
import {
  bringCheckoutToPickupReady,
  createFakePaymentProvider,
  newIdempotencyKey,
  orderOpts,
  paymentOpts,
  verifyAndProcessWebhook,
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

  it("cross-order fulfil: actioning A with B's orderId cannot fulfil A or B (AC-036H-040)", async () => {
    await withCompletedPositivePickupOrderHarness(async (h) => {
      const acceptedA = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      expect(acceptedA.status).toBe("ACCEPTED");

      const variantId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select variant_id::text as id
          from app.checkout_snapshot_lines
          where snapshot_id = ${h.snapshotId}::uuid
          limit 1
        `);
        return r.rows[0]!.id as string;
      });
      const addedB = await addCartLine(
        h.persistence,
        {
          kind: "customer",
          actor: h.actors.customerB,
          brandId: h.brandId,
        },
        { variantId, quantity: 1 },
      );
      const readyB = await bringCheckoutToPickupReady(
        h.persistence,
        h.actors.customerB,
        addedB.cart.id,
        h.outletId,
      );
      const providerB = createFakePaymentProvider({ defaultOutcome: "pending" });
      const optsB = paymentOpts(providerB);
      const startedB = await startPayment(
        h.persistence,
        h.actors.customerB,
        {
          checkoutId: readyB.checkoutId,
          expectedCheckoutRevision: readyB.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ord-pickup-b"),
        },
        optsB,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        providerB,
        {
          executionIdentity: startedB.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: startedB.payment.expectedAmountPaise,
        },
        optsB,
      );
      const orderB = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id, revision::text as revision, status
          from app.orders
          where checkout_id = ${readyB.checkoutId}::uuid
          limit 1
        `);
        return r.rows[0] as { id: string; revision: string; status: string };
      });
      expect(orderB.status).toBe("PLACED");
      expect(orderB.id).not.toBe(h.order.id);

      // A is ACCEPTED (rev N); B remains PLACED (rev 1). Presenting B's orderId with
      // A's card revision must not fulfil A or B.
      await expect(
        fulfilOrder(
          h.persistence,
          h.workforce.kitchen,
          {
            orderId: orderB.id,
            expectedOrderRevision: BigInt(acceptedA.revision),
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({
        code: "ORDER_CONFLICT",
        field: "expectedOrderRevision",
      });

      const stillA = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: h.order.id },
      );
      expect(stillA.status).toBe("ACCEPTED");
      expect(stillA.orderId).toBe(h.order.id);
      expect(BigInt(stillA.revision)).toBe(BigInt(acceptedA.revision));

      const stillB = await getWorkforceOrder(
        h.persistence,
        h.workforce.outletManager,
        { orderId: orderB.id },
      );
      expect(stillB.status).toBe("PLACED");
      expect(stillB.orderId).toBe(orderB.id);
      expect(BigInt(stillB.revision)).toBe(BigInt(orderB.revision));
    });
  });
});
