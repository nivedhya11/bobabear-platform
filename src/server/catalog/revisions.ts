/**
 * Catalog ENTITY_CONTENT_REVISION helpers (IMP-036F).
 *
 * Brand envelope (`catalog_content_revisions`) is the CAS target for
 * `publishCatalogContentChange`. Entity/binding draft rows live in non-effective
 * content revision stores; `effective_content_revision` on primary rows points at
 * the published customer-visible revision. Primary row name/description/etc.
 * mirrors the latest draft for admin LWW reads; customer projection uses
 * effective revision rows only.
 */
import { and, eq, sql } from "drizzle-orm";

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
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";
import { insertCatalogMutationAuditEvent } from "./audit";
import {
  CatalogConflictError,
  CatalogInvalidStateError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "./errors";
import { assertUuid } from "./lifecycle";

export type BrandContentEnvelope = Readonly<{
  brandId: string;
  contentRevision: bigint;
  updatedAt: Date;
}>;

export type ProductContentRevision = Readonly<{
  productId: string;
  contentRevision: bigint;
  brandId: string;
  name: string;
  description: string | null;
  createdAt: Date;
}>;

export type VariantContentRevision = Readonly<{
  variantId: string;
  contentRevision: bigint;
  brandId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isSelectorVisible: boolean;
  createdAt: Date;
}>;

export type RevisionPointers = Readonly<{
  effectiveContentRevision: bigint | null;
  draftContentRevision: bigint;
  lifecycleStatus: string;
}>;

const IN_PLACE_REJECT_MESSAGE =
  "Customer/structure-affecting catalog fields require revision-safe draft save and publishCatalogContentChange; in-place mutation is rejected.";

export function parseExpectedContentRevision(
  value: unknown,
  field = "expectedContentRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new CatalogValidationError({ message: `${field} must be > 0.` });
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new CatalogValidationError({ message: `${field} must be > 0.` });
    }
    return parsed;
  }
  throw new CatalogValidationError({ message: `${field} must be a positive integer.` });
}

export function assertInPlaceContentMutationAllowed(entity: RevisionPointers): void {
  if (entity.effectiveContentRevision != null || entity.lifecycleStatus === "active") {
    throw new CatalogInvalidStateError({ message: IN_PLACE_REJECT_MESSAGE });
  }
}

export async function ensureBrandContentRevision(
  context: PersistenceTransactionContext,
  brandId: string,
  at: Date = new Date(),
): Promise<BrandContentEnvelope> {
  assertTransactionContext(context, "ensureBrandContentRevision");
  const id = assertUuid(brandId, "brandId");

  const existing = await context.db
    .select()
    .from(catalogContentRevisionsTable)
    .where(eq(catalogContentRevisionsTable.brandId, id))
    .limit(1);
  if (existing[0]) {
    return {
      brandId: existing[0].brandId,
      contentRevision: existing[0].contentRevision,
      updatedAt: new Date(existing[0].updatedAt),
    };
  }

  await context.db.insert(catalogContentRevisionsTable).values({
    brandId: id,
    contentRevision: BigInt(1),
    updatedAt: at,
  });

  return { brandId: id, contentRevision: BigInt(1), updatedAt: at };
}

export async function lockBrandEnvelope(
  context: PersistenceTransactionContext,
  brandId: string,
): Promise<BrandContentEnvelope> {
  assertTransactionContext(context, "lockBrandEnvelope");
  const id = assertUuid(brandId, "brandId");
  await ensureBrandContentRevision(context, id);

  const rows = await context.db
    .select()
    .from(catalogContentRevisionsTable)
    .where(eq(catalogContentRevisionsTable.brandId, id))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new CatalogNotFoundError("catalog_content_revision");
  }
  return {
    brandId: row.brandId,
    contentRevision: row.contentRevision,
    updatedAt: new Date(row.updatedAt),
  };
}

/**
 * Advance the Brand Catalog content revision (aggregate candidate revision).
 * Every material draft / customer-affecting lifecycle stage must invalidate
 * previously reviewed expectedContentRevision values.
 */
export async function advanceBrandContentRevision(
  context: PersistenceTransactionContext,
  brandId: string,
  at: Date = new Date(),
): Promise<BrandContentEnvelope> {
  assertTransactionContext(context, "advanceBrandContentRevision");
  const envelope = await lockBrandEnvelope(context, brandId);
  const next = envelope.contentRevision + BigInt(1);
  await context.db
    .update(catalogContentRevisionsTable)
    .set({ contentRevision: next, updatedAt: at })
    .where(
      and(
        eq(catalogContentRevisionsTable.brandId, envelope.brandId),
        eq(catalogContentRevisionsTable.contentRevision, envelope.contentRevision),
      ),
    );
  return { brandId: envelope.brandId, contentRevision: next, updatedAt: at };
}

