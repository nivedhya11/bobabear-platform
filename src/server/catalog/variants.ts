/**
 * Variant commands (IMP-012).
 */
import { randomUUID } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";

import {
  CATALOG_DESCRIPTION_MAX,
  CATALOG_NAME_MAX,
  type CatalogLifecycleStatus,
  type ProductKind,
} from "../../shared/catalog";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertTransactionContext,
  isUniqueViolation,
  normalizeCatalogCode,
  normalizeName,
  normalizeOptionalDescription,
} from "./assert-role";
import { requireCatalogManage } from "./authorize-catalog";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
import {
  activationTimestamps,
  assertCanTransition,
  assertUuid,
  retirementTimestamps,
} from "./lifecycle";
import { findProductById } from "./products";
import type {
  CatalogVariant,
  CreateVariantInput,
  UpdateVariantInput,
  VariantLifecycleInput,
} from "./types";
import { revalidateProductsForVariant, validateActiveProductGraph } from "./validation";

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
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

export async function findVariantById(
  context: PersistenceQueryContext,
  variantId: string,
): Promise<CatalogVariant | null> {
  const id = assertUuid(variantId, "variantId");
  const rows = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToVariant(row) : null;
}

async function clearOtherDefaults(
  context: PersistenceTransactionContext,
  productId: string,
  keepVariantId: string,
): Promise<void> {
  await context.db
    .update(catalogVariantsTable)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(catalogVariantsTable.productId, productId),
        ne(catalogVariantsTable.id, keepVariantId),
        eq(catalogVariantsTable.isDefault, true),
        sql`${catalogVariantsTable.lifecycleStatus} <> 'retired'`,
      ),
    );
}

export async function createVariant(
  context: PersistenceTransactionContext,
  input: CreateVariantInput,
): Promise<CatalogVariant> {
  assertTransactionContext(context, "createVariant");
  const productId = assertUuid(input.productId, "productId");
  const product = await findProductById(context, productId);
  if (!product) throw new CatalogNotFoundError("product");
  if (product.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot add a variant to a retired product." });
  }
  await requireCatalogManage(context, input.actor, product.brandId);

  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.variant);
  const description = normalizeOptionalDescription(
    input.description,
    "description",
    CATALOG_DESCRIPTION_MAX.variant,
  );
  const isDefault = input.isDefault ?? false;
  const isSelectorVisible = input.isSelectorVisible ?? true;
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogVariantsTable).values({
      id,
      brandId: product.brandId,
      productId: product.id,
      productKind: product.productKind,
      code,
      name,
      description,
      isDefault,
      isSelectorVisible,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({
        message: "Variant code already exists for this product, or default uniqueness conflict.",
      });
    }
    throw error;
  }

  if (isDefault) {
    await clearOtherDefaults(context, product.id, id);
  }

  await validateActiveProductGraph(context, product.id);

  const created = await findVariantById(context, id);
  if (!created) {
    throw new CatalogValidationError({ message: "Variant create failed to persist." });
  }
  return created;
}

export async function updateVariant(
  context: PersistenceTransactionContext,
  input: UpdateVariantInput,
): Promise<CatalogVariant> {
  assertTransactionContext(context, "updateVariant");
  const variantId = assertUuid(input.variantId, "variantId");
  const existing = await findVariantById(context, variantId);
  if (!existing) throw new CatalogNotFoundError("variant");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired variant." });
  }
  await requireCatalogManage(context, input.actor, existing.brandId);

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.isDefault === undefined &&
    input.isSelectorVisible === undefined
  ) {
    throw new CatalogValidationError({
      message: "updateVariant requires at least one mutable field.",
    });
  }

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.variant)
      : existing.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.variant,
        )
      : existing.description;
  const isDefault = input.isDefault ?? existing.isDefault;
  const isSelectorVisible = input.isSelectorVisible ?? existing.isSelectorVisible;

  if (isDefault) {
    await clearOtherDefaults(context, existing.productId, existing.id);
  }

  try {
    await context.db
      .update(catalogVariantsTable)
      .set({
        name,
        description,
        isDefault,
        isSelectorVisible,
        updatedAt: new Date(),
      })
      .where(eq(catalogVariantsTable.id, variantId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({ message: "Variant default uniqueness conflict." });
    }
    throw error;
  }

  await validateActiveProductGraph(context, existing.productId);

  const updated = await findVariantById(context, variantId);
  if (!updated) throw new CatalogNotFoundError("variant");
  return updated;
}

export async function activateVariant(
  context: PersistenceTransactionContext,
  input: VariantLifecycleInput,
): Promise<CatalogVariant> {
  assertTransactionContext(context, "activateVariant");
  const variantId = assertUuid(input.variantId, "variantId");
  const existing = await findVariantById(context, variantId);
  if (!existing) throw new CatalogNotFoundError("variant");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  const stamps = activationTimestamps();
  await context.db
    .update(catalogVariantsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogVariantsTable.id, variantId));

  await revalidateProductsForVariant(context, variantId);

  const updated = await findVariantById(context, variantId);
  if (!updated) throw new CatalogNotFoundError("variant");
  return updated;
}

export async function retireVariant(
  context: PersistenceTransactionContext,
  input: VariantLifecycleInput,
): Promise<CatalogVariant> {
  assertTransactionContext(context, "retireVariant");
  const variantId = assertUuid(input.variantId, "variantId");
  const existing = await findVariantById(context, variantId);
  if (!existing) throw new CatalogNotFoundError("variant");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");
  const stamps = retirementTimestamps(existing.lifecycleStatus, existing.activatedAt);
  await context.db
    .update(catalogVariantsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
      isDefault: false,
    })
    .where(eq(catalogVariantsTable.id, variantId));

  await revalidateProductsForVariant(context, variantId);

  const updated = await findVariantById(context, variantId);
  if (!updated) throw new CatalogNotFoundError("variant");
  return updated;
}
