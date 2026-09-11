/**
 * Admin Catalog inspection projection (IMP-036F F2).
 *
 * Exposes explicit effective (customer-visible) vs draft (proposed) content so
 * commercial operators never infer customer truth from revision IDs alone.
 * Permission remains catalog.read @ Brand — this module only shapes reads.
 */
import "server-only";

import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierGroupOptionContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveProductContent,
  loadEffectiveVariantContent,
  loadEffectiveVariantModifierGroupContent,
} from "./revisions";
import type {
  CatalogModifierGroup,
  CatalogModifierGroupOption,
  CatalogModifierOption,
  CatalogProduct,
  CatalogProductGraph,
  CatalogVariant,
  CatalogVariantModifierGroup,
} from "./types";

function revisionString(value: bigint | null): string | null {
  return value == null ? null : value.toString(10);
}

function contentEqual(
  a: Record<string, unknown> | null,
  b: Record<string, unknown>,
): boolean {
  if (a == null) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

export type CatalogInspectionProduct = Readonly<{
  id: string;
  brandId: string;
  code: string;
  productKind: CatalogProduct["productKind"];
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{ name: string; description: string | null }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    lifecycleStatus: CatalogProduct["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionVariant = Readonly<{
  id: string;
  brandId: string;
  productId: string;
  productKind: CatalogVariant["productKind"];
  code: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
  }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
    lifecycleStatus: CatalogVariant["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionModifierGroup = Readonly<{
  id: string;
  brandId: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{ name: string; description: string | null }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    lifecycleStatus: CatalogModifierGroup["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionModifierOption = Readonly<{
  id: string;
  brandId: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{ name: string; description: string | null }> | null;
  draft: Readonly<{
    name: string;
    description: string | null;
    lifecycleStatus: CatalogModifierOption["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionModifierGroupOption = Readonly<{
  id: string;
  brandId: string;
  modifierGroupId: string;
  modifierOptionId: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{
    minQuantity: number;
    maxQuantity: number;
    defaultQuantity: number;
    position: number;
    lifecycleStatus: string;
  }> | null;
  draft: Readonly<{
    minQuantity: number;
    maxQuantity: number;
    defaultQuantity: number;
    position: number;
    lifecycleStatus: CatalogModifierGroupOption["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionVariantModifierGroup = Readonly<{
  id: string;
  brandId: string;
  variantId: string;
  modifierGroupId: string;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  effectiveContentRevision: string | null;
  draftContentRevision: string;
  draftDiffersFromEffective: boolean;
  effective: Readonly<{
    minTotalQuantity: number;
    maxTotalQuantity: number;
    position: number;
    lifecycleStatus: string;
  }> | null;
  draft: Readonly<{
    minTotalQuantity: number;
    maxTotalQuantity: number;
    position: number;
    lifecycleStatus: CatalogVariantModifierGroup["lifecycleStatus"];
  }>;
}>;

export type CatalogInspectionProductGraph = Readonly<{
  product: CatalogInspectionProduct;
  variants: readonly CatalogInspectionVariant[];
  modifierGroups: readonly CatalogInspectionModifierGroup[];
  modifierOptions: readonly CatalogInspectionModifierOption[];
  modifierGroupOptions: readonly CatalogInspectionModifierGroupOption[];
  variantModifierGroups: readonly CatalogInspectionVariantModifierGroup[];
  bundleGroups: CatalogProductGraph["bundleGroups"];
  bundleGroupOptions: CatalogProductGraph["bundleGroupOptions"];
  dietaryTags: CatalogProductGraph["dietaryTags"];
  variantDietaryTags: CatalogProductGraph["variantDietaryTags"];
  modifierOptionDietaryTags: CatalogProductGraph["modifierOptionDietaryTags"];
}>;

export async function projectProductInspection(
  context: PersistenceQueryContext,
  product: CatalogProduct,
): Promise<CatalogInspectionProduct> {
  assertApplicationRole(context, "projectProductInspection");
  const effective = await loadEffectiveProductContent(context, product);
  const draft = {
    name: product.name,
    description: product.description,
    lifecycleStatus: product.lifecycleStatus,
  };
  const effectiveComparable = effective
    ? { name: effective.name, description: effective.description }
    : null;
  const draftComparable = { name: draft.name, description: draft.description };
  const draftDiffersFromEffective =
    effectiveComparable == null
      ? product.lifecycleStatus === "active" || product.effectiveContentRevision != null
      : !contentEqual(effectiveComparable, draftComparable) ||
        (product.lifecycleStatus === "retired" && product.effectiveContentRevision != null);
  return {
    id: product.id,
    brandId: product.brandId,
    code: product.code,
    productKind: product.productKind,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    activatedAt: product.activatedAt,
    retiredAt: product.retiredAt,
    effectiveContentRevision: revisionString(product.effectiveContentRevision),
    draftContentRevision: product.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectVariantInspection(
  context: PersistenceQueryContext,
  variant: CatalogVariant,
): Promise<CatalogInspectionVariant> {
  assertApplicationRole(context, "projectVariantInspection");
  const effective = await loadEffectiveVariantContent(context, variant);
  const draft = {
    name: variant.name,
    description: variant.description,
    isDefault: variant.isDefault,
    isSelectorVisible: variant.isSelectorVisible,
    lifecycleStatus: variant.lifecycleStatus,
  };
  const effectiveComparable = effective
    ? {
        name: effective.name,
        description: effective.description,
        isDefault: effective.isDefault,
        isSelectorVisible: effective.isSelectorVisible,
      }
    : null;
  const draftComparable = {
    name: draft.name,
    description: draft.description,
    isDefault: draft.isDefault,
    isSelectorVisible: draft.isSelectorVisible,
  };
  const draftDiffersFromEffective =
    effectiveComparable == null
      ? variant.lifecycleStatus === "active" || variant.effectiveContentRevision != null
      : !contentEqual(effectiveComparable, draftComparable) ||
        (variant.lifecycleStatus === "retired" && variant.effectiveContentRevision != null);
  return {
    id: variant.id,
    brandId: variant.brandId,
    productId: variant.productId,
    productKind: variant.productKind,
    code: variant.code,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
    activatedAt: variant.activatedAt,
    retiredAt: variant.retiredAt,
    effectiveContentRevision: revisionString(variant.effectiveContentRevision),
    draftContentRevision: variant.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectModifierGroupInspection(
  context: PersistenceQueryContext,
  group: CatalogModifierGroup,
): Promise<CatalogInspectionModifierGroup> {
  assertApplicationRole(context, "projectModifierGroupInspection");
  const effective = await loadEffectiveModifierGroupContent(context, group);
  const draft = {
    name: group.name,
    description: group.description,
    lifecycleStatus: group.lifecycleStatus,
  };
  const effectiveComparable = effective
    ? { name: effective.name, description: effective.description }
    : null;
  const draftComparable = { name: draft.name, description: draft.description };
  const draftDiffersFromEffective =
    effectiveComparable == null
      ? group.lifecycleStatus === "active" || group.effectiveContentRevision != null
      : !contentEqual(effectiveComparable, draftComparable) ||
        (group.lifecycleStatus === "retired" && group.effectiveContentRevision != null);
  return {
    id: group.id,
    brandId: group.brandId,
    code: group.code,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    activatedAt: group.activatedAt,
    retiredAt: group.retiredAt,
    effectiveContentRevision: revisionString(group.effectiveContentRevision),
    draftContentRevision: group.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectModifierOptionInspection(
  context: PersistenceQueryContext,
  option: CatalogModifierOption,
): Promise<CatalogInspectionModifierOption> {
  assertApplicationRole(context, "projectModifierOptionInspection");
  const effective = await loadEffectiveModifierOptionContent(context, option);
  const draft = {
    name: option.name,
    description: option.description,
    lifecycleStatus: option.lifecycleStatus,
  };
  const effectiveComparable = effective
    ? { name: effective.name, description: effective.description }
    : null;
  const draftComparable = { name: draft.name, description: draft.description };
  const draftDiffersFromEffective =
    effectiveComparable == null
      ? option.lifecycleStatus === "active" || option.effectiveContentRevision != null
      : !contentEqual(effectiveComparable, draftComparable) ||
        (option.lifecycleStatus === "retired" && option.effectiveContentRevision != null);
  return {
    id: option.id,
    brandId: option.brandId,
    code: option.code,
    createdAt: option.createdAt,
    updatedAt: option.updatedAt,
    activatedAt: option.activatedAt,
    retiredAt: option.retiredAt,
    effectiveContentRevision: revisionString(option.effectiveContentRevision),
    draftContentRevision: option.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectModifierGroupOptionInspection(
  context: PersistenceQueryContext,
  binding: CatalogModifierGroupOption,
): Promise<CatalogInspectionModifierGroupOption> {
  assertApplicationRole(context, "projectModifierGroupOptionInspection");
  const effective = await loadEffectiveModifierGroupOptionContent(context, binding);
  const draft = {
    minQuantity: binding.minQuantity,
    maxQuantity: binding.maxQuantity,
    defaultQuantity: binding.defaultQuantity,
    position: binding.position,
    lifecycleStatus: binding.lifecycleStatus,
  };
  const draftDiffersFromEffective =
    effective == null
      ? binding.lifecycleStatus === "active" || binding.effectiveContentRevision != null
      : effective.minQuantity !== draft.minQuantity ||
        effective.maxQuantity !== draft.maxQuantity ||
        effective.defaultQuantity !== draft.defaultQuantity ||
        effective.position !== draft.position ||
        effective.lifecycleStatus !== draft.lifecycleStatus;
  return {
    id: binding.id,
    brandId: binding.brandId,
    modifierGroupId: binding.modifierGroupId,
    modifierOptionId: binding.modifierOptionId,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
    activatedAt: binding.activatedAt,
    retiredAt: binding.retiredAt,
    effectiveContentRevision: revisionString(binding.effectiveContentRevision),
    draftContentRevision: binding.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectVariantModifierGroupInspection(
  context: PersistenceQueryContext,
  binding: CatalogVariantModifierGroup,
): Promise<CatalogInspectionVariantModifierGroup> {
  assertApplicationRole(context, "projectVariantModifierGroupInspection");
  const effective = await loadEffectiveVariantModifierGroupContent(context, binding);
  const draft = {
    minTotalQuantity: binding.minTotalQuantity,
    maxTotalQuantity: binding.maxTotalQuantity,
    position: binding.position,
    lifecycleStatus: binding.lifecycleStatus,
  };
  const draftDiffersFromEffective =
    effective == null
      ? binding.lifecycleStatus === "active" || binding.effectiveContentRevision != null
      : effective.minTotalQuantity !== draft.minTotalQuantity ||
        effective.maxTotalQuantity !== draft.maxTotalQuantity ||
        effective.position !== draft.position ||
        effective.lifecycleStatus !== draft.lifecycleStatus;
  return {
    id: binding.id,
    brandId: binding.brandId,
    variantId: binding.variantId,
    modifierGroupId: binding.modifierGroupId,
    required: binding.required,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
    activatedAt: binding.activatedAt,
    retiredAt: binding.retiredAt,
    effectiveContentRevision: revisionString(binding.effectiveContentRevision),
    draftContentRevision: binding.draftContentRevision.toString(10),
    draftDiffersFromEffective,
    effective,
    draft,
  };
}

export async function projectProductGraphInspection(
  context: PersistenceQueryContext,
  graph: CatalogProductGraph,
): Promise<CatalogInspectionProductGraph> {
  assertApplicationRole(context, "projectProductGraphInspection");
  return {
    product: await projectProductInspection(context, graph.product),
    variants: await Promise.all(
      graph.variants.map((variant) => projectVariantInspection(context, variant)),
    ),
    modifierGroups: await Promise.all(
      graph.modifierGroups.map((group) => projectModifierGroupInspection(context, group)),
    ),
    modifierOptions: await Promise.all(
      graph.modifierOptions.map((option) => projectModifierOptionInspection(context, option)),
    ),
    modifierGroupOptions: await Promise.all(
      graph.modifierGroupOptions.map((binding) =>
        projectModifierGroupOptionInspection(context, binding),
      ),
    ),
    variantModifierGroups: await Promise.all(
      graph.variantModifierGroups.map((binding) =>
        projectVariantModifierGroupInspection(context, binding),
      ),
    ),
    bundleGroups: graph.bundleGroups,
    bundleGroupOptions: graph.bundleGroupOptions,
    dietaryTags: graph.dietaryTags,
    variantDietaryTags: graph.variantDietaryTags,
    modifierOptionDietaryTags: graph.modifierOptionDietaryTags,
  };
}
