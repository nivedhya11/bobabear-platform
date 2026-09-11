/**
 * Catalog content draft save + publishCatalogContentChange (IMP-036F).
 *
 * Primary rows mirror the latest draft for admin LWW display of name/etc.
 * Customer projection reads effective content revision rows only.
 *
 * Every material draft save advances the Brand content envelope so that a
 * previously reviewed `expectedContentRevision` can never publish content the
 * reviewer did not see. `publishCatalogContentChange` locks the whole
 * product-rooted envelope before validation, applies effective pointers by
 * entity lifecycle (active publishes the draft, retired clears customer
 * visibility, draft stays unpublished), and is a no-op — no envelope bump, no
 * audit event, no pointer switch — when nothing in the envelope would change.
 */
import { and, eq, inArray, ne } from "drizzle-orm";

import {
  CATALOG_DESCRIPTION_MAX,
  CATALOG_NAME_MAX,
  CATALOG_QUANTITY_MAX,
} from "../../shared/catalog";
import {
  catalogContentRevisionsTable,
  catalogModifierGroupContentRevisionsTable,
  catalogModifierGroupOptionContentRevisionsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionContentRevisionsTable,
  catalogModifierOptionsTable,
  catalogProductContentRevisionsTable,
  catalogProductsTable,
  catalogVariantContentRevisionsTable,
  catalogVariantModifierGroupContentRevisionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceTransactionContext } from "../persistence/types";
import {
  assertNonNegativeInt,
  assertQuantityInRange,
  assertTransactionContext,
  normalizeName,
  normalizeOptionalDescription,
} from "./assert-role";
import { insertCatalogMutationAuditEvent } from "./audit";
import { requireCatalogManage } from "./authorize-catalog";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
import { assertUuid } from "./lifecycle";
import {
  advanceBrandContentRevision,
  assertExpectedContentRevision,
  ensureBrandContentRevision,
  ensureModifierGroupContentRevision1,
  ensureModifierGroupOptionContentRevision1,
  ensureModifierOptionContentRevision1,
  ensureProductContentRevision1,
  ensureVariantContentRevision1,
  ensureVariantModifierGroupContentRevision1,
  lockBrandEnvelope,
  parseExpectedContentRevision,
} from "./revisions";
import { assertProductGraphReady } from "./validation";

function actorId(actor: unknown): string {
  return requireWorkforcePrincipal(actor).workforceUserId;
}

async function lockProductForDraft(
  context: PersistenceTransactionContext,
  productId: string,
) {
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("product");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot draft content for a retired product." });
  }
  return row;
}

async function lockVariantForDraft(
  context: PersistenceTransactionContext,
  variantId: string,
) {
  const rows = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, variantId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("variant");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({ message: "Cannot draft content for a retired variant." });
  }
  return row;
}

function assertDraftCas(current: bigint, expected: bigint, entityLabel: string): void {
  if (current !== expected) {
    throw new CatalogConflictError({
      message: `${entityLabel} draftContentRevision does not match expectedContentRevision; no draft write.`,
    });
  }
}

/**
 * Revision-safe clearing of sibling default variants.
 *
 * Clearing `isDefault` on the primary row alone would keep the customer reading
 * the old default from the sibling's effective revision until publish, so each
 * cleared sibling also gets a new draft content revision carrying
 * `isDefault: false`. Must run before the target variant claims the default so
 * the partial unique index on one non-retired default per product holds.
 */
async function clearSiblingVariantDefaults(
  context: PersistenceTransactionContext,
  input: Readonly<{
    productId: string;
    keepVariantId: string;
    actorWorkforceUserId: string;
    at: Date;
  }>,
): Promise<void> {
  const siblings = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(
      and(
        eq(catalogVariantsTable.productId, input.productId),
        ne(catalogVariantsTable.id, input.keepVariantId),
      ),
    )
    .for("update");

  for (const sibling of siblings) {
    if (!sibling.isDefault || sibling.lifecycleStatus === "retired") continue;

    await ensureVariantContentRevision1(context, sibling, input.at);
    const next = sibling.draftContentRevision + BigInt(1);

    await context.db.insert(catalogVariantContentRevisionsTable).values({
      variantId: sibling.id,
      contentRevision: next,
      brandId: sibling.brandId,
      name: sibling.name,
      description: sibling.description,
      isDefault: false,
      isSelectorVisible: sibling.isSelectorVisible,
      createdAt: input.at,
    });

    await context.db
      .update(catalogVariantsTable)
      .set({ isDefault: false, draftContentRevision: next, updatedAt: input.at })
      .where(eq(catalogVariantsTable.id, sibling.id));

    await insertCatalogMutationAuditEvent(context, {
      actorWorkforceUserId: input.actorWorkforceUserId,
      action: "catalog.content_draft_saved",
      brandId: sibling.brandId,
      targetType: "variant",
      targetId: sibling.id,
      previousContentRevision: sibling.draftContentRevision,
      newContentRevision: next,
      metadata: { defaultVariantCleared: true },
    });
  }
}

