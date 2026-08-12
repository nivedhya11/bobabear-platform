/**
 * Active product-graph validation (IMP-012).
 *
 * Draft graphs may be incomplete. Active graphs must always be structurally
 * valid — mutations revalidate in the same transaction and fail closed.
 */
import { and, eq, inArray } from "drizzle-orm";

import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { CatalogInvalidStateError, CatalogNotFoundError } from "./errors";
import { assertUuid } from "./lifecycle";

function fail(message: string): never {
  throw new CatalogInvalidStateError({ message });
}

/**
 * Full structural checks required for a product to be (or remain) active.
 * Does not consult product.lifecycleStatus — callers decide when to invoke.
 */
export async function assertProductGraphReady(
  context: PersistenceQueryContext,
  productId: string,
): Promise<void> {
  assertApplicationRole(context, "assertProductGraphReady");
  const id = assertUuid(productId, "productId");

  const productRows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, id))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new CatalogNotFoundError("product");

  const variants = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.productId, id));

  const activeVariants = variants.filter((v) => v.lifecycleStatus === "active");
  if (activeVariants.length === 0) {
    fail("Active product requires at least one active variant.");
  }

  const activeDefaults = activeVariants.filter((v) => v.isDefault);
  if (activeDefaults.length !== 1) {
    fail("Active product requires exactly one active default variant.");
  }

  if (activeVariants.length > 1) {
    const hidden = activeVariants.filter((v) => !v.isSelectorVisible);
    if (hidden.length > 0) {
      fail("Multi-variant active products require all active variants to be selector-visible.");
    }
  }

  const activeVariantIds = activeVariants.map((v) => v.id);

  const vmgRows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        inArray(catalogVariantModifierGroupsTable.variantId, activeVariantIds),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );

  if (vmgRows.length > 0) {
    const groupIds = [...new Set(vmgRows.map((r) => r.modifierGroupId))];
    const groups = await context.db
      .select()
      .from(catalogModifierGroupsTable)
      .where(inArray(catalogModifierGroupsTable.id, groupIds));
    const groupById = new Map(groups.map((g) => [g.id, g]));

    const groupOptions = await context.db
      .select()
      .from(catalogModifierGroupOptionsTable)
      .where(
        and(
          inArray(catalogModifierGroupOptionsTable.modifierGroupId, groupIds),
          eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
        ),
      );

    const optionIds = [...new Set(groupOptions.map((o) => o.modifierOptionId))];
    const options =
      optionIds.length === 0
        ? []
        : await context.db
            .select()
            .from(catalogModifierOptionsTable)
            .where(inArray(catalogModifierOptionsTable.id, optionIds));
    const optionById = new Map(options.map((o) => [o.id, o]));

    for (const binding of vmgRows) {
      const group = groupById.get(binding.modifierGroupId);
      if (!group || group.lifecycleStatus !== "active") {
        fail("Active variant modifier binding requires an active modifier group.");
      }

      const activeBindings = groupOptions.filter(
        (o) => o.modifierGroupId === binding.modifierGroupId,
      );
      if (activeBindings.length === 0) {
        fail("Active modifier group on an active variant requires at least one active option binding.");
      }

      let sumMin = 0;
      let sumMax = 0;
      let sumDefault = 0;
      for (const bindingOption of activeBindings) {
        const option = optionById.get(bindingOption.modifierOptionId);
        if (!option || option.lifecycleStatus !== "active") {
          fail("Active modifier group-option binding requires an active modifier option.");
        }
        sumMin += bindingOption.minQuantity;
        sumMax += bindingOption.maxQuantity;
        sumDefault += bindingOption.defaultQuantity;
      }

      if (sumMax < binding.minTotalQuantity) {
        fail("Modifier option max quantities cannot satisfy the group min total quantity.");
      }
      if (sumMin > binding.maxTotalQuantity) {
        fail("Modifier option min quantities exceed the group max total quantity.");
      }
      if (sumDefault < binding.minTotalQuantity || sumDefault > binding.maxTotalQuantity) {
        fail("Sum of modifier option defaults must lie within the group total quantity range.");
      }
    }
  }

  if (product.productKind === "bundle") {
    const activeBundleVariants = activeVariants.filter((v) => v.productKind === "bundle");
    if (activeBundleVariants.length === 0) {
      fail("Active bundle product requires at least one active bundle variant.");
    }

    const bundleVariantIds = activeBundleVariants.map((v) => v.id);
    const bundleGroups = await context.db
      .select()
      .from(catalogBundleGroupsTable)
      .where(inArray(catalogBundleGroupsTable.bundleVariantId, bundleVariantIds));

    for (const variant of activeBundleVariants) {
      const activeGroups = bundleGroups.filter(
        (g) => g.bundleVariantId === variant.id && g.lifecycleStatus === "active",
      );
      if (activeGroups.length === 0) {
        fail("Each active bundle variant requires at least one active bundle group.");
      }

      const groupIds = activeGroups.map((g) => g.id);
      const bundleOptions = await context.db
        .select()
        .from(catalogBundleGroupOptionsTable)
        .where(
          and(
            inArray(catalogBundleGroupOptionsTable.bundleGroupId, groupIds),
            eq(catalogBundleGroupOptionsTable.lifecycleStatus, "active"),
          ),
        );

      const componentVariantIds = [...new Set(bundleOptions.map((o) => o.componentVariantId))];
      const componentVariants =
        componentVariantIds.length === 0
          ? []
          : await context.db
              .select()
              .from(catalogVariantsTable)
              .where(inArray(catalogVariantsTable.id, componentVariantIds));
      const componentById = new Map(componentVariants.map((v) => [v.id, v]));

      const componentProductIds = [
        ...new Set(componentVariants.map((v) => v.productId)),
      ];
      const componentProducts =
        componentProductIds.length === 0
          ? []
          : await context.db
              .select()
              .from(catalogProductsTable)
              .where(inArray(catalogProductsTable.id, componentProductIds));
      const componentProductById = new Map(componentProducts.map((p) => [p.id, p]));

      for (const group of activeGroups) {
        const options = bundleOptions.filter((o) => o.bundleGroupId === group.id);
        if (options.length < group.minSelections) {
          fail("Active bundle group does not have enough active component options for min selections.");
        }

        const defaultCount = options.filter((o) => o.isDefault).length;
        if (
          defaultCount !== 0 &&
          (defaultCount < group.minSelections || defaultCount > group.maxSelections)
        ) {
          fail("Bundle group default option count must be zero or within selection cardinality.");
        }

        for (const option of options) {
          const component = componentById.get(option.componentVariantId);
          if (!component || component.lifecycleStatus !== "active") {
            fail("Active bundle option requires an active standard component variant.");
          }
          if (component.productKind !== "standard") {
            fail("Bundle components must be standard variants.");
          }
          const componentProduct = componentProductById.get(component.productId);
          if (!componentProduct || componentProduct.lifecycleStatus !== "active") {
            fail("Active bundle option requires an active standard component product.");
          }
          if (component.brandId !== product.brandId) {
            fail("Bundle components must belong to the same brand.");
          }
        }
      }
    }
  }

  // Active standard components used by *other* active bundle products are
  // checked when those bundle products revalidate; retiring a component used
  // by an active bundle is caught via revalidateProductsUsingVariant.
}