export function assertExpectedContentRevision(
  envelope: BrandContentEnvelope,
  expectedContentRevision: bigint,
): void {
  if (envelope.contentRevision !== expectedContentRevision) {
    throw new CatalogConflictError({
      message:
        "expectedContentRevision does not match current brand catalog content revision; no publish effect.",
    });
  }
}

export async function ensureProductContentRevision1(
  context: PersistenceTransactionContext,
  product: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureProductContentRevision1");
  await context.db
    .insert(catalogProductContentRevisionsTable)
    .values({
      productId: product.id,
      contentRevision: BigInt(1),
      brandId: product.brandId,
      name: product.name,
      description: product.description,
      createdAt: at,
    })
    .onConflictDoNothing();
}

export async function ensureVariantContentRevision1(
  context: PersistenceTransactionContext,
  variant: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
  },
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureVariantContentRevision1");
  await context.db
    .insert(catalogVariantContentRevisionsTable)
    .values({
      variantId: variant.id,
      contentRevision: BigInt(1),
      brandId: variant.brandId,
      name: variant.name,
      description: variant.description,
      isDefault: variant.isDefault,
      isSelectorVisible: variant.isSelectorVisible,
      createdAt: at,
    })
    .onConflictDoNothing();
}

export async function ensureModifierGroupContentRevision1(
  context: PersistenceTransactionContext,
  group: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureModifierGroupContentRevision1");
  await context.db
    .insert(catalogModifierGroupContentRevisionsTable)
    .values({
      modifierGroupId: group.id,
      contentRevision: BigInt(1),
      brandId: group.brandId,
      name: group.name,
      description: group.description,
      createdAt: at,
    })
    .onConflictDoNothing();
}

export async function ensureModifierOptionContentRevision1(
  context: PersistenceTransactionContext,
  option: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
  },
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureModifierOptionContentRevision1");
  await context.db
    .insert(catalogModifierOptionContentRevisionsTable)
    .values({
      modifierOptionId: option.id,
      contentRevision: BigInt(1),
      brandId: option.brandId,
      name: option.name,
      description: option.description,
      createdAt: at,
    })
    .onConflictDoNothing();
}

export async function ensureModifierGroupOptionContentRevision1(
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
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureModifierGroupOptionContentRevision1");
  await context.db
    .insert(catalogModifierGroupOptionContentRevisionsTable)
    .values({
      bindingId: binding.id,
      contentRevision: BigInt(1),
      brandId: binding.brandId,
      minQuantity: binding.minQuantity,
      maxQuantity: binding.maxQuantity,
      defaultQuantity: binding.defaultQuantity,
      position: binding.position,
      lifecycleStatus: binding.lifecycleStatus,
      createdAt: at,
    })
    .onConflictDoNothing();
}

export async function ensureVariantModifierGroupContentRevision1(
  context: PersistenceTransactionContext,
  binding: {
    id: string;
    brandId: string;
    minTotalQuantity: number;
    maxTotalQuantity: number;
    position: number;
    lifecycleStatus: string;
  },
  at: Date = new Date(),
): Promise<void> {
  assertTransactionContext(context, "ensureVariantModifierGroupContentRevision1");
  await context.db
    .insert(catalogVariantModifierGroupContentRevisionsTable)
    .values({
      bindingId: binding.id,
      contentRevision: BigInt(1),
      brandId: binding.brandId,
      minTotalQuantity: binding.minTotalQuantity,
      maxTotalQuantity: binding.maxTotalQuantity,
      position: binding.position,
      lifecycleStatus: binding.lifecycleStatus,
      createdAt: at,
    })
    .onConflictDoNothing();
}

/**
 * Ensure Brand envelope + content revision 1 exist for an entity that is entering
 * the Catalog publication candidate. Does NOT set effective pointers and does NOT
 * bump the Brand publication envelope — callers that stage customer-affecting
 * lifecycle must call `advanceBrandContentRevision` separately.
 *
 * Commercial customer effect occurs only via `publishCatalogContentChange`.
 */
export async function ensurePublicationCandidateBootstrap(
  context: PersistenceTransactionContext,
  input: Readonly<{
    brandId: string;
    ensureRevision1: () => Promise<void>;
  }>,
): Promise<void> {
  assertTransactionContext(context, "ensurePublicationCandidateBootstrap");
  await ensureBrandContentRevision(context, input.brandId);
  await input.ensureRevision1();
}

