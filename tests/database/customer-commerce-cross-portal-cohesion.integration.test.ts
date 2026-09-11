/**
 * IMP-036E cross-portal cohesion — Store Ops authority → customer Menu projection.
 */
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
} from "../../src/server/catalog";
import {
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
  findMenuById,
  publishMenuRevision,
} from "../../src/server/catalog/menu";
import {
  excludeVariantAtScope,
  includeBrandVariant,
  setModifierOptionAvailability,
  setVariantAvailability,
} from "../../src/server/assortment";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import { evaluateServiceability, fixedServiceabilityClock } from "../../src/server/serviceability";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import {
  publishProductEnvelope,
  withCatalogDomain,
  type CatalogActors,
} from "../catalog/support";
import { seedModifierDeltaOnBook } from "./support/checkout-fixtures";
import {
  closeTrackedPersistenceHandles,
  configureAlwaysAcceptingOutlet,
  pauseOutletIndefinitely,
  seedOutletDistanceServiceability,
  TEST_INSIDE_COORDS,
  TEST_OUTSIDE_COORDS,
  trackPersistenceHandle,
} from "./support/serviceability-fixtures";

const AT = new Date("2026-08-09T12:00:00.000Z");

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function seedMenuVariant(
  persistence: Parameters<Parameters<typeof withCatalogDomain>[0]>[0],
  actor: CatalogActors["brandAdminActor"],
  brandId: string,
  outletId: string,
  codePrefix: string,
): Promise<{ productId: string; variantId: string; menuId: string; priceBookId: string }> {
  trackPersistenceHandle(persistence);
  await configureAlwaysAcceptingOutlet(persistence, actor, outletId);
  await seedOutletDistanceServiceability(persistence, actor, outletId);

  const product = await persistence.transaction((tx) =>
    createProduct(tx, {
      actor,
      brandId,
      code: `${codePrefix}-product`,
      name: `${codePrefix} Product`,
      productKind: "standard",
    }),
  );
  const variant = await persistence.transaction((tx) =>
    createVariant(tx, {
      actor,
      productId: product.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    }),
  );
  await persistence.transaction(async (tx) => {
    await activateVariant(tx, { actor, variantId: variant.id });
    await activateProduct(tx, { actor, productId: product.id });
    // Customer projection reads effective content only, so the activated
    // candidate must be published before it is visible (IMP-036F).
    await publishProductEnvelope(tx, { actor, brandId, productId: product.id });
    await includeBrandVariant(tx, { actor, brandId, variantId: variant.id });
  });

  const menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  let currentMenu = menu;
  const section = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, currentMenu.id);
    return createMenuSection(tx, {
      actor,
      brandId,
      menuId: currentMenu.id,
      code: `${codePrefix}-section`,
      name: "Section",
      position: 0,
      expectedMenuRevision: current!.revision,
    });
  });
  currentMenu = (await persistence.withContext((ctx) => findMenuById(ctx, menu.id)))!;
  const entry = await persistence.transaction(async (tx) => {
    const current = await findMenuById(tx, currentMenu.id);
    return createMenuEntry(tx, {
      actor,
      brandId,
      menuId: currentMenu.id,
      sectionId: section.id,
      productId: product.id,
      position: 0,
      imagePath: null,
      expectedMenuRevision: current!.revision,
    });
  });
  await persistence.transaction(async (tx) => {
    let current = await findMenuById(tx, currentMenu.id);
    await activateMenuSection(tx, {
      actor,
      sectionId: section.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, currentMenu.id);
    await activateMenuEntry(tx, {
      actor,
      entryId: entry.id,
      expectedMenuRevision: current!.revision,
    });
    current = await findMenuById(tx, currentMenu.id);
    await publishMenuRevision(tx, {
      actor,
      menuId: currentMenu.id,
      expectedMenuRevision: current!.revision,
    });
  });

  const { priceBookId } = await persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor,
      brandId,
      scopeType: "brand",
      code: `brand-${randomUUID().slice(0, 8)}`,
      name: "Brand book",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
      effectiveTo: null,
    });
    await attachDraftVariantPrice(tx, {
      actor,
      priceBookId: book.id,
      brandId,
      variantId: variant.id,
      amountPaise: BigInt(17_900),
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    await activatePriceBook(tx, { actor, priceBookId: book.id, brandId });
    return { priceBookId: book.id };
  });

  return { productId: product.id, variantId: variant.id, menuId: menu.id, priceBookId };
}

