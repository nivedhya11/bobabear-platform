/**
 * IMP-036I Tranche 5 — deterministic purchase-authority races.
 *
 * Barriers are beforeBindingTransaction (mutation commits first) and
 * afterScheduledAuthorityLocked (bind already holds Cart, Checkout, Brand,
 * and Outlet locks). Sleeps are not the synchronization.
 */
import { randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { cartLinesTable, cartsTable } from "../../src/platform/database/schema/cart";
import { checkoutSnapshotsTable } from "../../src/platform/database/schema/checkout";
import { paymentsTable } from "../../src/platform/database/schema/payment";
import { outletServiceabilityConfigsTable } from "../../src/platform/database/schema/serviceability";
import { setCartLineQuantity, type CartAccess } from "../../src/server/cart";
import type { CustomerActor } from "../../src/server/cart/actor";
import {
  evaluateCheckout,
  setCheckoutDestination,
  setCheckoutFulfilmentTiming,
  startCheckout,
} from "../../src/server/checkout";
import { startPayment } from "../../src/server/payment";
import type { PaymentOperationOptions } from "../../src/server/payment";
import { excludeVariantAtScope } from "../../src/server/assortment/rules";
import {
  activatePromotion,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../src/server/promotions";
import { saveOutletSchedulingProfile } from "../../src/server/scheduled-fulfilment/foundations";
import { setOutletServiceabilityRoutingPriority } from "../../src/server/serviceability/administration";
import {
  closeTrackedPersistenceHandles,
  FIXED_NOW,
  openTrackedApplicationPersistence,
} from "../database/support/cart-fixtures";
import {
  checkoutOpts,
  seedServiceableOutlet,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import {
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
} from "../database/support/order-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

const WINDOW_START = new Date("2026-08-09T12:30:00.000Z");
const WINDOW_END = new Date("2026-08-09T13:00:00.000Z");
type PersistenceHandle = Parameters<typeof startCheckout>[0];

function writerHandle(connectionString: string): PersistenceHandle {
  return openTrackedApplicationPersistence(connectionString);
}

function sqlState(error: unknown): string {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Za-z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return error instanceof Error ? `${error.name}:${error.message}` : "UNKNOWN";
}

function withLockTimeout(inner: PersistenceHandle): PersistenceHandle {
  return {
    role: inner.role,
    withContext: (fn) => inner.withContext(fn),
    checkAvailability: () => inner.checkAvailability(),
    close: async () => {},
    transaction: (fn) =>
      inner.transaction(async (tx) => {
        await tx.db.execute(sql`select set_config('lock_timeout', '400', true)`);
        return fn(tx);
      }),
  };
}

async function paymentCount(persistence: PersistenceHandle, snapshotId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(eq(paymentsTable.checkoutSnapshotId, snapshotId)),
  );
  return rows.length;
}

async function scheduledDeliveryReady(h: {
  persistence: PersistenceHandle;
  actors: {
    customerA: Parameters<typeof startCheckout>[1];
    tree: { outletA: { id: string } };
  };
  cartId: string;
  addressId: string;
}) {
  await saveOutletSchedulingProfile(h.persistence, {
    outletId: h.actors.tree.outletA.id,
    pickupMinLeadMinutes: 30,
    deliveryMinLeadMinutes: 30,
    now: FIXED_NOW,
  });
  const opts = checkoutOpts();
  const started = await startCheckout(
    h.persistence,
    h.actors.customerA,
    { cartId: h.cartId },
    opts,
  );
  const withDest = await setCheckoutDestination(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: started.id,
      expectedCheckoutRevision: started.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: h.addressId },
    },
    opts,
  );
  const timed = await setCheckoutFulfilmentTiming(
    h.persistence,
    h.actors.customerA,
    {
      checkoutId: withDest.id,
      expectedCheckoutRevision: withDest.revision,
      fulfilmentTiming: "SCHEDULED",
      scheduledWindowStartAt: WINDOW_START,
      scheduledWindowEndAt: WINDOW_END,
    },
    opts,
  );
  return evaluateCheckout(
    h.persistence,
    h.actors.customerA,
    { checkoutId: timed.id, expectedCheckoutRevision: timed.revision },
    opts,
  );
}