export type SaveProductContentDraftInput = Readonly<{
  actor: unknown;
  productId: string;
  expectedContentRevision: bigint | number | string;
  name?: string;
  description?: string | null;
}>;

export type SaveProductContentDraftResult = Readonly<{
  productId: string;
  draftContentRevision: bigint;
  name: string;
  description: string | null;
}>;

export async function saveProductContentDraft(
  context: PersistenceTransactionContext,
  input: SaveProductContentDraftInput,
): Promise<SaveProductContentDraftResult> {
  assertTransactionContext(context, "saveProductContentDraft");
  const productId = assertUuid(input.productId, "productId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const row = await lockProductForDraft(context, productId);
  await requireCatalogManage(context, input.actor, row.brandId);

  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({
      message: "saveProductContentDraft requires name and/or description.",
    });
  }

  assertDraftCas(row.draftContentRevision, expected, "Product");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureProductContentRevision1(context, row);

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.product)
      : row.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.product,
        )
      : row.description;
  const next = expected + BigInt(1);
  const now = new Date();

  await context.db.insert(catalogProductContentRevisionsTable).values({
    productId,
    contentRevision: next,
    brandId: row.brandId,
    name,
    description,
    createdAt: now,
  });

  // Mirror latest draft onto primary for admin LWW reads; effective pointer unchanged.
  await context.db
    .update(catalogProductsTable)
    .set({
      name,
      description,
      draftContentRevision: next,
      updatedAt: now,
    })
    .where(eq(catalogProductsTable.id, productId));

  // Material draft change invalidates any previously reviewed Brand envelope.
  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "product",
    targetId: productId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return { productId, draftContentRevision: next, name, description };
}

export type SaveVariantContentDraftInput = Readonly<{
  actor: unknown;
  variantId: string;
  expectedContentRevision: bigint | number | string;
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isSelectorVisible?: boolean;
}>;

export type SaveVariantContentDraftResult = Readonly<{
  variantId: string;
  draftContentRevision: bigint;
  name: string;
  description: string | null;
  isDefault: boolean;
  isSelectorVisible: boolean;
}>;

export async function saveVariantContentDraft(
  context: PersistenceTransactionContext,
  input: SaveVariantContentDraftInput,
): Promise<SaveVariantContentDraftResult> {
  assertTransactionContext(context, "saveVariantContentDraft");
  const variantId = assertUuid(input.variantId, "variantId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const row = await lockVariantForDraft(context, variantId);
  await requireCatalogManage(context, input.actor, row.brandId);

  if (
    input.name === undefined &&
    input.description === undefined &&
    input.isDefault === undefined &&
    input.isSelectorVisible === undefined
  ) {
    throw new CatalogValidationError({
      message: "saveVariantContentDraft requires at least one content field.",
    });
  }

  assertDraftCas(row.draftContentRevision, expected, "Variant");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureVariantContentRevision1(context, row);

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.variant)
      : row.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.variant,
        )
      : row.description;
  const isDefault = input.isDefault ?? row.isDefault;
  const isSelectorVisible = input.isSelectorVisible ?? row.isSelectorVisible;
  const next = expected + BigInt(1);
  const now = new Date();

  if (isDefault) {
    await clearSiblingVariantDefaults(context, {
      productId: row.productId,
      keepVariantId: variantId,
      actorWorkforceUserId: actorId(input.actor),
      at: now,
    });
  }

  await context.db.insert(catalogVariantContentRevisionsTable).values({
    variantId,
    contentRevision: next,
    brandId: row.brandId,
    name,
    description,
    isDefault,
    isSelectorVisible,
    createdAt: now,
  });

  await context.db
    .update(catalogVariantsTable)
    .set({
      name,
      description,
      isDefault,
      isSelectorVisible,
      draftContentRevision: next,
      updatedAt: now,
    })
    .where(eq(catalogVariantsTable.id, variantId));

  // One advance covers the target variant plus any sibling default clears.
  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "variant",
    targetId: variantId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return {
    variantId,
    draftContentRevision: next,
    name,
    description,
    isDefault,
    isSelectorVisible,
  };
}