/**
 * After a mutation: if the product is active, re-run full graph validation.
 * No-op when the product is draft or retired.
 */
export async function validateActiveProductGraph(
  context: PersistenceQueryContext,
  productId: string,
): Promise<void> {
  assertApplicationRole(context, "validateActiveProductGraph");
  const id = assertUuid(productId, "productId");
  const productRows = await context.db
    .select({
      id: catalogProductsTable.id,
      lifecycleStatus: catalogProductsTable.lifecycleStatus,
    })
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, id))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new CatalogNotFoundError("product");
  if (product.lifecycleStatus !== "active") return;
  await assertProductGraphReady(context, id);
}

/** Revalidate every active product that references the given variant (as self or bundle component). */
export async function revalidateProductsForVariant(
  context: PersistenceQueryContext,
  variantId: string,
): Promise<void> {
  const variantRows = await context.db
    .select({
      id: catalogVariantsTable.id,
      productId: catalogVariantsTable.productId,
    })
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, variantId))
    .limit(1);
  const variant = variantRows[0];
  if (!variant) return;

  const productIds = new Set<string>([variant.productId]);

  const componentBindings = await context.db
    .select({
      bundleGroupId: catalogBundleGroupOptionsTable.bundleGroupId,
    })
    .from(catalogBundleGroupOptionsTable)
    .where(
      and(
        eq(catalogBundleGroupOptionsTable.componentVariantId, variantId),
        eq(catalogBundleGroupOptionsTable.lifecycleStatus, "active"),
      ),
    );

  if (componentBindings.length > 0) {
    const groupIds = componentBindings.map((b) => b.bundleGroupId);
    const groups = await context.db
      .select({
        bundleVariantId: catalogBundleGroupsTable.bundleVariantId,
      })
      .from(catalogBundleGroupsTable)
      .where(inArray(catalogBundleGroupsTable.id, groupIds));
    const bundleVariantIds = groups.map((g) => g.bundleVariantId);
    if (bundleVariantIds.length > 0) {
      const bundleVariants = await context.db
        .select({ productId: catalogVariantsTable.productId })
        .from(catalogVariantsTable)
        .where(inArray(catalogVariantsTable.id, bundleVariantIds));
      for (const bv of bundleVariants) productIds.add(bv.productId);
    }
  }

  for (const productId of productIds) {
    await validateActiveProductGraph(context, productId);
  }
}

