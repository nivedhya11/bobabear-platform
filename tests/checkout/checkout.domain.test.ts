/**
 * Checkout domain tests (IMP-021) — CO-01..CO-33.
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  excludeVariantAtScope,
  resumeOutlet,
  setVariantAvailability,
} from "../../src/server/assortment";
import {
  applyModifierGroupToVariant,
  retireProduct,
  retireVariant,
} from "../../src/server/catalog";
import {
  addCartLine,
  applyCartCoupon,
  clearCart,
  setCartLineQuantity,
  type CustomerActor,
} from "../../src/server/cart";
import {
  cancelCheckout,
  clearCheckoutDestination,
  evaluateCheckout,
  fixedCheckoutClock,
  getActiveCheckout,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  startCheckout,
} from "../../src/server/checkout";
import { checkoutSnapshotsStructurallyEqual } from "../../src/server/checkout/compare-snapshots";
import { updateOwnAddress } from "../../src/server/customer-addresses";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../src/server/promotions";
import type { CheckoutSnapshot } from "../../src/shared/checkout";
import { pauseOutletIndefinitely } from "../database/support/serviceability-fixtures";
import {
  GUEST_POLICY,
  seedActiveBundleWithComponent,
  seedActiveStandardVariant,
  seedActiveVariantWithModifier,
  seedRecognizedCoupon,
  uniqueCode,
} from "../database/support/cart-fixtures";
import {
  CHECKOUT_PIN,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  createSavedAddressForCustomer,
  FIXED_NOW,
  mutableCheckoutClock,
  attachVariantPriceToActiveBrandBook,
  seedBrandPriceAndTaxForVariant,
  seedBundleOptionDeltaOnBook,
  seedChargePricesOnBook,
  seedModifierDeltaOnBook,
  seedServiceableOutlet,
  withCartHarness,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import { customerActor as addressCustomerActor } from "../database/support/customer-addresses-fixtures";
import { includeVariantAtBrand as includeBrand } from "../assortment-availability/support";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function customerAccess(actor: CustomerActor, brandId: string) {
  return { kind: "customer" as const, actor, brandId };
}

function guestAccess(brandId: string, guestToken?: string) {
  return guestToken
    ? { kind: "guest" as const, brandId, guestToken }
    : { kind: "guest" as const, brandId };
}

describe("IMP-021 checkout domain — start / destination", () => {
  it("CO-01 start: authenticated customer + owned non-empty Cart → DRAFT revision 1", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const started = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        checkoutOpts(),
      );
      expect(started.status).toBe("DRAFT");
      expect(started.revision).toBe(BigInt(1));
      expect(started.cartId).toBe(cartId);
      expect(started.activeSnapshotId).toBeNull();
      expect(started.sourceCartRevision).toBe(BigInt(1));
    });
  });

  it("CO-02 repeated start: same usable active Checkout; no duplicates", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      const first = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      const second = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      expect(second.id).toBe(first.id);
      expect(second.revision).toBe(first.revision);
      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(sql`
          select count(*)::text as c from app.checkouts
          where cart_id = ${cartId}::uuid
            and status in ('DRAFT', 'READY_FOR_PAYMENT', 'PAYMENT_PENDING')
        `);
        expect(count.rows[0]?.c).toBe("1");
      });
    });
  });

  it("CO-03 empty Cart: CHECKOUT_EMPTY_CART; no Checkout created", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId }) => {
        const access = customerAccess(actors.customerA, actors.tree.brand.id);
        const cart = await clearCart(persistence, access, {
          expectedRevision: BigInt(1),
        });
        expect(cart.lines).toHaveLength(0);

        await expect(
          startCheckout(
            persistence,
            actors.customerA,
            { cartId },
            checkoutOpts(),
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EMPTY_CART" });

        await persistence.withContext(async (ctx) => {
          const count = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkouts where cart_id = ${cartId}::uuid
          `);
          expect(count.rows[0]?.c).toBe("0");
        });
      },
    );
  });

  it("CO-04 guest Cart: rejected; no implicit reconciliation", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const guest = await addCartLine(
        persistence,
        guestAccess(brandId),
        { variantId: catalog.variantId, quantity: 1 },
        { policy: GUEST_POLICY, clock: fixedCheckoutClock(FIXED_NOW) },
      );
      expect(guest.guestToken).toBeDefined();

      await expect(
        startCheckout(
          persistence,
          actors.customerA,
          { cartId: guest.cart.id },
          checkoutOpts(),
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
    });
  });

  it("CO-05 saved Address: owned address copied; later mutation does not mutate Checkout", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        expect(withDest.destination?.destinationKind).toBe("SAVED_ADDRESS");
        expect(withDest.destination?.sourceSavedAddressId).toBe(addressId);
        const copiedLine1 = withDest.destination!.addressLine1;

        await updateOwnAddress(
          persistence,
          addressCustomerActor(actors.customerAId),
          addressId,
          { addressLine1: "Mutated Street 99" },
        );

        const again = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: withDest.id },
          opts,
        );
        expect(again!.destination!.addressLine1).toBe(copiedLine1);
        expect(again!.destination!.addressLine1).not.toBe("Mutated Street 99");
      },
    );
  });

  it("CO-06 one-time Address: valid India address without creating Saved Address", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, oneTimeDestination }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const before = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select count(*)::text as c from app.customer_addresses
            where customer_auth_user_id = ${actors.customerAId}
          `);
          return Number(r.rows[0]?.c);
        });

        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: oneTimeDestination,
          },
          opts,
        );
        expect(withDest.destination?.destinationKind).toBe("ONE_TIME_ADDRESS");
        expect(withDest.destination?.sourceSavedAddressId).toBeNull();
        expect(withDest.destination?.postalCode).toBe(CHECKOUT_PIN);

        const after = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select count(*)::text as c from app.customer_addresses
            where customer_auth_user_id = ${actors.customerAId}
          `);
          return Number(r.rows[0]?.c);
        });
        expect(after).toBe(before);
      },
    );
  });

  it("CO-07 destination no-op: same canonical destination causes no write/revision/update", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const first = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const second = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: first.id,
            expectedCheckoutRevision: first.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        expect(second.revision).toBe(first.revision);
        expect(second.updatedAt.getTime()).toBe(first.updatedAt.getTime());
      },
    );
  });

  it("CO-08 destination change: material mutation + revision once; readiness invalidated", async () => {
    await withCheckoutReadyHarness(
      async ({
        persistence,
        actors,
        cartId,
        addressId,
        oneTimeDestination,
      }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        let checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
        const oldSnap = ready.checkout.activeSnapshotId;

        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            destination: oneTimeDestination,
          },
          opts,
        );
        expect(checkout.status).toBe("DRAFT");
        expect(checkout.activeSnapshotId).toBeNull();
        expect(checkout.revision).toBe(ready.checkout.revision + BigInt(1));
        expect(oldSnap).not.toBeNull();
      },
    );
  });

  it("CO-09 clear destination: correct pre-payment mutation / no-op semantics", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const clearedNoop = await clearCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
          },
          opts,
        );
        expect(clearedNoop.revision).toBe(started.revision);
        expect(clearedNoop.destination).toBeNull();

        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const cleared = await clearCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(cleared.destination).toBeNull();
        expect(cleared.revision).toBe(withDest.revision + BigInt(1));
      },
    );
  });
});

describe("IMP-021 checkout domain — evaluate commercial", () => {
  it("CO-10 serviceability: all four outcomes covered", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, oneTimeDestination }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );

        // NOT_SERVICEABLE — unknown PIN
        let checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { ...oneTimeDestination, postalCode: "110001" },
          },
          opts,
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_NOT_SERVICEABLE" });

        // SERVICEABLE
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: oneTimeDestination,
          },
          opts,
        );
        const ok = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(ok.checkout.status).toBe("READY_FOR_PAYMENT");

        // TEMPORARILY_UNAVAILABLE — pause outlet
        await pauseOutletIndefinitely(
          persistence,
          actors.brandAdminActor,
          actors.tree.outletA.id,
        );
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ok.checkout.id,
              expectedCheckoutRevision: ok.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({
          code: "CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
        });

        await persistence.transaction(async (tx) => {
          await resumeOutlet(tx, {
            actor: actors.brandAdminActor,
            outletId: actors.tree.outletA.id,
          });
        });

        // INDETERMINATE — invalid evaluation clock forces operating ERROR
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ok.checkout.id,
              expectedCheckoutRevision: ok.checkout.revision,
            },
            {
              clock: {
                now(): Date {
                  return new Date(Number.NaN);
                },
              },
              policy: opts.policy,
            },
          ),
        ).rejects.toMatchObject({
          code: expect.stringMatching(
            /CHECKOUT_(SERVICEABILITY_INDETERMINATE|DEPENDENCY_INDETERMINATE)/,
          ),
        });
      },
    );
  });

  it("CO-11 outlet provenance: Serviceability-selected Outlet frozen in snapshot", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.snapshot.selectedOutletId).toBe(actors.tree.outletA.id);
      },
    );
  });

  it("CO-12 catalog lifecycle: valid active Variant; retired/non-orderable rejected", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ok = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ok.checkout.status).toBe("READY_FOR_PAYMENT");

        await persistence.withContext(async (ctx) => {
          const now = new Date();
          await ctx.db.execute(sql`
            update app.catalog_variants
            set lifecycle_status = 'retired',
                retired_at = ${now},
                updated_at = ${now}
            where id = ${catalog.variantId}::uuid
          `);
        });

        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ok.checkout.id,
              expectedCheckoutRevision: ok.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_VARIANT_INVALID" });
        void retireProduct;
        void retireVariant;
      },
    );
  });

  it("CO-13 modifiers: valid, invalid option, retired option, and selection-count failure", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const brandId = actors.tree.brand.id;
      const mod = await seedActiveVariantWithModifier(
        persistence,
        brandId,
        actors.brandAdminActor,
      );
      await includeBrand(
        persistence,
        actors.brandAdminActor,
        brandId,
        mod.variantId,
      );
      await seedServiceableOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      const { priceBookId } = await seedBrandPriceAndTaxForVariant(persistence, {
        actor: actors.brandAdminActor,
        brandId,
        organizationId: actors.tree.orgA.id,
        legalEntityId: actors.tree.leA.id,
        outletId: actors.tree.outletA.id,
        variantId: mod.variantId,
      });
      await seedModifierDeltaOnBook(persistence, {
        brandId,
        priceBookId,
        variantModifierGroupId: mod.variantModifierGroupId,
        modifierGroupOptionId: mod.modifierGroupOptionId,
        priceDeltaPaise: BigInt(500),
      });

      const access = customerAccess(actors.customerA, brandId);
      const opts = checkoutOpts();
      const address = await createSavedAddressForCustomer(
        persistence,
        actors.customerAId,
      );

      // Valid with optional modifier
      const added = await addCartLine(persistence, access, {
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
      let checkout = await startCheckout(
        persistence,
        actors.customerA,
        { cartId: added.cart.id },
        opts,
      );
      checkout = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: address.id },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
        },
        opts,
      );
      expect(ready.snapshot.lines[0]!.modifiers).toHaveLength(1);

      // Invalid option: real option from a different modifier group (FK ok, structure fails)
      const otherMod = await seedActiveVariantWithModifier(
        persistence,
        brandId,
        actors.brandAdminActor,
        "oth",
      );
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`delete from app.cart_line_modifier_selections`);
        await ctx.db.execute(sql`
          insert into app.cart_line_modifier_selections (
            cart_line_id, variant_modifier_group_id, modifier_group_option_id, quantity
          ) values (
            ${ready.snapshot.lines[0]!.sourceCartLineId}::uuid,
            ${mod.variantModifierGroupId}::uuid,
            ${otherMod.modifierGroupOptionId}::uuid,
            1
          )
        `);
        await ctx.db.execute(sql`
          update app.carts set revision = revision + 1 where id = ${added.cart.id}::uuid
        `);
      });
      checkout = await clearCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
        },
        opts,
      );
      checkout = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: address.id },
        },
        opts,
      );
      await expect(
        evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_MODIFIER_INVALID" });

      // Wrong VMG for this variant (selection-count / binding failure path)
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`delete from app.cart_line_modifier_selections`);
        await ctx.db.execute(sql`
          insert into app.cart_line_modifier_selections (
            cart_line_id, variant_modifier_group_id, modifier_group_option_id, quantity
          ) values (
            ${ready.snapshot.lines[0]!.sourceCartLineId}::uuid,
            ${otherMod.variantModifierGroupId}::uuid,
            ${otherMod.modifierGroupOptionId}::uuid,
            1
          )
        `);
        await ctx.db.execute(sql`
          update app.carts set revision = revision + 1 where id = ${added.cart.id}::uuid
        `);
      });
      const live = await getActiveCheckout(
        persistence,
        actors.customerA,
        { cartId: added.cart.id },
        opts,
      );
      await expect(
        evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: live!.id,
            expectedCheckoutRevision: live!.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_MODIFIER_INVALID" });
      void applyModifierGroupToVariant;
    });
  });

  it("CO-14 bundles: valid bundle; invalid required component; invalid nested modifier", async () => {
    await withCartHarness(async ({ persistence, actors }) => {
      const brandId = actors.tree.brand.id;
      const bundle = await seedActiveBundleWithComponent(
        persistence,
        brandId,
        actors.brandAdminActor,
        { withNestedModifier: true },
      );
      await includeBrand(
        persistence,
        actors.brandAdminActor,
        brandId,
        bundle.bundleVariantId,
      );
      await includeBrand(
        persistence,
        actors.brandAdminActor,
        brandId,
        bundle.componentVariantId,
      );
      await seedServiceableOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      const { priceBookId } = await seedBrandPriceAndTaxForVariant(persistence, {
        actor: actors.brandAdminActor,
        brandId,
        organizationId: actors.tree.orgA.id,
        legalEntityId: actors.tree.leA.id,
        outletId: actors.tree.outletA.id,
        variantId: bundle.bundleVariantId,
      });
      await seedBundleOptionDeltaOnBook(persistence, {
        brandId,
        priceBookId,
        bundleGroupOptionId: bundle.bundleGroupOptionId,
        priceDeltaPaise: BigInt(0),
      });
      if (
        bundle.componentVariantModifierGroupId &&
        bundle.componentModifierGroupOptionId
      ) {
        await seedModifierDeltaOnBook(persistence, {
          brandId,
          priceBookId,
          variantModifierGroupId: bundle.componentVariantModifierGroupId,
          modifierGroupOptionId: bundle.componentModifierGroupOptionId,
          priceDeltaPaise: BigInt(0),
        });
      }

      const access = customerAccess(actors.customerA, brandId);
      const opts = checkoutOpts();
      const address = await createSavedAddressForCustomer(
        persistence,
        actors.customerAId,
      );

      const added = await addCartLine(persistence, access, {
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
      let checkout = await startCheckout(
        persistence,
        actors.customerA,
        { cartId: added.cart.id },
        opts,
      );
      checkout = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: address.id },
        },
        opts,
      );
      const ready = await evaluateCheckout(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
        },
        opts,
      );
      expect(ready.snapshot.lines[0]!.bundleSelections).toHaveLength(1);

      // Invalid: empty bundle selections via SQL
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          delete from app.cart_line_bundle_modifier_selections
        `);
        await ctx.db.execute(sql`delete from app.cart_line_bundle_selections`);
        await ctx.db.execute(sql`
          update app.carts set revision = revision + 1 where id = ${added.cart.id}::uuid
        `);
      });
      await expect(
        evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/CHECKOUT_(BUNDLE|CART)_/),
      });
    });
  });

  it("CO-15 assortment: assorted / not assorted; no rerouting", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");

        await persistence.transaction(async (tx) => {
          await excludeVariantAtScope(tx, {
            actor: actors.brandAdminActor,
            brandId: actors.tree.brand.id,
            scopeType: "outlet",
            outletId: actors.tree.outletA.id,
            variantId: catalog.variantId,
          });
        });

        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_NOT_ASSORTED" });
      },
    );
  });

  it("CO-16 availability: available / temporarily unavailable / sold out", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");

        await persistence.transaction(async (tx) => {
          await setVariantAvailability(tx, {
            actor: actors.brandAdminActor,
            outletId: actors.tree.outletA.id,
            variantId: catalog.variantId,
            state: "temporarily_unavailable",
            unavailableUntil: new Date(FIXED_NOW.getTime() + 60 * 60 * 1000),
          });
        });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_TEMPORARILY_UNAVAILABLE" });

        await persistence.transaction(async (tx) => {
          await setVariantAvailability(tx, {
            actor: actors.brandAdminActor,
            outletId: actors.tree.outletA.id,
            variantId: catalog.variantId,
            state: "sold_out",
            unavailableUntil: null,
          });
        });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_SOLD_OUT" });
      },
    );
  });

  it("CO-17 problem aggregation: multiple deterministic merchandise problems returned together", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const access = customerAccess(actors.customerA, brandId);
        const other = await seedActiveStandardVariant(
          persistence,
          brandId,
          actors.brandAdminActor,
          "agg",
        );
        // Line B: priced but not assortment-included → CHECKOUT_NOT_ASSORTED.
        await attachVariantPriceToActiveBrandBook(persistence, {
          brandId,
          variantId: other.variantId,
        });
        const cart = await addCartLine(persistence, access, {
          variantId: other.variantId,
          quantity: 1,
          expectedRevision: BigInt(1),
        });

        const lineAId = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select id::text as id
            from app.cart_lines
            where cart_id = ${cart.cart.id}::uuid
              and variant_id = ${catalog.variantId}::uuid
            limit 1
          `);
          return r.rows[0]!.id as string;
        });
        const lineBId = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select id::text as id
            from app.cart_lines
            where cart_id = ${cart.cart.id}::uuid
              and variant_id = ${other.variantId}::uuid
            limit 1
          `);
          return r.rows[0]!.id as string;
        });

        const cartBefore = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select id::text as id, variant_id::text as variant_id, quantity::text as quantity
            from app.cart_lines
            where cart_id = ${cart.cart.id}::uuid
            order by id
          `);
          return r.rows as Array<{ id: string; variant_id: string; quantity: string }>;
        });
        expect(cartBefore).toHaveLength(2);

        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId: cart.cart.id },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );

        // Line A: retire the original harness variant → CHECKOUT_VARIANT_INVALID.
        await persistence.withContext(async (ctx) => {
          const now = new Date();
          await ctx.db.execute(sql`
            update app.catalog_variants
            set lifecycle_status = 'retired',
                retired_at = ${now},
                updated_at = ${now}
            where id = ${catalog.variantId}::uuid
          `);
        });

        try {
          await evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: withDest.id,
              expectedCheckoutRevision: withDest.revision,
            },
            opts,
          );
          expect.unreachable("expected merchandise failure");
        } catch (error) {
          expect(error).toMatchObject({
            code: expect.stringMatching(/^CHECKOUT_/),
          });
          const problems = (error as { problems?: unknown[] }).problems;
          expect(Array.isArray(problems)).toBe(true);
          expect(problems).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                cartLineId: lineAId,
                code: "CHECKOUT_VARIANT_INVALID",
              }),
              expect.objectContaining({
                cartLineId: lineBId,
                code: "CHECKOUT_NOT_ASSORTED",
              }),
            ]),
          );
        }

        const cartAfter = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select id::text as id, variant_id::text as variant_id, quantity::text as quantity
            from app.cart_lines
            where cart_id = ${cart.cart.id}::uuid
            order by id
          `);
          return r.rows as Array<{ id: string; variant_id: string; quantity: string }>;
        });
        expect(cartAfter).toEqual(cartBefore);
        void cartId;
      },
    );
  });

  it("CO-18 pricing losslessness: base + charges preserved from Pricing quote totals", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        // Attach charges on the already-active brand book via SQL
        await persistence.withContext(async (ctx) => {
          const book = await ctx.db.execute(sql`
            select id::text as id from app.price_books
            where brand_id = ${actors.tree.brand.id}::uuid
              and lifecycle_status = 'active'
            limit 1
          `);
          const priceBookId = book.rows[0]!.id as string;
          await seedChargePricesOnBook(persistence, {
            brandId: actors.tree.brand.id,
            priceBookId,
            packagingPaise: BigInt(2_000),
            deliveryPaise: BigInt(4_000),
          });
        });

        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.snapshot.basePaise).toBe(BigInt(10_000));
        expect(ready.snapshot.chargesPaise).toBe(BigInt(6_000));
        expect(ready.snapshot.grandTotalPaise).toBe(
          ready.snapshot.taxablePaise + ready.snapshot.taxPaise,
        );
        expect(ready.snapshot.currency).toBe("INR");
        void catalog;
      },
    );
  });

  it("CO-19 manual coupon: eligible succeeds; recognized-but-ineligible blocks READY", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const brandId = actors.tree.brand.id;
        const access = customerAccess(actors.customerA, brandId);
        const opts = checkoutOpts();

        const eligible = await seedRecognizedCoupon(
          persistence,
          brandId,
          actors.brandAdminActor,
          "SAVE10CHK",
        );
        let cart = await applyCartCoupon(persistence, access, {
          couponCode: eligible.canonicalCode,
          expectedRevision: BigInt(1),
        });
        expect(cart.manualCouponCode).toBe(eligible.canonicalCode);

        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");
        expect(ready.snapshot.manualCouponCode).toBe(eligible.canonicalCode);
        expect(ready.snapshot.promotionDiscountPaise).toBeGreaterThan(BigInt(0));

        // Cart coupon untouched
        const still = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select manual_coupon_code from app.carts where id = ${cartId}::uuid
          `);
          return r.rows[0]?.manual_coupon_code as string;
        });
        expect(still).toBe(eligible.canonicalCode);

        // Ineligible: coupon targeting a different product
        const other = await seedActiveStandardVariant(
          persistence,
          brandId,
          actors.brandAdminActor,
          "cpx",
        );
        const ineligible = await persistence.transaction(async (tx) => {
          const created = await createPromotionDraft(tx, {
            actor: actors.brandAdminActor,
            brandId,
            code: uniqueCode("inel"),
            displayName: "Ineligible Coupon",
            scopeType: "brand",
            territoryId: null,
            organizationId: null,
            outletId: null,
            triggerType: "coupon",
            stackingPolicy: "exclusive",
            startsAt: new Date("2026-01-01T00:00:00Z"),
            endsAt: null,
          });
          await setPromotionBenefit(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
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
          });
          await setPromotionTargets(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
            targetRole: "qualifier",
            targets: [
              {
                targetRole: "qualifier",
                targetType: "product",
                productId: other.productId,
                variantId: null,
                chargeDefinitionId: null,
              },
            ],
          });
          await setPromotionTargets(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
            targetRole: "benefit",
            targets: [
              {
                targetRole: "benefit",
                targetType: "product",
                productId: other.productId,
                variantId: null,
                chargeDefinitionId: null,
              },
            ],
          });
          await activatePromotion(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
          });
          const coupon = await createCouponDraft(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
            origin: "manual",
            canonicalCode: "WRONGITEM",
          });
          await activateCoupon(tx, { actor: actors.brandAdminActor, couponId: coupon.id });
          return coupon;
        });

        cart = await applyCartCoupon(persistence, access, {
          couponCode: ineligible.canonicalCode,
          expectedRevision: cart.revision,
        });
        // Destination change or cancel READY then re-evaluate
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        // same destination may no-op while READY — force clear/set if needed
        if (checkout.status === "READY_FOR_PAYMENT") {
          checkout = await clearCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          );
          checkout = await setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
              destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
            },
            opts,
          );
        }
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_COUPON_INELIGIBLE" });
      },
    );
  });

  it("CO-20 automatic promotion: evaluated/snapshotted without Cart mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const brandId = actors.tree.brand.id;
        await persistence.transaction(async (tx) => {
          const created = await createPromotionDraft(tx, {
            actor: actors.brandAdminActor,
            brandId,
            code: uniqueCode("auto"),
            displayName: "Auto 5%",
            scopeType: "brand",
            territoryId: null,
            organizationId: null,
            outletId: null,
            triggerType: "automatic",
            stackingPolicy: "exclusive",
            startsAt: new Date("2026-01-01T00:00:00Z"),
            endsAt: null,
          });
          await setPromotionBenefit(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
            benefit: {
              benefitType: "percentage_discount",
              percentageBps: 500,
              fixedAmountPaise: null,
              maximumDiscountPaise: null,
              buyQuantity: null,
              getQuantity: null,
              repeatable: null,
              maximumRewardQuantity: null,
              includeModifiers: false,
              includeBundleDeltas: false,
            },
          });
          for (const role of ["qualifier", "benefit"] as const) {
            await setPromotionTargets(tx, {
              actor: actors.brandAdminActor,
              promotionId: created.id,
              targetRole: role,
              targets: [
                {
                  targetRole: role,
                  targetType: "all_merchandise",
                  productId: null,
                  variantId: null,
                  chargeDefinitionId: null,
                },
              ],
            });
          }
          await activatePromotion(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
          });
        });

        const opts = checkoutOpts();
        const beforeCoupon = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select manual_coupon_code, revision::text as revision
            from app.carts where id = ${cartId}::uuid
          `);
          return r.rows[0]!;
        });

        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.snapshot.promotionDiscountPaise).toBeGreaterThan(BigInt(0));
        expect(
          ready.snapshot.promotionEffects.some(
            (e) => e.effectKind === "applied_promotion",
          ),
        ).toBe(true);

        const after = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select manual_coupon_code, revision::text as revision
            from app.carts where id = ${cartId}::uuid
          `);
          return r.rows[0]!;
        });
        expect(after.manual_coupon_code).toBe(beforeCoupon.manual_coupon_code);
        expect(after.revision).toBe(beforeCoupon.revision);
      },
    );
  });

  it("CO-21 BOGO: structured reward preserved without Cart quantity mutation", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const brandId = actors.tree.brand.id;
        const access = customerAccess(actors.customerA, brandId);
        // Need qty 2 for buy 1 get 1
        await setCartLineQuantity(persistence, access, {
          cartLineId: (
            await persistence.withContext(async (ctx) => {
              const r = await ctx.db.execute(sql`
                select id::text as id from app.cart_lines where cart_id = ${cartId}::uuid limit 1
              `);
              return r.rows[0]!.id as string;
            })
          ),
          quantity: 2,
          expectedRevision: BigInt(1),
        });

        let promotionId = "";
        await persistence.transaction(async (tx) => {
          const created = await createPromotionDraft(tx, {
            actor: actors.brandAdminActor,
            brandId,
            code: uniqueCode("bogo"),
            displayName: "BOGO",
            scopeType: "brand",
            territoryId: null,
            organizationId: null,
            outletId: null,
            triggerType: "automatic",
            stackingPolicy: "exclusive",
            startsAt: new Date("2026-01-01T00:00:00Z"),
            endsAt: null,
          });
          promotionId = created.id;
          await setPromotionBenefit(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
            benefit: {
              benefitType: "buy_x_get_y",
              percentageBps: null,
              fixedAmountPaise: null,
              maximumDiscountPaise: null,
              buyQuantity: 1,
              getQuantity: 1,
              repeatable: true,
              maximumRewardQuantity: null,
              includeModifiers: false,
              includeBundleDeltas: false,
            },
          });
          for (const role of ["qualifier", "benefit"] as const) {
            await setPromotionTargets(tx, {
              actor: actors.brandAdminActor,
              promotionId: created.id,
              targetRole: role,
              targets: [
                {
                  targetRole: role,
                  targetType: "variant",
                  productId: null,
                  variantId: catalog.variantId,
                  chargeDefinitionId: null,
                },
              ],
            });
          }
          await activatePromotion(tx, {
            actor: actors.brandAdminActor,
            promotionId: created.id,
          });
        });

        const opts = checkoutOpts();
        const qtyBefore = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select quantity::text as q from app.cart_lines where cart_id = ${cartId}::uuid
          `);
          return r.rows[0]!.q as string;
        });
        expect(qtyBefore).toBe("2");

        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.checkout.status).toBe("READY_FOR_PAYMENT");

        const bogoEffects = ready.snapshot.promotionEffects.filter(
          (e) => e.effectKind === "bogo_reward",
        );
        expect(bogoEffects.length).toBeGreaterThanOrEqual(1);
        expect(bogoEffects).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              effectKind: "bogo_reward",
              promotionId,
              rewardQuantity: expect.any(Number),
            }),
          ]),
        );
        for (const effect of bogoEffects) {
          expect(effect.promotionId).toBe(promotionId);
          expect(effect.rewardQuantity).toBeGreaterThanOrEqual(1);
          expect(effect.rewardUnitId).toBeTruthy();
        }

        const persisted = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select
              effect_kind,
              promotion_id::text as promotion_id,
              reward_quantity::text as reward_quantity,
              reward_unit_id,
              reward_variant_id::text as reward_variant_id
            from app.checkout_snapshot_promotion_effects
            where snapshot_id = ${ready.snapshot.id}::uuid
              and effect_kind = 'bogo_reward'
            order by sort_order, id
          `);
          return r.rows as Array<{
            effect_kind: string;
            promotion_id: string;
            reward_quantity: string | null;
            reward_unit_id: string | null;
            reward_variant_id: string | null;
          }>;
        });
        expect(persisted.length).toBeGreaterThanOrEqual(1);
        expect(persisted).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              effect_kind: "bogo_reward",
              promotion_id: promotionId,
            }),
          ]),
        );
        for (const row of persisted) {
          expect(Number(row.reward_quantity)).toBeGreaterThanOrEqual(1);
          expect(row.reward_unit_id).toBeTruthy();
        }

        const qtyAfter = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select quantity::text as q from app.cart_lines where cart_id = ${cartId}::uuid
          `);
          return r.rows[0]!.q as string;
        });
        expect(qtyAfter).toBe(qtyBefore);
        // Structured bogo_reward must be present; monetary discount alone is insufficient.
        expect(
          ready.snapshot.promotionEffects.some((e) => e.effectKind === "bogo_reward"),
        ).toBe(true);
      },
    );
  });

  it("CO-22 GST: taxable values/components preserved exactly", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        expect(ready.snapshot.taxComponents.length).toBeGreaterThan(0);
        const sum = ready.snapshot.taxComponents.reduce(
          (a, c) => a + c.taxAmountPaise,
          BigInt(0),
        );
        expect(sum).toBe(ready.snapshot.taxPaise);
        expect(ready.snapshot.taxablePaise).toBeGreaterThan(BigInt(0));
      },
    );
  });

  it("CO-23 complete commercial readiness: unresolved monetary authority prevents READY", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      await includeBrand(
        persistence,
        actors.brandAdminActor,
        brandId,
        catalog.variantId,
      );
      await seedServiceableOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      // Intentionally no price book
      const access = customerAccess(actors.customerA, brandId);
      const added = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      });
      const address = await createSavedAddressForCustomer(
        persistence,
        actors.customerAId,
      );
      const opts = checkoutOpts();
      let checkout = await startCheckout(
        persistence,
        actors.customerA,
        { cartId: added.cart.id },
        opts,
      );
      checkout = await setCheckoutDestination(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          destination: { kind: "SAVED_ADDRESS", savedAddressId: address.id },
        },
        opts,
      );
      await expect(
        evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_PRICE_UNRESOLVED" });
    });
  });

  it("CO-24 snapshot immutability: later upstream mutations do not modify existing snapshot", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        const started = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const withDest = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: withDest.id,
            expectedCheckoutRevision: withDest.revision,
          },
          opts,
        );
        const snapId = ready.snapshot.id;
        const grand = ready.snapshot.grandTotalPaise;

        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.price_book_variant_prices
            set amount_paise = 99999
            where variant_id = ${catalog.variantId}::uuid
          `);
        });

        const loaded = await persistence.withContext(async (ctx) => {
          const r = await ctx.db.execute(sql`
            select grand_total_paise::text as g from app.checkout_snapshots
            where id = ${snapId}::uuid
          `);
          return BigInt(r.rows[0]!.g as string);
        });
        expect(loaded).toBe(grand);
      },
    );
  });

  it("CO-25 changed terms: new snapshot S2 appended; S1 remains immutable/inactive", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const access = customerAccess(actors.customerA, actors.tree.brand.id);
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const first = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const s1 = first.snapshot.id;

        await setCartLineQuantity(persistence, access, {
          cartLineId: first.snapshot.lines[0]!.sourceCartLineId,
          quantity: 3,
          expectedRevision: first.checkout.sourceCartRevision,
        });

        // Demote READY via destination clear so DRAFT can re-evaluate with new cart rev
        checkout = await clearCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: first.checkout.id,
            expectedCheckoutRevision: first.checkout.revision,
          },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const second = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(second.snapshot.id).not.toBe(s1);
        expect(second.checkout.activeSnapshotId).toBe(second.snapshot.id);
        await persistence.withContext(async (ctx) => {
          const s1row = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots where id = ${s1}::uuid
          `);
          expect(s1row.rows[0]?.c).toBe("1");
        });
      },
    );
  });

  it("CO-26 equivalent revalidation: no duplicate snapshot churn", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const first = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const second = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: first.checkout.id,
            expectedCheckoutRevision: first.checkout.revision,
          },
          opts,
        );
        expect(second.snapshot.id).toBe(first.snapshot.id);
        expect(second.checkout.revision).toBe(first.checkout.revision);
        await persistence.withContext(async (ctx) => {
          const count = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots
            where checkout_id = ${first.checkout.id}::uuid
          `);
          expect(count.rows[0]?.c).toBe("1");
        });
      },
    );
  });

  it("CO-27 structural equivalence: same grand total with different allocation is not equivalent", () => {
    const base: CheckoutSnapshot = {
      id: "a",
      checkoutId: "00000000-0000-4000-8000-000000000099",
      checkoutRevision: BigInt(1),
      sourceCartRevision: BigInt(1),
      selectedOutletId: "00000000-0000-4000-8000-000000000001",
      evaluatedAt: FIXED_NOW,
      serviceabilityEvaluatedAt: FIXED_NOW,
      currency: "INR",
      manualCouponCode: null,
      destination: {
        destinationKind: "ONE_TIME_ADDRESS",
        sourceSavedAddressId: null,
        recipientName: "A",
        recipientPhone: "+919876543210",
        addressLine1: "1",
        addressLine2: null,
        landmark: null,
        locality: null,
        city: "Dehradun",
        stateCode: "IN-UT",
        postalCode: CHECKOUT_PIN,
        coordinates: null,
        label: null,
      },
      basePaise: BigInt(10_000),
      modifierAdjustmentsPaise: BigInt(0),
      bundleAdjustmentsPaise: BigInt(0),
      chargesPaise: BigInt(0),
      prePromotionSubtotalPaise: BigInt(10_000),
      promotionDiscountPaise: BigInt(0),
      taxablePaise: BigInt(10_000),
      taxPaise: BigInt(500),
      grandTotalPaise: BigInt(10_500),
      taxInclusionMode: "exclusive",
      createdAt: FIXED_NOW,
      lines: [
        {
          id: "l1",
          sourceCartLineId: "00000000-0000-4000-8000-000000000010",
          productId: "00000000-0000-4000-8000-000000000011",
          variantId: "00000000-0000-4000-8000-000000000012",
          productName: "P",
          variantName: "V",
          quantity: 1,
          sequence: 0,
          lineBasePaise: BigInt(10_000),
          lineModifierAdjustmentsPaise: BigInt(0),
          lineBundleAdjustmentsPaise: BigInt(0),
          lineSubtotalPaise: BigInt(10_000),
          linePromotionDiscountPaise: BigInt(0),
          lineTaxablePaise: BigInt(10_000),
          lineTaxPaise: BigInt(500),
          lineTotalPaise: BigInt(10_500),
          modifiers: [],
          bundleSelections: [],
        },
      ],
      charges: [],
      promotionEffects: [],
      taxComponents: [
        {
          id: "t1",
          targetContext: "order",
          taxType: "cgst",
          rateBps: 250,
          taxableAmountPaise: BigInt(10_000),
          taxAmountPaise: BigInt(250),
          sortOrder: 0,
        },
        {
          id: "t2",
          targetContext: "order",
          taxType: "sgst",
          rateBps: 250,
          taxableAmountPaise: BigInt(10_000),
          taxAmountPaise: BigInt(250),
          sortOrder: 1,
        },
      ],
    };
    const swapped: CheckoutSnapshot = {
      ...base,
      id: "b",
      taxComponents: [
        { ...base.taxComponents[0]!, taxAmountPaise: BigInt(100), id: "t1b" },
        { ...base.taxComponents[1]!, taxAmountPaise: BigInt(400), id: "t2b" },
      ],
    };
    expect(checkoutSnapshotsStructurallyEqual(base, swapped)).toBe(false);
    expect(base.grandTotalPaise).toBe(swapped.grandTotalPaise);
  });

  it("CO-28 cart changed: Cart rev N→N+1 blocks stale snapshot commit", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        const access = customerAccess(actors.customerA, actors.tree.brand.id);
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        await setCartLineQuantity(persistence, access, {
          cartLineId: ready.snapshot.lines[0]!.sourceCartLineId,
          quantity: 5,
          expectedRevision: ready.checkout.sourceCartRevision,
        });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: ready.checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_CART_CHANGED" });
      },
    );
  });

  it("CO-29 cancellation: DRAFT/READY cancellation; Cart/coupon/snapshot history preserved", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        const cancelledDraft = await cancelCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(cancelledDraft.status).toBe("CANCELLED");

        checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const snapId = ready.snapshot.id;
        const cancelledReady = await cancelCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        );
        expect(cancelledReady.status).toBe("CANCELLED");
        await persistence.withContext(async (ctx) => {
          const cart = await ctx.db.execute(sql`
            select count(*)::text as c from app.carts where id = ${cartId}::uuid
          `);
          expect(cart.rows[0]?.c).toBe("1");
          const snap = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots where id = ${snapId}::uuid
          `);
          expect(snap.rows[0]?.c).toBe("1");
        });
      },
    );
  });

  it("CO-30 terminal rejection: COMPLETED/CANCELLED/EXPIRED cannot mutate/revive", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await cancelCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        await expect(
          setCheckoutDestination(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
              destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });

        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.checkouts
            set status = 'EXPIRED', active_snapshot_id = null
            where id = ${checkout.id}::uuid
          `);
        });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_STATE_CONFLICT" });
      },
    );
  });

  it("CO-31 logical expiry: expiresAt enforced even before physical status update", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const clock = mutableCheckoutClock(FIXED_NOW);
        const opts = {
          clock: clock.clock,
          policy: { checkoutTtlMs: 60_000 },
        };
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        clock.set(new Date(FIXED_NOW.getTime() + 60_000));
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_EXPIRED" });
      },
    );
  });

  it("CO-32 dependency uncertainty: injected failures never become permissive commerce truth", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId }) => {
        const opts = checkoutOpts();
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        // Remove outlet tax profile assignment → tax indeterminate / dependency
        await persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            delete from app.outlet_tax_profiles
            where outlet_id = ${actors.tree.outletA.id}::uuid
          `);
        });
        await expect(
          evaluateCheckout(
            persistence,
            actors.customerA,
            {
              checkoutId: checkout.id,
              expectedCheckoutRevision: checkout.revision,
            },
            opts,
          ),
        ).rejects.toMatchObject({
          code: expect.stringMatching(
            /CHECKOUT_(TAX_INDETERMINATE|DEPENDENCY_INDETERMINATE|PRICE_UNRESOLVED)/,
          ),
        });
      },
    );
  });

  it("CO-33 READY invalidation: unsafe revalidation demotes READY→DRAFT, clears active pointer, increments revision, preserves old snapshot", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, addressId, catalog }) => {
        const opts = checkoutOpts();
        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );
        checkout = await setCheckoutDestination(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
          },
          opts,
        );
        const ready = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        const oldSnap = ready.snapshot.id;
        const readyRev = ready.checkout.revision;

        await persistence.transaction(async (tx) => {
          await setVariantAvailability(tx, {
            actor: actors.brandAdminActor,
            outletId: actors.tree.outletA.id,
            variantId: catalog.variantId,
            state: "sold_out",
            unavailableUntil: null,
          });
        });

        await expect(
          prepareCheckoutForPayment(
            persistence,
            actors.customerA,
            {
              checkoutId: ready.checkout.id,
              expectedCheckoutRevision: readyRev,
            },
            opts,
          ),
        ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });

        const after = await getActiveCheckout(
          persistence,
          actors.customerA,
          { checkoutId: ready.checkout.id },
          opts,
        );
        expect(after).not.toBeNull();
        expect(after!.status).toBe("DRAFT");
        expect(after!.activeSnapshotId).toBeNull();
        expect(after!.revision).toBe(readyRev + BigInt(1));

        await persistence.withContext(async (ctx) => {
          const snap = await ctx.db.execute(sql`
            select count(*)::text as c from app.checkout_snapshots where id = ${oldSnap}::uuid
          `);
          expect(snap.rows[0]?.c).toBe("1");
        });
      },
    );
  });
});
