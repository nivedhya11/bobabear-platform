/**
 * Explicit active-graph negative paths (IMP-012 §59).
 * Mutations must reject rather than silently invalidate an active catalog graph.
 */
import { describe, expect, it } from "vitest";

import {
  CatalogInvalidStateError,
  activateModifierGroup,
  activateModifierGroupOption,
  activateModifierOption,
  activateProduct,
  activateVariant,
  activateVariantModifierGroup,
  activateBundleGroup,
  activateBundleOption,
  addBundleOption,
  addModifierOptionToGroup,
  applyModifierGroupToVariant,
  createBundleGroup,
  createModifierGroup,
  createModifierOption,
  createProduct,
  createVariant,
  retireModifierGroup,
  retireModifierGroupOption,
  retireProduct,
  retireVariant,
  updateModifierGroupOption,
  updateVariantModifierGroup,
} from "../../src/server/catalog";
import { withCatalogDomain } from "./support";

describe("active-graph negative paths", () => {
  it("rejects retiring the only active variant of an active product", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "solo",
          name: "Solo",
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
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      await expect(
        persistence.transaction((tx) => retireVariant(tx, { actor, variantId: variant.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("rejects retiring the active default variant without a replacement", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "two-size",
          name: "Two Size",
          productKind: "standard",
        }),
      );
      const vDefault = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "350ml",
          name: "350ml",
          isDefault: true,
          isSelectorVisible: true,
        }),
      );
      const vAlt = await persistence.transaction((tx) =>
        createVariant(tx, {
          actor,
          productId: product.id,
          code: "500ml",
          name: "500ml",
          isDefault: false,
          isSelectorVisible: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateVariant(tx, { actor, variantId: vDefault.id });
        await activateVariant(tx, { actor, variantId: vAlt.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      await expect(
        persistence.transaction((tx) => retireVariant(tx, { actor, variantId: vDefault.id })),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("rejects retiring a modifier group required by an active variant graph", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "mod-prod",
          name: "Mod Prod",
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
          name: "Sugar",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "normal",
          name: "Normal",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 1,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variant.id,
          modifierGroupId: group.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: binding.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmg.id });
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      await expect(
        persistence.transaction((tx) =>
          retireModifierGroup(tx, { actor, modifierGroupId: group.id }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("rejects retiring enough modifier options to make required cardinality impossible", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "card-prod",
          name: "Card Prod",
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
          code: "toppings",
          name: "Toppings",
        }),
      );
      const optA = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "pearl",
          name: "Pearl",
        }),
      );
      const optB = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "jelly",
          name: "Jelly",
        }),
      );
      const bindA = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: optA.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 1,
        }),
      );
      const bindB = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: optB.id,
          minQuantity: 0,
          maxQuantity: 1,
          defaultQuantity: 0,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variant.id,
          modifierGroupId: group.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 2,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: optA.id });
        await activateModifierOption(tx, { actor, modifierOptionId: optB.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindA.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: bindB.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmg.id });
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      // Retiring both option bindings leaves the required group unsatisfiable.
      await expect(
        persistence.transaction(async (tx) => {
          await retireModifierGroupOption(tx, { actor, modifierGroupOptionId: bindA.id });
          await retireModifierGroupOption(tx, { actor, modifierGroupOptionId: bindB.id });
        }),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("rejects retiring an active standard product used by an active bundle", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const componentProduct = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "comp",
          name: "Comp",
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
          code: "bundle",
          name: "Bundle",
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
      const group = await persistence.transaction((tx) =>
        createBundleGroup(tx, {
          actor,
          bundleVariantId: bundleVariant.id,
          code: "main",
          name: "Main",
          minSelections: 1,
          maxSelections: 1,
        }),
      );
      const option = await persistence.transaction((tx) =>
        addBundleOption(tx, {
          actor,
          bundleGroupId: group.id,
          componentVariantId: componentVariant.id,
          quantity: 1,
          isDefault: true,
        }),
      );
      await persistence.transaction(async (tx) => {
        await activateBundleOption(tx, { actor, bundleGroupOptionId: option.id });
        await activateBundleGroup(tx, { actor, bundleGroupId: group.id });
        await activateVariant(tx, { actor, variantId: bundleVariant.id });
        await activateProduct(tx, { actor, productId: bundleProduct.id });
      });

      await expect(
        persistence.transaction((tx) =>
          retireProduct(tx, { actor, productId: componentProduct.id }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await expect(
        persistence.transaction((tx) =>
          retireVariant(tx, { actor, variantId: componentVariant.id }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });

  it("rejects mutating active modifier defaults into an invalid cardinality", async () => {
    await withCatalogDomain(async (persistence, { tree, brandAdminActor: actor }) => {
      const product = await persistence.transaction((tx) =>
        createProduct(tx, {
          actor,
          brandId: tree.brand.id,
          code: "def-prod",
          name: "Def Prod",
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
          code: "choose",
          name: "Choose",
        }),
      );
      const option = await persistence.transaction((tx) =>
        createModifierOption(tx, {
          actor,
          brandId: tree.brand.id,
          code: "a",
          name: "A",
        }),
      );
      const binding = await persistence.transaction((tx) =>
        addModifierOptionToGroup(tx, {
          actor,
          modifierGroupId: group.id,
          modifierOptionId: option.id,
          minQuantity: 0,
          maxQuantity: 2,
          defaultQuantity: 1,
        }),
      );
      const vmg = await persistence.transaction((tx) =>
        applyModifierGroupToVariant(tx, {
          actor,
          variantId: variant.id,
          modifierGroupId: group.id,
          minTotalQuantity: 1,
          maxTotalQuantity: 1,
        }),
      );

      await persistence.transaction(async (tx) => {
        await activateModifierOption(tx, { actor, modifierOptionId: option.id });
        await activateModifierGroupOption(tx, { actor, modifierGroupOptionId: binding.id });
        await activateModifierGroup(tx, { actor, modifierGroupId: group.id });
        await activateVariantModifierGroup(tx, { actor, variantModifierGroupId: vmg.id });
        await activateVariant(tx, { actor, variantId: variant.id });
        await activateProduct(tx, { actor, productId: product.id });
      });

      await expect(
        persistence.transaction((tx) =>
          updateModifierGroupOption(tx, {
            actor,
            modifierGroupOptionId: binding.id,
            defaultQuantity: 0,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);

      await expect(
        persistence.transaction((tx) =>
          updateVariantModifierGroup(tx, {
            actor,
            variantModifierGroupId: vmg.id,
            minTotalQuantity: 2,
            maxTotalQuantity: 2,
          }),
        ),
      ).rejects.toBeInstanceOf(CatalogInvalidStateError);
    });
  });
});
