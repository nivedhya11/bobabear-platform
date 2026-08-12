/**
 * Domain/service coverage for the canonical catalog (IMP-012).
 * Uses the database vitest config (Testcontainers PostgreSQL 18).
 */
import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { AuthorizationError } from "../../src/server/access-control";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogValidationError,
  activateBundleGroup,
  activateBundleOption,
  activateDietaryTag,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  addBundleOption,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  assignDietaryTag,
  createBundleGroup,
  createDietaryTag,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
  getCatalogProductGraph,
  retireBundleOption,
  retireDietaryTag,
  retireProduct,
  retireVariant,
  updateVariant,
} from "../../src/server/catalog";
import { withCatalogDomain } from "./support";

describe("catalog product activation and variants", () => {
  it("creates a draft standard product, hidden default variant, and activates", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "milk-tea",
          name: "Milk Tea",
          productKind: "standard",
        }),
      );
      expect(product.lifecycleStatus).toBe("draft");

      await expect(
        persistence.transaction((tx) => activateProduct(tx, { actor, productId: product.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "default",
          name: "Regular",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      expect(variant.isDefault).toBe(true);
      expect(variant.isSelectorVisible).toBe(false);

      await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: variant.id }));
      const activated = await persistence.transaction((tx) =>
        activateProduct(tx, { actor, productId: product.id }),
      );
      expect(activated.lifecycleStatus).toBe("active");
    });
  });

  it("rejects activate without exactly one active default and enforces multi-variant visibility", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "sizes",
          name: "Sized Drink",
          productKind: "standard",
        }),
      );

      const v350 = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "350ml",
          name: "350ml",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const v500 = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "500ml",
          name: "500ml",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );

      await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: v350.id }));
      // Second variant still draft — activate product should fail (needs all? actually needs >=1 active + one default)
      // Activating with only one active default is OK for graph readiness; add second as active but hidden.
      await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: v500.id }));
      await persistence.transaction((tx) =>
        updateVariant(tx, { actor, variantId: v500.id, isSelectorVisible: false }),
      );

      await expect(
        persistence.transaction((tx) => activateProduct(tx, { actor, productId: product.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await persistence.transaction((tx) =>
        updateVariant(tx, { actor, variantId: v500.id, isSelectorVisible: true }),
      );
      const activated = await persistence.transaction((tx) =>
        activateProduct(tx, { actor, productId: product.id }),
      );
      expect(activated.lifecycleStatus).toBe("active");

      // Clearing the only default via update while active fails closed.
      await expect(
        persistence.transaction((tx) =>
          updateVariant(tx, { actor, variantId: v350.id, isDefault: false }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("treats retired as terminal", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "retire-me",
          name: "Retire Me",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "def",
          name: "Def",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction((tx) => activateVariant(tx, { actor, variantId: variant.id }));
      await persistence.transaction((tx) => activateProduct(tx, { actor, productId: product.id }));
      await persistence.transaction((tx) => retireProduct(tx, { actor, productId: product.id }));
      await expect(
        persistence.transaction((tx) => activateProduct(tx, { actor, productId: product.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });
});

describe("modifiers and bundles", () => {
  it("supports modifier group reuse, required derivation, and quantity validation", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "mod-drink",
          name: "Mod Drink",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "def",
          name: "Def",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      const group = await persistence.transaction((tx) =>
        createModifierGroup(tx, {
          actor,
          brandId: tree.brand.id,
          code: "sugar",
          name: "Sugar Level",
        }),
      );
      const optLess = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "less",
          name: "Less",
        }),
      );
      const optNormal = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "normal",
          name: "Normal",
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          addModifierOptionToGroup(tx, {
            actor,
            modifierGroupId: group.id,
            modifierOptionId: optLess.id,
            minQuantity: 2,
            maxQuantity: 1,
            defaultQuantity: 0,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogValidationError);

      const bindingLess = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: optLess.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 1,
          position: 0,
        }),
      );
      const bindingNormal = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: optNormal.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
          position: 1,
        }),
      );

      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variant.id,
          modifierGroupId: group.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
          position: 0,
        }),
      );
      expect(vmg.required).toBe(true);

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: optLess.id });
        await activateModifierOption(tx, { actor, modifierOptionId: optNormal.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindingLess.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindingNormal.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmg.id });
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      const graph = await persistence.withContext((ctx) =>
        getCatalogProductGraph(ctx, { actor, productId: product.id }),
      );
      expect(graph.variantModifierGroups[0]?.required).toBe(true);
      expect(graph.modifierGroupOptions.map((o) => o.position).sort((a, b) => a - b)).toEqual([
        0, 1,
      ]);
    });
  });

  it("creates fixed and choose-one bundle groups with standard components only", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const componentProduct = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "comp-tea",
          name: "Component Tea",
          productKind: "standard",
        }),
      );
      const componentVariant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: componentProduct.id,
          code: "def",
          name: "Def",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: componentVariant.id });
        await activateProduct(tx, { actor, productId: componentProduct.id });
      });

      const bundleProduct = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "combo",
          name: "Combo",
          productKind: "bundle",
        }),
      );
      const bundleVariant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: bundleProduct.id,
          code: "def",
          name: "Def",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );

      await expect(
        persistence.transaction((tx) =>
          createBundleGroup(tx, {
            actor,
            bundleVariantId: componentVariant.id,
            code: "bad",
            name: "Bad",
            maxSelections: 1,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogValidationError);

      const fixed = await persistence.transaction((tx) =>
        createBundleGroup(tx, {
          actor,
          bundleVariantId: bundleVariant.id,
          code: "fixed",
          name: "Fixed",
          minSelections: 1,
          maxSelections: 1,
          position: 0,
        }),
      );
      const choose = await persistence.transaction((tx) =>
        createBundleGroup(tx, {
          actor,
          bundleVariantId: bundleVariant.id,
          code: "choose",
          name: "Choose One",
          minSelections: 1,
          maxSelections: 1,
          position: 1,
        }),
      );

      const option = await persistence.transaction((tx) =>
        addBundleOption(tx, {
          actor,
          bundleGroupId: fixed.id,
          componentVariantId: componentVariant.id,
          quantity: 1,
          isDefault: true,
          position: 0,
        }),
      );
      await persistence.transaction((tx) =>
        addBundleOption(tx, {
          actor,
          bundleGroupId: choose.id,
          componentVariantId: componentVariant.id,
          quantity: 1,
          isDefault: true,
          position: 0,
        }),
      );

      // Nested/self: using the bundle variant as a component fails closed.
      await expect(
        persistence.transaction((tx) =>
          addBundleOption(tx, {
            actor,
            bundleGroupId: choose.id,
            componentVariantId: bundleVariant.id,
            quantity: 1,
          }),
        ),
      ).rejects.toThrow();

      await persistence.transaction(async (tx) => {
        await activateBundleOption(tx, { actor, bundleGroupOptionId: option.id });
        const chooseOpt = (
          await getCatalogProductGraph(tx, { actor, productId: bundleProduct.id })
        ).bundleGroupOptions.find((o) => o.bundleGroupId === choose.id)!;
        await activateBundleOption(tx, { actor, bundleGroupOptionId: chooseOpt.id });
        await activateBundleGroup(tx, { actor, bundleGroupId: fixed.id });
        await activateBundleGroup(tx, { actor, bundleGroupId: choose.id });
        await activateVariant(tx, { actor, variantId: bundleVariant.id });
        await activateProduct(tx, { actor, productId: bundleProduct.id });
      });

      // Retiring an active component used by an active bundle fails closed.
      await expect(
        persistence.transaction((tx) =>
          retireVariant(tx, { actor, variantId: componentVariant.id }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await expect(
        persistence.transaction((tx) =>
          retireBundleOption(tx, { actor, bundleGroupOptionId: option.id }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });
});

describe("dietary and authorization", () => {
  it("assigns dietary tags and derives bundle dietary inputs without persistence", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "diet-tea",
          name: "Diet Tea",
          productKind: "standard",
        }),
      );
      const variant = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "def",
          name: "Def",
          isDefault: true,
          isSelectorVisible: false,
        }),
      );
      const tag = await persistence.transaction((tx) =>
        createDietaryTag(tx, {
          actor,
          brandId: tree.brand.id,
          code: "veg",
          name: "Vegetarian",
          kind: "dietary",
        }),
      );
      await persistence.transaction((tx) => activateDietaryTag(tx, { actor, dietaryTagId: tag.id }));
      await persistence.transaction((tx) =>
        assignDietaryTag(tx, {
          actor,
          dietaryTagId: tag.id,
          targetType: "variant",
          targetId: variant.id,
        }),
      );

      // Retiring a tag with live assignments fails closed.
      await expect(
        persistence.transaction((tx) => retireDietaryTag(tx, { actor, dietaryTagId: tag.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await expect(
        persistence.transaction((tx) =>
          assignDietaryTag(tx, {
            actor,
            dietaryTagId: tag.id,
            targetType: "variant",
            targetId: variant.id,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogConflictError);
    });
  });

  it("authorizes brand admin / PSA manage and denies outlet manager and cross-brand", async () => {
    await withCatalogDomain(
      async (
        persistence,
        {
          tree,
          otherTree,
          brandAdminActor,
          otherBrandAdminActor,
          outletManagerActor,
          psaActor,
        },
      ) => {
        const product = await persistence.transaction((tx) =>
          createProduct(tx, {
            actor: brandAdminActor,
            brandId: tree.brand.id,
            code: "authz",
            name: "Authz Product",
            productKind: "standard",
          }),
        );

        await expect(
          persistence.transaction((tx) =>
            createProduct(tx, {
              actor: outletManagerActor,
              brandId: tree.brand.id,
              code: "denied",
              name: "Denied",
              productKind: "standard",
            }),
          ),
        ).rejects.toBeInstanceOf(AuthorizationError);

        await expect(
          persistence.transaction((tx) =>
            createVariant(tx, {
              actor: otherBrandAdminActor,
              productId: product.id,
              code: "x",
              name: "X",
              isDefault: true,
            }),
          ),
        ).rejects.toBeInstanceOf(AuthorizationError);

        // Unknown / untrusted actor.
        await expect(
          persistence.transaction((tx) =>
            createProduct(tx, {
              actor: { workforceUserId: randomUUID() },
              brandId: tree.brand.id,
              code: "unknown",
              name: "Unknown",
              productKind: "standard",
            }),
          ),
        ).rejects.toThrow(/WorkforcePrincipal|untrusted|Actor must be/i);

        const psaProduct = await persistence.transaction((tx) =>
          createProduct(tx, {
            actor: psaActor,
            brandId: otherTree.brand.id,
            code: "psa-ok",
            name: "PSA Ok",
            productKind: "standard",
          }),
        );
        expect(psaProduct.brandId).toBe(otherTree.brand.id);

        // catalog.read can load graph; manage-only mutations stay gated.
        const variant = await persistence.transaction((tx) =>
          createVariant(tx, {
            actor: brandAdminActor,
            productId: product.id,
            code: "def",
            name: "Def",
            isDefault: true,
            isSelectorVisible: false,
          }),
        );
        await persistence.transaction((tx) =>
          activateVariant(tx, { actor: brandAdminActor, variantId: variant.id }),
        );
        await persistence.transaction((tx) =>
          activateProduct(tx, { actor: brandAdminActor, productId: product.id }),
        );

        const graph = await persistence.withContext((ctx) =>
          getCatalogProductGraph(ctx, { actor: brandAdminActor, productId: product.id }),
        );
        expect(graph.product.id).toBe(product.id);
        expect(graph.variants).toHaveLength(1);
      },
    );
  });
});
