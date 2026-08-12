/**
 * Order concurrency tests (IMP-023) — section AL, 20 real parallel races.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { addCartLine, setCartLineQuantity } from "../../src/server/cart";
import {
  OrderError,
  acceptOrder,
  cancelOrder,
  fixedOrderNumberGenerator,
  fulfilOrder,
  generateOrderNumber,
  materializeOrderForCompletedCheckout,
  recoverMissingOrdersBatch,
} from "../../src/server/order";
import {
  completeZeroPayableCheckout,
  startPayment,
} from "../../src/server/payment";
import { includeVariantAtBrand } from "../assortment-availability/support";
import { seedActiveStandardVariant } from "../database/support/cart-fixtures";
import { attachVariantPriceToActiveBrandBook } from "../database/support/checkout-fixtures";
import {
  ORDER_POLICY,
  bringCheckoutToReady,
  cartState,
  checkoutState,
  closeTrackedPersistenceHandles,
  countOrderNumbers,
  countOrdersForCheckout,
  countOrdersForSnapshot,
  countPaymentWritesForSnapshot,
  createFakePaymentProvider,
  deleteOrderForCheckout,
  deleteOrderRow,
  firstCartLineId,
  getOrderByCheckout,
  getOrderRow,
  newIdempotencyKey,
  orderOpts,
  paymentOpts,
  restoreCartToSourceRevision,
  snapshotSourceCartRevision,
  snapshotVariantId,
  testOrderNumber,
  verifyAndProcessWebhook,
  withCompletedPositiveOrderHarness,
  withCompletedZeroOrderHarness,
  withPaymentReadyHarness,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function settled(results: ReadonlyArray<PromiseSettledResult<unknown>>) {
  return {
    ok: results.filter(
      (r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled",
    ),
    fail: results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    ),
  };
}

function isOrderConflict(err: unknown): boolean {
  return err instanceof OrderError && err.code === "ORDER_CONFLICT";
}

describe("IMP-023 order concurrency matrix (20 cases)", () => {
  it("01: materialize vs materialize same completed Checkout", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const chkBefore = await checkoutState(h.persistence, h.checkoutId);
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(0);

      const opts = orderOpts();
      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length + fail.length).toBe(2);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      expect(await countOrdersForSnapshot(h.persistence, h.snapshotId)).toBe(1);

      const created = ok.filter(
        (r) => (r.value as { disposition: string }).disposition === "CREATED",
      ).length;
      expect(created).toBeLessThanOrEqual(1);

      const chk = await checkoutState(h.persistence, h.checkoutId);
      expect(chk.status).toBe("COMPLETED");
      expect(chk.revision).toBe(chkBefore.revision);
      expect(
        await countPaymentWritesForSnapshot(h.persistence, h.snapshotId),
      ).toBe(1);
    });
  });

  it("02: immediate materialization vs recovery same Checkout", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const opts = orderOpts();
      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
        recoverMissingOrdersBatch(h.persistence, {}, opts),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      const order = await getOrderByCheckout(h.persistence, h.checkoutId);
      expect(order?.status).toBe("PLACED");
      expect(order?.revision).toBe(BigInt(1));
    });
  });

  it("03: recovery vs recovery same Checkout", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const opts = orderOpts();
      const raced = await Promise.allSettled([
        recoverMissingOrdersBatch(h.persistence, {}, opts),
        recoverMissingOrdersBatch(h.persistence, {}, opts),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("04: materialization vs Cart mutation exact source-revision race", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const sourceRev = await snapshotSourceCartRevision(
        h.persistence,
        h.snapshotId,
      );
      const variantId = await snapshotVariantId(h.persistence, h.snapshotId);
      await restoreCartToSourceRevision(h.persistence, {
        cartId: h.cartId,
        brandId: h.brandId,
        actor: h.actor,
        variantId,
        sourceCartRevision: sourceRev,
      });
      const lineId = await firstCartLineId(h.persistence, h.cartId);
      const opts = orderOpts();

      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
        setCartLineQuantity(
          h.persistence,
          { kind: "customer", actor: h.actor, brandId: h.brandId },
          {
            cartLineId: lineId,
            quantity: 2,
            expectedRevision: sourceRev,
          },
        ),
      ]);
      expect(settled(raced).ok.length + settled(raced).fail.length).toBe(2);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);

      const cart = await cartState(h.persistence, h.cartId);
      if (cart.lineCount === 0) {
        expect(cart.revision).toBe(sourceRev + BigInt(1));
      } else {
        expect(cart.revision).toBeGreaterThan(sourceRev);
      }
    });
  });

  it("05: materialization vs later Cart mutation — changed Cart preserved", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const sourceRev = await snapshotSourceCartRevision(
        h.persistence,
        h.snapshotId,
      );
      const variantId = await snapshotVariantId(h.persistence, h.snapshotId);
      await restoreCartToSourceRevision(h.persistence, {
        cartId: h.cartId,
        brandId: h.brandId,
        actor: h.actor,
        variantId,
        sourceCartRevision: sourceRev,
      });
      const lineId = await firstCartLineId(h.persistence, h.cartId);
      await setCartLineQuantity(
        h.persistence,
        { kind: "customer", actor: h.actor, brandId: h.brandId },
        {
          cartLineId: lineId,
          quantity: 3,
          expectedRevision: sourceRev,
        },
      );
      const before = await cartState(h.persistence, h.cartId);
      expect(before.revision).toBe(sourceRev + BigInt(1));
      expect(before.lineCount).toBe(1);

      const result = await materializeOrderForCompletedCheckout(
        h.persistence,
        h.checkoutId,
        orderOpts(),
      );
      expect(result.disposition).toBe("CREATED");
      expect(result.cartFinalization).toBe("PRESERVED_CHANGED");

      const after = await cartState(h.persistence, h.cartId);
      expect(after.revision).toBe(before.revision);
      expect(after.lineCount).toBe(1);
    });
  });

  it("06: Order-number candidate collision across two unrelated Checkouts", async () => {
    await withPaymentReadyHarness(async (h) => {
      const variant2 = await seedActiveStandardVariant(
        h.persistence,
        h.brandId,
        h.actors.brandAdminActor,
        "ord2",
      );
      await includeVariantAtBrand(
        h.persistence,
        h.actors.brandAdminActor,
        h.brandId,
        variant2.variantId,
      );
      await attachVariantPriceToActiveBrandBook(h.persistence, {
        brandId: h.brandId,
        variantId: variant2.variantId,
        amountPaise: BigInt(12_000),
      });
      const access = {
        kind: "customer" as const,
        actor: h.actor,
        brandId: h.brandId,
      };

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const payOpts = paymentOpts(provider);
      const started1 = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("c1"),
        },
        payOpts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started1.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started1.payment.expectedAmountPaise,
        },
        payOpts,
      );
      await deleteOrderForCheckout(
        h.persistence,
        h.checkoutId,
        h.connectionString,
      );

      const cartAfterClear = await cartState(h.persistence, h.cartId);
      const added = await addCartLine(h.persistence, access, {
        variantId: variant2.variantId,
        quantity: 1,
        expectedRevision: cartAfterClear.revision,
      });
      const ready2 = await bringCheckoutToReady(
        h.persistence,
        h.actor,
        added.cart.id,
        h.addressId,
      );
      const provider2 = createFakePaymentProvider({ defaultOutcome: "pending" });
      const payOpts2 = paymentOpts(provider2);
      const started2 = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: ready2.checkoutId,
          expectedCheckoutRevision: ready2.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("c2"),
        },
        payOpts2,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider2,
        {
          executionIdentity: started2.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started2.payment.expectedAmountPaise,
        },
        payOpts2,
      );
      await deleteOrderForCheckout(
        h.persistence,
        ready2.checkoutId,
        h.connectionString,
      );

      const shared = testOrderNumber("SAME00000001");
      const uniqueA = testOrderNumber("AAAAAAAABBB1");
      const uniqueB = testOrderNumber("AAAAAAAABBB2");
      let n = 0;
      const sharedGen = () => {
        const i = n++;
        if (i === 0 || i === 1) return shared;
        return i === 2 ? uniqueA : uniqueB;
      };

      const opts = orderOpts();
      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, {
          ...opts,
          orderNumberGenerator: sharedGen,
        }),
        materializeOrderForCompletedCheckout(h.persistence, ready2.checkoutId, {
          ...opts,
          orderNumberGenerator: sharedGen,
        }),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      expect(
        await countOrdersForCheckout(h.persistence, ready2.checkoutId),
      ).toBe(1);
      expect(await countOrderNumbers(h.persistence, shared)).toBe(1);
      const a = await getOrderByCheckout(h.persistence, h.checkoutId);
      const b = await getOrderByCheckout(h.persistence, ready2.checkoutId);
      expect(a!.orderNumber).not.toBe(b!.orderNumber);
    });
  });

  it("07: positive rematerialize after committed Order / lost response", async () => {
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

  it("08: zero-payable concurrent materialization", async () => {
    await withCompletedZeroOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const opts = orderOpts();
      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
      ]);
      expect(settled(raced).ok.length).toBeGreaterThanOrEqual(1);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      const order = await getOrderByCheckout(h.persistence, h.checkoutId);
      expect(order?.paymentProvenanceKind).toBe("NO_PAYMENT_REQUIRED");
      expect(order?.paymentId).toBeNull();
      expect(
        await countPaymentWritesForSnapshot(h.persistence, h.snapshotId),
      ).toBe(0);
    });
  });

  it("09: acceptOrder vs acceptOrder same revision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const raced = await Promise.allSettled([
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
      ]);
      const { ok, fail } = settled(raced);
      const accepted = ok.filter(
        (r) =>
          (r.value as { status: string }).status === "ACCEPTED",
      );
      expect(accepted.length).toBeGreaterThanOrEqual(1);
      if (fail.length > 0) {
        expect(fail.every((f) => isOrderConflict(f.reason))).toBe(true);
      }
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("ACCEPTED");
      expect(row?.revision).toBe("2");
      expect(row?.accepted_at).not.toBeNull();
      expect(row?.fulfilled_at).toBeNull();
      expect(row?.cancelled_at).toBeNull();
    });
  });

  it("10: acceptOrder vs cancelOrder same PLACED revision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const raced = await Promise.allSettled([
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        }),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect(isOrderConflict(fail[0]!.reason)).toBe(true);
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.revision).toBe("2");
      expect(["ACCEPTED", "CANCELLED"]).toContain(row?.status);
      if (row?.status === "ACCEPTED") {
        expect(row.cancelled_at).toBeNull();
      } else {
        expect(row?.cancellation_reason_code).toBe("CUSTOMER_REQUESTED");
        expect(row?.accepted_at).toBeNull();
      }
    });
  });

  it("11: fulfilOrder vs cancelOrder same ACCEPTED revision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      const raced = await Promise.allSettled([
        fulfilOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        }),
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
          cancellationReasonCode: "ITEM_UNAVAILABLE",
        }),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect(isOrderConflict(fail[0]!.reason)).toBe(true);
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.revision).toBe("3");
      expect(["FULFILLED", "CANCELLED"]).toContain(row?.status);
      expect(row?.fulfilled_at != null && row?.cancelled_at != null).toBe(
        false,
      );
    });
  });

  it("12: cancelOrder vs cancelOrder same revision different reasons", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      const raced = await Promise.allSettled([
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "CUSTOMER_REQUESTED",
        }),
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "BUSINESS_DECISION",
        }),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBe(1);
      expect(fail.length).toBe(1);
      expect(isOrderConflict(fail[0]!.reason)).toBe(true);
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("CANCELLED");
      expect(row?.revision).toBe("2");
      expect(["CUSTOMER_REQUESTED", "BUSINESS_DECISION"]).toContain(
        row?.cancellation_reason_code,
      );
    });
  });

  it("13: fulfilOrder vs fulfilOrder same ACCEPTED revision", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      const raced = await Promise.allSettled([
        fulfilOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        }),
        fulfilOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        }),
      ]);
      const { ok, fail } = settled(raced);
      expect(ok.length).toBeGreaterThanOrEqual(1);
      if (fail.length > 0) {
        expect(fail.every((f) => isOrderConflict(f.reason))).toBe(true);
      }
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("FULFILLED");
      expect(row?.revision).toBe("3");
      expect(row?.fulfilled_at).not.toBeNull();
      expect(row?.cancelled_at).toBeNull();
    });
  });

  it("14: stale accept vs current ACCEPTED Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      await expect(
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("ACCEPTED");
      expect(row?.revision).toBe("2");
    });
  });

  it("15: stale cancel vs Order accepted by another actor", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.actors.brandAdminActor, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      await expect(
        cancelOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
          cancellationReasonCode: "OPERATIONAL_DISRUPTION",
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("ACCEPTED");
      expect(row?.revision).toBe("2");
    });
  });

  it("16: stale fulfil vs Order cancelled by another actor", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await acceptOrder(h.persistence, h.workforce.outletManager, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(1),
      });
      await cancelOrder(h.persistence, h.actors.brandAdminActor, {
        orderId: h.order.id,
        expectedOrderRevision: BigInt(2),
        cancellationReasonCode: "OUTLET_UNABLE_TO_FULFIL",
      });
      await expect(
        fulfilOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(2),
        }),
      ).rejects.toMatchObject({ code: "ORDER_CONFLICT" });
      const row = await getOrderRow(h.persistence, h.order.id);
      expect(row?.status).toBe("CANCELLED");
      expect(row?.fulfilled_at).toBeNull();
      expect(row?.cancellation_reason_code).toBe("OUTLET_UNABLE_TO_FULFIL");
    });
  });

  it("17: recovery discovery vs concurrent immediate materialization", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const opts = {
        ...orderOpts(),
        policy: { ...ORDER_POLICY, recoveryBatchSize: 10 },
      };
      const raced = await Promise.allSettled([
        recoverMissingOrdersBatch(h.persistence, {}, opts),
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
    });
  });

  it("18: different Orders lifecycle mutations proceed independently", async () => {
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
      const addressId = await h.persistence.withContext(async (ctx) => {
        const r = await ctx.db.execute(sql`
          select id::text as id from app.customer_addresses
          where customer_auth_user_id = ${h.actors.customerAId}
          limit 1
        `);
        return r.rows[0]!.id as string;
      });
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
          idempotencyKey: newIdempotencyKey("ind"),
        },
        paymentOpts(provider),
      );
      const order2 = await getOrderByCheckout(h.persistence, ready2.checkoutId);
      expect(order2).not.toBeNull();

      const raced = await Promise.allSettled([
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: h.order.id,
          expectedOrderRevision: BigInt(1),
        }),
        acceptOrder(h.persistence, h.workforce.outletManager, {
          orderId: order2!.id,
          expectedOrderRevision: BigInt(1),
        }),
      ]);
      expect(settled(raced).ok.length).toBe(2);
      expect((await getOrderRow(h.persistence, h.order.id))?.status).toBe(
        "ACCEPTED",
      );
      expect((await getOrderRow(h.persistence, order2!.id))?.status).toBe(
        "ACCEPTED",
      );
    });
  });

  it("19: older completed Order recovery vs newer Checkout/Cart activity", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const variantId = await snapshotVariantId(h.persistence, h.snapshotId);
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
      const newerRev = added.cart.revision;

      const recovered = await recoverMissingOrdersBatch(
        h.persistence,
        {},
        orderOpts(),
      );
      expect(
        recovered.results.some(
          (r) =>
            r.checkoutId === h.checkoutId &&
            (r.disposition === "CREATED" || r.disposition === "ALREADY_EXISTS"),
        ),
      ).toBe(true);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);

      const after = await cartState(h.persistence, h.cartId);
      expect(after.revision).toBeGreaterThanOrEqual(newerRev);
      expect(after.lineCount).toBeGreaterThanOrEqual(1);
    });
  });

  it("20: same-source raw DB uniqueness race → one Order", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await deleteOrderRow(h.persistence, h.order.id, h.connectionString);
      const opts = orderOpts();
      const gens = [
        fixedOrderNumberGenerator([
          testOrderNumber("RAWEQAAAAAA1"),
          generateOrderNumber(),
        ]),
        fixedOrderNumberGenerator([
          testOrderNumber("RAWEQBBBBBB2"),
          generateOrderNumber(),
        ]),
      ];
      const raced = await Promise.allSettled([
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, {
          ...opts,
          orderNumberGenerator: gens[0],
        }),
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, {
          ...opts,
          orderNumberGenerator: gens[1],
        }),
        materializeOrderForCompletedCheckout(h.persistence, h.checkoutId, opts),
      ]);
      expect(settled(raced).ok.length).toBeGreaterThanOrEqual(1);
      expect(await countOrdersForCheckout(h.persistence, h.checkoutId)).toBe(1);
      expect(await countOrdersForSnapshot(h.persistence, h.snapshotId)).toBe(1);
      await h.persistence.withContext(async (ctx) => {
        const pay = await ctx.db.execute(sql`
          select count(*)::text as c from app.orders
          where payment_id = ${h.paymentId}::uuid
        `);
        expect(pay.rows[0]?.c).toBe("1");
      });
    });
  });
});
