/**
 * Product commands (IMP-012).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  CATALOG_DESCRIPTION_MAX,
  CATALOG_NAME_MAX,
  isProductKind,
  type CatalogLifecycleStatus,
  type ProductKind,
} from "../../shared/catalog";
import { catalogProductsTable } from "../../platform/database/schema/catalog";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
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
import {
  advanceBrandContentRevision,
  assertInPlaceContentMutationAllowed,
  ensureProductContentRevision1,
  ensurePublicationCandidateBootstrap,
  lockBrandEnvelope,
} from "./revisions";
import type {
  CatalogProduct,
  CreateProductInput,
  ProductLifecycleInput,
  UpdateProductInput,
} from "./types";
import {
  assertProductGraphReady,
  revalidateProductsForProduct,
  validateActiveProductGraph,
} from "./validation";
import { MenuInvalidStateError } from "./menu/errors";
import { assertNoActiveEntriesForProduct } from "./menu/validation";

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

export async function findProductById(
  context: PersistenceQueryContext,
  productId: string,
): Promise<CatalogProduct | null> {
  assertApplicationRole(context, "findProductById");
  const id = assertUuid(productId, "productId");
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToProduct(row) : null;
}

export async function createProduct(
  context: PersistenceTransactionContext,
  input: CreateProductInput,
): Promise<CatalogProduct> {
  assertTransactionContext(context, "createProduct");
  await requireCatalogManage(context, input.actor, input.brandId);

  if (!isProductKind(input.productKind)) {
    throw new CatalogValidationError({ message: "productKind must be standard or bundle." });
  }

  const code = normalizeCatalogCode(input.code, "code");
  const name = normalizeName(input.name, "name", CATALOG_NAME_MAX.product);
  const description = normalizeOptionalDescription(
    input.description,
    "description",
    CATALOG_DESCRIPTION_MAX.product,
  );
  const brandId = assertUuid(input.brandId, "brandId");
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(catalogProductsTable).values({
      id,
      brandId,
      code,
      name,
      description,
      productKind: input.productKind,
      lifecycleStatus: "draft",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CatalogConflictError({ message: "Product code already exists for this brand." });
    }
    throw error;
  }

  const created = await findProductById(context, id);
  if (!created) {
    throw new CatalogValidationError({ message: "Product create failed to persist." });
  }
  return created;
}

export async function updateProduct(
  context: PersistenceTransactionContext,
  input: UpdateProductInput,
): Promise<CatalogProduct> {
  assertTransactionContext(context, "updateProduct");
  const productId = assertUuid(input.productId, "productId");
  const existing = await findProductById(context, productId);
  if (!existing) throw new CatalogNotFoundError("product");
  if (existing.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot update a retired product." });
  }

  await requireCatalogManage(context, input.actor, existing.brandId);

  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({ message: "updateProduct requires name and/or description." });
  }

  assertInPlaceContentMutationAllowed(existing);

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.product)
      : existing.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.product,
        )
      : existing.description;

  await context.db
    .update(catalogProductsTable)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(catalogProductsTable.id, productId));

  const updated = await findProductById(context, productId);
  if (!updated) throw new CatalogNotFoundError("product");
  return updated;
}

export async function activateProduct(
  context: PersistenceTransactionContext,
  input: ProductLifecycleInput,
): Promise<CatalogProduct> {
  assertTransactionContext(context, "activateProduct");
  const productId = assertUuid(input.productId, "productId");
  const existing = await findProductById(context, productId);
  if (!existing) throw new CatalogNotFoundError("product");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "active");
  await assertProductGraphReady(context, productId);

  // Brand envelope before entity — same order as publishCatalogContentChange.
  await lockBrandEnvelope(context, existing.brandId);
  const locked = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .for("update")
    .limit(1);
  if (!locked[0]) throw new CatalogNotFoundError("product");
  assertCanTransition(
    locked[0].lifecycleStatus as "draft" | "active" | "retired",
    "active",
  );

  const stamps = activationTimestamps();
  await context.db
    .update(catalogProductsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogProductsTable.id, productId));

  // Activation stages the product into the publication candidate only; customer
  // visibility changes exclusively via publishCatalogContentChange.
  await ensurePublicationCandidateBootstrap(context, {
    brandId: existing.brandId,
    ensureRevision1: async () => {
      await ensureProductContentRevision1(context, existing, stamps.activatedAt);
    },
  });
  await advanceBrandContentRevision(context, existing.brandId, stamps.updatedAt);

  await validateActiveProductGraph(context, productId);

  const updated = await findProductById(context, productId);
  if (!updated) throw new CatalogNotFoundError("product");
  return updated;
}

export async function retireProduct(
  context: PersistenceTransactionContext,
  input: ProductLifecycleInput,
): Promise<CatalogProduct> {
  assertTransactionContext(context, "retireProduct");
  const productId = assertUuid(input.productId, "productId");
  const existing = await findProductById(context, productId);
  if (!existing) throw new CatalogNotFoundError("product");
  await requireCatalogManage(context, input.actor, existing.brandId);

  assertCanTransition(existing.lifecycleStatus, "retired");

  // IMP-013: active Menu Entry references block Product retirement.
  try {
    await assertNoActiveEntriesForProduct(context, productId);
  } catch (error) {
    if (error instanceof MenuInvalidStateError) {
      throw new CatalogInvalidStateError({ message: error.message });
    }
    throw error;
  }

  await lockBrandEnvelope(context, existing.brandId);
  const locked = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .for("update")
    .limit(1);
  if (!locked[0]) throw new CatalogNotFoundError("product");
  assertCanTransition(locked[0].lifecycleStatus as CatalogLifecycleStatus, "retired");

  const stamps = retirementTimestamps(locked[0].lifecycleStatus as CatalogLifecycleStatus, locked[0].activatedAt);
  await context.db
    .update(catalogProductsTable)
    .set({
      lifecycleStatus: stamps.lifecycleStatus,
      activatedAt: stamps.activatedAt,
      retiredAt: stamps.retiredAt,
      updatedAt: stamps.updatedAt,
    })
    .where(eq(catalogProductsTable.id, productId));

  // Retirement stages removal; the previously published effective revision keeps
  // serving customers until publishCatalogContentChange.
  await ensurePublicationCandidateBootstrap(context, {
    brandId: existing.brandId,
    ensureRevision1: async () => {
      await ensureProductContentRevision1(context, existing, stamps.retiredAt);
    },
  });
  await advanceBrandContentRevision(context, existing.brandId, stamps.updatedAt);

  // Reject retirement when this product's variants are still required by an
  // active bundle (or would leave any dependent active graph invalid).
  await revalidateProductsForProduct(context, productId);

  const updated = await findProductById(context, productId);
  if (!updated) throw new CatalogNotFoundError("product");
  return updated;
}
