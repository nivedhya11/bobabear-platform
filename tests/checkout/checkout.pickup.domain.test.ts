/**
 * IMP-036H-B — Pickup eligibility + checkout commercial core domain tests.
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  replaceOutletOperatingSchedule,
  suspendOutlet,
  unsuspendOutlet,
} from "../../src/server/assortment";
import {
  evaluateCheckout,
  listCheckoutPickupOptions,
  prepareCheckoutForPayment,
  setCheckoutDestination,
  setCheckoutFulfilment,
  startCheckout,
} from "../../src/server/checkout";
import { upsertOutletPickupProfile } from "../../src/server/outlet-pickup-profile/repository";
import {
  CHECKOUT_PIN,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  seedChargePricesOnBook,
  seedServiceableOutlet,
  withCheckoutReadyHarness,
} from "../database/support/checkout-fixtures";
import {
  configureAlwaysAcceptingOutlet,
  pauseOutletIndefinitely,
} from "../database/support/serviceability-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function seedEnabledPickupProfile(
  persistence: Parameters<typeof withCheckoutReadyHarness>[0] extends (
    h: infer H,
  ) => unknown
    ? H extends { persistence: infer P }
      ? P
      : never
    : never,
  outletId: string,
  overrides: Partial<{
    enabled: boolean;
    displayName: string;
  }> = {},
): Promise<void> {
  await persistence.transaction(async (tx) => {
    await upsertOutletPickupProfile(tx, {
      outletId,
      enabled: overrides.enabled ?? true,
      displayName: overrides.displayName ?? "Pickup Counter",
      addressLine1: "12 Mall Road",
      addressLine2: null,
      locality: "Rajpur",
      city: "Dehradun",
      stateCode: "IN-UT",
      postalCode: CHECKOUT_PIN,
      latitude: null,
      longitude: null,
      instructions: "Ask at counter for BOBA order.",
    });
  });
}

async function attachCharges(
  persistence: Parameters<typeof seedChargePricesOnBook>[0],
  brandId: string,
): Promise<void> {
  const { sql } = await import("drizzle-orm");
  await persistence.withContext(async (ctx) => {
    const book = await ctx.db.execute(sql`
      select id::text as id from app.price_books
      where brand_id = ${brandId}::uuid
        and lifecycle_status = 'active'
      limit 1
    `);
    const priceBookId = book.rows[0]!.id as string;
    await seedChargePricesOnBook(persistence, {
      brandId,
      priceBookId,
      packagingPaise: BigInt(2_000),
      deliveryPaise: BigInt(4_000),
    });
  });
}

describe("IMP-036H-B pickup eligibility + commercial core", () => {
  it("lists zero / one / multiple eligible outlets with selectionPolicy", async () => {
    await withCheckoutReadyHarness(async (harness) => {
      const { persistence, actors, cartId } = harness;
      const opts = checkoutOpts();
      const started = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );

      // Zero: no profiles
      let options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);
      expect(options.selectionPolicy).toBe("UNAVAILABLE");

      await seedEnabledPickupProfile(persistence, actors.tree.outletA.id);
      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );

      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toHaveLength(1);
      expect(options.selectionPolicy).toBe("AUTO_SELECT");
      expect(options.outlets[0]).toMatchObject({
        outletId: actors.tree.outletA.id,
        displayName: "Pickup Counter",
        city: "Dehradun",
      });
      expect(options.outlets[0]).not.toHaveProperty("enabled");
      expect(options.outlets[0]).not.toHaveProperty("revision");

      await seedServiceableOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletB.id,
      );
      await seedEnabledPickupProfile(persistence, actors.tree.outletB.id, {
        displayName: "Outlet B Pickup",
      });

      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets.length).toBeGreaterThanOrEqual(2);
      expect(options.selectionPolicy).toBe("CUSTOMER_SELECT");
    });
  });

  it("excludes disabled profile, paused, suspended, and closed_by_schedule outlets", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      const outletId = actors.tree.outletA.id;
      const { sql } = await import("drizzle-orm");

      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        outletId,
      );

      // Disabled profile
      await seedEnabledPickupProfile(persistence, outletId, { enabled: false });
      let options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);

      // Enable profile then pause operating state
      await persistence.transaction(async (tx) => {
        await upsertOutletPickupProfile(tx, {
          outletId,
          enabled: true,
          displayName: "Pickup Counter",
          addressLine1: "12 Mall Road",
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: CHECKOUT_PIN,
          instructions: "Counter",
          expectedRevision: 1,
        });
      });
      await pauseOutletIndefinitely(
        persistence,
        actors.brandAdminActor,
        outletId,
      );
      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);

      // Accepting again then suspend
      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        outletId,
      );
      await persistence.transaction(async (tx) => {
        await suspendOutlet(tx, {
          actor: actors.brandAdminActor,
          outletId,
        });
      });
      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);

      // Unsuspend + closed_by_schedule (hours exclude FIXED_NOW local ~17:30)
      await persistence.transaction(async (tx) => {
        await unsuspendOutlet(tx, {
          actor: actors.brandAdminActor,
          outletId,
        });
        await replaceOutletOperatingSchedule(tx, {
          actor: actors.brandAdminActor,
          outletId,
          intervals: ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
            dayOfWeek,
            startMinute: 0,
            endMinute: 60,
          })),
        });
      });
      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);

      // Restore accepting + enabled, then deactivate outlet lifecycle
      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        outletId,
      );
      await persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.outlets
          set status = 'inactive', revision = revision + 1, updated_at = now()
          where id = ${outletId}::uuid
        `);
      });
      options = await listCheckoutPickupOptions(
        persistence,
        actors.customerA,
        { checkoutId: started.id },
        opts,
      );
      expect(options.outlets).toEqual([]);
    });
  });

  it("PICKUP evaluate seals pickup location, omits delivery charge, leaves destination unsealed", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, oneTimeDestination }) => {
        const opts = checkoutOpts();
        await attachCharges(persistence, actors.tree.brand.id);
        await seedEnabledPickupProfile(persistence, actors.tree.outletA.id);
        await configureAlwaysAcceptingOutlet(
          persistence,
          actors.brandAdminActor,
          actors.tree.outletA.id,
        );

        let checkout = await startCheckout(
          persistence,
          actors.customerA,
          { cartId },
          opts,
        );

        // Draft destination convenience may remain on PICKUP without sealing.
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
        checkout = await setCheckoutFulfilment(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
            fulfilmentMode: "PICKUP",
            pickupOutletId: actors.tree.outletA.id,
          },
          opts,
        );
        expect(checkout.fulfilmentMode).toBe("PICKUP");
        expect(checkout.pickupOutletId).toBe(actors.tree.outletA.id);
        expect(checkout.destination).not.toBeNull();

        const evaluated = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(evaluated.checkout.status).toBe("READY_FOR_PAYMENT");
        expect(evaluated.snapshot.fulfilmentMode).toBe("PICKUP");
        expect(evaluated.snapshot.destination).toBeNull();
        expect(evaluated.snapshot.serviceabilityEvaluatedAt).toBeNull();
        expect(evaluated.snapshot.pickupLocation).toMatchObject({
          displayName: "Pickup Counter",
          instructions: "Ask at counter for BOBA order.",
          city: "Dehradun",
        });
        expect(
          evaluated.snapshot.charges.every((c) => c.chargeCode !== "delivery"),
        ).toBe(true);
        expect(
          evaluated.snapshot.charges.some((c) => c.chargeCode === "packaging"),
        ).toBe(true);
        // Mutable destination may still exist on Checkout aggregate.
        expect(evaluated.checkout.destination).not.toBeNull();
      },
    );
  });

  it("DELIVERY golden path still applies delivery charge", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, oneTimeDestination }) => {
        const opts = checkoutOpts();
        await attachCharges(persistence, actors.tree.brand.id);
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
            destination: oneTimeDestination,
          },
          opts,
        );
        const evaluated = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(evaluated.snapshot.fulfilmentMode).toBe("DELIVERY");
        expect(
          evaluated.snapshot.charges.some((c) => c.chargeCode === "delivery"),
        ).toBe(true);
      },
    );
  });

  it("mode switch Delivery→Pickup invalidates READY and recalculates without delivery", async () => {
    await withCheckoutReadyHarness(
      async ({ persistence, actors, cartId, oneTimeDestination }) => {
        const opts = checkoutOpts();
        await attachCharges(persistence, actors.tree.brand.id);
        await seedEnabledPickupProfile(persistence, actors.tree.outletA.id);

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
            destination: oneTimeDestination,
          },
          opts,
        );
        const deliveryReady = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(deliveryReady.checkout.status).toBe("READY_FOR_PAYMENT");
        const deliveryGrand = deliveryReady.snapshot.grandTotalPaise;

        checkout = await setCheckoutFulfilment(
          persistence,
          actors.customerA,
          {
            checkoutId: deliveryReady.checkout.id,
            expectedCheckoutRevision: deliveryReady.checkout.revision,
            fulfilmentMode: "PICKUP",
            pickupOutletId: actors.tree.outletA.id,
          },
          opts,
        );
        expect(checkout.status).toBe("DRAFT");
        expect(checkout.activeSnapshotId).toBeNull();

        const pickupReady = await evaluateCheckout(
          persistence,
          actors.customerA,
          {
            checkoutId: checkout.id,
            expectedCheckoutRevision: checkout.revision,
          },
          opts,
        );
        expect(pickupReady.snapshot.fulfilmentMode).toBe("PICKUP");
        expect(
          pickupReady.snapshot.charges.every((c) => c.chargeCode !== "delivery"),
        ).toBe(true);
        expect(pickupReady.snapshot.grandTotalPaise).toBeLessThan(deliveryGrand);
      },
    );
  });

  it("PICKUP without outlet rejects evaluate with PICKUP_OUTLET_REQUIRED", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      let checkout = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      checkout = await setCheckoutFulfilment(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          fulfilmentMode: "PICKUP",
        },
        opts,
      );
      expect(checkout.fulfilmentMode).toBe("PICKUP");
      expect(checkout.pickupOutletId).toBeNull();
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
      ).rejects.toMatchObject({ code: "PICKUP_OUTLET_REQUIRED" });
    });
  });

  it("prepare revalidates Pickup eligibility and CHECKOUT_REPRICED when paused", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      await attachCharges(persistence, actors.tree.brand.id);
      await seedEnabledPickupProfile(persistence, actors.tree.outletA.id);
      await configureAlwaysAcceptingOutlet(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );

      let checkout = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      checkout = await setCheckoutFulfilment(
        persistence,
        actors.customerA,
        {
          checkoutId: checkout.id,
          expectedCheckoutRevision: checkout.revision,
          fulfilmentMode: "PICKUP",
          pickupOutletId: actors.tree.outletA.id,
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

      // Equivalent prepare succeeds
      const prepared = await prepareCheckoutForPayment(
        persistence,
        actors.customerA,
        {
          checkoutId: ready.checkout.id,
          expectedCheckoutRevision: ready.checkout.revision,
        },
        opts,
      );
      expect(prepared.snapshot.id).toBe(ready.snapshot.id);

      await pauseOutletIndefinitely(
        persistence,
        actors.brandAdminActor,
        actors.tree.outletA.id,
      );
      await expect(
        prepareCheckoutForPayment(
          persistence,
          actors.customerA,
          {
            checkoutId: ready.checkout.id,
            expectedCheckoutRevision: ready.checkout.revision,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_REPRICED" });
    });
  });

  it("ownership: other customer cannot list pickup options or set fulfilment (BOLA)", async () => {
    await withCheckoutReadyHarness(async ({ persistence, actors, cartId }) => {
      const opts = checkoutOpts();
      const started = await startCheckout(
        persistence,
        actors.customerA,
        { cartId },
        opts,
      );
      await expect(
        listCheckoutPickupOptions(
          persistence,
          actors.customerB,
          { checkoutId: started.id },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
      await expect(
        setCheckoutFulfilment(
          persistence,
          actors.customerB,
          {
            checkoutId: started.id,
            expectedCheckoutRevision: started.revision,
            fulfilmentMode: "PICKUP",
            pickupOutletId: actors.tree.outletA.id,
          },
          opts,
        ),
      ).rejects.toMatchObject({ code: "CHECKOUT_NOT_FOUND" });
    });
  });
});
