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
import {
  catalogVariantContentRevisionsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
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
import {
  advanceBrandContentRevision,
  assertInPlaceContentMutationAllowed,
  ensurePublicationCandidateBootstrap,
  ensureVariantContentRevision1,
  lockBrandEnvelope,
} from "./revisions";
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
    effectiveContentRevision: row.effectiveContentRevision,
    draftContentRevision: row.draftContentRevision,
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

/**
 * Demote sibling defaults. A sibling that already participates in the content
 * revision store must not be mutated in place: its `isDefault` change is staged
 * as a new draft content revision so publication can switch defaults atomically.
 *
 * Returns whether any revision-tracked sibling changed, so the caller can
 * invalidate reviewed brand expectedContentRevision values.
 */
async function clearOtherDefaults(
  context: PersistenceTransactionContext,
  productId: string,
  keepVariantId: string,
): Promise<{ stagedContentChange: boolean }> {
  const siblings = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(
      and(
        eq(catalogVariantsTable.productId, productId),
        ne(catalogVariantsTable.id, keepVariantId),
        eq(catalogVariantsTable.isDefault, true),
        sql`${catalogVariantsTable.lifecycleStatus} <> 'retired'`,
      ),
    );

  const now = new Date();
  let stagedContentChange = false;

  for (const sibling of siblings) {
    const draftRows = await context.db
      .select()
      .from(catalogVariantContentRevisionsTable)
      .where(
        and(
          eq(catalogVariantContentRevisionsTable.variantId, sibling.id),
          eq(
            catalogVariantContentRevisionsTable.contentRevision,
            sibling.draftContentRevision,
          ),
        ),
      )
      .limit(1);

    if (sibling.effectiveContentRevision == null && !draftRows[0]) {
      await context.db
        .update(catalogVariantsTable)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(catalogVariantsTable.id, sibling.id));
      continue;
    }

    await ensureVariantContentRevision1(context, sibling, now);
    const next = sibling.draftContentRevision + BigInt(1);
    await context.db.insert(catalogVariantContentRevisionsTable).values({
      variantId: sibling.id,
      contentRevision: next,
      brandId: sibling.brandId,
      name: sibling.name,
      description: sibling.description,
      isDefault: false,
      isSelectorVisible: sibling.isSelectorVisible,
      createdAt: now,
    });
    await context.db
      .update(catalogVariantsTable)
      .set({ isDefault: false, draftContentRevision: next, updatedAt: now })
      .where(eq(catalogVariantsTable.id, sibling.id));
    stagedContentChange = true;
  }

  return { stagedContentChange };
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
    await lockBrandEnvelope(context, product.brandId);
    const { stagedContentChange } = await clearOtherDefaults(context, product.id, id);
    if (stagedContentChange) {
      await advanceBrandContentRevision(context, product.brandId, now);
    }
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

  assertInPlaceContentMutationAllowed(existing);

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
    await lockBrandEnvelope(context, existing.brandId);
    const { stagedContentChange } = await clearOtherDefaults(
      context,
      existing.productId,
      existing.id,
    );
    if (stagedContentChange) {
      await advanceBrandContentRevision(context, existing.brandId, new Date());
    }
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
  await lockBrandEnvelope(context, existing.brandId);
  const locked = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, variantId))
    .for("update")
    .limit(1);
  if (!locked[0]) throw new CatalogNotFoundError("variant");
  assertCanTransition(locked[0].lifecycleStatus as CatalogLifecycleStatus, "active");
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

  // Activation stages the variant into the publication candidate only; customer
  // visibility changes exclusively via publishCatalogContentChange.
  await ensurePublicationCandidateBootstrap(context, {
    brandId: existing.brandId,
    ensureRevision1: async () => {
      await ensureVariantContentRevision1(context, existing, stamps.activatedAt);
    },
  });
  await advanceBrandContentRevision(context, existing.brandId, stamps.updatedAt);

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
  await lockBrandEnvelope(context, existing.brandId);
  const locked = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, variantId))
    .for("update")
    .limit(1);
  if (!locked[0]) throw new CatalogNotFoundError("variant");
  assertCanTransition(locked[0].lifecycleStatus as CatalogLifecycleStatus, "retired");
  const stamps = retirementTimestamps(locked[0].lifecycleStatus as CatalogLifecycleStatus, locked[0].activatedAt);
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

  // Retirement stages removal; the published effective revision keeps serving
  // customers until publishCatalogContentChange.
  await ensurePublicationCandidateBootstrap(context, {
    brandId: existing.brandId,
    ensureRevision1: async () => {
      await ensureVariantContentRevision1(context, existing, stamps.retiredAt);
    },
  });

  // The primary `isDefault` reset above is admin-graph hygiene. When the variant
  // was already published as default, stage the demotion as a draft revision so
  // publication can switch defaults atomically.
  if (existing.effectiveContentRevision != null && existing.isDefault) {
    const next = existing.draftContentRevision + BigInt(1);
    await context.db.insert(catalogVariantContentRevisionsTable).values({
      variantId,
      contentRevision: next,
      brandId: existing.brandId,
      name: existing.name,
      description: existing.description,
      isDefault: false,
      isSelectorVisible: existing.isSelectorVisible,
      createdAt: stamps.retiredAt,
    });
    await context.db
      .update(catalogVariantsTable)
      .set({ draftContentRevision: next, updatedAt: stamps.updatedAt })
      .where(eq(catalogVariantsTable.id, variantId));
  }

  await advanceBrandContentRevision(context, existing.brandId, stamps.updatedAt);

  await revalidateProductsForVariant(context, variantId);

  const updated = await findVariantById(context, variantId);
  if (!updated) throw new CatalogNotFoundError("variant");
  return updated;
}