/** Revalidate every active product that uses the modifier group. */
export async function revalidateProductsForModifierGroup(
  context: PersistenceQueryContext,
  modifierGroupId: string,
): Promise<void> {
  const bindings = await context.db
    .select({ variantId: catalogVariantModifierGroupsTable.variantId })
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.modifierGroupId, modifierGroupId),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );
  if (bindings.length === 0) return;

  const variants = await context.db
    .select({ productId: catalogVariantsTable.productId })
    .from(catalogVariantsTable)
    .where(
      inArray(
        catalogVariantsTable.id,
        bindings.map((b) => b.variantId),
      ),
    );
  const productIds = [...new Set(variants.map((v) => v.productId))];
  for (const productId of productIds) {
    await validateActiveProductGraph(context, productId);
  }
}

/**
 * After retiring (or otherwise mutating) a product, revalidate every active
 * product that depends on its variants — most importantly active bundles that
 * use those variants as components.
 */
export async function revalidateProductsForProduct(
  context: PersistenceQueryContext,
  productId: string,
): Promise<void> {
  const variants = await context.db
    .select({ id: catalogVariantsTable.id })
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.productId, productId));

  for (const variant of variants) {
    await revalidateProductsForVariant(context, variant.id);
  }
}

/** Revalidate every active product that uses a group containing the modifier option. */
export async function revalidateProductsForModifierOption(
  context: PersistenceQueryContext,
  modifierOptionId: string,
): Promise<void> {
  const groupOptions = await context.db
    .select({ modifierGroupId: catalogModifierGroupOptionsTable.modifierGroupId })
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.modifierOptionId, modifierOptionId),
        eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
      ),
    );
  const groupIds = [...new Set(groupOptions.map((g) => g.modifierGroupId))];
  for (const groupId of groupIds) {
    await revalidateProductsForModifierGroup(context, groupId);
  }
}