export type SaveModifierGroupContentDraftInput = Readonly<{
  actor: unknown;
  modifierGroupId: string;
  expectedContentRevision: bigint | number | string;
  name?: string;
  description?: string | null;
}>;

export async function saveModifierGroupContentDraft(
  context: PersistenceTransactionContext,
  input: SaveModifierGroupContentDraftInput,
): Promise<{ modifierGroupId: string; draftContentRevision: bigint; name: string; description: string | null }> {
  assertTransactionContext(context, "saveModifierGroupContentDraft");
  const modifierGroupId = assertUuid(input.modifierGroupId, "modifierGroupId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const rows = await context.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(eq(catalogModifierGroupsTable.id, modifierGroupId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("modifier_group");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({
      message: "Cannot draft content for a retired modifier group.",
    });
  }
  await requireCatalogManage(context, input.actor, row.brandId);
  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({
      message: "saveModifierGroupContentDraft requires name and/or description.",
    });
  }
  assertDraftCas(row.draftContentRevision, expected, "ModifierGroup");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureModifierGroupContentRevision1(context, row);

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierGroup)
      : row.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.modifierGroup,
        )
      : row.description;
  const next = expected + BigInt(1);
  const now = new Date();

  await context.db.insert(catalogModifierGroupContentRevisionsTable).values({
    modifierGroupId,
    contentRevision: next,
    brandId: row.brandId,
    name,
    description,
    createdAt: now,
  });
  await context.db
    .update(catalogModifierGroupsTable)
    .set({ name, description, draftContentRevision: next, updatedAt: now })
    .where(eq(catalogModifierGroupsTable.id, modifierGroupId));

  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "modifier_group",
    targetId: modifierGroupId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return { modifierGroupId, draftContentRevision: next, name, description };
}

export type SaveModifierOptionContentDraftInput = Readonly<{
  actor: unknown;
  modifierOptionId: string;
  expectedContentRevision: bigint | number | string;
  name?: string;
  description?: string | null;
}>;

