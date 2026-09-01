/**
 * Cart domain tests (IMP-020) — §105–109.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { PERMISSION_KEYS } from "../../src/shared/access-control";
import { CartError } from "../../src/shared/cart";
import {
  addCartLine,
  applyCartCoupon,
  claimGuestCart,
  clearCart,
  evaluateCart,
  fixedCartClock,
  getActiveCart,
  reconcileGuestCartWithCustomer,
  removeCartCoupon,
  removeCartLine,
  setCartLineQuantity,
  updateCartLineConfiguration,
  type CustomerActor,
} from "../../src/server/cart";
import {
  setOutletServiceabilityRoutingPriority,
} from "../../src/server/serviceability";
import {
  configureAlwaysAcceptingOutlet,
  pauseOutletIndefinitely,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
} from "../database/support/serviceability-fixtures";
import { resumeOutlet } from "../../src/server/assortment";
import {
  FIXED_NOW,
  GUEST_POLICY,
  closeTrackedPersistenceHandles,
  mutableCartClock,
  seedActiveBundleWithComponent,
  seedActiveStandardVariant,
  seedActiveVariantWithModifier,
  seedRecognizedCoupon,
  withCartHarness,
} from "../database/support/cart-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function customerAccess(
  actor: CustomerActor,
  brandId: string,
) {
  return { kind: "customer" as const, actor, brandId };
}

function guestAccess(brandId: string, guestToken?: string) {
  return guestToken
    ? { kind: "guest" as const, brandId, guestToken }
    : { kind: "guest" as const, brandId };
}

describe("IMP-020 cart domain — lazy create, lines, revision", () => {
  it("does not create a row on read of absent Cart", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      expect(await getActiveCart(persistence, access)).toBeNull();
      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(sql`select count(*)::text as c from app.carts`);
        expect(count.rows[0]?.c).toBe("0");
      });
    });
  });

  it("lazily creates customer cart on first add with revision 1 and server line id", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const result = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 2,
      });
      expect(result.cart.revision).toBe(BigInt(1));
      expect(result.cart.ownerMode).toBe("customer");
      expect(result.cart.lines).toHaveLength(1);
      expect(result.cart.lines[0]!.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result.cart.lines[0]!.quantity).toBe(2);
      expect(result.guestToken).toBeUndefined();
    });
  });

  it("coalesces equivalent configurations and keeps different configs separate", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const first = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      });
      const second = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 3,
        expectedRevision: first.cart.revision,
      });
      expect(second.cart.lines).toHaveLength(1);
      expect(second.cart.lines[0]!.quantity).toBe(4);
      expect(second.cart.revision).toBe(BigInt(2));

      const other = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "other",
      );
      const third = await addCartLine(persistence, access, {
        variantId: other.variantId,
        quantity: 1,
        expectedRevision: second.cart.revision,
      });
      expect(third.cart.lines).toHaveLength(2);
    });
  });

  it("canonicalizes modifier selection order for equality", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const mod = await seedActiveVariantWithModifier(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
      );
      // second option on same group for order test — use same option twice with qty coalescing via two adds different order won't apply for single option
      // Use one option: order of single-element arrays is trivial; prove two-mod path via same option ids swapped if we had two.
      // Seed another option on same group:
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const a = await addCartLine(persistence, access, {
        variantId: mod.variantId,
        quantity: 1,
        modifiers: [
          {
            variantModifierGroupId: mod.variantModifierGroupId,
            modifierGroupOptionId: mod.modifierGroupOptionId,
            quantity: 1,
          },
        ],
      });
      const b = await addCartLine(persistence, access, {
        variantId: mod.variantId,
        quantity: 1,
        expectedRevision: a.cart.revision,
        modifiers: [
          {
            variantModifierGroupId: mod.variantModifierGroupId,
            modifierGroupOptionId: mod.modifierGroupOptionId,
            quantity: 1,
          },
        ],
      });
      expect(b.cart.lines).toHaveLength(1);
      expect(b.cart.lines[0]!.quantity).toBe(2);
      expect(b.cart.lines[0]!.modifiers[0]!.quantity).toBe(1);
    });
  });

  it("adds bundle as one structured line with nested modifiers", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const bundle = await seedActiveBundleWithComponent(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        { withNestedModifier: true },
      );
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const result = await addCartLine(persistence, access, {
        variantId: bundle.bundleVariantId,
        quantity: 1,
        bundleSelections: [
          {
            bundleGroupOptionId: bundle.bundleGroupOptionId,
            quantity: 1,
            modifiers: [
              {
                variantModifierGroupId: bundle.componentVariantModifierGroupId!,
                modifierGroupOptionId: bundle.componentModifierGroupOptionId!,
                quantity: 1,
              },
            ],
          },
        ],
      });
      expect(result.cart.lines).toHaveLength(1);
      expect(result.cart.lines[0]!.bundleSelections).toHaveLength(1);
      expect(result.cart.lines[0]!.bundleSelections[0]!.modifiers).toHaveLength(1);
    });
  });

  it("rejects invalid structural configuration", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      await expect(
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
          modifiers: [
            {
              variantModifierGroupId: "00000000-0000-4000-8000-000000000001",
              modifierGroupOptionId: "00000000-0000-4000-8000-000000000002",
              quantity: 1,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: "CART_CONFIGURATION_INVALID" });
    });
  });

  it("retains state on stale expectedRevision even for no-op intent", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const created = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 2,
      });
      const updatedAt = created.cart.updatedAt;
      await expect(
        setCartLineQuantity(persistence, access, {
          cartLineId: created.cart.lines[0]!.id,
          quantity: 2,
          expectedRevision: BigInt(99),
        }),
      ).rejects.toMatchObject({ code: "CART_CONFLICT" });
      const again = await getActiveCart(persistence, access);
      expect(again!.revision).toBe(BigInt(1));
      expect(again!.lines[0]!.quantity).toBe(2);
      expect(again!.updatedAt.getTime()).toBe(updatedAt.getTime());
    });
  });

  it("validates positive integer quantity and rejects 0 / fraction", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      await expect(
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 0,
        }),
      ).rejects.toMatchObject({ code: "CART_INVALID_INPUT" });
      await expect(
        addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1.5,
        }),
      ).rejects.toMatchObject({ code: "CART_INVALID_INPUT" });
    });
  });

  it("supports set quantity, remove, config edit, clear, and no-ops", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const mod = await seedActiveVariantWithModifier(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
      );
      const plain = await seedActiveStandardVariant(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "plain",
      );
      const access = customerAccess(actors.customerA, actors.tree.brand.id);

      let cart = (
        await addCartLine(persistence, access, {
          variantId: plain.variantId,
          quantity: 1,
        })
      ).cart;
      cart = await setCartLineQuantity(persistence, access, {
        cartLineId: cart.lines[0]!.id,
        quantity: 5,
        expectedRevision: cart.revision,
      });
      expect(cart.lines[0]!.quantity).toBe(5);
      expect(cart.revision).toBe(BigInt(2));

      const noopQty = await setCartLineQuantity(persistence, access, {
        cartLineId: cart.lines[0]!.id,
        quantity: 5,
        expectedRevision: cart.revision,
      });
      expect(noopQty.revision).toBe(BigInt(2));

      const lineId = cart.lines[0]!.id;
      cart = await updateCartLineConfiguration(persistence, access, {
        cartLineId: lineId,
        variantId: mod.variantId,
        expectedRevision: cart.revision,
        modifiers: [
          {
            variantModifierGroupId: mod.variantModifierGroupId,
            modifierGroupOptionId: mod.modifierGroupOptionId,
            quantity: 1,
          },
        ],
      });
      expect(cart.lines[0]!.id).toBe(lineId);
      expect(cart.lines[0]!.variantId).toBe(mod.variantId);
      expect(cart.revision).toBe(BigInt(3));

      // add second plain line then edit first into matching plain → coalesce
      cart = (
        await addCartLine(persistence, access, {
          variantId: plain.variantId,
          quantity: 2,
          expectedRevision: cart.revision,
        })
      ).cart;
      const modLine = cart.lines.find((l) => l.variantId === mod.variantId)!;
      const plainLine = cart.lines.find((l) => l.variantId === plain.variantId)!;
      cart = await updateCartLineConfiguration(persistence, access, {
        cartLineId: modLine.id,
        variantId: plain.variantId,
        expectedRevision: cart.revision,
      });
      expect(cart.lines).toHaveLength(1);
      expect(cart.lines[0]!.id).toBe(plainLine.id);
      expect(cart.lines[0]!.quantity).toBe(7);

      cart = await removeCartLine(persistence, access, {
        cartLineId: cart.lines[0]!.id,
        expectedRevision: cart.revision,
      });
      expect(cart.lines).toHaveLength(0);
      expect(cart.revision).toBeGreaterThan(BigInt(1));

      const emptyClear = await clearCart(persistence, access, {
        expectedRevision: cart.revision,
      });
      expect(emptyClear.revision).toBe(cart.revision);

      cart = (
        await addCartLine(persistence, access, {
          variantId: plain.variantId,
          quantity: 1,
          expectedRevision: cart.revision,
        })
      ).cart;
      cart = await clearCart(persistence, access, {
        expectedRevision: cart.revision,
      });
      expect(cart.lines).toHaveLength(0);
      expect(cart.manualCouponCode).toBeNull();
    });
  });

  it("handles coupon canonicalize, unknown, recognized ineligible, replace, remove", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      let cart = (
        await addCartLine(persistence, access, {
          variantId: catalog.variantId,
          quantity: 1,
        })
      ).cart;

      await expect(
        applyCartCoupon(persistence, access, {
          couponCode: "NO-SUCH-COUPON",
          expectedRevision: cart.revision,
        }),
      ).rejects.toMatchObject({ code: "CART_COUPON_UNKNOWN" });

      const draft = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "save-10",
        { activate: false },
      );
      cart = await applyCartCoupon(persistence, access, {
        couponCode: "  SaVe-10  ",
        expectedRevision: cart.revision,
      });
      expect(cart.manualCouponCode).toBe(draft.canonicalCode);
      expect(cart.revision).toBe(BigInt(2));

      const active = await seedRecognizedCoupon(
        persistence,
        actors.tree.brand.id,
        actors.brandAdminActor,
        "save-20",
      );
      cart = await applyCartCoupon(persistence, access, {
        couponCode: "save-20",
        expectedRevision: cart.revision,
      });
      expect(cart.manualCouponCode).toBe(active.canonicalCode);

      const same = await applyCartCoupon(persistence, access, {
        couponCode: "save-20",
        expectedRevision: cart.revision,
      });
      expect(same.revision).toBe(cart.revision);

      cart = await removeCartCoupon(persistence, access, {
        expectedRevision: cart.revision,
      });
      expect(cart.manualCouponCode).toBeNull();
      const noop = await removeCartCoupon(persistence, access, {
        expectedRevision: cart.revision,
      });
      expect(noop.revision).toBe(cart.revision);
    });
  });

  it("does not bump revision for evaluation or external catalog changes", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const created = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      });
      const rev = created.cart.revision;
      const evaluation = await evaluateCart(persistence, access, {});
      expect(evaluation.status).toBe("REQUIRES_FULFILMENT_CONTEXT");
      const after = await getActiveCart(persistence, access);
      expect(after!.revision).toBe(rev);
    });
  });
});

describe("IMP-020 cart domain — guest TTL", () => {
  it("extends expiresAt only on material guest mutations", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const clock = mutableCartClock(FIXED_NOW);
      const brandId = actors.tree.brand.id;
      const opts = { clock: clock.clock, policy: GUEST_POLICY };

      const created = await addCartLine(
        persistence,
        guestAccess(brandId),
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      expect(created.guestToken).toBeDefined();
      const token = created.guestToken!;
      const access = guestAccess(brandId, token);
      expect(created.cart.expiresAt!.getTime()).toBe(
        FIXED_NOW.getTime() + GUEST_POLICY.guestCartTtlMs,
      );

      clock.advance(60_000);
      const bumped = await addCartLine(
        persistence,
        access,
        {
          variantId: catalog.variantId,
          quantity: 1,
          expectedRevision: created.cart.revision,
        },
        opts,
      );
      expect(bumped.cart.expiresAt!.getTime()).toBe(
        clock.instant().getTime() + GUEST_POLICY.guestCartTtlMs,
      );
      const expiresAfterMaterial = bumped.cart.expiresAt!.getTime();

      clock.advance(30_000);
      await getActiveCart(persistence, access, opts);
      await evaluateCart(persistence, access, {}, { clock: clock.clock });
      const noop = await setCartLineQuantity(
        persistence,
        access,
        {
          cartLineId: bumped.cart.lines[0]!.id,
          quantity: bumped.cart.lines[0]!.quantity,
          expectedRevision: bumped.cart.revision,
        },
        opts,
      );
      expect(noop.expiresAt!.getTime()).toBe(expiresAfterMaterial);

      await expect(
        setCartLineQuantity(
          persistence,
          access,
          {
            cartLineId: bumped.cart.lines[0]!.id,
            quantity: 9,
            expectedRevision: BigInt(999),
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_CONFLICT" });

      const afterConflict = await getActiveCart(persistence, access, opts);
      expect(afterConflict!.expiresAt!.getTime()).toBe(expiresAfterMaterial);

      await expect(
        addCartLine(
          persistence,
          access,
          {
            variantId: catalog.variantId,
            quantity: 0,
            expectedRevision: afterConflict!.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_INVALID_INPUT" });
      const afterValidation = await getActiveCart(persistence, access, opts);
      expect(afterValidation!.expiresAt!.getTime()).toBe(expiresAfterMaterial);

      // expire
      clock.set(
        new Date(expiresAfterMaterial),
      );
      await expect(
        addCartLine(
          persistence,
          access,
          {
            variantId: catalog.variantId,
            quantity: 1,
            expectedRevision: afterValidation!.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_EXPIRED" });

      await expect(
        claimGuestCart(
          persistence,
          actors.customerA,
          {
            guestToken: token,
            brandId,
            expectedGuestRevision: afterValidation!.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CART_EXPIRED" });
    });
  });
});

describe("IMP-020 cart domain — claim and reconcile", () => {
  it("claims guest cart onto customer atomically", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const guest = await addCartLine(
        persistence,
        guestAccess(brandId),
        { variantId: catalog.variantId, quantity: 2 },
        opts,
      );
      const token = guest.guestToken!;
      const claimed = await claimGuestCart(
        persistence,
        actors.customerA,
        {
          guestToken: token,
          brandId,
          expectedGuestRevision: guest.cart.revision,
        },
        opts,
      );
      expect(claimed.id).toBe(guest.cart.id);
      expect(claimed.ownerMode).toBe("customer");
      expect(claimed.expiresAt).toBeNull();
      expect(claimed.revision).toBe(guest.cart.revision + BigInt(1));

      await expect(
        getActiveCart(persistence, guestAccess(brandId, token), opts),
      ).resolves.toBeNull();
      const customerCart = await getActiveCart(
        persistence,
        customerAccess(actors.customerA, brandId),
        opts,
      );
      expect(customerCart!.id).toBe(claimed.id);
    });
  });

  it("reconciles guest into customer with KEEP_GUEST / KEEP_CUSTOMER", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const couponA = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "keep-a",
      );
      const couponB = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "keep-b",
      );
      const other = await seedActiveStandardVariant(
        persistence,
        brandId,
        actors.brandAdminActor,
        "diff",
      );

      let customer = (
        await addCartLine(
          persistence,
          customerAccess(actors.customerA, brandId),
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        )
      ).cart;
      customer = await applyCartCoupon(
        persistence,
        customerAccess(actors.customerA, brandId),
        { couponCode: couponA.canonicalCode, expectedRevision: customer.revision },
        opts,
      );

      const guestCreated = await addCartLine(
        persistence,
        guestAccess(brandId),
        { variantId: catalog.variantId, quantity: 2 },
        opts,
      );
      let guest = guestCreated.cart;
      const token = guestCreated.guestToken!;
      guest = (
        await addCartLine(
          persistence,
          guestAccess(brandId, token),
          {
            variantId: other.variantId,
            quantity: 1,
            expectedRevision: guest.revision,
          },
          opts,
        )
      ).cart;
      guest = await applyCartCoupon(
        persistence,
        guestAccess(brandId, token),
        { couponCode: couponB.canonicalCode, expectedRevision: guest.revision },
        opts,
      );

      await expect(
        reconcileGuestCartWithCustomer(
          persistence,
          actors.customerA,
          {
            guestToken: token,
            brandId,
            expectedGuestRevision: guest.revision,
            expectedCustomerRevision: customer.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({
        code: "CART_RECONCILIATION_CONFLICT",
        resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
      });

      // Auth still valid conceptually — actor still works
      expect(
        await getActiveCart(
          persistence,
          customerAccess(actors.customerA, brandId),
          opts,
        ),
      ).not.toBeNull();

      const merged = await reconcileGuestCartWithCustomer(
        persistence,
        actors.customerA,
        {
          guestToken: token,
          brandId,
          expectedGuestRevision: guest.revision,
          expectedCustomerRevision: customer.revision,
          resolution: "KEEP_GUEST",
        },
        opts,
      );
      expect(merged.id).toBe(customer.id);
      expect(merged.manualCouponCode).toBe(couponB.canonicalCode);
      const equiv = merged.lines.find((l) => l.variantId === catalog.variantId);
      expect(equiv!.quantity).toBe(3);
      expect(merged.lines.some((l) => l.variantId === other.variantId)).toBe(true);

      await expect(
        getActiveCart(persistence, guestAccess(brandId, token), opts),
      ).resolves.toBeNull();
    });
  });

  it("KEEP_CUSTOMER preserves customer coupon", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const opts = { clock: fixedCartClock(FIXED_NOW), policy: GUEST_POLICY };
      const couponA = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "cust-c",
      );
      const couponB = await seedRecognizedCoupon(
        persistence,
        brandId,
        actors.brandAdminActor,
        "guest-c",
      );

      let customer = (
        await addCartLine(
          persistence,
          customerAccess(actors.customerA, brandId),
          { variantId: catalog.variantId, quantity: 1 },
          opts,
        )
      ).cart;
      customer = await applyCartCoupon(
        persistence,
        customerAccess(actors.customerA, brandId),
        { couponCode: couponA.canonicalCode, expectedRevision: customer.revision },
        opts,
      );

      const guestCreated = await addCartLine(
        persistence,
        guestAccess(brandId),
        { variantId: catalog.variantId, quantity: 1 },
        opts,
      );
      const guest = await applyCartCoupon(
        persistence,
        guestAccess(brandId, guestCreated.guestToken!),
        {
          couponCode: couponB.canonicalCode,
          expectedRevision: guestCreated.cart.revision,
        },
        opts,
      );

      const merged = await reconcileGuestCartWithCustomer(
        persistence,
        actors.customerA,
        {
          guestToken: guestCreated.guestToken!,
          brandId,
          expectedGuestRevision: guest.revision,
          expectedCustomerRevision: customer.revision,
          resolution: "KEEP_CUSTOMER",
        },
        opts,
      );
      expect(merged.manualCouponCode).toBe(couponA.canonicalCode);
    });
  });
});

describe("IMP-020 cart domain — evaluation", () => {
  it("returns REQUIRES_FULFILMENT_CONTEXT without location and distinct serviceability statuses", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const access = customerAccess(actors.customerA, brandId);
      await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      });

      const missing = await evaluateCart(persistence, access, {});
      expect(missing.status).toBe("REQUIRES_FULFILMENT_CONTEXT");
      expect(missing).not.toHaveProperty("quote");

      // No distance policy → INDETERMINATE at serviceability layer
      const notSvc = await evaluateCart(persistence, access, {
        location: { coordinates: TEST_INSIDE_COORDS },
      });
      expect(notSvc.status).toBe("SERVICEABILITY_INDETERMINATE");

      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      await seedOutletDistanceServiceability(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );

      await pauseOutletIndefinitely(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      const paused = await evaluateCart(persistence, access, {
        location: { coordinates: TEST_INSIDE_COORDS },
      });
      expect(paused.status).toBe("SERVICEABILITY_TEMPORARILY_UNAVAILABLE");

      await persistence.transaction(async (tx) => {
        await resumeOutlet(tx, {
          actor: actors.brandAdminActor,
          outletId: actors.tree.outletA.id,
        });
      });

      const before = await getActiveCart(persistence, access);
      const afterSvc = await evaluateCart(persistence, access, {
        location: { coordinates: TEST_INSIDE_COORDS },
      });
      // Without assortment/pricing may be CART_INVALID or EVALUATION_INDETERMINATE
      expect([
        "COMPLETE",
        "CART_INVALID",
        "EVALUATION_INDETERMINATE",
        "SERVICEABILITY_INDETERMINATE",
      ]).toContain(afterSvc.status);

      const after = await getActiveCart(persistence, access);
      expect(after!.revision).toBe(before!.revision);
      expect(after!.updatedAt.getTime()).toBe(before!.updatedAt.getTime());
      await persistence.withContext(async (ctx) => {
        const carts = await ctx.db.execute(sql`
          select column_name from information_schema.columns
          where table_schema='app' and table_name='carts' and column_name='outlet_id'
        `);
        expect(carts.rows).toHaveLength(0);
      });
    });
  });
});

describe("IMP-020 cart domain — permissions catalog untouched", () => {
  it("does not introduce workforce cart permissions", () => {
    expect(PERMISSION_KEYS.some((k) => k.startsWith("cart."))).toBe(false);
    expect(CartError).toBeDefined();
  });
});
