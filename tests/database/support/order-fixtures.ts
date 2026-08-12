/**
 * Shared fixtures for Order tests (IMP-023).
 */
import { sql } from "drizzle-orm";

import {
  createMembership,
  grantRole,
  type WorkforcePrincipal,
} from "../../../src/server/access-control";
import type { CustomerActor } from "../../../src/server/cart";
import {
  completeZeroPayableCheckout,
  startPayment,
} from "../../../src/server/payment";
import type { Persistence } from "../../../src/server/persistence/types";
import type { Order, OrderClock, OrderPolicy } from "../../../src/shared/order";
import {
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  CHECKOUT_POLICY,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  FIXED_NOW,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withPaymentReadyHarness,
  type PaymentReadyHarness,
} from "./payment-fixtures";
import {
  createEligibleWorkforceUser,
  principalFor,
  type SeededBrandTree,
  type WorkforceUserFixture,
} from "./access-control-fixtures";
import { withTestDatabaseClient } from "./test-database";

export {
  CHECKOUT_POLICY,
  FIXED_NOW,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withPaymentReadyHarness,
  principalFor,
};

export const ORDER_POLICY: OrderPolicy = Object.freeze({
  orderNumberMaxAttempts: 8,
  recoveryBatchSize: 25,
});

/**
 * Default clock is wall-clock: Payment completion hooks materialize Orders with
 * `systemOrderClock`, so lifecycle tests must not use FIXED_NOW (which is
 * earlier than Order.createdAt and trips accepted_at >= created_at).
 */
export function orderOpts(
  clock: OrderClock = { now: () => new Date() },
): Readonly<{ clock: OrderClock; policy: OrderPolicy }> {
  return Object.freeze({
    clock,
    policy: ORDER_POLICY,
  });
}

export type OrderWorkforcePrincipals = Readonly<{
  outletManager: WorkforcePrincipal;
  outletManagerUser: WorkforceUserFixture;
  kitchen: WorkforcePrincipal;
  kitchenUser: WorkforceUserFixture;
  support: WorkforcePrincipal;
  supportUser: WorkforceUserFixture;
  finance: WorkforcePrincipal;
  financeUser: WorkforceUserFixture;
  delivery: WorkforcePrincipal;
  deliveryUser: WorkforceUserFixture;
}>;

export type CompletedOrderHarness = Readonly<{
  persistence: Persistence;
  actor: CustomerActor;
  actors: PaymentReadyHarness["actors"];
  tree: SeededBrandTree;
  order: Order;
  checkoutId: string;
  snapshotId: string;
  paymentId: string | null;
  cartId: string;
  brandId: string;
  outletId: string;
  connectionString: string;
  workforce: OrderWorkforcePrincipals;
  provider: ReturnType<typeof createFakePaymentProvider>;
  grandTotalPaise: bigint;
}>;