describe("customer commerce cross-portal cohesion (IMP-036E)", () => {
  it("projects Store variant sold_out / temporarily unavailable / available for outlet menu", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedMenuVariant(
        persistence,
        actor,
        tree.brand.id,
        tree.outletA.id,
        "avail",
      );

      await persistence.transaction(async (tx) => {
        await setVariantAvailability(tx, {
          actor,
          outletId: tree.outletA.id,
          variantId: seeded.variantId,
          state: "sold_out",
          unavailableUntil: null,
        });
      });
      let menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(menu.items.find((item) => item.variantId === seeded.variantId)?.availability).toBe(
        "sold_out",
      );

      await persistence.transaction(async (tx) => {
        await setVariantAvailability(tx, {
          actor,
          outletId: tree.outletA.id,
          variantId: seeded.variantId,
          state: "temporarily_unavailable",
          unavailableUntil: new Date(AT.getTime() + 60 * 60 * 1000),
        });
      });
      menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(menu.items.find((item) => item.variantId === seeded.variantId)?.availability).toBe(
        "temporarily_unavailable",
      );

      await persistence.transaction(async (tx) => {
        await setVariantAvailability(tx, {
          actor,
          outletId: tree.outletA.id,
          variantId: seeded.variantId,
          state: "available",
          unavailableUntil: null,
        });
      });
      menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(menu.items.find((item) => item.variantId === seeded.variantId)?.availability).toBe(
        "available",
      );
    });
  });

  it("omits assortment-excluded variants from outlet-aware menu projection", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedMenuVariant(
        persistence,
        actor,
        tree.brand.id,
        tree.outletA.id,
        "assort",
      );

      await persistence.transaction(async (tx) => {
        await excludeVariantAtScope(tx, {
          actor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: seeded.variantId,
        });
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      expect(menu.items.some((item) => item.variantId === seeded.variantId)).toBe(false);
    });
  });

  it("omits sold-out required modifier options and marks parent temporarily unavailable", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedMenuVariant(
        persistence,
        actor,
        tree.brand.id,
        tree.outletA.id,
        "mod",
      );

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "mod-group",
          name: "Required Sauce",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "mod-opt",
          name: "Chili",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: group.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: binding.id,
        });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: vmg.id,
        });
      });
      await persistence.transaction((tx) =>
        publishProductEnvelope(tx, {
          actor,
          brandId: tree.brand.id,
          productId: seeded.productId,
        }),
      );

      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: vmg.id,
        modifierGroupOptionId: binding.id,
      });

      await persistence.transaction(async (tx) => {
        await setModifierOptionAvailability(tx, {
          actor,
          outletId: tree.outletA.id,
          modifierOptionId: option.id,
          state: "sold_out",
          unavailableUntil: null,
        });
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId)!;
      expect(item.availability).toBe("temporarily_unavailable");
      const projectedOption = item.modifierGroups?.[0]?.options.find(
        (entry) => entry.modifierOptionId === option.id,
      );
      // Sold-out options are omitted from D-368 projection (no public option.availability).
      expect(projectedOption).toBeUndefined();
    });
  });

  it("re-evaluates serviceability when outlet is paused or outside radius", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      await configureAlwaysAcceptingOutlet(persistence, actor, tree.outletA.id);
      await seedOutletDistanceServiceability(persistence, actor, tree.outletA.id, {
        maxServiceDistanceMeters: 9_000,
      });
      const clock = fixedServiceabilityClock(AT);

      const inside = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_INSIDE_COORDS },
        },
        { clock },
      );
      expect(inside.status).toBe("SERVICEABLE");
      if (inside.status === "SERVICEABLE") {
        expect(inside.selectedOutletId).toBe(tree.outletA.id);
      }

      const outside = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_OUTSIDE_COORDS },
        },
        { clock },
      );
      expect(outside.status).toBe("NOT_SERVICEABLE");

      await pauseOutletIndefinitely(persistence, actor, tree.outletA.id);
      const paused = await evaluateServiceability(
        persistence,
        {
          brandId: tree.brand.id,
          location: { coordinates: TEST_INSIDE_COORDS },
        },
        { clock },
      );
      expect(paused.status).toBe("TEMPORARILY_UNAVAILABLE");
    });
  });
});