export async function saveModifierOptionContentDraft(
  context: PersistenceTransactionContext,
  input: SaveModifierOptionContentDraftInput,
): Promise<{ modifierOptionId: string; draftContentRevision: bigint; name: string; description: string | null }> {
  assertTransactionContext(context, "saveModifierOptionContentDraft");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const rows = await context.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(eq(catalogModifierOptionsTable.id, modifierOptionId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("modifier_option");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({
      message: "Cannot draft content for a retired modifier option.",
    });
  }
  await requireCatalogManage(context, input.actor, row.brandId);
  if (input.name === undefined && input.description === undefined) {
    throw new CatalogValidationError({
      message: "saveModifierOptionContentDraft requires name and/or description.",
    });
  }
  assertDraftCas(row.draftContentRevision, expected, "ModifierOption");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureModifierOptionContentRevision1(context, row);

  const name =
    input.name !== undefined
      ? normalizeName(input.name, "name", CATALOG_NAME_MAX.modifierOption)
      : row.name;
  const description =
    input.description !== undefined
      ? normalizeOptionalDescription(
          input.description,
          "description",
          CATALOG_DESCRIPTION_MAX.modifierOption,
        )
      : row.description;
  const next = expected + BigInt(1);
  const now = new Date();

  await context.db.insert(catalogModifierOptionContentRevisionsTable).values({
    modifierOptionId,
    contentRevision: next,
    brandId: row.brandId,
    name,
    description,
    createdAt: now,
  });
  await context.db
    .update(catalogModifierOptionsTable)
    .set({ name, description, draftContentRevision: next, updatedAt: now })
    .where(eq(catalogModifierOptionsTable.id, modifierOptionId));

  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "modifier_option",
    targetId: modifierOptionId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return { modifierOptionId, draftContentRevision: next, name, description };
}

export type SaveModifierGroupOptionContentDraftInput = Readonly<{
  actor: unknown;
  modifierGroupOptionId: string;
  expectedContentRevision: bigint | number | string;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  position?: number;
}>;

export async function saveModifierGroupOptionContentDraft(
  context: PersistenceTransactionContext,
  input: SaveModifierGroupOptionContentDraftInput,
): Promise<{
  modifierGroupOptionId: string;
  draftContentRevision: bigint;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  position: number;
}> {
  assertTransactionContext(context, "saveModifierGroupOptionContentDraft");
  const bindingId = assertUuid(input.modifierGroupOptionId, "modifierGroupOptionId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const rows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(eq(catalogModifierGroupOptionsTable.id, bindingId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("modifier_group_option");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({
      message: "Cannot draft content for a retired modifier group option binding.",
    });
  }
  await requireCatalogManage(context, input.actor, row.brandId);

  if (
    input.minQuantity === undefined &&
    input.maxQuantity === undefined &&
    input.defaultQuantity === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "saveModifierGroupOptionContentDraft requires at least one binding field.",
    });
  }

  assertDraftCas(row.draftContentRevision, expected, "modifierGroupOption");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureModifierGroupOptionContentRevision1(context, row);

  const minQuantity =
    input.minQuantity !== undefined
      ? assertNonNegativeInt(input.minQuantity, "minQuantity")
      : row.minQuantity;
  const maxQuantity =
    input.maxQuantity !== undefined
      ? assertQuantityInRange(input.maxQuantity, "maxQuantity", 1, CATALOG_QUANTITY_MAX)
      : row.maxQuantity;
  const defaultQuantity =
    input.defaultQuantity !== undefined
      ? assertNonNegativeInt(input.defaultQuantity, "defaultQuantity")
      : row.defaultQuantity;
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : row.position;
  if (minQuantity > maxQuantity) {
    throw new CatalogValidationError({ message: "minQuantity must be <= maxQuantity." });
  }
  if (defaultQuantity < minQuantity || defaultQuantity > maxQuantity) {
    throw new CatalogValidationError({
      message: "defaultQuantity must be within minQuantity..maxQuantity.",
    });
  }

  const next = expected + BigInt(1);
  const now = new Date();
  await context.db.insert(catalogModifierGroupOptionContentRevisionsTable).values({
    bindingId,
    contentRevision: next,
    brandId: row.brandId,
    minQuantity,
    maxQuantity,
    defaultQuantity,
    position,
    lifecycleStatus: row.lifecycleStatus,
    createdAt: now,
  });
  await context.db
    .update(catalogModifierGroupOptionsTable)
    .set({
      minQuantity,
      maxQuantity,
      defaultQuantity,
      position,
      draftContentRevision: next,
      updatedAt: now,
    })
    .where(eq(catalogModifierGroupOptionsTable.id, bindingId));

  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "modifier_group_option",
    targetId: bindingId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return {
    modifierGroupOptionId: bindingId,
    draftContentRevision: next,
    minQuantity,
    maxQuantity,
    defaultQuantity,
    position,
  };
}

export type SaveVariantModifierGroupContentDraftInput = Readonly<{
  actor: unknown;
  variantModifierGroupId: string;
  expectedContentRevision: bigint | number | string;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  position?: number;
}>;

export async function saveVariantModifierGroupContentDraft(
  context: PersistenceTransactionContext,
  input: SaveVariantModifierGroupContentDraftInput,
): Promise<{
  variantModifierGroupId: string;
  draftContentRevision: bigint;
  minTotalQuantity: number;
  maxTotalQuantity: number;
  position: number;
}> {
  assertTransactionContext(context, "saveVariantModifierGroupContentDraft");
  const bindingId = assertUuid(input.variantModifierGroupId, "variantModifierGroupId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  const rows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(eq(catalogVariantModifierGroupsTable.id, bindingId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new CatalogNotFoundError("variant_modifier_group");
  if (row.lifecycleStatus === "retired") {
    throw new CatalogInvalidStateError({
      message: "Cannot draft content for a retired variant modifier group binding.",
    });
  }
  await requireCatalogManage(context, input.actor, row.brandId);

  if (
    input.minTotalQuantity === undefined &&
    input.maxTotalQuantity === undefined &&
    input.position === undefined
  ) {
    throw new CatalogValidationError({
      message: "saveVariantModifierGroupContentDraft requires at least one binding field.",
    });
  }

  assertDraftCas(row.draftContentRevision, expected, "variantModifierGroup");
  await ensureBrandContentRevision(context, row.brandId);
  await ensureVariantModifierGroupContentRevision1(context, row);

  const minTotalQuantity =
    input.minTotalQuantity !== undefined
      ? assertNonNegativeInt(input.minTotalQuantity, "minTotalQuantity")
      : row.minTotalQuantity;
  const maxTotalQuantity =
    input.maxTotalQuantity !== undefined
      ? assertQuantityInRange(input.maxTotalQuantity, "maxTotalQuantity", 1, CATALOG_QUANTITY_MAX)
      : row.maxTotalQuantity;
  const position =
    input.position !== undefined
      ? assertNonNegativeInt(input.position, "position")
      : row.position;
  if (minTotalQuantity > maxTotalQuantity) {
    throw new CatalogValidationError({
      message: "minTotalQuantity must be <= maxTotalQuantity.",
    });
  }

  const next = expected + BigInt(1);
  const now = new Date();
  await context.db.insert(catalogVariantModifierGroupContentRevisionsTable).values({
    bindingId,
    contentRevision: next,
    brandId: row.brandId,
    minTotalQuantity,
    maxTotalQuantity,
    position,
    lifecycleStatus: row.lifecycleStatus,
    createdAt: now,
  });
  await context.db
    .update(catalogVariantModifierGroupsTable)
    .set({
      minTotalQuantity,
      maxTotalQuantity,
      position,
      draftContentRevision: next,
      updatedAt: now,
    })
    .where(eq(catalogVariantModifierGroupsTable.id, bindingId));

  await advanceBrandContentRevision(context, row.brandId, now);

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_draft_saved",
    brandId: row.brandId,
    targetType: "variant_modifier_group",
    targetId: bindingId,
    previousContentRevision: expected,
    newContentRevision: next,
  });

  return {
    variantModifierGroupId: bindingId,
    draftContentRevision: next,
    minTotalQuantity,
    maxTotalQuantity,
    position,
  };
}

