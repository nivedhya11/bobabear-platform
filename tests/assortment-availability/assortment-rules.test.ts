/**
 * Assortment rule eligibility domain tests (IMP-014).
 */
import { describe, expect, it } from "vitest";

import {
  AssortmentValidationError,
  excludeModifierOptionAtScope,
  excludeProductAtScope,
  excludeVariantAtScope,
  resolveOutletVariantAvailability,
  retireAssortmentRule,
} from "../../src/server/assortment";
import {
  configureAlwaysAcceptingOutlet,
  createActiveStandardVariant,
  includeVariantAtBrand,
  nowInsideAcceptingWindow,
  withAssortmentDomain,
} from "./support";

describe("assortment eligibility", () => {
  it("denies when no Brand include exists", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "noinc",
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);

      const decision = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(decision).toEqual({ eligible: false, code: "ASSORTMENT_NOT_INCLUDED" });
    });
  });

  it("Brand Variant include makes the variant eligible under an accepting outlet", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "inc",
      );
      await includeVariantAtBrand(
        persistence,
        brandAdminActor,
        tree.brand.id,
        catalog.variantId,
      );
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);

      const decision = await persistence.withContext((ctx) =>
        resolveOutletVariantAvailability(ctx, {
          variantId: catalog.variantId,
          outletId: tree.outletA.id,
          context: { now: nowInsideAcceptingWindow() },
        }),
      );
      expect(decision).toEqual({ eligible: true, code: "AVAILABLE" });
    });
  });

  it("Brand Product exclusion denies all variants; Variant exclusion is specific", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const {
        activateProduct,
        activateVariant,
        createProduct,
        createVariant,
      } = await import("../../src/server/catalog");

      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "pex-p",
          name: "Pex Product",
          productKind: "standard",
        }),
      );
      const vDefault = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "default",
          name: "Default",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const vAlt = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor: brandAdminActor,
          productId: product.id,
          code: "alt",
          name: "Alt",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor: brandAdminActor, variantId: vDefault.id });
        await activateVariant(tx, { actor: brandAdminActor, variantId: vAlt.id });
        await activateProduct(tx, { actor: brandAdminActor, productId: product.id });
      });
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, vDefault.id);
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, vAlt.id);
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);

      const productExclude = await persistence.transaction((tx) =>
        excludeProductAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          productId: product.id,
        }),
      );

      const now = nowInsideAcceptingWindow();
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: vDefault.id,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_BRAND" });
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: vAlt.id,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_BRAND" });

      await persistence.transaction((tx) =>
        retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: productExclude.id }),
      );

      await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          variantId: vDefault.id,
        }),
      );

      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: vDefault.id,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_BRAND" });
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: vAlt.id,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: true, code: "AVAILABLE" });
    });
  });

  it("Territory / Organization / Outlet exclusions apply; scopes are independent", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor, outletManagerActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "scope",
      );
      await includeVariantAtBrand(persistence, brandAdminActor, tree.brand.id, catalog.variantId);
      await configureAlwaysAcceptingOutlet(persistence, outletManagerActor, tree.outletA.id);
      const now = nowInsideAcceptingWindow();

      const terrRule = await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "territory",
          territoryId: tree.terrA.id,
          variantId: catalog.variantId,
        }),
      );
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_TERRITORY" });

      const orgRule = await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "organization",
          organizationId: tree.orgA.id,
          variantId: catalog.variantId,
        }),
      );
      // Territory still wins (evaluated first), and org exclusion coexists.
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_TERRITORY" });

      const outletRule = await persistence.transaction((tx) =>
        excludeVariantAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "outlet",
          outletId: tree.outletA.id,
          variantId: catalog.variantId,
        }),
      );

      await persistence.transaction((tx) =>
        retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: outletRule.id }),
      );
      // Still denied by organization after outlet retire — but territory still first.
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_TERRITORY" });

      await persistence.transaction((tx) =>
        retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: terrRule.id }),
      );
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: false, code: "ASSORTMENT_EXCLUDED_ORGANIZATION" });

      await persistence.transaction((tx) =>
        retireAssortmentRule(tx, { actor: brandAdminActor, ruleId: orgRule.id }),
      );
      expect(
        await persistence.withContext((ctx) =>
          resolveOutletVariantAvailability(ctx, {
            variantId: catalog.variantId,
            outletId: tree.outletA.id,
            context: { now },
          }),
        ),
      ).toEqual({ eligible: true, code: "AVAILABLE" });
    });
  });

  it("Modifier Option exclusion denies that option path via assortment read", async () => {
    await withAssortmentDomain(async (persistence, { tree, brandAdminActor }) => {
      const {
        activateModifierGroup,
        activateModifierGroupOption,
        activateModifierOption,
        activateVariantModifierGroup,
        addModifierOptionToGroup,
        applyModifierGroupToVariant,
        createModifierGroup,
        createModifierOption,
      } = await import("../../src/server/catalog");

      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "modex",
      );
      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "sugar",
          name: "Sugar",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          code: "less",
          name: "Less",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor: brandAdminActor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor: brandAdminActor,
          variantId: catalog.variantId,
          modifierGroupId: group.id,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, {
          actor: brandAdminActor,
          modifierOptionId: option.id,
        });
        await activateModifierGroupOption(tx, {
          actor: brandAdminActor,
          modifierGroupOptionId: binding.id,
        });
        await activateModifierGroup(tx, { actor: brandAdminActor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, {
          actor: brandAdminActor,
          variantModifierGroupId: vmg.id,
        });
      });

      await persistence.transaction((tx) =>
        excludeModifierOptionAtScope(tx, {
          actor: brandAdminActor,
          brandId: tree.brand.id,
          scopeType: "brand",
          modifierOptionId: option.id,
        }),
      );

      const { getEffectiveModifierOptionAssortment } = await import("../../src/server/assortment");
      const result = await persistence.withContext((ctx) =>
        getEffectiveModifierOptionAssortment(ctx, {
          actor: brandAdminActor,
          outletId: tree.outletA.id,
          modifierOptionId: option.id,
        }),
      );
      expect(result.eligible).toBe(false);
      expect(result.code).toBe("ASSORTMENT_EXCLUDED_BRAND");
    });
  });

  it("rejects Brand include at lower scope via domain ValidationError path (cross-brand)", async () => {
    await withAssortmentDomain(
      async (persistence, { tree, otherTree, brandAdminActor, otherBrandAdminActor }) => {
        const catalog = await createActiveStandardVariant(
          persistence,
          brandAdminActor,
          tree.brand.id,
          "xbrand",
        );
        // Variant belongs to tree.brand — other brand cannot exclude it.
        await expect(
          persistence.transaction((tx) =>
            excludeVariantAtScope(tx, {
              actor: otherBrandAdminActor,
              brandId: otherTree.brand.id,
              scopeType: "brand",
              variantId: catalog.variantId,
            }),
          ),
        ).rejects.toBeInstanceOf(AssortmentValidationError);
      },
    );
  });

  it("cross-Brand territory scope is denied with AssortmentValidationError", async () => {
    await withAssortmentDomain(async (persistence, { tree, otherTree, brandAdminActor }) => {
      const catalog = await createActiveStandardVariant(
        persistence,
        brandAdminActor,
        tree.brand.id,
        "xb",
      );
      await expect(
        persistence.transaction((tx) =>
          excludeVariantAtScope(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            scopeType: "territory",
            territoryId: otherTree.terrA.id,
            variantId: catalog.variantId,
          }),
        ),
      ).rejects.toBeInstanceOf(AssortmentValidationError);
    });
  });
});
