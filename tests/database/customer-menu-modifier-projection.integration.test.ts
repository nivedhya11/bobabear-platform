/**
 * Customer Menu modifier projection integration tests (IMP-028C Slice 1).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
  activateMenu,
  activateMenuEntry,
  activateMenuSection,
  createMenu,
  createMenuEntry,
  createMenuSection,
} from "../../src/server/catalog/menu";
import { projectCustomerMenu } from "../../src/server/customer-commerce/menu/project-customer-menu";
import {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
} from "../../src/server/pricing";
import { includeBrandVariant } from "../../src/server/assortment";
import { TAX_CATEGORY_RESTAURANT_SERVICE_ID } from "../../src/shared/pricing";
import { withCatalogDomain, type CatalogActors } from "../catalog/support";
import { seedModifierDeltaOnBook } from "./support/checkout-fixtures";

const AT = new Date("2026-08-09T12:00:00.000Z");

type CatalogActor = CatalogActors["brandAdminActor"];

async function activateBrandVariantPrice(
  persistence: Parameters<Parameters<typeof withCatalogDomain>[0]>[0],
  args: {
    actor: CatalogActor;
    brandId: string;
    variantId: string;
    amountPaise?: bigint;
  },
): Promise<{ priceBookId: string }> {
  return persistence.transaction(async (tx) => {
    const book = await createDraftPriceBook(tx, {
      actor: args.actor,
      brandId: args.brandId,
      scopeType: "brand",
      code: `brand-${randomUUID().slice(0, 8)}`,
      name: "Brand book",
      effectiveFrom: new Date("2026-08-08T00:00:00+05:30"),
      effectiveTo: null,
    });
    await attachDraftVariantPrice(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
      variantId: args.variantId,
      amountPaise: args.amountPaise ?? BigInt(17_900),
      taxCategoryId: TAX_CATEGORY_RESTAURANT_SERVICE_ID,
    });
    await activatePriceBook(tx, {
      actor: args.actor,
      priceBookId: book.id,
      brandId: args.brandId,
    });
    return { priceBookId: book.id };
  });
}

type SeededMenuItem = Readonly<{
  menuId: string;
  productId: string;
  variantId: string;
  priceBookId: string;
}>;

async function seedActiveMenuProduct(
  persistence: Parameters<Parameters<typeof withCatalogDomain>[0]>[0],
  actor: CatalogActor,
  brandId: string,
  codePrefix: string,
): Promise<SeededMenuItem> {
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
    await includeBrandVariant(tx, {
      actor,
      brandId,
      variantId: variant.id,
    });
  });

  const menu = await persistence.transaction((tx) =>
    createMenu(tx, {
      actor,
      brandId,
      code: `${codePrefix}-menu`,
      name: `${codePrefix} Menu`,
    }),
  );
  const section = await persistence.transaction((tx) =>
    createMenuSection(tx, {
      actor,
      brandId,
      menuId: menu.id,
      code: `${codePrefix}-section`,
      name: "Section",
      position: 0,
    }),
  );
  const entry = await persistence.transaction((tx) =>
    createMenuEntry(tx, {
      actor,
      brandId,
      menuId: menu.id,
      sectionId: section.id,
      productId: product.id,
      position: 0,
      imagePath: "/assets/menu/test.jpeg",
    }),
  );
  await persistence.transaction(async (tx) => {
    await activateMenu(tx, { actor, menuId: menu.id });
    await activateMenuSection(tx, { actor, sectionId: section.id });
    await activateMenuEntry(tx, { actor, entryId: entry.id });
  });

  const { priceBookId } = await activateBrandVariantPrice(persistence, {
    actor,
    brandId,
    variantId: variant.id,
  });

  return {
    menuId: menu.id,
    productId: product.id,
    variantId: variant.id,
    priceBookId,
  };
}

describe("customer menu modifier projection (IMP-028C Slice 1)", () => {
  it("MP-T01: menu item without modifiers preserves existing projection behavior", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "plain");

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: tree.brand.id, at: AT }),
      );

      expect(menu.items).toHaveLength(1);
      const item = menu.items[0]!;
      expect(item.productId).toBe(seeded.productId);
      expect(item.variantId).toBe(seeded.variantId);
      expect(item.displayPricePaise).toBe(17_900);
      expect(item.modifierGroups).toBeUndefined();
      expect(item.availability).toBeUndefined();
    });
  });

  it("MP-T02–T06: projects modifier groups/options, constraints, and ordering", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "custom");

      const sizeGroup = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "size",
          name: "Size",
        }),
      );
      const toppingsGroup = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "toppings",
          name: "Toppings",
        }),
      );
      const regularOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "regular",
          name: "Regular",
        }),
      );
      const largeOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "large",
          name: "Large",
        }),
      );
      const pearlOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "pearl",
          name: "Pearl",
        }),
      );

      const regularBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: sizeGroup.id,
          modifierOptionId: regularOption.id,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
          position: 1,
        }),
      );
      const largeBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: sizeGroup.id,
          modifierOptionId: largeOption.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 0,
        }),
      );
      const pearlBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: toppingsGroup.id,
          modifierOptionId: pearlOption.id,
          minQuantity: 0,
          maxQuantity: 3,
          defaultQuantity: 0,
          position: 0,
        }),
      );

      const sizeVmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: sizeGroup.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
          position: 1,
        }),
      );
      const toppingsVmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: toppingsGroup.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 3,
          position: 0,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: regularOption.id });
        await activateModifierOption(tx, { actor, modifierOptionId: largeOption.id });
        await activateModifierOption(tx, { actor, modifierOptionId: pearlOption.id });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: regularBinding.id,
        });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: largeBinding.id,
        });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: pearlBinding.id,
        });
        await activateModifierGroup(tx, { actor, modifierGroupId: sizeGroup.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: toppingsGroup.id });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: sizeVmg.id,
        });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: toppingsVmg.id,
        });
      });

      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: sizeVmg.id,
        modifierGroupOptionId: regularBinding.id,
        priceDeltaPaise: BigInt(0),
      });
      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: sizeVmg.id,
        modifierGroupOptionId: largeBinding.id,
        priceDeltaPaise: BigInt(4_000),
      });
      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: toppingsVmg.id,
        modifierGroupOptionId: pearlBinding.id,
        priceDeltaPaise: BigInt(3_000),
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: tree.brand.id, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId);
      expect(item).toBeDefined();
      expect(item!.modifierGroups).toHaveLength(2);

      expect(item!.modifierGroups![0]!.modifierGroupId).toBe(toppingsGroup.id);
      expect(item!.modifierGroups![0]!.variantModifierGroupId).toBe(toppingsVmg.id);
      expect(item!.modifierGroups![0]!.required).toBe(false);
      expect(item!.modifierGroups![0]!.minTotalQuantity).toBe(0);
      expect(item!.modifierGroups![0]!.maxTotalQuantity).toBe(3);
      expect(item!.modifierGroups![0]!.position).toBe(0);

      expect(item!.modifierGroups![1]!.modifierGroupId).toBe(sizeGroup.id);
      expect(item!.modifierGroups![1]!.required).toBe(true);
      expect(item!.modifierGroups![1]!.minTotalQuantity).toBe(1);
      expect(item!.modifierGroups![1]!.maxTotalQuantity).toBe(1);

      const sizeOptions = item!.modifierGroups![1]!.options;
      expect(sizeOptions[0]!.modifierOptionId).toBe(largeOption.id);
      expect(sizeOptions[0]!.position).toBe(0);
      expect(sizeOptions[1]!.modifierOptionId).toBe(regularOption.id);
      expect(sizeOptions[1]!.position).toBe(1);
      expect(sizeOptions[1]!.minQuantity).toBe(1);
      expect(sizeOptions[1]!.maxQuantity).toBe(1);
      expect(sizeOptions[1]!.defaultQuantity).toBe(1);

      const pearl = item!.modifierGroups![0]!.options[0]!;
      expect(pearl.modifierOptionId).toBe(pearlOption.id);
      expect(pearl.modifierGroupOptionId).toBe(pearlBinding.id);
    });
  });

  it("MP-T07: inactive modifier authority is not exposed", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "inactive");

      const activeGroup = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "active-group",
          name: "Active Group",
        }),
      );
      const hiddenGroup = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "hidden-group",
          name: "Hidden Group",
        }),
      );
      const activeOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "active-opt",
          name: "Active Option",
        }),
      );
      const hiddenOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "hidden-opt",
          name: "Hidden Option",
        }),
      );

      const activeBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: activeGroup.id,
          modifierOptionId: activeOption.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const hiddenBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: hiddenGroup.id,
          modifierOptionId: hiddenOption.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );

      const activeVmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: activeGroup.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
        }),
      );
      const hiddenVmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: hiddenGroup.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: activeOption.id });
        await activateModifierOption(tx, { actor, modifierOptionId: hiddenOption.id });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: activeBinding.id,
        });
        await activateModifierGroup(tx, { actor, modifierGroupId: activeGroup.id });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: activeVmg.id,
        });
        // hidden chain remains draft: group-option, group, and vmg bindings stay inactive
      });

      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: activeVmg.id,
        modifierGroupOptionId: activeBinding.id,
      });
      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: hiddenVmg.id,
        modifierGroupOptionId: hiddenBinding.id,
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: tree.brand.id, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId);
      expect(item!.modifierGroups).toHaveLength(1);
      expect(item!.modifierGroups![0]!.modifierGroupId).toBe(activeGroup.id);
    });
  });

  it("MP-T08–T10: modifier display deltas and descriptive defaultQuantity only", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "pricing");

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "extras",
          name: "Extras",
        }),
      );
      const freeOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "free",
          name: "Free Extra",
        }),
      );
      const paidOption = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "paid",
          name: "Paid Extra",
        }),
      );

      const freeBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: freeOption.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const paidBinding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: paidOption.id,
          minQuantity: 0,
          maxQuantity: 3,
          defaultQuantity: 2,
        }),
      );

      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 3,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: freeOption.id });
        await activateModifierOption(tx, { actor, modifierOptionId: paidOption.id });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: freeBinding.id,
        });
        await activateModifierGroupOption(tx, {
          actor,
          modifierGroupOptionId: paidBinding.id,
        });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, {
          actor,
          variantModifierGroupId: vmg.id,
        });
      });

      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: vmg.id,
        modifierGroupOptionId: freeBinding.id,
        priceDeltaPaise: BigInt(0),
      });
      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: vmg.id,
        modifierGroupOptionId: paidBinding.id,
        priceDeltaPaise: BigInt(3_000),
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: tree.brand.id, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId)!;
      const options = item.modifierGroups![0]!.options;

      const free = options.find((option) => option.modifierOptionId === freeOption.id)!;
      const paid = options.find((option) => option.modifierOptionId === paidOption.id)!;
      expect(free.displayPriceDeltaPaise).toBe(0);
      expect(free.currency).toBe("INR");
      expect(paid.displayPriceDeltaPaise).toBe(3_000);
      expect(paid.defaultQuantity).toBe(2);

      const serialized = JSON.stringify(item);
      expect(serialized).not.toMatch(/selected/i);
      expect(serialized).not.toMatch(/preselected/i);
      expect(serialized).not.toMatch(/initialSelection/i);
    });
  });

  it("MP-T11–T12: base display pricing and outlet availability remain unchanged", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "stable");

      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "stable-group",
          name: "Stable Group",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "stable-opt",
          name: "Stable Option",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: seeded.variantId,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
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

      await seedModifierDeltaOnBook(persistence, {
        brandId: tree.brand.id,
        priceBookId: seeded.priceBookId,
        variantModifierGroupId: vmg.id,
        modifierGroupOptionId: binding.id,
      });

      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, {
          brandId: tree.brand.id,
          outletId: tree.outletA.id,
          at: AT,
        }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId)!;
      expect(item.displayPricePaise).toBe(17_900);
      expect(item.availability).toBe("available");
    });
  });

  it("MP-T13: GET /api/v1/menu remains the only customer customization discovery route", () => {
    const routerSource = readFileSync(
      path.join(process.cwd(), "src/server/customer-commerce/http/router.ts"),
      "utf8",
    );
    expect(routerSource).toMatch(/\/api\/v1\/menu/);
    expect(routerSource).not.toMatch(/\/api\/v1\/modifiers/);
    expect(routerSource).not.toMatch(/\/api\/v1\/customization/);
    expect(routerSource).not.toMatch(/\/api\/v1\/configuration/);
  });

  it("MP-T14: no bundle UX/configuration projection is introduced", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const seeded = await seedActiveMenuProduct(persistence, actor, tree.brand.id, "standard");
      const menu = await persistence.withContext((ctx) =>
        projectCustomerMenu(ctx, { brandId: tree.brand.id, at: AT }),
      );
      const item = menu.items.find((entry) => entry.variantId === seeded.variantId)!;
      expect(item).not.toHaveProperty("bundleGroups");
      expect(item).not.toHaveProperty("bundleSelections");
      expect(JSON.stringify(item)).not.toMatch(/bundleGroupOptionId/i);
    });
  });
});
