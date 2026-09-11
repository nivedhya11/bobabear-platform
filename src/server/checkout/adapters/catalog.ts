/**
 * Catalog labels + structural validation for Checkout (IMP-021).
 *
 * Checkout/order labels resolve PUBLISHED / EFFECTIVE Catalog truth only.
 * Primary name columns mirror latest drafts and must not leak into snapshots.
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
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
} from "../../catalog/revisions";
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
        productId: catalogVariantsTable.productId,
        effectiveContentRevision: catalogVariantsTable.effectiveContentRevision,
      })
      .from(catalogVariantsTable)
      .where(eq(catalogVariantsTable.id, line.variantId))
      .limit(1);
    const v = variant[0];
    // Customer-orderable requires published effective content; staged activation
    // (primary active, effective null) and staged retirement (primary retired,
    // effective still set) are resolved via effective pointer presence.
    if (!v || v.effectiveContentRevision == null) {
      problems.push(
        Object.freeze({
          cartLineId: line.id,
          code: "CHECKOUT_VARIANT_INVALID",
        }),
      );
      continue;
    }
    const product = await context.db
      .select({
        effectiveContentRevision: catalogProductsTable.effectiveContentRevision,
      })
      .from(catalogProductsTable)
      .where(eq(catalogProductsTable.id, v.productId))
      .limit(1);
    if (!product[0] || product[0].effectiveContentRevision == null) {
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

async function loadEffectiveModifierLabels(
  context: PersistenceQueryContext,
  variantModifierGroupId: string,
  modifierGroupOptionId: string,
): Promise<{ groupName: string; optionName: string }> {
  const rows = await context.db
    .select({
      group: catalogModifierGroupsTable,
      option: catalogModifierOptionsTable,
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
      eq(catalogModifierGroupOptionsTable.id, modifierGroupOptionId),
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
        eq(catalogVariantModifierGroupsTable.id, variantModifierGroupId),
        eq(catalogModifierGroupOptionsTable.id, modifierGroupOptionId),
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
  const groupContent = await loadEffectiveModifierGroupContent(context, row.group);
  const optionContent = await loadEffectiveModifierOptionContent(context, row.option);
  if (!groupContent || !optionContent) {
    throw new CheckoutError(
      "CHECKOUT_MODIFIER_INVALID",
      "Modifier labels could not be resolved from effective Catalog content.",
    );
  }
  return { groupName: groupContent.name, optionName: optionContent.name };
}

async function loadLabelsForLine(
  context: PersistenceQueryContext,
  line: CartLine,
): Promise<CatalogLineLabels> {
  const variantRows = await context.db
    .select({
      variant: catalogVariantsTable,
      product: catalogProductsTable,
    })
    .from(catalogVariantsTable)
    .innerJoin(
      catalogProductsTable,
      eq(catalogProductsTable.id, catalogVariantsTable.productId),
    )
    .where(eq(catalogVariantsTable.id, line.variantId))
    .limit(1);
  const row = variantRows[0];
  if (!row) {
    throw new CheckoutError(
      "CHECKOUT_VARIANT_INVALID",
      "Variant labels could not be resolved.",
    );
  }
  const productContent = await loadEffectiveProductContent(context, row.product);
  const variantContent = await loadEffectiveVariantContent(context, row.variant);
  if (!productContent || !variantContent) {
    throw new CheckoutError(
      "CHECKOUT_VARIANT_INVALID",
      "Variant labels could not be resolved from effective Catalog content.",
    );
  }

  const modifiers = [];
  for (const mod of line.modifiers) {
    const names = await loadEffectiveModifierLabels(
      context,
      mod.variantModifierGroupId,
      mod.modifierGroupOptionId,
    );
    modifiers.push(
      Object.freeze({
        variantModifierGroupId: mod.variantModifierGroupId,
        modifierGroupOptionId: mod.modifierGroupOptionId,
        groupName: names.groupName,
        optionName: names.optionName,
      }),
    );
  }

  const bundleSelections = [];
  for (const bundle of line.bundleSelections) {
    const rows = await context.db
      .select({
        groupName: catalogBundleGroupsTable.name,
        selectedVariantId: catalogBundleGroupOptionsTable.componentVariantId,
        componentVariant: catalogVariantsTable,
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
    const bundleRow = rows[0];
    if (!bundleRow) {
      throw new CheckoutError(
        "CHECKOUT_BUNDLE_INVALID",
        "Bundle labels could not be resolved.",
      );
    }
    const componentVariantContent = await loadEffectiveVariantContent(
      context,
      bundleRow.componentVariant,
    );
    if (!componentVariantContent) {
      throw new CheckoutError(
        "CHECKOUT_BUNDLE_INVALID",
        "Bundle labels could not be resolved from effective Catalog content.",
      );
    }

    const nestedMods = [];
    for (const mod of bundle.modifiers) {
      const names = await loadEffectiveModifierLabels(
        context,
        mod.variantModifierGroupId,
        mod.modifierGroupOptionId,
      );
      nestedMods.push(
        Object.freeze({
          variantModifierGroupId: mod.variantModifierGroupId,
          modifierGroupOptionId: mod.modifierGroupOptionId,
          groupName: names.groupName,
          optionName: names.optionName,
        }),
      );
    }

    bundleSelections.push(
      Object.freeze({
        bundleGroupOptionId: bundle.bundleGroupOptionId,
        selectedVariantId: bundleRow.selectedVariantId,
        groupName: bundleRow.groupName,
        optionName: componentVariantContent.name,
        variantName: componentVariantContent.name,
        modifiers: Object.freeze(nestedMods),
      }),
    );
  }

  return Object.freeze({
    productId: row.product.id,
    productName: productContent.name,
    variantName: variantContent.name,
    modifiers: Object.freeze(modifiers),
    bundleSelections: Object.freeze(bundleSelections),
  });
}