async function loadOrderForCheckout(
  persistence: Persistence,
  checkoutId: string,
): Promise<Order> {
  const row = await persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select
        id::text as id,
        order_number as "orderNumber",
        checkout_id::text as "checkoutId",
        checkout_snapshot_id::text as "checkoutSnapshotId",
        payment_provenance_kind as "paymentProvenanceKind",
        payment_id::text as "paymentId",
        status,
        revision,
        created_at as "createdAt",
        updated_at as "updatedAt",
        accepted_at as "acceptedAt",
        accepted_by_workforce_user_id as "acceptedByWorkforceUserId",
        fulfilled_at as "fulfilledAt",
        fulfilled_by_workforce_user_id as "fulfilledByWorkforceUserId",
        cancelled_at as "cancelledAt",
        cancelled_by_workforce_user_id as "cancelledByWorkforceUserId",
        cancellation_reason_code as "cancellationReasonCode"
      from app.orders
      where checkout_id = ${checkoutId}::uuid
      limit 1
    `);
    return result.rows[0] as
      | {
          id: string;
          orderNumber: string;
          checkoutId: string;
          checkoutSnapshotId: string;
          paymentProvenanceKind: string;
          paymentId: string | null;
          status: string;
          revision: string | number | bigint;
          createdAt: Date;
          updatedAt: Date;
          acceptedAt: Date | null;
          acceptedByWorkforceUserId: string | null;
          fulfilledAt: Date | null;
          fulfilledByWorkforceUserId: string | null;
          cancelledAt: Date | null;
          cancelledByWorkforceUserId: string | null;
          cancellationReasonCode: string | null;
        }
      | undefined;
  });
  if (!row) {
    throw new Error(`Expected Order for checkout ${checkoutId}`);
  }
  const asDate = (value: Date | string | null): Date | null => {
    if (value == null) return null;
    return value instanceof Date ? value : new Date(value);
  };
  return Object.freeze({
    id: row.id,
    orderNumber: row.orderNumber,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    paymentProvenanceKind: row.paymentProvenanceKind as Order["paymentProvenanceKind"],
    paymentId: row.paymentId,
    status: row.status as Order["status"],
    revision: BigInt(row.revision),
    createdAt: asDate(row.createdAt)!,
    updatedAt: asDate(row.updatedAt)!,
    acceptedAt: asDate(row.acceptedAt),
    acceptedByWorkforceUserId: row.acceptedByWorkforceUserId,
    fulfilledAt: asDate(row.fulfilledAt),
    fulfilledByWorkforceUserId: row.fulfilledByWorkforceUserId,
    cancelledAt: asDate(row.cancelledAt),
    cancelledByWorkforceUserId: row.cancelledByWorkforceUserId,
    cancellationReasonCode:
      row.cancellationReasonCode as Order["cancellationReasonCode"],
  });
}

export async function seedOutletManagerPrincipal(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  const outlet =
    outletId === tree.outletA.id
      ? tree.outletA
      : outletId === tree.outletB.id
        ? tree.outletB
        : null;
  if (!outlet) {
    throw new Error("seedOutletManagerPrincipal: outletId not in tree");
  }
  const org =
    outletId === tree.outletA.id ? tree.orgA : tree.orgB;
  const terr =
    outletId === tree.outletA.id ? tree.terrA : tree.terrB;

  const user = await createEligibleWorkforceUser(persistence);
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: {
        scopeType: "outlet",
        brandId: tree.brand.id,
        organizationId: org.id,
        territoryId: terr.id,
        outletId,
      },
      status: "active",
    });
    await grantRole(tx, {
      membershipId: membership.id,
      roleKey: "outlet_manager",
    });
  });
  return { user, principal: principalFor(user.id) };
}

async function seedOutletScopedRole(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
  roleKey:
    | "kitchen_operator"
    | "delivery_coordinator"
    | "support_refund_operator"
    | "finance_viewer"
    | "outlet_manager",
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  const user = await createEligibleWorkforceUser(persistence);

  if (roleKey === "finance_viewer") {
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: user.id,
        scope: { scopeType: "brand", brandId: tree.brand.id },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey });
    });
    return { user, principal: principalFor(user.id) };
  }

  if (roleKey === "support_refund_operator") {
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: user.id,
        scope: { scopeType: "brand", brandId: tree.brand.id },
        status: "active",
      });
      await grantRole(tx, { membershipId: membership.id, roleKey });
    });
    return { user, principal: principalFor(user.id) };
  }

  const org = outletId === tree.outletA.id ? tree.orgA : tree.orgB;
  const terr = outletId === tree.outletA.id ? tree.terrA : tree.terrB;
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: user.id,
      scope: {
        scopeType: "outlet",
        brandId: tree.brand.id,
        organizationId: org.id,
        territoryId: terr.id,
        outletId,
      },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey });
  });
  return { user, principal: principalFor(user.id) };
}

export async function seedKitchenPrincipal(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  return seedOutletScopedRole(
    persistence,
    tree,
    outletId,
    "kitchen_operator",
  );
}

export async function seedSupportPrincipal(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  return seedOutletScopedRole(
    persistence,
    tree,
    outletId,
    "support_refund_operator",
  );
}

export async function seedFinancePrincipal(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  return seedOutletScopedRole(persistence, tree, outletId, "finance_viewer");
}

export async function seedDeliveryPrincipal(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<{ user: WorkforceUserFixture; principal: WorkforcePrincipal }> {
  return seedOutletScopedRole(
    persistence,
    tree,
    outletId,
    "delivery_coordinator",
  );
}

async function seedDefaultWorkforce(
  persistence: Persistence,
  tree: SeededBrandTree,
  outletId: string,
): Promise<OrderWorkforcePrincipals> {
  const [outletManager, kitchen, support, finance, delivery] =
    await Promise.all([
      seedOutletManagerPrincipal(persistence, tree, outletId),
      seedKitchenPrincipal(persistence, tree, outletId),
      seedSupportPrincipal(persistence, tree, outletId),
      seedFinancePrincipal(persistence, tree, outletId),
      seedDeliveryPrincipal(persistence, tree, outletId),
    ]);
  return Object.freeze({
    outletManager: outletManager.principal,
    outletManagerUser: outletManager.user,
    kitchen: kitchen.principal,
    kitchenUser: kitchen.user,
    support: support.principal,
    supportUser: support.user,
    finance: finance.principal,
    financeUser: finance.user,
    delivery: delivery.principal,
    deliveryUser: delivery.user,
  });
}

/**
 * Positive grand-total path: startPayment + webhook success → COMPLETED +
 * SUCCEEDED Payment + Order (via Payment completion hook).
 */
export async function withCompletedPositiveOrderHarness<T>(
  fn: (harness: CompletedOrderHarness) => Promise<T>,
): Promise<T> {
  return withPaymentReadyHarness(async (h) => {
    const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
    const opts = paymentOpts(provider);
    const started = await startPayment(
      h.persistence,
      h.actor,
      {
        checkoutId: h.checkoutId,
        expectedCheckoutRevision: h.revision,
        paymentMethodIntent: "upi",
        idempotencyKey: newIdempotencyKey("ord-pos"),
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

    const order = await loadOrderForCheckout(h.persistence, h.checkoutId);
    if (order.paymentProvenanceKind !== "PAYMENT" || !order.paymentId) {
      throw new Error("Expected PAYMENT provenance Order from positive path");
    }

    const workforce = await seedDefaultWorkforce(
      h.persistence,
      h.actors.tree,
      h.outletId,
    );

    return fn({
      persistence: h.persistence,
      actor: h.actor,
      actors: h.actors,
      tree: h.actors.tree,
      order,
      checkoutId: h.checkoutId,
      snapshotId: h.snapshotId,
      paymentId: order.paymentId,
      cartId: h.cartId,
      brandId: h.brandId,
      outletId: h.outletId,
      connectionString: h.connectionString,
      workforce,
      provider,
      grandTotalPaise: h.grandTotalPaise,
    });
  });
}

/**
 * Zero-payable path: full-discount coupon → completeZeroPayableCheckout →
 * COMPLETED + no Payment + NO_PAYMENT_REQUIRED Order (via hook).
 */
export async function withCompletedZeroOrderHarness<T>(
  fn: (harness: CompletedOrderHarness) => Promise<T>,
): Promise<T> {
  return withCheckoutReadyHarness(async (h) => {
    const brandId = h.actors.tree.brand.id;
    const outletId = h.actors.tree.outletA.id;
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
    if (ready.grandTotalPaise !== BigInt(0)) {
      throw new Error(
        `Expected zero grand total for zero Order harness, got ${ready.grandTotalPaise}`,
      );
    }

    const provider = createFakePaymentProvider({ defaultOutcome: "succeed" });
    await completeZeroPayableCheckout(
      h.persistence,
      h.actors.customerA,
      {
        checkoutId: ready.checkoutId,
        expectedCheckoutRevision: ready.revision,
        idempotencyKey: newIdempotencyKey("ord-zero"),
      },
      paymentOpts(provider),
    );

    const order = await loadOrderForCheckout(
      h.persistence,
      ready.checkoutId,
    );
    if (order.paymentProvenanceKind !== "NO_PAYMENT_REQUIRED") {
      throw new Error("Expected NO_PAYMENT_REQUIRED Order from zero path");
    }

    const workforce = await seedDefaultWorkforce(
      h.persistence,
      h.actors.tree,
      outletId,
    );

    return fn({
      persistence: h.persistence,
      actor: h.actors.customerA,
      actors: h.actors,
      tree: h.actors.tree,
      order,
      checkoutId: ready.checkoutId,
      snapshotId: ready.snapshotId,
      paymentId: null,
      cartId: cart.id,
      brandId,
      outletId,
      connectionString: h.database.connectionString,
      workforce,
      provider,
      grandTotalPaise: BigInt(0),
    });
  });
}

/** Admin connection DELETE — app role has DELETE revoked on orders. */
export async function deleteOrderRow(
  persistence: Persistence,
  orderId: string,
  connectionString?: string,
): Promise<void> {
  if (connectionString) {
    await withTestDatabaseClient(connectionString, async (client) => {
      await client.pool.query(`delete from app.orders where id = $1`, [
        orderId,
      ]);
    });
    return;
  }
  // Fallback: attempt via persistence (may fail if DELETE revoked).
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(
      sql`delete from app.orders where id = ${orderId}::uuid`,
    );
  });
}

export async function countOrdersForCheckout(
  persistence: Persistence,
  checkoutId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select count(*)::text as c
      from app.orders
      where checkout_id = ${checkoutId}::uuid
    `);
    return Number(result.rows[0]?.c ?? 0);
  });
}

