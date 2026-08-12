/**
 * Catalog labels + structural validation for Checkout (IMP-021).
 */

import { and, eq } from "drizzle-orm";

import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../../platform/database/schema/catalog";
import type { Cart, CartLine } from "../../../shared/cart";
import {
  CheckoutError,
  type CheckoutMerchandiseProblem,
} from "../../../shared/checkout";
import type { PersistenceQueryContext } from "../../persistence/types";
import { validateCartLineStructure } from "../../cart/validate-structure";
import { cartLineToCanonicalConfiguration } from "../../cart/canonicalize-config";
import { assertApplicationRole } from "../assert-role";

export type CatalogLineLabels = Readonly<{
  productId: string;
  productName: string;
  variantName: string;
  modifiers: readonly Readonly<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    groupName: string;
    optionName: string;
  }>[];
  bundleSelections: readonly Readonly<{
    bundleGroupOptionId: string;
    selectedVariantId: string;
    groupName: string;
    optionName: string;
    variantName: string;
    modifiers: readonly Readonly<{
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      groupName: string;
      optionName: string;
    }>[];
  }>[];
}>;

export async function validateCheckoutCartMerchandise(
  context: PersistenceQueryContext,
  brandId: string,
  cart: Cart,
): Promise<CheckoutMerchandiseProblem[]> {
  assertApplicationRole(context, "validateCheckoutCartMerchandise");
  const problems: CheckoutMerchandiseProblem[] = [];

  for (const line of cart.lines) {
    try {
      await validateCartLineStructure(
        context,
        brandId,
        cartLineToCanonicalConfiguration(line),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code =
        /modifier/i.test(message)
          ? ("CHECKOUT_MODIFIER_INVALID" as const)
          : /bundle/i.test(message)
            ? ("CHECKOUT_BUNDLE_INVALID" as const)
            : ("CHECKOUT_VARIANT_INVALID" as const);
      problems.push(Object.freeze({ cartLineId: line.id, code }));
      continue;
    }

    const variant = await context.db
      .select({
        id: catalogVariantsTable.id,
        lifecycleStatus: catalogVariantsTable.lifecycleStatus,
        productId: catalogVariantsTable.productId,
      })
      .from(catalogVariantsTable)
      .where(eq(catalogVariantsTable.id, line.variantId))
      .limit(1);
    const v = variant[0];
    if (!v || v.lifecycleStatus !== "active") {
      problems.push(
        Object.freeze({
          cartLineId: line.id,
          code: "CHECKOUT_VARIANT_INVALID",
        }),
      );
      continue;
    }
    const product = await context.db
      .select({ lifecycleStatus: catalogProductsTable.lifecycleStatus })
      .from(catalogProductsTable)
      .where(eq(catalogProductsTable.id, v.productId))
      .limit(1);
    if (!product[0] || product[0].lifecycleStatus !== "active") {
      problems.push(
        Object.freeze({
          cartLineId: line.id,
          code: "CHECKOUT_VARIANT_INVALID",
        }),
      );
    }
  }

  return problems;
}

export async function loadCatalogLabelsForCart(
  context: PersistenceQueryContext,
  cart: Cart,
): Promise<ReadonlyMap<string, CatalogLineLabels>> {
  assertApplicationRole(context, "loadCatalogLabelsForCart");
  const result = new Map<string, CatalogLineLabels>();

  for (const line of cart.lines) {
    result.set(line.id, await loadLabelsForLine(context, line));
  }
  return result;
}

async function loadLabelsForLine(
  context: PersistenceQueryContext,
  line: CartLine,
): Promise<CatalogLineLabels> {
  const variantRows = await context.db
    .select({
      productId: catalogVariantsTable.productId,
      variantName: catalogVariantsTable.name,
      productName: catalogProductsTable.name,
    })
    .from(catalogVariantsTable)
    .innerJoin(
      catalogProductsTable,
      eq(catalogProductsTable.id, catalogVariantsTable.productId),
    )
    .where(eq(catalogVariantsTable.id, line.variantId))
    .limit(1);
  const variant = variantRows[0];
  if (!variant) {
    throw new CheckoutError(
      "CHECKOUT_VARIANT_INVALID",
      "Variant labels could not be resolved.",
    );
  }

  const modifiers = [];
  for (const mod of line.modifiers) {
    const rows = await context.db
      .select({
        groupName: catalogModifierGroupsTable.name,
        optionName: catalogModifierOptionsTable.name,
      })
      .from(catalogVariantModifierGroupsTable)
      .innerJoin(
        catalogModifierGroupsTable,
        eq(
          catalogModifierGroupsTable.id,
          catalogVariantModifierGroupsTable.modifierGroupId,
        ),
      )
      .innerJoin(
        catalogModifierGroupOptionsTable,
        eq(
          catalogModifierGroupOptionsTable.id,
          mod.modifierGroupOptionId,
        ),
      )
      .innerJoin(
        catalogModifierOptionsTable,
        eq(
          catalogModifierOptionsTable.id,
          catalogModifierGroupOptionsTable.modifierOptionId,
        ),
      )
      .where(
        and(
          eq(catalogVariantModifierGroupsTable.id, mod.variantModifierGroupId),
          eq(catalogModifierGroupOptionsTable.id, mod.modifierGroupOptionId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new CheckoutError(
        "CHECKOUT_MODIFIER_INVALID",
        "Modifier labels could not be resolved.",
      );
    }
    modifiers.push(
      Object.freeze({
        variantModifierGroupId: mod.variantModifierGroupId,
        modifierGroupOptionId: mod.modifierGroupOptionId,
        groupName: row.groupName,
        optionName: row.optionName,
      }),
    );
  }

  const bundleSelections = [];
  for (const bundle of line.bundleSelections) {
    const rows = await context.db
      .select({
        groupName: catalogBundleGroupsTable.name,
        selectedVariantId: catalogBundleGroupOptionsTable.componentVariantId,
        optionName: catalogVariantsTable.name,
        variantName: catalogVariantsTable.name,
      })
      .from(catalogBundleGroupOptionsTable)
      .innerJoin(
        catalogBundleGroupsTable,
        eq(
          catalogBundleGroupsTable.id,
          catalogBundleGroupOptionsTable.bundleGroupId,
        ),
      )
      .innerJoin(
        catalogVariantsTable,
        eq(
          catalogVariantsTable.id,
          catalogBundleGroupOptionsTable.componentVariantId,
        ),
      )
      .where(eq(catalogBundleGroupOptionsTable.id, bundle.bundleGroupOptionId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new CheckoutError(
        "CHECKOUT_BUNDLE_INVALID",
        "Bundle labels could not be resolved.",
      );
    }

    const nestedMods = [];
    for (const mod of bundle.modifiers) {
      const modRows = await context.db
        .select({
          groupName: catalogModifierGroupsTable.name,
          optionName: catalogModifierOptionsTable.name,
        })
        .from(catalogVariantModifierGroupsTable)
        .innerJoin(
          catalogModifierGroupsTable,
          eq(
            catalogModifierGroupsTable.id,
            catalogVariantModifierGroupsTable.modifierGroupId,
          ),
        )
        .innerJoin(
          catalogModifierGroupOptionsTable,
          eq(catalogModifierGroupOptionsTable.id, mod.modifierGroupOptionId),
        )
        .innerJoin(
          catalogModifierOptionsTable,
          eq(
            catalogModifierOptionsTable.id,
            catalogModifierGroupOptionsTable.modifierOptionId,
          ),
        )
        .where(
          and(
            eq(catalogVariantModifierGroupsTable.id, mod.variantModifierGroupId),
            eq(catalogModifierGroupOptionsTable.id, mod.modifierGroupOptionId),
          ),
        )
        .limit(1);
      const modRow = modRows[0];
      if (!modRow) {
        throw new CheckoutError(
          "CHECKOUT_MODIFIER_INVALID",
          "Bundle modifier labels could not be resolved.",
        );
      }
      nestedMods.push(
        Object.freeze({
          variantModifierGroupId: mod.variantModifierGroupId,
          modifierGroupOptionId: mod.modifierGroupOptionId,
          groupName: modRow.groupName,
          optionName: modRow.optionName,
        }),
      );
    }

    bundleSelections.push(
      Object.freeze({
        bundleGroupOptionId: bundle.bundleGroupOptionId,
        selectedVariantId: row.selectedVariantId,
        groupName: row.groupName,
        optionName: row.optionName,
        variantName: row.variantName,
        modifiers: Object.freeze(nestedMods),
      }),
    );
  }

  return Object.freeze({
    productId: variant.productId,
    productName: variant.productName,
    variantName: variant.variantName,
    modifiers: Object.freeze(modifiers),
    bundleSelections: Object.freeze(bundleSelections),
  });
}
