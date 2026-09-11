/**
 * Catalog admin reads and trusted internal lookups (IMP-012).
 *
 * `trustedInternalFindProductById` performs **no** authorization. It is for
 * future server-side menu/cart/order modules only — never expose as an
 * unrestricted browser endpoint. Admin reads require `catalog.read`.
 */
import { and, asc, eq, inArray } from "drizzle-orm";

import { isModifierGroupRequired, type CatalogLifecycleStatus, type DietaryTagKind, type ProductKind } from "../../shared/catalog";
import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogDietaryTagsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionDietaryTagsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantDietaryTagsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { requireCatalogRead } from "./authorize-catalog";
import { CatalogNotFoundError } from "./errors";
import { assertUuid } from "./lifecycle";
import type {
  CatalogBundleGroup,
  CatalogBundleGroupOption,
  CatalogDietaryAssignment,
  CatalogDietaryTag,
  CatalogModifierGroup,
  CatalogModifierGroupOption,
  CatalogModifierOption,
  CatalogProduct,
  CatalogProductGraph,
  CatalogReadInput,
  CatalogVariant,
  CatalogVariantModifierGroup,
} from "./types";
import { assertProductGraphReady, validateActiveProductGraph } from "./validation";

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

/**
 * Trusted internal product lookup — **no authorization**.
 * Server modules only; does not imply user business authority.
 */
export async function trustedInternalFindProductById(
  context: PersistenceQueryContext,
  productId: string,
): Promise<CatalogProduct | null> {
  assertApplicationRole(context, "trustedInternalFindProductById");
  const id = assertUuid(productId, "productId");
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToProduct(row) : null;
}

export async function getCatalogProduct(
  context: PersistenceQueryContext,
  input: CatalogReadInput,
): Promise<CatalogProduct> {
  assertApplicationRole(context, "getCatalogProduct");
  const product = await trustedInternalFindProductById(context, input.productId);
  if (!product) throw new CatalogNotFoundError("product");
  await requireCatalogRead(context, input.actor, product.brandId);
  return product;
}

export type BrandCatalogResourceInput = Readonly<{
  actor: unknown;
  brandId: string;
  productId?: string;
  modifierGroupId?: string;
  modifierOptionId?: string;
}>;

export type ListBrandCatalogProductsInput = Readonly<{
  actor: unknown;
  brandId: string;
}>;

/**
 * Authorized Brand-scoped Product list for commercial Catalog inspection.
 */
export async function listBrandCatalogProducts(
  context: PersistenceQueryContext,
  input: ListBrandCatalogProductsInput,
): Promise<readonly CatalogProduct[]> {
  assertApplicationRole(context, "listBrandCatalogProducts");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.brandId, brandId))
    .orderBy(asc(catalogProductsTable.code), asc(catalogProductsTable.id));
  return rows.map(rowToProduct);
}

/**
 * Path-Brand-first Product read: authorize the locator Brand, then constrain
 * retrieval to that Brand. Missing and cross-Brand IDs share not-found.
 */
export async function getBrandCatalogProduct(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; productId: string }>,
): Promise<CatalogProduct> {
  assertApplicationRole(context, "getBrandCatalogProduct");
  const brandId = assertUuid(input.brandId, "brandId");
  const productId = assertUuid(input.productId, "productId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(and(eq(catalogProductsTable.id, productId), eq(catalogProductsTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("product");
  return rowToProduct(row);
}

/**
 * Path-Brand-first Product graph read (same anti-oracle ordering as getBrandCatalogProduct).
 */
export async function getBrandCatalogProductGraph(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; productId: string }>,
): Promise<CatalogProductGraph> {
  assertApplicationRole(context, "getBrandCatalogProductGraph");
  const product = await getBrandCatalogProduct(context, input);
  return loadProductGraph(context, product);
}

/**
 * Authorized Brand-scoped ModifierGroup list for commercial association discovery.
 */
export async function listBrandCatalogModifierGroups(
  context: PersistenceQueryContext,
  input: ListBrandCatalogProductsInput,
): Promise<readonly CatalogModifierGroup[]> {
  assertApplicationRole(context, "listBrandCatalogModifierGroups");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(eq(catalogModifierGroupsTable.brandId, brandId))
    .orderBy(asc(catalogModifierGroupsTable.code), asc(catalogModifierGroupsTable.id));
  return rows.map((row) => ({
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  }));
}

/**
 * Authorized Brand-scoped ModifierOption list for commercial association discovery.
 */
