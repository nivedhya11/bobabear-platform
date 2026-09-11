/**
 * Explicit revision authority establishment for ACTIVE bootstrap/import inserts.
 * Do not leave ACTIVE rows without effective content revision pointers.
 */
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import {
  ensureBrandContentRevision,
  ensureModifierGroupContentRevision1,
  ensureModifierGroupOptionContentRevision1,
  ensureModifierOptionContentRevision1,
  ensureProductContentRevision1,
  ensureVariantContentRevision1,
  ensureVariantModifierGroupContentRevision1,
} from "./revisions";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import { eq } from "drizzle-orm";

export async function bootstrapActiveProductRevision(
  context: PersistenceTransactionContext,
  product: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveProductRevision");
  await ensureBrandContentRevision(context, product.brandId, at);
  await ensureProductContentRevision1(context, product, at);
  await context.db
    .update(catalogProductsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogProductsTable.id, product.id));
}

export async function bootstrapActiveVariantRevision(
  context: PersistenceTransactionContext,
  variant: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveVariantRevision");
  await ensureBrandContentRevision(context, variant.brandId, at);
  await ensureVariantContentRevision1(context, variant, at);
  await context.db
    .update(catalogVariantsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogVariantsTable.id, variant.id));
}

export async function bootstrapActiveModifierGroupRevision(
  context: PersistenceTransactionContext,
  group: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveModifierGroupRevision");
  await ensureBrandContentRevision(context, group.brandId, at);
  await ensureModifierGroupContentRevision1(context, group, at);
  await context.db
    .update(catalogModifierGroupsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogModifierGroupsTable.id, group.id));
}

export async function bootstrapActiveModifierOptionRevision(
  context: PersistenceTransactionContext,
  option: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveModifierOptionRevision");
  await ensureBrandContentRevision(context, option.brandId, at);
  await ensureModifierOptionContentRevision1(context, option, at);
  await context.db
    .update(catalogModifierOptionsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogModifierOptionsTable.id, option.id));
}

export async function bootstrapActiveModifierGroupOptionRevision(
  context: PersistenceTransactionContext,
  binding: {
    id: string;
    brandId: string;
    minQuantity: number;
    maxQuantity: number;
    defaultQuantity: number;
    position: number;
    lifecycleStatus: string;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveModifierGroupOptionRevision");
  await ensureBrandContentRevision(context, binding.brandId, at);
  await ensureModifierGroupOptionContentRevision1(context, binding, at);
  await context.db
    .update(catalogModifierGroupOptionsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogModifierGroupOptionsTable.id, binding.id));
}

export async function bootstrapActiveVariantModifierGroupRevision(
  context: PersistenceTransactionContext,
  binding: {
    id: string;
    brandId: string;
    minTotalQuantity: number;
    maxTotalQuantity: number;
    position: number;
    lifecycleStatus: string;
  },
  at: Date,
): Promise<void> {
  assertTransactionContext(context, "bootstrapActiveVariantModifierGroupRevision");
  await ensureBrandContentRevision(context, binding.brandId, at);
  await ensureVariantModifierGroupContentRevision1(context, binding, at);
  await context.db
    .update(catalogVariantModifierGroupsTable)
    .set({
      draftContentRevision: BigInt(1),
      effectiveContentRevision: BigInt(1),
      updatedAt: at,
    })
    .where(eq(catalogVariantModifierGroupsTable.id, binding.id));
}
