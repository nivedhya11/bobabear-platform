/**
 * Structural Catalog validation for new / edited Cart configurations (IMP-020).
 *
 * Validates relationships against Catalog identities. Does not check
 * assortment/availability (those are evaluation-only).
 */

import { and, eq, inArray } from "drizzle-orm";

import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogModifierGroupOptionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import {
  CartError,
  type CanonicalCartLineConfiguration,
} from "../../shared/cart";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";

export async function validateCartLineStructure(
  context: PersistenceQueryContext,
  brandId: string,
  configuration: CanonicalCartLineConfiguration,
): Promise<void> {
  assertApplicationRole(context, "validateCartLineStructure");

  const variants = await context.db
    .select({
      id: catalogVariantsTable.id,
      brandId: catalogVariantsTable.brandId,
      productKind: catalogVariantsTable.productKind,
    })
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, configuration.variantId))
    .limit(1);
  const variant = variants[0];
  if (!variant || variant.brandId !== brandId) {
    throw new CartError(
      "CART_CONFIGURATION_INVALID",
      "Variant is not valid for this Brand.",
      { field: "variantId" },
    );
  }

  if (configuration.modifiers.length > 0) {
    const vmgIds = [
      ...new Set(configuration.modifiers.map((m) => m.variantModifierGroupId)),
    ];
    const vmgRows = await context.db
      .select({
        id: catalogVariantModifierGroupsTable.id,
        variantId: catalogVariantModifierGroupsTable.variantId,
        brandId: catalogVariantModifierGroupsTable.brandId,
        modifierGroupId: catalogVariantModifierGroupsTable.modifierGroupId,
      })
      .from(catalogVariantModifierGroupsTable)
      .where(inArray(catalogVariantModifierGroupsTable.id, vmgIds));
    const vmgById = new Map(vmgRows.map((r) => [r.id, r]));

    const mgoIds = [
      ...new Set(configuration.modifiers.map((m) => m.modifierGroupOptionId)),
    ];
    const mgoRows = await context.db
      .select({
        id: catalogModifierGroupOptionsTable.id,
        brandId: catalogModifierGroupOptionsTable.brandId,
        modifierGroupId: catalogModifierGroupOptionsTable.modifierGroupId,
      })
      .from(catalogModifierGroupOptionsTable)
      .where(inArray(catalogModifierGroupOptionsTable.id, mgoIds));
    const mgoById = new Map(mgoRows.map((r) => [r.id, r]));

    for (const mod of configuration.modifiers) {
      const vmg = vmgById.get(mod.variantModifierGroupId);
      if (
        !vmg ||
        vmg.brandId !== brandId ||
        vmg.variantId !== configuration.variantId
      ) {
        throw new CartError(
          "CART_CONFIGURATION_INVALID",
          "Modifier group does not belong to this Variant.",
          { field: "modifiers" },
        );
      }
      const mgo = mgoById.get(mod.modifierGroupOptionId);
      if (
        !mgo ||
        mgo.brandId !== brandId ||
        mgo.modifierGroupId !== vmg.modifierGroupId
      ) {
        throw new CartError(
          "CART_CONFIGURATION_INVALID",
          "Modifier option does not belong to the selected group.",
          { field: "modifiers" },
        );
      }
    }
  }

  if (configuration.bundleSelections.length > 0) {
    if (variant.productKind !== "bundle") {
      throw new CartError(
        "CART_CONFIGURATION_INVALID",
        "Bundle selections require a bundle Variant.",
        { field: "bundleSelections" },
      );
    }

    const bgoIds = configuration.bundleSelections.map(
      (s) => s.bundleGroupOptionId,
    );
    const bgoRows = await context.db
      .select({
        id: catalogBundleGroupOptionsTable.id,
        brandId: catalogBundleGroupOptionsTable.brandId,
        bundleGroupId: catalogBundleGroupOptionsTable.bundleGroupId,
        componentVariantId: catalogBundleGroupOptionsTable.componentVariantId,
      })
      .from(catalogBundleGroupOptionsTable)
      .where(inArray(catalogBundleGroupOptionsTable.id, bgoIds));
    const bgoById = new Map(bgoRows.map((r) => [r.id, r]));

    const groupIds = [...new Set(bgoRows.map((r) => r.bundleGroupId))];
    const groupRows =
      groupIds.length === 0
        ? []
        : await context.db
            .select({
              id: catalogBundleGroupsTable.id,
              brandId: catalogBundleGroupsTable.brandId,
              bundleVariantId: catalogBundleGroupsTable.bundleVariantId,
            })
            .from(catalogBundleGroupsTable)
            .where(
              and(
                inArray(catalogBundleGroupsTable.id, groupIds),
                eq(
                  catalogBundleGroupsTable.bundleVariantId,
                  configuration.variantId,
                ),
              ),
            );
    const groupById = new Map(groupRows.map((r) => [r.id, r]));

    for (const sel of configuration.bundleSelections) {
      const bgo = bgoById.get(sel.bundleGroupOptionId);
      if (!bgo || bgo.brandId !== brandId) {
        throw new CartError(
          "CART_CONFIGURATION_INVALID",
          "Bundle option is not valid for this Brand.",
          { field: "bundleSelections" },
        );
      }
      const group = groupById.get(bgo.bundleGroupId);
      if (!group || group.bundleVariantId !== configuration.variantId) {
        throw new CartError(
          "CART_CONFIGURATION_INVALID",
          "Bundle option does not belong to this Variant.",
          { field: "bundleSelections" },
        );
      }

      if (sel.modifiers.length > 0) {
        const componentVariantId = bgo.componentVariantId;
        const vmgIds = [
          ...new Set(sel.modifiers.map((m) => m.variantModifierGroupId)),
        ];
        const vmgRows = await context.db
          .select({
            id: catalogVariantModifierGroupsTable.id,
            variantId: catalogVariantModifierGroupsTable.variantId,
            brandId: catalogVariantModifierGroupsTable.brandId,
            modifierGroupId: catalogVariantModifierGroupsTable.modifierGroupId,
          })
          .from(catalogVariantModifierGroupsTable)
          .where(inArray(catalogVariantModifierGroupsTable.id, vmgIds));
        const vmgById = new Map(vmgRows.map((r) => [r.id, r]));

        const mgoIds = [
          ...new Set(sel.modifiers.map((m) => m.modifierGroupOptionId)),
        ];
        const mgoRows = await context.db
          .select({
            id: catalogModifierGroupOptionsTable.id,
            brandId: catalogModifierGroupOptionsTable.brandId,
            modifierGroupId: catalogModifierGroupOptionsTable.modifierGroupId,
          })
          .from(catalogModifierGroupOptionsTable)
          .where(inArray(catalogModifierGroupOptionsTable.id, mgoIds));
        const mgoById = new Map(mgoRows.map((r) => [r.id, r]));

        for (const mod of sel.modifiers) {
          const vmg = vmgById.get(mod.variantModifierGroupId);
          if (
            !vmg ||
            vmg.brandId !== brandId ||
            vmg.variantId !== componentVariantId
          ) {
            throw new CartError(
              "CART_CONFIGURATION_INVALID",
              "Nested modifier does not belong to the bundle component Variant.",
              { field: "bundleSelections" },
            );
          }
          const mgo = mgoById.get(mod.modifierGroupOptionId);
          if (
            !mgo ||
            mgo.brandId !== brandId ||
            mgo.modifierGroupId !== vmg.modifierGroupId
          ) {
            throw new CartError(
              "CART_CONFIGURATION_INVALID",
              "Nested modifier option does not belong to the selected group.",
              { field: "bundleSelections" },
            );
          }
        }
      }
    }
  } else if (variant.productKind === "bundle") {
    // Empty bundle selections are structurally allowed at persistence time;
    // evaluation reports incomplete/invalid configuration.
  }
}