/**
 * @deprecated Commercial activation must not set effective pointers. Prefer
 * `ensurePublicationCandidateBootstrap` + `advanceBrandContentRevision`, then
 * `publishCatalogContentChange`. Retained only for narrowly bounded import
 * bootstrap paths that intentionally initialize effective state outside the
 * commercial publication command.
 */
export async function establishFirstEffectivePublication(
  context: PersistenceTransactionContext,
  input: Readonly<{
    brandId: string;
    targetType: string;
    targetId: string;
    actorWorkforceUserId?: string | null;
    ensureRevision1: () => Promise<void>;
    setEffectiveOnPrimary: (draftRevision: bigint) => Promise<bigint>;
  }>,
): Promise<void> {
  assertTransactionContext(context, "establishFirstEffectivePublication");
  await ensureBrandContentRevision(context, input.brandId);
  await input.ensureRevision1();
  const draftRevision = await input.setEffectiveOnPrimary(BigInt(1));

  await insertCatalogMutationAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: "catalog.first_effective_publication",
    brandId: input.brandId,
    targetType: input.targetType,
    targetId: input.targetId,
    previousContentRevision: null,
    newContentRevision: draftRevision,
    metadata: { bootstrap: true },
  });
}

export async function loadEffectiveProductContent(
  context: PersistenceQueryContext,
  product: {
    id: string;
    brandId: string;
    name: string;
    description: string | null;
    effectiveContentRevision: bigint | null;
  },
): Promise<{ name: string; description: string | null } | null> {
  assertApplicationRole(context, "loadEffectiveProductContent");
  // Never fall back to mutable primary draft as customer truth.
  if (product.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogProductContentRevisionsTable)
    .where(
      and(
        eq(catalogProductContentRevisionsTable.productId, product.id),
        eq(
          catalogProductContentRevisionsTable.contentRevision,
          product.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { name: row.name, description: row.description };
}

export async function loadEffectiveVariantContent(
  context: PersistenceQueryContext,
  variant: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
    effectiveContentRevision: bigint | null;
  },
): Promise<{
  name: string;
  description: string | null;
  isDefault: boolean;
  isSelectorVisible: boolean;
} | null> {
  assertApplicationRole(context, "loadEffectiveVariantContent");
  if (variant.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogVariantContentRevisionsTable)
    .where(
      and(
        eq(catalogVariantContentRevisionsTable.variantId, variant.id),
        eq(
          catalogVariantContentRevisionsTable.contentRevision,
          variant.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    isSelectorVisible: row.isSelectorVisible,
  };
}

export async function loadEffectiveModifierGroupContent(
  context: PersistenceQueryContext,
  group: {
    id: string;
    name: string;
    description: string | null;
    effectiveContentRevision: bigint | null;
  },
): Promise<{ name: string; description: string | null } | null> {
  assertApplicationRole(context, "loadEffectiveModifierGroupContent");
  if (group.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogModifierGroupContentRevisionsTable)
    .where(
      and(
        eq(catalogModifierGroupContentRevisionsTable.modifierGroupId, group.id),
        eq(
          catalogModifierGroupContentRevisionsTable.contentRevision,
          group.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { name: row.name, description: row.description };
}

export async function loadEffectiveModifierOptionContent(
  context: PersistenceQueryContext,
  option: {
    id: string;
    name: string;
    description: string | null;
    effectiveContentRevision: bigint | null;
  },
): Promise<{ name: string; description: string | null } | null> {
  assertApplicationRole(context, "loadEffectiveModifierOptionContent");
  if (option.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogModifierOptionContentRevisionsTable)
    .where(
      and(
        eq(catalogModifierOptionContentRevisionsTable.modifierOptionId, option.id),
        eq(
          catalogModifierOptionContentRevisionsTable.contentRevision,
          option.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { name: row.name, description: row.description };
}

export async function loadEffectiveModifierGroupOptionContent(
  context: PersistenceQueryContext,
  binding: {
    id: string;
    minQuantity: number;
    maxQuantity: number;
    defaultQuantity: number;
    position: number;
    lifecycleStatus: string;
    effectiveContentRevision: bigint | null;
  },
): Promise<{
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  position: number;
  lifecycleStatus: string;
} | null> {
  assertApplicationRole(context, "loadEffectiveModifierGroupOptionContent");
  if (binding.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogModifierGroupOptionContentRevisionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionContentRevisionsTable.bindingId, binding.id),
        eq(
          catalogModifierGroupOptionContentRevisionsTable.contentRevision,
          binding.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    defaultQuantity: row.defaultQuantity,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus,
  };
}

export async function loadEffectiveVariantModifierGroupContent(
  context: PersistenceQueryContext,
  binding: {
    id: string;
    minTotalQuantity: number;
    maxTotalQuantity: number;
    position: number;
    lifecycleStatus: string;
    effectiveContentRevision: bigint | null;
  },
): Promise<{
  minTotalQuantity: number;
  maxTotalQuantity: number;
  position: number;
  lifecycleStatus: string;
} | null> {
  assertApplicationRole(context, "loadEffectiveVariantModifierGroupContent");
  if (binding.effectiveContentRevision == null) {
    return null;
  }
  const rows = await context.db
    .select()
    .from(catalogVariantModifierGroupContentRevisionsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupContentRevisionsTable.bindingId, binding.id),
        eq(
          catalogVariantModifierGroupContentRevisionsTable.contentRevision,
          binding.effectiveContentRevision,
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    minTotalQuantity: row.minTotalQuantity,
    maxTotalQuantity: row.maxTotalQuantity,
    position: row.position,
    lifecycleStatus: row.lifecycleStatus,
  };
}

/** Batch-load effective product content for customer projection (fail-closed). */
export async function loadEffectiveProductContentMap(
  context: PersistenceQueryContext,
  products: ReadonlyArray<{
    id: string;
    name: string;
    description: string | null;
    effectiveContentRevision: bigint | null;
  }>,
): Promise<Map<string, { name: string; description: string | null }>> {
  assertApplicationRole(context, "loadEffectiveProductContentMap");
  const result = new Map<string, { name: string; description: string | null }>();
  for (const product of products) {
    const content = await loadEffectiveProductContent(context, {
      ...product,
      brandId: "",
    });
    if (content) {
      result.set(product.id, content);
    }
  }
  return result;
}

export async function loadEffectiveVariantContentMap(
  context: PersistenceQueryContext,
  variants: ReadonlyArray<{
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    isSelectorVisible: boolean;
    effectiveContentRevision: bigint | null;
  }>,
): Promise<
  Map<
    string,
    {
      name: string;
      description: string | null;
      isDefault: boolean;
      isSelectorVisible: boolean;
    }
  >
> {
  assertApplicationRole(context, "loadEffectiveVariantContentMap");
  const result = new Map<
    string,
    {
      name: string;
      description: string | null;
      isDefault: boolean;
      isSelectorVisible: boolean;
    }
  >();
  for (const variant of variants) {
    const content = await loadEffectiveVariantContent(context, variant);
    if (content) {
      result.set(variant.id, content);
    }
  }
  return result;
}

export async function setPrimaryEffectiveToDraft(
  context: PersistenceTransactionContext,
  table:
    | typeof catalogProductsTable
    | typeof catalogVariantsTable
    | typeof catalogModifierGroupsTable
    | typeof catalogModifierOptionsTable
    | typeof catalogModifierGroupOptionsTable
    | typeof catalogVariantModifierGroupsTable,
  id: string,
): Promise<bigint> {
  assertTransactionContext(context, "setPrimaryEffectiveToDraft");
  const rows = await context.db.select().from(table).where(eq(table.id, id)).limit(1);
  const row = rows[0] as
    | {
        draftContentRevision: bigint;
        effectiveContentRevision: bigint | null;
      }
    | undefined;
  if (!row) {
    throw new CatalogNotFoundError("catalog_entity");
  }
  const draft = row.draftContentRevision;
  await context.db
    .update(table)
    .set({
      effectiveContentRevision: draft,
      updatedAt: new Date(),
    } as never)
    .where(eq(table.id, id));
  return draft;
}

/** Used by activate paths when effective is still null. */
export async function publishFirstEffectiveIfNeeded(
  context: PersistenceTransactionContext,
  input: Readonly<{
    brandId: string;
    targetType: string;
    targetId: string;
    effectiveContentRevision: bigint | null;
    actorWorkforceUserId?: string | null;
    ensureRevision1: () => Promise<void>;
  }>,
): Promise<void> {
  if (input.effectiveContentRevision != null) return;
  await establishFirstEffectivePublication(context, {
    brandId: input.brandId,
    targetType: input.targetType,
    targetId: input.targetId,
    actorWorkforceUserId: input.actorWorkforceUserId,
    ensureRevision1: input.ensureRevision1,
    setEffectiveOnPrimary: async () => {
      // Caller must update the correct primary table; default uses product table
      // only for products — override via ensure+direct update in activate helpers.
      throw new CatalogValidationError({
        message: "setEffectiveOnPrimary must be provided by caller.",
      });
    },
  });
}

export { sql };
