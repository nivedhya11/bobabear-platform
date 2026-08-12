/**
 * Order crash / fault-injection tests (IMP-023) — section AM, CR-01…CR-10.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { addCartLine } from "../../src/server/cart";
import {
  acceptOrder,
  cancelOrder,
  fulfilOrder,
  materializeOrderForCompletedCheckout,
  recoverMissingOrdersBatch,
} from "../../src/server/order";
import {
  insertPlacedOrder,
  newOrderId,
} from "../../src/server/order/repository";
import {
  completeZeroPayableCheckout,
  startPayment,
} from "../../src/server/payment";
import {
  bringCheckoutToReady,
  cartState,
  checkoutState,
  closeTrackedPersistenceHandles,
  countOrdersForCheckout,
  createFakePaymentProvider,
  deleteOrderRow,
  getOrderByCheckout,
  getOrderRow,
  newIdempotencyKey,
  orderOpts,
  paymentOpts,
  snapshotVariantId,
  testOrderNumber,
  verifyAndProcessWebhook,
  withCompletedPositiveOrderHarness,
  withPaymentReadyHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function customerAddressId(
  persistence: Parameters<typeof getOrderRow>[0],
  customerAuthUserId: string,
): Promise<string> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select id::text as id from app.customer_addresses
      where customer_auth_user_id = ${customerAuthUserId}
      limit 1
    `);
    return r.rows[0]!.id as string;
  });
}

describe("IMP-023 order crash / fault injection (CR-01…CR-10)", () => {
  it("CR-01: financial completion committed before materializer invocation", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("cr01"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );

      const auto = await getOrderByCheckout(h.persistence, h.checkoutId);
      expect(auto).not.toBeNull();
      await deleteOrderRow(h.persistence, auto!.id, h.connectionString);

      const chk = await checkoutState(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select status from app.payments where id = ${started.payment.id}::uuid
        `);
        expect(pay.rows[0]?.status).toBe("SUCCEEDED");
      });
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);

      const recovered = await recoverMissingOrdersBatch(
        h.persistence,
        {},
        orderOpts(),
      );
      expect(
        recovered.results.some(
          (r) =>
            r.checkoutId === h.checkoutId && r.disposition === "CREATED",
        ),
      ).toBe(true);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("CR-02: materializer crashes before Order insert", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const cartBefore = await cartState(h.persistence, h.cartId);

      await expect(
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, {
          ...orderOpts(),
          orderNumberGenerator: () => {
            throw new Error("simulated crash before insert");
          },
        }),
      ).rejects.toThrow(/simulated crash before insert/);

      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);
      const cartAfter = await cartState(h.persistence, h.cartId);
      expect(cartAfter.revision).toBe(cartBefore.revision);
      expect(cartAfter.lineCount).toBe(cartBefore.lineCount);

      const created = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(created.disposition).toBe("CREATED");
    });
  });

  it("CR-03: Order insert executes then materialization transaction rolls back", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);

      await expect(
        h.persistence.transaction(async (tx) => {
          await insertPlacedOrder(tx, {
            id: newOrderId(),
            orderNumber: testOrderNumber("CRASHR000001"),
            checkoutId: h.checkoutId,
            checkoutSnapshotId: h.snapshotId,
            paymentProvenanceKind: "PAYMENT",
            paymentId: h.paymentId,
            now: new Date("2026-08-09T12:00:00.000Z"),
          });
          throw new Error("simulated abort after insert");
        }),
      ).rejects.toThrow(/simulated abort after insert/);

      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);

      const recovered = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(recovered.disposition).toBe("CREATED");
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("CR-04: Order + eligible Cart clear commit, response lost", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const cartBefore = await cartState(h.persistence, h.cartId);
      const replay = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(replay.disposition).toBe("ALREADY_EXISTS");
      expect(replay.order.id).toBe(h.order.id);
      expect(replay.cartFinalization).toBeNull();
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);

      const cartAfter = await cartState(h.persistence, h.cartId);
      expect(cartAfter.revision).toBe(cartBefore.revision);
      expect(cartAfter.lineCount).toBe(cartBefore.lineCount);
    });
  });

  it("CR-05: Order-number collision attempts exhaust bounded retry", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const sticky = testOrderNumber("EXHA5T000001");
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.orders
          set order_number = ${sticky}
          where id = ${h.order.id}::uuid
        `);
      });

      const variantId = await snapshotVariantId(h.persistence, h.snapshotId);
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.price_book_variant_prices
          set amount_paise = 0
          where variant_id = ${variantId}::uuid
        `);
      });
      const cart = await cartState(h.persistence, h.cartId);
      const added = await addCartLine(
        h.persistence,
        { kind: "customer", actor: h.actor, brandId: h.brandId },
        {
          variantId,
          quantity: 1,
          expectedRevision: cart.revision,
        },
      );
      const addressId = await customerAddressId(
        h.persistence,
        h.actors.customerAId,
      );
      const ready2 = await bringCheckoutToReady(
        h.persistence,
        h.actor,
        added.cart.id,
        addressId,
      );
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      await completeZeroPayableCheckout(
        h.persistence,
        h.actor,
        {
          checkoutId: ready2.checkoutId,
          expectedCheckoutRevision: ready2.revision,
          idempotencyKey: newIdempotencyKey("cr05"),
        },
        paymentOpts(provider),
      );
      const auto2 = await getOrderByCheckout(h.persistence, ready2.checkoutId);
      expect(auto2).not.toBeNull();
      await deleteOrderRow(h.persistence, auto2!.id, h.connectionString);

      await expect(
        materializeOrderForCompletedCheckout(h.persistence, ready2.checkoutId, {
          clock: orderOpts().clock,
          policy: { orderNumberMaxAttempts: 3, recoveryBatchSize: 25 },
          orderNumberGenerator: () => sticky,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NUMBER_COLLISION_EXHAUSTED" });

      expect(
        await countOrdersForCheckout(h.persistence, ready2.checkoutId),
      ).toBe(0);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("CR-06: recovery batch commits some candidates then process dies", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const variantId = await snapshotVariantId(h.persistence, h.snapshotId);
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.price_book_variant_prices
          set amount_paise = 0
          where variant_id = ${variantId}::uuid
        `);
      });
      const cart = await cartState(h.persistence, h.cartId);
      const added = await addCartLine(
        h.persistence,
        { kind: "customer", actor: h.actor, brandId: h.brandId },
        {
          variantId,
          quantity: 1,
          expectedRevision: cart.revision,
        },
      );
      const addressId = await customerAddressId(
        h.persistence,
        h.actors.customerAId,
      );
      const ready2 = await bringCheckoutToReady(
        h.persistence,
        h.actor,
        added.cart.id,
        addressId,
      );
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      await completeZeroPayableCheckout(
        h.persistence,
        h.actor,
        {
          checkoutId: ready2.checkoutId,
          expectedCheckoutRevision: ready2.revision,
          idempotencyKey: newIdempotencyKey("cr06"),
        },
        paymentOpts(provider),
      );

      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const auto2 = await getOrderByCheckout(h.persistence, ready2.checkoutId);
      await deleteOrderRow(h.persistence, auto2!.id, h.connectionString);

      const first = await recoverMissingOrdersBatch(
        h.persistence,
        {},
        {
          ...orderOpts(),
          policy: { orderNumberMaxAttempts: 8, recoveryBatchSize: 1 },
        },
      );
      expect(first.results.length).toBe(1);
      expect(first.nextCursor).not.toBeNull();

      const afterFirst =
        (await countOrdersForCheckout(h.persistence, h.checkoutId)) +
        (await countOrdersForCheckout(h.persistence, ready2.checkoutId));
      expect(afterFirst).toBe(1);

      const second = await recoverMissingOrdersBatch(
        h.persistence,
        { cursor: first.nextCursor },
        {
          ...orderOpts(),
          policy: { orderNumberMaxAttempts: 8, recoveryBatchSize: 1 },
        },
      );
      expect(second.results.length).toBe(1);
      expect(
        (await countOrdersForCheckout(h.persistence, h.checkoutId)) +
          (await countOrdersForCheckout(h.persistence, ready2.checkoutId)),
      ).toBe(2);
    });
  });

  it("CR-07: accept mutation crashes before commit", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const { updateOrderLifecycle, lockOrderForUpdate } = await import(
        "../../src/server/order/repository"
      );
      const crashAt = new Date(new Date(h.order.createdAt).getTime() + 60_000);
      await expect(
        h.persistence.transaction(async (tx) => {
          const locked = await lockOrderForUpdate(tx, h.order.id);
          expect(locked).not.toBeNull();
          await updateOrderLifecycle(tx, h.order.id, {
            status: "ACCEPTED",
            revision: locked!.revision + BigInt(1),
            updatedAt: crashAt,
            acceptedAt: crashAt,
            acceptedByWorkforceUserId: h.workforce.outletManagerUser.id,
          });
          throw new Error("simulated accept crash before commit");
        }),
      ).rejects.toThrow(/simulated accept crash before commit/);

      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("PLACED");
      expect(row?.revision).toBe("1");
      expect(row?.accepted_at).toBeNull();

      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        },
      );
      expect(accepted.status).toBe("ACCEPTED");
      expect(accepted.revision).toBe("2");
    });
  });

  it("CR-08: accept commits, response lost → stale expected revision ORDER_CONFLICT", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        },
      );
      expect(accepted.revision).toBe("2");

      await expect(
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });

      const noop = await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(2),
      });
      expect(noop.status).toBe("ACCEPTED");
      expect(noop.revision).toBe("2");
    });
  });

  it("CR-09: cancel commits, response lost → stale expected revision ORDER_CONFLICT", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const cancelled = await cancelOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        },
      );
      expect(cancelled.revision).toBe("2");

      await expect(
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "BUSINESS_DECISION",
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });

      const same = await cancelOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(2),
        cancellationReasonCode: "CUSTOMER_REQUESTED",
      });
      expect(same.cancellationReasonCode).toBe("CUSTOMER_REQUESTED");

      await expect(
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
          cancellationReasonCode: "BUSINESS_DECISION",
        }),
      ).rejects.toMatchObject({ code: "ORDER_CANCEL_NOT_ALLOWED" });

      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.cancellation_reason_code).toBe("CUSTOMER_REQUESTED");
      expect(row?.revision).toBe("2");
    });
  });

  it("CR-10: fulfil commits, response lost → stale expected revision ORDER_CONFLICT", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      const fulfilled = await fulfilOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        },
      );
      expect(fulfilled.revision).toBe("3");

      await expect(
        fulfilOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });

      const noop = await fulfilOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(3),
      });
      expect(noop.status).toBe("FULFILLED");
      expect(noop.revision).toBe("3");

      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("FULFILLED");
      expect(row?.fulfilled_at).not.toBeNull();
      expect(row?.cancelled_at).toBeNull();
    });
  });
});
