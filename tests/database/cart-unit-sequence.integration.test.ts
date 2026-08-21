/**
 * D-371 durable Cart unit-sequence integration proof (IMP-028D RC3).
 */
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  addCartLine,
  claimGuestCart,
  decrementLatestCartVariant,
  getActiveCart,
  reconcileGuestCartWithCustomer,
  setCartLineQuantity,
} from "../../src/server/cart";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  closeTrackedPersistenceHandles,
  GUEST_POLICY,
  seedActiveVariantWithModifier,
  trackPersistenceHandle,
  withCartHarness,
} from "./support/cart-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

type UnitRow = Readonly<{
  ordinal: string;
  cart_id: string;
  cart_line_id: string;
}>;

async function loadUnits(
  persistence: Parameters<typeof getActiveCart>[0],
  cartId: string,
): Promise<UnitRow[]> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute(sql`
      select ordinal::text, cart_id::text, cart_line_id::text
      from app.cart_line_units
      where cart_id = ${cartId}::uuid
      order by ordinal
    `);
    return result.rows as unknown as UnitRow[];
  });
}

function customerAccess(
  actor: Parameters<typeof claimGuestCart>[1],
  brandId: string,
) {
  return { kind: "customer" as const, actor, brandId };
}

function modifierSelection(modifier: {
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
}) {
  return [{
    variantModifierGroupId: modifier.variantModifierGroupId,
    modifierGroupOptionId: modifier.modifierGroupOptionId,
    quantity: 1,
  }];
}

