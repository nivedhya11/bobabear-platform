/**
 * Order domain tests (IMP-023) — materialization, lifecycle, recovery, cart finalization.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  acceptOrder,
  cancelOrder,
  fulfilOrder,
  materializeOrderForCompletedCheckout,
  recoverMissingOrdersBatch,
} from "../../src/server/order";
import { fixedOrderNumberGenerator } from "../../src/server/order/order-number";
import {
  completeZeroPayableCheckout,
  startPayment,
} from "../../src/server/payment";
import { OrderError } from "../../src/shared/order";
import {
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  closeTrackedPersistenceHandles,
  countOrdersForCheckout,
  createFakePaymentProvider,
  deleteOrderRow,
  newIdempotencyKey,
  ORDER_POLICY,
  orderOpts,
  paymentOpts,
  seedFullDiscountCoupon,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withCompletedPositiveOrderHarness,
  withCompletedZeroOrderHarness,
  withPaymentReadyHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-023 order materialization matrix", () => {
  it("positive completed Checkout + SUCCEEDED Payment → one PLACED PAYMENT Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      expect(h.order.status).toBe("PLACED");
      expect(h.order.paymentProvenanceKind).toBe("PAYMENT");
      expect(h.order.paymentId).toBe(h.paymentId);
      expect(h.order.revision).toBe(BigInt(1));
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("zero-payable completed Checkout + no Payment → NO_PAYMENT_REQUIRED Order", async () => {
    await withCompletedZeroOrderHarness(async (h) => {
      expect(h.order.status).toBe("PLACED");
      expect(h.order.paymentProvenanceKind).toBe("NO_PAYMENT_REQUIRED");
      expect(h.order.paymentId).toBeNull();
      expect(h.grandTotalPaise).toBe(BigInt(0));
      await h.persistence.withContext(async (ctx) => {
        const payments = await ctx.db.execute(sql`
          select count(*)::text as c from app.payments
          where checkout_snapshot_id = ${h.snapshotId}::uuid
        `);
        expect(payments.rows[0]?.c).toBe("0");
      });
    });
  });

  it("non-COMPLETED Checkout → materialization anomaly / no Order", async () => {
    await withPaymentReadyHarness(async (h) => {
      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);
    });
  });

  it("positive completed Checkout + missing Payment → fail closed", async () => {
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
          idempotencyKey: newIdempotencyKey("miss-pay"),
        },
        opts,
      );
      // Force COMPLETED without SUCCEEDED payment via raw SQL (anomaly setup).
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.checkouts
          set status = 'COMPLETED',
              revision = revision + 1,
              updated_at = now()
          where id = ${h.checkoutId}::uuid
        `);
        await ctx.db.execute(sql`
          delete from app.payment_initiation_idempotency
          where payment_id = ${started.payment.id}::uuid
             or payment_attempt_id in (
               select id from app.payment_attempts
               where payment_id = ${started.payment.id}::uuid
             )
        `);
        await ctx.db.execute(sql`
          delete from app.payment_provider_observations
          where attempt_id in (
            select id from app.payment_attempts
            where payment_id = ${started.payment.id}::uuid
          )
        `);
        await ctx.db.execute(sql`
          delete from app.payment_provider_references
          where payment_id = ${started.payment.id}::uuid
        `);
        await ctx.db.execute(sql`
          delete from app.promotion_redemption_claims
          where payment_id = ${started.payment.id}::uuid
        `);
        await ctx.db.execute(sql`
          delete from app.payment_attempts where payment_id = ${started.payment.id}::uuid
        `);
        await ctx.db.execute(sql`
          delete from app.payments where id = ${started.payment.id}::uuid
        `);
      });
      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
    });
  });

  it("positive completed Checkout + non-SUCCEEDED Payment → fail closed", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("non-succ"),
        },
        opts,
      );
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.checkouts
          set status = 'COMPLETED',
              revision = revision + 1,
              updated_at = now()
          where id = ${h.checkoutId}::uuid
        `);
      });
      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
    });
  });

  it("zero Checkout + Payment exists → fail closed", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cart.id,
        h.addressId,
      );
      expect(ready.grandTotalPaise).toBe(BigInt(0));

      const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
      await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          idempotencyKey: newIdempotencyKey("zero-then-pay"),
        },
        paymentOpts(provider),
      );

      // Delete the auto-materialized Order, then inject a rogue Payment row.
      const orderId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id from app.orders
          where checkout_id = ${ready.checkoutId}::uuid
        `);
        return r.rows[0]?.id as string | undefined;
      });
      if (orderId) {
        await deleteOrderRow(
          h.persistence,
          orderId,
          h.database.connectionString,
        );
      }

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.payments (
            id, checkout_id, checkout_snapshot_id, status,
            created_at, updated_at, succeeded_at
          ) values (
            gen_random_uuid(), ${ready.checkoutId}::uuid, ${ready.snapshotId}::uuid,
            'SUCCEEDED', now(), now(), now()
          )
        `);
      });

      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          ready.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
    });
  });

  it("negative snapshot total → fail closed", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      // Snapshot CHECK normally forbids negatives; drop it only in this
      // disposable test database so the materializer fail-closed path is reachable.
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          alter table app.checkout_snapshots
            drop constraint if exists checkout_snapshots_grand_total_paise_nonnegative_check
        `);
        await ctx.db.execute(sql`
          update app.checkout_snapshots
          set grand_total_paise = -1
          where id = ${h.snapshotId}::uuid
        `);
      });
      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);
    });
  });

  it("broken/missing active completed snapshot → fail closed", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      // COMPLETED requires a non-null active_snapshot_id; drop FKs/checks only
      // in this disposable DB to simulate a corrupted completed Checkout.
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          alter table app.checkouts
            drop constraint if exists checkouts_active_snapshot_ownership_fk
        `);
        await ctx.db.execute(sql`
          alter table app.checkouts
            drop constraint if exists checkouts_status_snapshot_null_check
        `);
        await ctx.db.execute(sql`
          update app.checkouts
          set active_snapshot_id = null
          where id = ${h.checkoutId}::uuid
        `);
      });
      await expect(
        materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_MATERIALIZATION_ANOMALY" });
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);
    });
  });

  it("idempotent rematerialize returns ALREADY_EXISTS", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const again = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      expect(again.order.id).toBe(h.order.id);
      expect(again.cartFinalization).toBeNull();
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });
});

describe("IMP-023 order lifecycle", () => {
  it("accept → fulfil happy path; provider calls stay at post-payment baseline", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const baselineCreate = h.provider.createExecutionCallCount;
      const baselineQuery = h.provider.queryExecutionCallCount;
      const baselineCancel = h.provider.cancelExecutionCallCount;

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
      expect(accepted.revision).toBe("2");

      const fulfilled = await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        },
        orderOpts(),
      );
      expect(fulfilled.status).toBe("FULFILLED");
      expect(fulfilled.revision).toBe("3");

      expect(h.provider.createExecutionCallCount).toBe(baselineCreate);
      expect(h.provider.queryExecutionCallCount).toBe(baselineQuery);
      expect(h.provider.cancelExecutionCallCount).toBe(baselineCancel);
    });
  });

  it("accept → cancel; cancel no-op on already cancelled", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const accepted = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      const cancelled = await cancelOrder(
        h.persistence,
        h.workforce.support,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(accepted.revision),
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        },
        orderOpts(),
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellationReasonCode).toBe("ITEM_UNAVAILABLE");

      const noop = await cancelOrder(
        h.persistence,
        h.workforce.support,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(cancelled.revision),
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        },
        orderOpts(),
      );
      expect(noop.status).toBe("CANCELLED");
      expect(noop.revision).toBe(cancelled.revision);
      expect(noop.cancellationReasonCode).toBe("ITEM_UNAVAILABLE");
    });
  });

  it("accept no-op when already ACCEPTED at current revision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const first = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      const second = await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(first.revision),
        },
        orderOpts(),
      );
      expect(second.status).toBe("ACCEPTED");
      expect(second.revision).toBe(first.revision);
    });
  });

  it("stale expectedOrderRevision → ORDER_CONFLICT", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      await expect(
        acceptOrder(
          h.persistence,
          h.workforce.outletManager,
          {
            orderId: h.order.id,
            expectedOrderRevision: h.order.revision,
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({
        code: "ORDER_CONFLICT",
        field: "expectedOrderRevision",
      });
    });
  });

  it("cannot fulfil from PLACED; cannot accept from FULFILLED", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await expect(
        fulfilOrder(
          h.persistence,
          h.workforce.kitchen,
          {
            orderId: h.order.id,
            expectedOrderRevision: h.order.revision,
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_FULFIL_NOT_ALLOWED" });

      await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      await fulfilOrder(
        h.persistence,
        h.workforce.kitchen,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        },
        orderOpts(),
      );
      await expect(
        acceptOrder(
          h.persistence,
          h.workforce.outletManager,
          {
            orderId: h.order.id,
            expectedOrderRevision: BigInt(3),
          },
          orderOpts(),
        ),
      ).rejects.toMatchObject({ code: "ORDER_ACCEPT_NOT_ALLOWED" });
    });
  });
});

describe("IMP-023 cart finalization", () => {
  it("CLEARED when Cart revision matches snapshot sourceCartRevision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const sourceRev = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select source_cart_revision::text as rev
          from app.checkout_snapshots where id = ${h.snapshotId}::uuid
        `);
        return BigInt(r.rows[0]!.rev as string);
      });
      const sourceRevText = sourceRev.toString();
      await h.persistence.withContext(async (ctx) => {
        const updated = await ctx.db.execute(sql`
          update app.carts
          set revision = ${sourceRevText}::bigint,
              manual_coupon_code = null,
              updated_at = now()
          where id = ${h.cartId}::uuid
          returning id::text as id, revision::text as revision
        `);
        expect(updated.rows).toHaveLength(1);
        expect(updated.rows[0]?.revision).toBe(sourceRevText);
      });

      const result = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(result.disposition).toBe("CREATED");
      expect(result.cartFinalization).toBe("CLEARED");
    });
  });

  it("PRESERVED_CHANGED when Cart mutated after snapshot", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.carts
          set revision = revision + 10,
              updated_at = now()
          where id = ${h.cartId}::uuid
        `);
      });

      const result = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(result.disposition).toBe("CREATED");
      expect(result.cartFinalization).toBe("PRESERVED_CHANGED");
    });
  });

  it("PRESERVED_UNAVAILABLE when Cart row is gone", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const { withTestDatabaseClient } = await import(
        "../database/support/test-database"
      );
      await withTestDatabaseClient(h.connectionString, async (client) => {
        // Disposable DB: drop cart FK so we can leave checkout.cart_id dangling.
        await client.pool.query(
          `alter table app.checkouts drop constraint if exists checkouts_cart_fk`,
        );
        await client.pool.query(
          `delete from app.cart_line_modifier_selections where cart_line_id in (select id from app.cart_lines where cart_id = $1)`,
          [h.cartId],
        );
        await client.pool.query(
          `delete from app.cart_line_bundle_modifier_selections where cart_line_bundle_selection_id in (select id from app.cart_line_bundle_selections where cart_line_id in (select id from app.cart_lines where cart_id = $1))`,
          [h.cartId],
        );
        await client.pool.query(
          `delete from app.cart_line_bundle_selections where cart_line_id in (select id from app.cart_lines where cart_id = $1)`,
          [h.cartId],
        );
        await client.pool.query(`delete from app.cart_lines where cart_id = $1`, [
          h.cartId,
        ]);
        await client.pool.query(`delete from app.carts where id = $1`, [
          h.cartId,
        ]);
      });

      const result = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(result.disposition).toBe("CREATED");
      expect(result.cartFinalization).toBe("PRESERVED_UNAVAILABLE");
    });
  });
});

describe("IMP-023 recovery batch", () => {
  it("recovers missing Order after delete; provider calls = 0 during recovery", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const baselineCreate = h.provider.createExecutionCallCount;
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);

      const batch = await recoverMissingOrdersBatch(
        h.persistence,
        {},
        orderOpts(),
      );
      expect(batch.results.length).toBeGreaterThanOrEqual(1);
      const hit = batch.results.find((r) => r.checkoutId === h.checkoutId);
      expect(hit?.disposition).toBe("CREATED");
      expect(hit?.orderId).toBeTruthy();
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      expect(h.provider.createExecutionCallCount).toBe(baselineCreate);
    });
  });

  it("order-number collision exhausts bounded retries against a held number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const taken = h.order.orderNumber;

      // Second completed checkout (customer B) so only order_number conflicts.
      const { addCartLine } = await import("../../src/server/cart");
      const { createSavedAddressForCustomer } = await import(
        "../database/support/checkout-fixtures"
      );
      const added = await addCartLine(
        h.persistence,
        {
          kind: "customer",
          actor: h.actors.customerB,
          brandId: h.brandId,
        },
        {
          variantId: (
            await h.persistence.withContext(async (ctx) => {
              const r = await ctx.db.execute(sql`
                select variant_id::text as id
                from app.checkout_snapshot_lines
                where snapshot_id = ${h.snapshotId}::uuid
                limit 1
              `);
              return r.rows[0]!.id as string;
            })
          ),
          quantity: 1,
        },
      );
      const address = await createSavedAddressForCustomer(
        h.persistence,
        h.actors.customerBId,
      );
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerB,
        added.cart.id,
        address.id,
      );
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actors.customerB,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("ord-b"),
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
      const orderBId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id from app.orders
          where checkout_id = ${ready.checkoutId}::uuid
        `);
        return r.rows[0]!.id as string;
      });
      await deleteOrderRow(h.persistence, orderBId, h.connectionString);

      const generator = fixedOrderNumberGenerator(
        Array.from({ length: ORDER_POLICY.orderNumberMaxAttempts }, () => taken),
      );
      await expect(
        materializeOrderForCompletedCheckout(h.persistence, ready.checkoutId, {
          ...orderOpts(),
          orderNumberGenerator: generator,
        }),
      ).rejects.toMatchObject({ code: "ORDER_NUMBER_COLLISION_EXHAUSTED" });
    });
  });
});

describe("IMP-023 provider isolation on lifecycle", () => {
  it("lifecycle mutations never call provider execute/query/cancel", async () => {
    await withCompletedZeroOrderHarness(async (h) => {
      expect(h.provider.createExecutionCallCount).toBe(0);
      expect(h.provider.queryExecutionCallCount).toBe(0);
      expect(h.provider.cancelExecutionCallCount).toBe(0);

      await acceptOrder(
        h.persistence,
        h.workforce.outletManager,
        {
          orderId: h.order.id,
          expectedOrderRevision: h.order.revision,
        },
        orderOpts(),
      );
      await fulfilOrder(
        h.persistence,
        h.workforce.delivery,
        {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        },
        orderOpts(),
      );

      expect(h.provider.createExecutionCallCount).toBe(0);
      expect(h.provider.queryExecutionCallCount).toBe(0);
      expect(h.provider.cancelExecutionCallCount).toBe(0);
    });
  });
});

describe("IMP-023 OrderError surface", () => {
  it("is OrderError for domain failures", async () => {
    await withPaymentReadyHarness(async (h) => {
      try {
        await materializeOrderForCompletedCheckout(
          h.persistence,
          h.checkoutId,
          orderOpts(),
        );
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(OrderError);
      }
    });
  });
});
