/**
 * Batched eligibility composition inputs for outlet-aware Customer Menu.
 *
 * Preserves IMP-014 decision semantics while eliminating nested scalar
 * catalog / modifier / bundle feasibility reads during menu projection.
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { AvailabilityState } from "../../shared/assortment";
import type { CatalogLifecycleStatus, ProductKind } from "../../shared/catalog";
import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import type { CatalogProduct, CatalogVariant } from "../catalog/types";
import type { PersistenceQueryContext } from "../persistence/types";
import {
  loadActiveBrandVariantIncludes,
  loadOutletAncestry,
  loadOutletExclusionIndex,
  type OutletAncestry,
  type OutletExclusionIndex,
} from "./assortment-reads";
import {
  loadEffectiveModifierOptionAvailabilityStates,
  loadEffectiveVariantAvailabilityStates,
} from "./availability";
import { resolveOutletOperatingState } from "./resolve-operating";
import type { ResolveOutletOperatingStateResult } from "./types";

export type ModifierFeasibilityGroup = Readonly<{
  minTotalQuantity: number;
  options: readonly Readonly<{
    modifierOptionId: string;
    maxQuantity: number | null;
  }>[];
}>;

export type BundleFeasibilityGroup = Readonly<{
  minSelections: number;
  componentVariantIds: readonly string[];
}>;

/** Full outlet-aware composition graph for IMP-014 reuse without scalar fanout. */
export type OutletEligibilityComposition = Readonly<{
  ancestry: OutletAncestry;
  operating: ResolveOutletOperatingStateResult;
  includedVariantIds: ReadonlySet<string>;
  variantAvailability: ReadonlyMap<string, AvailabilityState>;
  exclusions: OutletExclusionIndex;
  variantsById: ReadonlyMap<string, CatalogVariant>;
  productsById: ReadonlyMap<string, CatalogProduct>;
  modifierFeasibilityByVariantId: ReadonlyMap<string, readonly ModifierFeasibilityGroup[]>;
  bundleFeasibilityByVariantId: ReadonlyMap<string, readonly BundleFeasibilityGroup[]>;
  modifierOptionAvailability: ReadonlyMap<string, AvailabilityState>;
}>;