describe("D-371 durable Cart unit sequence", () => {
  it("persists A, B, A and removes the latest active product unit after repository reload", async () => {
    await withCartHarness(async ({ persistence, database, actors }) => {
      const brandId = actors.tree.brand.id;
      const access = customerAccess(actors.customerA, brandId);
      const configured = await seedActiveVariantWithModifier(
        persistence,
        brandId,
        actors.brandAdminActor,
        "d371-lifo",
      );
      const selectionB = modifierSelection(configured);

      const a1 = await addCartLine(persistence, access, {
        variantId: configured.variantId,
        quantity: 1,
      });
      const b1 = await addCartLine(persistence, access, {
        variantId: configured.variantId,
        quantity: 1,
        modifiers: selectionB,
        expectedRevision: a1.cart.revision,
      });
      const a2 = await addCartLine(persistence, access, {
        variantId: configured.variantId,
        quantity: 1,
        expectedRevision: b1.cart.revision,
      });

      expect(a2.cart.lines).toHaveLength(2);
      expect(a2.cart.lines.reduce((sum, line) => sum + line.quantity, 0)).toBe(3);
      const lineA = a2.cart.lines.find((line) => line.modifiers.length === 0)!;
      const lineB = a2.cart.lines.find((line) => line.modifiers.length === 1)!;
      expect(lineA.quantity).toBe(2);
      expect(lineB.quantity).toBe(1);

      const addedUnits = await loadUnits(persistence, a2.cart.id);
      expect(addedUnits.map((unit) => unit.cart_line_id)).toEqual([
        lineA.id,
        lineB.id,
        lineA.id,
      ]);

      const reloadedPersistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      trackPersistenceHandle(reloadedPersistence);
      const reloaded = await getActiveCart(reloadedPersistence, access);
      expect(reloaded).toEqual(a2.cart);

      const afterFirst = await decrementLatestCartVariant(
        reloadedPersistence,
        access,
        { variantId: configured.variantId, expectedRevision: reloaded!.revision },
      );
      expect(afterFirst.lines.find((line) => line.id === lineA.id)?.quantity).toBe(1);
      expect(afterFirst.lines.find((line) => line.id === lineB.id)?.quantity).toBe(1);
      expect((await loadUnits(reloadedPersistence, afterFirst.id)).map((unit) => unit.cart_line_id))
        .toEqual([lineA.id, lineB.id]);

      const afterSecond = await decrementLatestCartVariant(
        reloadedPersistence,
        access,
        { variantId: configured.variantId, expectedRevision: afterFirst.revision },
      );
      expect(afterSecond.lines).toHaveLength(1);
      expect(afterSecond.lines[0]).toMatchObject({ id: lineA.id, quantity: 1 });

      const afterThird = await decrementLatestCartVariant(
        reloadedPersistence,
        access,
        { variantId: configured.variantId, expectedRevision: afterSecond.revision },
      );
      expect(afterThird.lines).toHaveLength(0);
      expect(await loadUnits(reloadedPersistence, afterThird.id)).toHaveLength(0);
    });
  });

  it("appends and consumes the newest durable unit for a specific line", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const created = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 1,
      });
      const lineId = created.cart.lines[0]!.id;
      const initialUnits = await loadUnits(persistence, created.cart.id);

      const increased = await setCartLineQuantity(persistence, access, {
        cartLineId: lineId,
        quantity: 2,
        expectedRevision: created.cart.revision,
      });
      const increasedUnits = await loadUnits(persistence, created.cart.id);
      expect(increasedUnits).toHaveLength(2);
      expect(BigInt(increasedUnits[1]!.ordinal)).toBeGreaterThan(BigInt(initialUnits[0]!.ordinal));

      const decreased = await setCartLineQuantity(persistence, access, {
        cartLineId: lineId,
        quantity: 1,
        expectedRevision: increased.revision,
      });
      expect(decreased.lines[0]!.quantity).toBe(1);
      expect(await loadUnits(persistence, created.cart.id)).toEqual(initialUnits);
    });
  });

  it("serializes concurrent product decrements so one durable unit is consumed once", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const access = customerAccess(actors.customerA, actors.tree.brand.id);
      const created = await addCartLine(persistence, access, {
        variantId: catalog.variantId,
        quantity: 2,
      });
      const revision = created.cart.revision;
      const results = await Promise.allSettled([
        decrementLatestCartVariant(persistence, access, {
          variantId: catalog.variantId,
          expectedRevision: revision,
        }),
        decrementLatestCartVariant(persistence, access, {
          variantId: catalog.variantId,
          expectedRevision: revision,
        }),
      ]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      const cart = await getActiveCart(persistence, access);
      expect(cart!.lines[0]!.quantity).toBe(1);
      expect(await loadUnits(persistence, cart!.id)).toHaveLength(1);
    });
  });

  it("preserves immutable ordinals through D-370 claim and reconciliation", async () => {
    await withCartHarness(async ({ persistence, actors, catalog }) => {
      const brandId = actors.tree.brand.id;
      const customer = customerAccess(actors.customerA, brandId);
      const guestOptions = { policy: GUEST_POLICY };

      const claimSource = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 1 },
        guestOptions,
      );
      const beforeClaim = await loadUnits(persistence, claimSource.cart.id);
      const claimed = await claimGuestCart(persistence, actors.customerB, {
        guestToken: claimSource.guestToken!,
        brandId,
        expectedGuestRevision: claimSource.cart.revision,
      }, guestOptions);
      expect(claimed.id).toBe(claimSource.cart.id);
      expect(await loadUnits(persistence, claimed.id)).toEqual(beforeClaim);

      const customerA = await addCartLine(persistence, customer, {
        variantId: catalog.variantId,
        quantity: 1,
      });
      const guestB = await addCartLine(
        persistence,
        { kind: "guest", brandId },
        { variantId: catalog.variantId, quantity: 2 },
        guestOptions,
      );
      const beforeReconcile = [
        ...(await loadUnits(persistence, customerA.cart.id)),
        ...(await loadUnits(persistence, guestB.cart.id)),
      ].sort((left, right) => Number(BigInt(left.ordinal) - BigInt(right.ordinal)));

      const reconciled = await reconcileGuestCartWithCustomer(
        persistence,
        actors.customerA,
        {
          guestToken: guestB.guestToken!,
          brandId,
          expectedGuestRevision: guestB.cart.revision,
          expectedCustomerRevision: customerA.cart.revision,
        },
        guestOptions,
      );
      const afterReconcile = await loadUnits(persistence, reconciled.id);
      expect(afterReconcile.map((unit) => unit.ordinal)).toEqual(
        beforeReconcile.map((unit) => unit.ordinal),
      );
      expect(new Set(afterReconcile.map((unit) => unit.cart_id))).toEqual(
        new Set([reconciled.id]),
      );
      expect(afterReconcile).toHaveLength(reconciled.lines[0]!.quantity);
    });
  });
});