export async function getOrderRow(
  persistence: Persistence,
  orderId: string,
): Promise<Record<string, unknown> | null> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select
        id::text as id,
        order_number,
        checkout_id::text as checkout_id,
        checkout_snapshot_id::text as checkout_snapshot_id,
        payment_provenance_kind,
        payment_id::text as payment_id,
        status,
        revision::text as revision,
        created_at,
        updated_at,
        accepted_at,
        accepted_by_workforce_user_id,
        fulfilled_at,
        fulfilled_by_workforce_user_id,
        cancelled_at,
        cancelled_by_workforce_user_id,
        cancellation_reason_code
      from app.orders
      where id = ${orderId}::uuid
      limit 1
    `);
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  });
}

export function validOrderNumber(suffix = "ABCDEFGHJKMN"): string {
  const body = suffix.padEnd(12, "0").slice(0, 12).toUpperCase();
  return `ORD-${body}`;
}


/** Extra helpers for concurrency / crash suites (IMP-023 AL/AM). */

export function testOrderNumber(body12: string): string {
  if (body12.length !== 12) {
    throw new Error("Order number body must be exactly 12 Crockford chars.");
  }
  return `ORD-${body12}`;
}

export async function getOrderByCheckout(
  persistence: Persistence,
  checkoutId: string,
): Promise<Order | null> {
  try {
    return await loadOrderForCheckout(persistence, checkoutId);
  } catch {
    return null;
  }
}

export async function deleteOrderForCheckout(
  persistence: Persistence,
  checkoutId: string,
  connectionString?: string,
): Promise<void> {
  const existing = await getOrderByCheckout(persistence, checkoutId);
  if (existing) {
    await deleteOrderRow(persistence, existing.id, connectionString);
  }
}

export async function countOrdersForSnapshot(
  persistence: Persistence,
  snapshotId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select count(*)::text as c
      from app.orders
      where checkout_snapshot_id = ${snapshotId}::uuid
    `);
    return Number(result.rows[0]?.c ?? 0);
  });
}