export type ValidateCatalogPublicationInput = Readonly<{
  actor: unknown;
  brandId: string;
  productId: string;
}>;

export async function validateCatalogPublication(
  context: PersistenceTransactionContext,
  input: ValidateCatalogPublicationInput,
): Promise<{ ok: true }> {
  assertTransactionContext(context, "validateCatalogPublication");
  const brandId = assertUuid(input.brandId, "brandId");
  const productId = assertUuid(input.productId, "productId");
  await requireCatalogManage(context, input.actor, brandId);

  const products = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .limit(1);
  const product = products[0];
  if (!product || product.brandId !== brandId) {
    throw new CatalogNotFoundError("product");
  }

  // Graph readiness uses primary rows (admin draft mirror) — same fields that
  // would become effective after publish.
  await assertProductGraphReady(context, productId);
  return { ok: true };
}

export type PublishCatalogContentChangeInput = Readonly<{
  actor: unknown;
  brandId: string;
  expectedContentRevision: bigint | number | string;
  productId: string;
}>;

export type PublishCatalogContentChangeResult = Readonly<{
  changed: boolean;
  contentRevision: bigint;
  previousContentRevision: bigint;
  productId: string;
  brandId: string;
}>;

/** Pointer fields every publishable primary row exposes. */
type PublicationEntity = Readonly<{
  id: string;
  lifecycleStatus: string;
  draftContentRevision: bigint;
  effectiveContentRevision: bigint | null;
}>;

/**
 * Effective pointer this publication would install:
 * `bigint` publishes the draft, `null` withdraws customer visibility, and
 * `undefined` means the entity is still draft-only and must not be published.
 */
function plannedEffectiveContentRevision(
  entity: PublicationEntity,
): bigint | null | undefined {
  if (entity.lifecycleStatus === "retired") return null;
  if (entity.lifecycleStatus === "active") return entity.draftContentRevision;
  return undefined;
}

function hasMaterialEffectiveDifference(entity: PublicationEntity): boolean {
  const planned = plannedEffectiveContentRevision(entity);
  if (planned === undefined) return false;
  return planned !== entity.effectiveContentRevision;
}

/**
 * Atomic publication of the product-rooted CONTENT envelope.
 * CAS brand envelope first; on mismatch throw with zero effective switches.
 * Publishing an envelope that would not change any effective pointer is a
 * no-op: the Brand revision is not bumped and no publication event is emitted.
 */