export async function listBrandCatalogModifierOptions(
  context: PersistenceQueryContext,
  input: ListBrandCatalogProductsInput,
): Promise<readonly CatalogModifierOption[]> {
  assertApplicationRole(context, "listBrandCatalogModifierOptions");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(eq(catalogModifierOptionsTable.brandId, brandId))
    .orderBy(asc(catalogModifierOptionsTable.code), asc(catalogModifierOptionsTable.id));
  return rows.map((row) => ({
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  }));
}

/**
 * Path-Brand-first ModifierGroup detail.
 */
export async function getBrandCatalogModifierGroup(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; modifierGroupId: string }>,
): Promise<CatalogModifierGroup> {
  assertApplicationRole(context, "getBrandCatalogModifierGroup");
  const brandId = assertUuid(input.brandId, "brandId");
  const modifierGroupId = assertUuid(input.modifierGroupId, "modifierGroupId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(
      and(
        eq(catalogModifierGroupsTable.id, modifierGroupId),
        eq(catalogModifierGroupsTable.brandId, brandId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("modifier_group");
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

/**
 * Path-Brand-first ModifierOption detail.
 */
export async function getBrandCatalogModifierOption(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; modifierOptionId: string }>,
): Promise<CatalogModifierOption> {
  assertApplicationRole(context, "getBrandCatalogModifierOption");
  const brandId = assertUuid(input.brandId, "brandId");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  await requireCatalogRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(
      and(
        eq(catalogModifierOptionsTable.id, modifierOptionId),
        eq(catalogModifierOptionsTable.brandId, brandId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("modifier_option");
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    description: row.description,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

async function loadProductGraph(
  context: PersistenceQueryContext,
  product: CatalogProduct,
): Promise<CatalogProductGraph> {
  const variants = (
    await context.db
      .select()
      .from(catalogVariantsTable)
      .where(eq(catalogVariantsTable.productId, product.id))
      .orderBy(asc(catalogVariantsTable.code), asc(catalogVariantsTable.id))
  ).map(rowToVariant);

  const variantIds = variants.map((v) => v.id);

  const variantModifierGroupsRaw =
    variantIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogVariantModifierGroupsTable)
          .where(inArray(catalogVariantModifierGroupsTable.variantId, variantIds))
          .orderBy(
            asc(catalogVariantModifierGroupsTable.position),
            asc(catalogVariantModifierGroupsTable.id),
          );

  const variantModifierGroups: CatalogVariantModifierGroup[] = variantModifierGroupsRaw.map((row) => ({
    id: row.id,
    brandId: row.brandId,
    variantId: row.variantId,
    modifierGroupId: row.modifierGroupId,
    minTotalQuantity: row.minTotalQuantity,
    maxTotalQuantity: row.maxTotalQuantity,
    required: isModifierGroupRequired(row.minTotalQuantity),
    position: row.position,
    lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  }));

  const modifierGroupIds = [...new Set(variantModifierGroups.map((b) => b.modifierGroupId))];

  const modifierGroups: CatalogModifierGroup[] =
    modifierGroupIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogModifierGroupsTable)
            .where(inArray(catalogModifierGroupsTable.id, modifierGroupIds))
            .orderBy(asc(catalogModifierGroupsTable.code), asc(catalogModifierGroupsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          code: row.code,
          name: row.name,
          description: row.description,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          effectiveContentRevision: row.effectiveContentRevision,
          draftContentRevision: row.draftContentRevision,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const modifierGroupOptions: CatalogModifierGroupOption[] =
    modifierGroupIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogModifierGroupOptionsTable)
            .where(inArray(catalogModifierGroupOptionsTable.modifierGroupId, modifierGroupIds))
            .orderBy(
              asc(catalogModifierGroupOptionsTable.position),
              asc(catalogModifierGroupOptionsTable.id),
            )
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          modifierGroupId: row.modifierGroupId,
          modifierOptionId: row.modifierOptionId,
          minQuantity: row.minQuantity,
          maxQuantity: row.maxQuantity,
          defaultQuantity: row.defaultQuantity,
          position: row.position,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          effectiveContentRevision: row.effectiveContentRevision,
          draftContentRevision: row.draftContentRevision,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const modifierOptionIds = [
    ...new Set(modifierGroupOptions.map((o) => o.modifierOptionId)),
  ];

  const modifierOptions: CatalogModifierOption[] =
    modifierOptionIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogModifierOptionsTable)
            .where(inArray(catalogModifierOptionsTable.id, modifierOptionIds))
            .orderBy(asc(catalogModifierOptionsTable.code), asc(catalogModifierOptionsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          code: row.code,
          name: row.name,
          description: row.description,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          effectiveContentRevision: row.effectiveContentRevision,
          draftContentRevision: row.draftContentRevision,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const bundleGroups: CatalogBundleGroup[] =
    variantIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogBundleGroupsTable)
            .where(inArray(catalogBundleGroupsTable.bundleVariantId, variantIds))
            .orderBy(asc(catalogBundleGroupsTable.position), asc(catalogBundleGroupsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          bundleVariantId: row.bundleVariantId,
          parentProductKind: "bundle" as const,
          code: row.code,
          name: row.name,
          minSelections: row.minSelections,
          maxSelections: row.maxSelections,
          position: row.position,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const bundleGroupIds = bundleGroups.map((g) => g.id);

  const bundleGroupOptions: CatalogBundleGroupOption[] =
    bundleGroupIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogBundleGroupOptionsTable)
            .where(inArray(catalogBundleGroupOptionsTable.bundleGroupId, bundleGroupIds))
            .orderBy(
              asc(catalogBundleGroupOptionsTable.position),
              asc(catalogBundleGroupOptionsTable.id),
            )
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          bundleGroupId: row.bundleGroupId,
          componentVariantId: row.componentVariantId,
          componentProductKind: "standard" as const,
          quantity: row.quantity,
          isDefault: row.isDefault,
          position: row.position,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const variantDietaryTags: CatalogDietaryAssignment[] =
    variantIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogVariantDietaryTagsTable)
            .where(inArray(catalogVariantDietaryTagsTable.targetId, variantIds))
            .orderBy(asc(catalogVariantDietaryTagsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          targetType: "variant" as const,
          targetId: row.targetId,
          dietaryTagId: row.dietaryTagId,
          assignedAt: new Date(row.assignedAt),
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const modifierOptionDietaryTags: CatalogDietaryAssignment[] =
    modifierOptionIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogModifierOptionDietaryTagsTable)
            .where(inArray(catalogModifierOptionDietaryTagsTable.targetId, modifierOptionIds))
            .orderBy(asc(catalogModifierOptionDietaryTagsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          targetType: "modifier_option" as const,
          targetId: row.targetId,
          dietaryTagId: row.dietaryTagId,
          assignedAt: new Date(row.assignedAt),
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  const dietaryTagIds = [
    ...new Set([
      ...variantDietaryTags.map((a) => a.dietaryTagId),
      ...modifierOptionDietaryTags.map((a) => a.dietaryTagId),
    ]),
  ];

  const dietaryTags: CatalogDietaryTag[] =
    dietaryTagIds.length === 0
      ? []
      : (
          await context.db
            .select()
            .from(catalogDietaryTagsTable)
            .where(inArray(catalogDietaryTagsTable.id, dietaryTagIds))
            .orderBy(asc(catalogDietaryTagsTable.code), asc(catalogDietaryTagsTable.id))
        ).map((row) => ({
          id: row.id,
          brandId: row.brandId,
          code: row.code,
          name: row.name,
          kind: row.kind as DietaryTagKind,
          lifecycleStatus: row.lifecycleStatus as CatalogLifecycleStatus,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
          retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
        }));

  return {
    product,
    variants,
    modifierGroups,
    modifierOptions,
    modifierGroupOptions,
    variantModifierGroups,
    bundleGroups,
    bundleGroupOptions,
    dietaryTags,
    variantDietaryTags,
    modifierOptionDietaryTags,
  };
}

export async function getCatalogProductGraph(
  context: PersistenceQueryContext,
  input: CatalogReadInput,
): Promise<CatalogProductGraph> {
  assertApplicationRole(context, "getCatalogProductGraph");
  const product = await trustedInternalFindProductById(context, input.productId);
  if (!product) throw new CatalogNotFoundError("product");
  await requireCatalogRead(context, input.actor, product.brandId);
  return loadProductGraph(context, product);
}

/**
 * Authorized graph validation. Always runs full active-graph rules (even for
 * draft products) so admins can check readiness before activation.
 */
export async function validateCatalogProduct(
  context: PersistenceQueryContext,
  input: CatalogReadInput,
): Promise<void> {
  assertApplicationRole(context, "validateCatalogProduct");
  const product = await trustedInternalFindProductById(context, input.productId);
  if (!product) throw new CatalogNotFoundError("product");
  await requireCatalogRead(context, input.actor, product.brandId);
  await assertProductGraphReady(context, product.id);
}

export { validateActiveProductGraph };