export async function countOrderNumbers(
  persistence: Persistence,
  orderNumber: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select count(*)::text as c
      from app.orders
      where order_number = ${orderNumber}
    `);
    return Number(result.rows[0]?.c ?? 0);
  });
}

export async function countPaymentWritesForSnapshot(
  persistence: Persistence,
  snapshotId: string,
): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select count(*)::text as c
      from app.payments
      where checkout_snapshot_id = ${snapshotId}::uuid
    `);
    return Number(result.rows[0]?.c ?? 0);
  });
}

export async function cartState(
  persistence: Persistence,
  cartId: string,
): Promise<{ revision: bigint; lineCount: number; coupon: string | null }> {
  return persistence.withContext(async (ctx) => {
    const cart = await ctx.db.execute(sql`
      select revision::text as revision,
             manual_coupon_code as coupon
      from app.carts where id = ${cartId}::uuid
    `);
    const lines = await ctx.db.execute(sql`
      select count(*)::text as c from app.cart_lines
      where cart_id = ${cartId}::uuid
    `);
    return {
      revision: BigInt(String(cart.rows[0]?.revision ?? "0")),
      lineCount: Number(lines.rows[0]?.c ?? "0"),
      coupon: (cart.rows[0]?.coupon as string | null) ?? null,
    };
  });
}