export async function publishCatalogContentChange(
  context: PersistenceTransactionContext,
  input: PublishCatalogContentChangeInput,
): Promise<PublishCatalogContentChangeResult> {
  assertTransactionContext(context, "publishCatalogContentChange");
  const brandId = assertUuid(input.brandId, "brandId");
  const productId = assertUuid(input.productId, "productId");
  const expected = parseExpectedContentRevision(input.expectedContentRevision);
  await requireCatalogManage(context, input.actor, brandId);

  // CAS lock first — no mutations before match.
  const envelope = await lockBrandEnvelope(context, brandId);
  assertExpectedContentRevision(envelope, expected);

  const products = await context.db
    .select()
    .from(catalogProductsTable)
    .where(eq(catalogProductsTable.id, productId))
    .for("update")
    .limit(1);
  const product = products[0];
  if (!product || product.brandId !== brandId) {
    throw new CatalogNotFoundError("product");
  }

  // Lock the complete child graph before validating so the candidate that is
  // validated is exactly the candidate that is published.
  const variants = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.productId, productId))
    .for("update");
  const variantIds = variants.map((v) => v.id);

  const vmgs =
    variantIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogVariantModifierGroupsTable)
          .where(inArray(catalogVariantModifierGroupsTable.variantId, variantIds))
          .for("update");
  const groupIds = [...new Set(vmgs.map((v) => v.modifierGroupId))];

  const groups =
    groupIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogModifierGroupsTable)
          .where(inArray(catalogModifierGroupsTable.id, groupIds))
          .for("update");

  const groupOptions =
    groupIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogModifierGroupOptionsTable)
          .where(inArray(catalogModifierGroupOptionsTable.modifierGroupId, groupIds))
          .for("update");
  const optionIds = [...new Set(groupOptions.map((g) => g.modifierOptionId))];

  const options =
    optionIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogModifierOptionsTable)
          .where(inArray(catalogModifierOptionsTable.id, optionIds))
          .for("update");

  const now = new Date();

  // Candidate primary graph — validated only after every row is locked.
  await assertProductGraphReady(context, productId);

  // Ensure revision rows exist for draft pointers before switching.
  await ensureProductContentRevision1(context, product, now);
  for (const v of variants) await ensureVariantContentRevision1(context, v, now);
  for (const g of groups) await ensureModifierGroupContentRevision1(context, g, now);
  for (const o of options) await ensureModifierOptionContentRevision1(context, o, now);
  for (const b of groupOptions) await ensureModifierGroupOptionContentRevision1(context, b, now);
  for (const b of vmgs) await ensureVariantModifierGroupContentRevision1(context, b, now);

  const envelopeEntities: PublicationEntity[] = [
    product,
    ...variants,
    ...groups,
    ...options,
    ...groupOptions,
    ...vmgs,
  ];

  if (!envelopeEntities.some(hasMaterialEffectiveDifference)) {
    return {
      changed: false,
      contentRevision: expected,
      previousContentRevision: expected,
      productId,
      brandId,
    };
  }

  async function applyEffective(
    table:
      | typeof catalogProductsTable
      | typeof catalogVariantsTable
      | typeof catalogModifierGroupsTable
      | typeof catalogModifierOptionsTable
      | typeof catalogModifierGroupOptionsTable
      | typeof catalogVariantModifierGroupsTable,
    entity: PublicationEntity,
  ): Promise<void> {
    const planned = plannedEffectiveContentRevision(entity);
    // Draft-lifecycle entities stay unpublished; leave their pointer untouched.
    if (planned === undefined) return;
    await context.db
      .update(table)
      .set({
        effectiveContentRevision: planned,
        updatedAt: now,
      } as never)
      .where(eq(table.id, entity.id));
  }

  await applyEffective(catalogProductsTable, product);
  for (const v of variants) await applyEffective(catalogVariantsTable, v);
  for (const g of groups) await applyEffective(catalogModifierGroupsTable, g);
  for (const o of options) await applyEffective(catalogModifierOptionsTable, o);
  for (const b of groupOptions) await applyEffective(catalogModifierGroupOptionsTable, b);
  for (const b of vmgs) await applyEffective(catalogVariantModifierGroupsTable, b);

  const newEnvelope = expected + BigInt(1);
  await context.db
    .update(catalogContentRevisionsTable)
    .set({ contentRevision: newEnvelope, updatedAt: now })
    .where(
      and(
        eq(catalogContentRevisionsTable.brandId, brandId),
        eq(catalogContentRevisionsTable.contentRevision, expected),
      ),
    );

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: actorId(input.actor),
    action: "catalog.content_published",
    brandId,
    targetType: "product",
    targetId: productId,
    previousEnvelopeRevision: expected,
    newEnvelopeRevision: newEnvelope,
    metadata: {
      productId,
      variantCount: variants.length,
      modifierGroupCount: groups.length,
    },
  });

  return {
    changed: true,
    contentRevision: newEnvelope,
    previousContentRevision: expected,
    productId,
    brandId,
  };
}