async function cartLine(persistence: PersistenceHandle, cartId: string) {
  const rows = await persistence.withContext((ctx) =>
    ctx.db
      .select({
        id: cartLinesTable.id,
        revision: cartsTable.revision,
      })
      .from(cartLinesTable)
      .innerJoin(cartsTable, eq(cartsTable.id, cartLinesTable.cartId))
      .where(eq(cartLinesTable.cartId, cartId))
      .limit(1),
  );
  const row = rows[0];
  if (!row) throw new Error("cart line missing");
  return row;
}

async function draftTenPercentPromotion(h: {
  persistence: PersistenceHandle;
  actors: { brandAdminActor: Parameters<typeof activatePromotion>[1]["actor"]; tree: { brand: { id: string } } };
}): Promise<{ id: string; revision: bigint }> {
  return h.persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor: h.actors.brandAdminActor,
      brandId: h.actors.tree.brand.id,
      code: `t5-${randomBytes(3).toString("hex")}`,
      displayName: "Tranche 5 discount",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      triggerType: "automatic",
      stackingPolicy: "exclusive",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: null,
    });
    let revision = created.revision;
    revision = (
      await setPromotionBenefit(tx, {
        actor: h.actors.brandAdminActor,
        promotionId: created.id,
        expectedPromotionRevision: revision,
        benefit: {
          benefitType: "percentage_discount",
          percentageBps: 1000,
          fixedAmountPaise: null,
          maximumDiscountPaise: null,
          buyQuantity: null,
          getQuantity: null,
          repeatable: null,
          maximumRewardQuantity: null,
          includeModifiers: false,
          includeBundleDeltas: false,
        },
      })
    ).revision;
    revision = (
      await setPromotionTargets(tx, {
        actor: h.actors.brandAdminActor,
        promotionId: created.id,
        expectedPromotionRevision: revision,
        targetRole: "qualifier",
        targets: [
          {
            targetRole: "qualifier",
            targetType: "all_merchandise",
            productId: null,
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      })
    ).revision;
    revision = (
      await setPromotionTargets(tx, {
        actor: h.actors.brandAdminActor,
        promotionId: created.id,
        expectedPromotionRevision: revision,
        targetRole: "benefit",
        targets: [
          {
            targetRole: "benefit",
            targetType: "all_merchandise",
            productId: null,
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      })
    ).revision;
    return { id: created.id, revision };
  });
}

async function activateTenPercentPromotion(h: {
  persistence: PersistenceHandle;
  actors: { brandAdminActor: Parameters<typeof activatePromotion>[1]["actor"]; tree: { brand: { id: string } } };
}): Promise<void> {
  const draft = await draftTenPercentPromotion(h);
  await h.persistence.transaction(async (tx) => {
    await activatePromotion(tx, {
      actor: h.actors.brandAdminActor,
      promotionId: draft.id,
      expectedPromotionRevision: draft.revision,
    });
  });
}

function customerAccess(h: {
  actors: { customerA: CustomerActor; tree: { brand: { id: string } } };
}): CartAccess {
  return {
    kind: "customer",
    actor: h.actors.customerA,
    brandId: h.actors.tree.brand.id,
  };
}

describe("IMP-036I tranche 5 purchase authority", () => {
  it("refuses a scheduled purchase when an assortment exclude commits before bind", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await h.persistence.transaction(async (tx) => {
            await excludeVariantAtScope(tx, {
              actor: h.actors.brandAdminActor,
              brandId: h.actors.tree.brand.id,
              expectedRuleRevision: null,
              scopeType: "outlet",
              outletId: h.actors.tree.outletA.id,
              variantId: h.catalog.variantId,
            });
          });
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-assort-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("keeps the purchased snapshot when bind holds the brand lock before an assortment exclude", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let writerCode = "";
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        afterScheduledAuthorityLocked: async () => {
          try {
            await writer.transaction(async (tx) => {
              await excludeVariantAtScope(tx, {
                actor: h.actors.brandAdminActor,
                brandId: h.actors.tree.brand.id,
                expectedRuleRevision: null,
                scopeType: "outlet",
                outletId: h.actors.tree.outletA.id,
                variantId: h.catalog.variantId,
              });
            });
          } catch (error) {
            writerCode = sqlState(error);
          }
        },
      };
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-assort-holds"),
        },
        options,
      );
      expect(writerCode).toBe("55P03");
      expect(started.payment.expectedAmountPaise).toBe(ready.snapshot.grandTotalPaise);
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(1);
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-assort-second"),
          },
          paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        ),
      ).rejects.toBeTruthy();
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(1);
    });
  });

  it("refuses bind when a committed price change lands before payment preparation is sealed", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await h.persistence.withContext((ctx) =>
            ctx.db.execute(sql`
              update app.price_book_variant_prices
              set amount_paise = 25000
              where variant_id = ${h.catalog.variantId}::uuid
            `),
          );
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-price-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("keeps the accepted commercial snapshot when bind holds the brand lock first", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let writerCode = "";
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        afterScheduledAuthorityLocked: async () => {
          try {
            await writer.transaction(async (tx) => {
              await tx.db.execute(sql`
                select id from app.brands
                where id = ${h.actors.tree.brand.id}::uuid
                for update
              `);
              await tx.db.execute(sql`
                update app.price_book_variant_prices
                set amount_paise = 25000
                where variant_id = ${h.catalog.variantId}::uuid
              `);
            });
          } catch (error) {
            writerCode = sqlState(error);
          }
        },
      };
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-price-holds"),
        },
        options,
      );
      expect(writerCode).toBe("55P03");
      expect(started.payment.expectedAmountPaise).toBe(ready.snapshot.grandTotalPaise);
      const rows = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ total: checkoutSnapshotsTable.grandTotalPaise })
          .from(checkoutSnapshotsTable)
          .where(eq(checkoutSnapshotsTable.id, ready.snapshot.id)),
      );
      expect(rows[0]?.total).toBe(ready.snapshot.grandTotalPaise);
    });
  });

  it("refuses bind when an active tax rate commits before the commercial seal", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await h.persistence.withContext((ctx) =>
            ctx.db.execute(sql`
              update app.tax_policy_components
              set rate_bps = rate_bps + 100
              where tax_policy_id in (
                select id from app.tax_policies where lifecycle_status = 'active'
              )
            `),
          );
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-tax-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("blocks a tax-rate writer that takes the brand lock while bind holds it", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let writerCode = "";
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        afterScheduledAuthorityLocked: async () => {
          try {
            await writer.transaction(async (tx) => {
              await tx.db.execute(sql`
                select id from app.brands
                where id = ${h.actors.tree.brand.id}::uuid
                for update
              `);
              await tx.db.execute(sql`
                update app.tax_policy_components
                set rate_bps = rate_bps + 100
                where tax_policy_id in (
                  select id from app.tax_policies where lifecycle_status = 'active'
                )
              `);
            });
          } catch (error) {
            writerCode = sqlState(error);
          }
        },
      };
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-tax-holds"),
        },
        options,
      );
      expect(writerCode).toBe("55P03");
      expect(started.payment.expectedAmountPaise).toBe(ready.snapshot.grandTotalPaise);
    });
  });

  it("refuses bind when a live promotion activates before the commercial seal", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await activateTenPercentPromotion(h);
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-promo-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("blocks promotion activation while bind holds the brand lock", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const draft = await draftTenPercentPromotion(h);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let writerCode = "";
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        afterScheduledAuthorityLocked: async () => {
          try {
            await writer.transaction(async (tx) => {
              await activatePromotion(tx, {
                actor: h.actors.brandAdminActor,
                promotionId: draft.id,
                expectedPromotionRevision: draft.revision,
              });
            });
          } catch (error) {
            writerCode = sqlState(error);
          }
        },
      };
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-promo-holds"),
        },
        options,
      );
      expect(writerCode).toBe("55P03");
      expect(started.payment.expectedAmountPaise).toBe(ready.snapshot.grandTotalPaise);
    });
  });

  it("does not let an unconfigured sibling outlet rewrite a fixed selected outlet", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      expect(ready.snapshot.selectedOutletId).toBe(h.actors.tree.outletA.id);
      expect(h.actors.tree.outletB.id).not.toBe(h.actors.tree.outletA.id);
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-sibling-irrelevant"),
        },
        paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
      );
      expect(started.kind).toBe("payment_started");
      const rows = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ outletId: checkoutSnapshotsTable.selectedOutletId })
          .from(checkoutSnapshotsTable)
          .where(eq(checkoutSnapshotsTable.id, ready.snapshot.id)),
      );
      expect(rows[0]?.outletId).toBe(h.actors.tree.outletA.id);
    });
  });

  it("refuses bind when a closer serviceable outlet is committed before the lock", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const config = await h.persistence.withContext((ctx) =>
        ctx.db
          .select({ revision: outletServiceabilityConfigsTable.revision })
          .from(outletServiceabilityConfigsTable)
          .where(eq(outletServiceabilityConfigsTable.outletId, h.actors.tree.outletA.id)),
      );
      const revision = config[0]?.revision;
      if (revision === undefined) throw new Error("outlet serviceability revision missing");
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await setOutletServiceabilityRoutingPriority(h.persistence, h.actors.brandAdminActor, {
            outletId: h.actors.tree.outletA.id,
            routingPriority: 5,
            expectedRevision: revision,
          });
          await seedServiceableOutlet(
            h.persistence,
            h.actors.brandAdminActor,
            h.actors.tree.outletB.id,
          );
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-outlet-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("refuses bind when the cart revision commits before the cart lock", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const line = await cartLine(h.persistence, h.cartId);
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        beforeBindingTransaction: async () => {
          await setCartLineQuantity(h.persistence, customerAccess(h), {
            cartLineId: line.id,
            quantity: 2,
            expectedRevision: line.revision,
          });
        },
      };
      await expect(
        startPayment(
          h.persistence,
          h.actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            paymentMethodIntent: "upi",
            idempotencyKey: newIdempotencyKey("t5-cart-before"),
          },
          options,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(0);
    });
  });

  it("serializes a competing cart mutation while bind holds the cart lock", async () => {
    await withCheckoutReadyHarness(async (h) => {
      const ready = await scheduledDeliveryReady(h);
      const line = await cartLine(h.persistence, h.cartId);
      const writer = withLockTimeout(writerHandle(h.database.connectionString));
      let writerCode = "";
      const options: PaymentOperationOptions = {
        ...paymentOpts(createFakePaymentProvider({ defaultOutcome: "pending" })),
        afterScheduledAuthorityLocked: async () => {
          try {
            await setCartLineQuantity(writer, customerAccess(h), {
              cartLineId: line.id,
              quantity: 2,
              expectedRevision: line.revision,
            });
          } catch (error) {
            writerCode = sqlState(error);
          }
        },
      };
      const started = await startPayment(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("t5-cart-holds"),
        },
        options,
      );
      expect(writerCode).toBe("55P03");
      expect(started.kind).toBe("payment_started");
      expect(await paymentCount(h.persistence, ready.snapshot.id)).toBe(1);
      const after = await cartLine(h.persistence, h.cartId);
      expect(after.revision).toBe(line.revision);
    });
  });
});