export async function checkoutState(
  persistence: Persistence,
  checkoutId: string,
): Promise<{ status: string; revision: bigint; snapshotId: string | null }> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select status,
             revision::text as revision,
             active_snapshot_id::text as snap
      from app.checkouts where id = ${checkoutId}::uuid
    `);
    const row = r.rows[0]!;
    return {
      status: String(row.status),
      revision: BigInt(String(row.revision)),
      snapshotId: (row.snap as string | null) ?? null,
    };
  });
}

export async function snapshotSourceCartRevision(
  persistence: Persistence,
  snapshotId: string,
): Promise<bigint> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select source_cart_revision::text as rev
      from app.checkout_snapshots where id = ${snapshotId}::uuid
    `);
    return BigInt(String(r.rows[0]?.rev ?? "0"));
  });
}

export async function firstCartLineId(
  persistence: Persistence,
  cartId: string,
): Promise<string> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select id::text as id from app.cart_lines
      where cart_id = ${cartId}::uuid
      limit 1
    `);
    return r.rows[0]!.id as string;
  });
}

export async function snapshotVariantId(
  persistence: Persistence,
  snapshotId: string,
): Promise<string> {
  return persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select variant_id::text as variant_id
      from app.checkout_snapshot_lines
      where snapshot_id = ${snapshotId}::uuid
      order by sequence asc
      limit 1
    `);
    const id = r.rows[0]?.variant_id as string | undefined;
    if (!id) throw new Error("snapshot has no lines");
    return id;
  });
}

export async function restoreCartToSourceRevision(
  persistence: Persistence,
  args: {
    cartId: string;
    brandId: string;
    actor: CustomerActor;
    variantId: string;
    sourceCartRevision: bigint;
  },
): Promise<bigint> {
  const { addCartLine } = await import("../../../src/server/cart");
  await persistence.transaction(async (tx) => {
    // Child tables cascade / delete in FK-safe order.
    await tx.db.execute(sql`
      delete from app.cart_line_bundle_modifier_selections
      where cart_line_bundle_selection_id in (
        select id from app.cart_line_bundle_selections
        where cart_line_id in (
          select id from app.cart_lines where cart_id = ${args.cartId}::uuid
        )
      )
    `);
    await tx.db.execute(sql`
      delete from app.cart_line_bundle_selections
      where cart_line_id in (
        select id from app.cart_lines where cart_id = ${args.cartId}::uuid
      )
    `);
    await tx.db.execute(sql`
      delete from app.cart_line_modifier_selections
      where cart_line_id in (
        select id from app.cart_lines where cart_id = ${args.cartId}::uuid
      )
    `);
    await tx.db.execute(sql`
      delete from app.cart_lines where cart_id = ${args.cartId}::uuid
    `);
    await tx.db.execute(sql`
      update app.carts
      set revision = ${args.sourceCartRevision},
          manual_coupon_code = null,
          updated_at = ${new Date()}
      where id = ${args.cartId}::uuid
    `);
  });
  await addCartLine(
    persistence,
    { kind: "customer", actor: args.actor, brandId: args.brandId },
    {
      variantId: args.variantId,
      quantity: 1,
      expectedRevision: args.sourceCartRevision,
    },
  );
  await persistence.withContext(async (ctx) => {
    await ctx.db.execute(sql`
      update app.carts
      set revision = ${args.sourceCartRevision}
      where id = ${args.cartId}::uuid
    `);
  });
  return args.sourceCartRevision;
}

export { mutableCheckoutClock } from "./payment-fixtures";