function rowToVariant(row: typeof catalogVariantsTable.$inferSelect): CatalogVariant {
  return {
    id: row.id,
    brandId: row.brandId,
    productId: row.productId,
    productKind: row.productKind as ProductKind,
    code: row.code,
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    isSelectorVisible: row.isSelectorVisible,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

function rowToProduct(row: typeof catalogProductsTable.$inferSelect): CatalogProduct {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    productKind: row.productKind as ProductKind,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

async function loadVariantsByIds(
  context: PersistenceQueryContext,
  brandId: string,
  variantIds: readonly string[],
): Promise<Map<string, CatalogVariant>> {
  const result = new Map<string, CatalogVariant>();
  if (variantIds.length === 0) return result;
  const rows = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(
      and(
        eq(catalogVariantsTable.brandId, brandId),
        inArray(catalogVariantsTable.id, [...variantIds]),
      ),
    );
  for (const row of rows) {
    result.set(row.id, rowToVariant(row));
  }
  return result;
}

async function loadProductsByIds(
  context: PersistenceQueryContext,
  brandId: string,
  productIds: readonly string[],
): Promise<Map<string, CatalogProduct>> {
  const result = new Map<string, CatalogProduct>();
  if (productIds.length === 0) return result;
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(
      and(
        eq(catalogProductsTable.brandId, brandId),
        inArray(catalogProductsTable.id, [...productIds]),
      ),
    );
  for (const row of rows) {
    result.set(row.id, rowToProduct(row));
  }
  return result;
}

async function loadBundleFeasibilityByVariantId(
  context: PersistenceQueryContext,
  brandId: string,
  bundleVariantIds: readonly string[],
): Promise<{
  groupsByBundleVariantId: Map<string, BundleFeasibilityGroup[]>;
  componentVariantIds: string[];
}> {
  const groupsByBundleVariantId = new Map<string, BundleFeasibilityGroup[]>();
  const componentVariantIds: string[] = [];
  if (bundleVariantIds.length === 0) {
    return { groupsByBundleVariantId, componentVariantIds };
  }

  const groups = await context.db
    .select()
    .from(catalogBundleGroupsTable)
    .where(
      and(
        eq(catalogBundleGroupsTable.brandId, brandId),
        inArray(catalogBundleGroupsTable.bundleVariantId, [...bundleVariantIds]),
        eq(catalogBundleGroupsTable.lifecycleStatus, "active"),
      ),
    );
  if (groups.length === 0) {
    return { groupsByBundleVariantId, componentVariantIds };
  }

  const groupIds = groups.map((group) => group.id);
  const options = await context.db
    .select()
    .from(catalogBundleGroupOptionsTable)
    .where(
      and(
        eq(catalogBundleGroupOptionsTable.brandId, brandId),
        inArray(catalogBundleGroupOptionsTable.bundleGroupId, groupIds),
        eq(catalogBundleGroupOptionsTable.lifecycleStatus, "active"),
      ),
    );

  const optionsByGroupId = new Map<string, string[]>();
  for (const option of options) {
    const list = optionsByGroupId.get(option.bundleGroupId) ?? [];
    list.push(option.componentVariantId);
    optionsByGroupId.set(option.bundleGroupId, list);
    componentVariantIds.push(option.componentVariantId);
  }

  for (const group of groups) {
    const componentIds = optionsByGroupId.get(group.id) ?? [];
    const list = groupsByBundleVariantId.get(group.bundleVariantId) ?? [];
    list.push({
      minSelections: group.minSelections,
      componentVariantIds: Object.freeze([...componentIds]),
    });
    groupsByBundleVariantId.set(group.bundleVariantId, list);
  }

  return { groupsByBundleVariantId, componentVariantIds };
}

async function loadModifierFeasibilityByVariantId(
  context: PersistenceQueryContext,
  brandId: string,
  variantIds: readonly string[],
): Promise<{
  feasibilityByVariantId: Map<string, ModifierFeasibilityGroup[]>;
  modifierOptionIds: string[];
}> {
  const feasibilityByVariantId = new Map<string, ModifierFeasibilityGroup[]>();
  const modifierOptionIds: string[] = [];
  if (variantIds.length === 0) {
    return { feasibilityByVariantId, modifierOptionIds };
  }

  const bindings = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        inArray(catalogVariantModifierGroupsTable.variantId, [...variantIds]),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );
  if (bindings.length === 0) {
    return { feasibilityByVariantId, modifierOptionIds };
  }

  const groupIds = [...new Set(bindings.map((binding) => binding.modifierGroupId))];
  const groupOptionRows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.brandId, brandId),
        inArray(catalogModifierGroupOptionsTable.modifierGroupId, groupIds),
        eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
      ),
    );

  const optionIds = [...new Set(groupOptionRows.map((row) => row.modifierOptionId))];
  const activeOptionRows =
    optionIds.length === 0
      ? []
      : await context.db
          .select({ id: catalogModifierOptionsTable.id })
          .from(catalogModifierOptionsTable)
          .where(
            and(
              eq(catalogModifierOptionsTable.brandId, brandId),
              inArray(catalogModifierOptionsTable.id, optionIds),
              eq(catalogModifierOptionsTable.lifecycleStatus, "active"),
            ),
          );
  const activeOptionIds = new Set(activeOptionRows.map((row) => row.id));

  const optionsByGroupId = new Map<
    string,
    Array<{ modifierOptionId: string; maxQuantity: number | null }>
  >();
  for (const row of groupOptionRows) {
    if (!activeOptionIds.has(row.modifierOptionId)) continue;
    const list = optionsByGroupId.get(row.modifierGroupId) ?? [];
    list.push({
      modifierOptionId: row.modifierOptionId,
      maxQuantity: row.maxQuantity,
    });
    optionsByGroupId.set(row.modifierGroupId, list);
    modifierOptionIds.push(row.modifierOptionId);
  }

  for (const binding of bindings) {
    const options = optionsByGroupId.get(binding.modifierGroupId) ?? [];
    const list = feasibilityByVariantId.get(binding.variantId) ?? [];
    list.push({
      minTotalQuantity: binding.minTotalQuantity,
      options: Object.freeze(options.map((option) => Object.freeze(option))),
    });
    feasibilityByVariantId.set(binding.variantId, list);
  }

  return { feasibilityByVariantId, modifierOptionIds };
}

/**
 * Load outlet-common + catalog + modifier/bundle feasibility inputs once for
 * the projected (and bundle-component) variant set.
 */
export async function loadOutletEligibilityComposition(
  context: PersistenceQueryContext,
  input: Readonly<{
    outletId: string;
    variantIds: readonly string[];
    now: Date;
  }>,
): Promise<OutletEligibilityComposition> {
  const ancestry = await loadOutletAncestry(context, input.outletId);
  const operating = await resolveOutletOperatingState(context, {
    outletId: input.outletId,
    context: { now: input.now },
  });
  const exclusions = await loadOutletExclusionIndex(context, ancestry);

  const seedVariants = await loadVariantsByIds(context, ancestry.brandId, input.variantIds);
  const bundleVariantIds = [...seedVariants.values()]
    .filter((variant) => variant.productKind === "bundle")
    .map((variant) => variant.id);

  const { groupsByBundleVariantId, componentVariantIds } = await loadBundleFeasibilityByVariantId(
    context,
    ancestry.brandId,
    bundleVariantIds,
  );

  const allVariantIds = [...new Set([...input.variantIds, ...componentVariantIds])];
  const variantsById =
    componentVariantIds.length === 0
      ? seedVariants
      : await loadVariantsByIds(context, ancestry.brandId, allVariantIds);

  const productIds = [...new Set([...variantsById.values()].map((variant) => variant.productId))];
  // Outlet-common assortment/availability remain parallel; catalog + modifier
  // graph load sequentially so composition shape stays bounded and deterministic.
  const [includedVariantIds, variantAvailability] = await Promise.all([
    loadActiveBrandVariantIncludes(context, ancestry.brandId, allVariantIds),
    loadEffectiveVariantAvailabilityStates(
      context,
      input.outletId,
      allVariantIds,
      input.now,
    ),
  ]);
  const productsById = await loadProductsByIds(context, ancestry.brandId, productIds);
  const modifierGraph = await loadModifierFeasibilityByVariantId(
    context,
    ancestry.brandId,
    allVariantIds,
  );

  const modifierOptionAvailability = await loadEffectiveModifierOptionAvailabilityStates(
    context,
    input.outletId,
    [...new Set(modifierGraph.modifierOptionIds)],
    input.now,
  );

  const bundleFeasibilityByVariantId = new Map<string, readonly BundleFeasibilityGroup[]>();
  for (const [bundleVariantId, groups] of groupsByBundleVariantId) {
    bundleFeasibilityByVariantId.set(
      bundleVariantId,
      Object.freeze(groups.map((group) => Object.freeze(group))),
    );
  }

  const modifierFeasibilityByVariantId = new Map<string, readonly ModifierFeasibilityGroup[]>();
  for (const [variantId, groups] of modifierGraph.feasibilityByVariantId) {
    modifierFeasibilityByVariantId.set(
      variantId,
      Object.freeze(groups.map((group) => Object.freeze(group))),
    );
  }

  return {
    ancestry,
    operating,
    includedVariantIds,
    variantAvailability,
    exclusions,
    variantsById,
    productsById,
    modifierFeasibilityByVariantId,
    bundleFeasibilityByVariantId,
    modifierOptionAvailability,
  };
}
