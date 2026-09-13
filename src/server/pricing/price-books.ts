/**
 * Price book administration (IMP-015 / IMP-036F F4).
 *
 * Active books and their price rows are financially immutable.
 * Every material draft mutation and activatePriceBook consumes
 * expectedPriceBookRevision (PRICE_BOOK_AGGREGATE_REVISION CAS).
 */
import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";

import {
  catalogModifierGroupOptionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
  taxCategoriesTable,
} from "../../platform/database/schema/pricing";
import type {
  PriceBookScopeType,
  TaxInclusionMode,
} from "../../shared/pricing";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, assertUuid, isUniqueViolation } from "./assert-role";
import { insertPricingTaxAuditEvent } from "./audit";
import {
  PricingConflictError,
  PricingInvalidStateError,
  PricingNotFoundError,
  PricingValidationError,
} from "./errors";
import { requireOutletPricingManage, requirePricingManage } from "./authorize-pricing";

function stalePriceBookRevision(): never {
  throw new PricingConflictError({
    code: "PRICE_BOOK_STALE_REVISION",
    message:
      "expectedPriceBookRevision does not match current PriceBook revision; no mutation effect.",
  });
}

export function parseExpectedPriceBookRevision(
  value: unknown,
  field = "expectedPriceBookRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new PricingValidationError({ message: `${field} must be > 0.` });
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new PricingValidationError({ message: `${field} must be > 0.` });
    }
    return parsed;
  }
  throw new PricingValidationError({ message: `${field} must be a positive integer.` });
}

export type PriceBookRecord = Readonly<{
  id: string;
  brandId: string;
  scopeType: PriceBookScopeType;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  code: string;
  name: string;
  salesChannel: "direct";
  currency: "INR";
  taxInclusionMode: TaxInclusionMode;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  lifecycleStatus: "draft" | "active" | "retired";
  revision: bigint;
  createdByWorkforceUserId: string | null;
  activatedByWorkforceUserId: string | null;
  retiredByWorkforceUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
}>;

export function rowToBook(row: typeof priceBooksTable.$inferSelect): PriceBookRecord {
  return {
    id: row.id,
    brandId: row.brandId,
    scopeType: row.scopeType as PriceBookScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    code: row.code,
    name: row.name,
    salesChannel: "direct",
    currency: "INR",
    taxInclusionMode: row.taxInclusionMode as TaxInclusionMode,
    effectiveFrom: new Date(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? new Date(row.effectiveTo) : null,
    lifecycleStatus: row.lifecycleStatus as PriceBookRecord["lifecycleStatus"],
    revision: row.revision,
    createdByWorkforceUserId: row.createdByWorkforceUserId,
    activatedByWorkforceUserId: row.activatedByWorkforceUserId,
    retiredByWorkforceUserId: row.retiredByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    activatedAt: row.activatedAt ? new Date(row.activatedAt) : null,
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

async function lockBrandPriceBook(
  context: PersistenceTransactionContext,
  brandId: string,
  priceBookId: string,
): Promise<PriceBookRecord> {
  const rows = await context.db
    .select()
    .from(priceBooksTable)
    .where(and(eq(priceBooksTable.id, priceBookId), eq(priceBooksTable.brandId, brandId)))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) throw new PricingNotFoundError("price_book");
  return rowToBook(row);
}

async function requireActiveTaxCategory(
  context: PersistenceTransactionContext,
  taxCategoryId: string,
): Promise<void> {
  const id = assertUuid(taxCategoryId, "taxCategoryId");
  const rows = await context.db
    .select({ id: taxCategoriesTable.id, lifecycleStatus: taxCategoriesTable.lifecycleStatus })
    .from(taxCategoriesTable)
    .where(eq(taxCategoriesTable.id, id))
    .limit(1);
  if (!rows[0] || rows[0].lifecycleStatus !== "active") {
    throw new PricingValidationError({ message: "taxCategoryId is not a valid active tax category." });
  }
}

async function requireBrandVariant(
  context: PersistenceTransactionContext,
  brandId: string,
  variantId: string,
): Promise<void> {
  const id = assertUuid(variantId, "variantId");
  const rows = await context.db
    .select({ id: catalogVariantsTable.id })
    .from(catalogVariantsTable)
    .where(and(eq(catalogVariantsTable.id, id), eq(catalogVariantsTable.brandId, brandId)))
    .limit(1);
  if (!rows[0]) throw new PricingNotFoundError("variant");
}

async function advancePriceBookRevision(
  context: PersistenceTransactionContext,
  book: PriceBookRecord,
  expected: bigint,
  extra: Partial<{
    lifecycleStatus: PriceBookRecord["lifecycleStatus"];
    activatedAt: Date | null;
    activatedByWorkforceUserId: string | null;
    retiredAt: Date | null;
    retiredByWorkforceUserId: string | null;
  }>,
  now: Date,
): Promise<bigint> {
  if (book.revision !== expected) stalePriceBookRevision();
  const next = book.revision + BigInt(1);
  const updated = await context.db
    .update(priceBooksTable)
    .set({
      revision: next,
      updatedAt: now,
      ...extra,
    })
    .where(
      and(
        eq(priceBooksTable.id, book.id),
        eq(priceBooksTable.brandId, book.brandId),
        eq(priceBooksTable.revision, expected),
      ),
    )
    .returning({ revision: priceBooksTable.revision });
  if (!updated[0]) stalePriceBookRevision();
  return next;
}

export type CreateDraftPriceBookInput = Readonly<{
  actor: unknown;
  brandId: string;
  scopeType: PriceBookScopeType;
  territoryId?: string | null;
  organizationId?: string | null;
  outletId?: string | null;
  code: string;
  name: string;
  taxInclusionMode?: TaxInclusionMode;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}>;

export async function createDraftPriceBook(
  context: PersistenceTransactionContext,
  input: CreateDraftPriceBookInput,
): Promise<{ id: string; revision: bigint }> {
  assertTransactionContext(context, "createDraftPriceBook");
  const brandId = assertUuid(input.brandId, "brandId");

  if (input.scopeType === "outlet") {
    await requireOutletPricingManage(context, input.actor, assertUuid(input.outletId, "outletId"));
  } else {
    await requirePricingManage(context, input.actor, brandId);
  }

  if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) {
    throw new PricingValidationError({
      message: "effectiveTo must be greater than effectiveFrom when set.",
    });
  }

  const principal = requireWorkforcePrincipal(input.actor);

  const id = randomUUID();
  const now = new Date();
  const revision = BigInt(1);
  try {
    await context.db.insert(priceBooksTable).values({
      id,
      brandId,
      scopeType: input.scopeType,
      territoryId: input.territoryId ?? null,
      organizationId: input.organizationId ?? null,
      outletId: input.outletId ?? null,
      code: input.code,
      name: input.name,
      salesChannel: "direct",
      currency: "INR",
      taxInclusionMode: input.taxInclusionMode ?? "exclusive",
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      lifecycleStatus: "draft",
      revision,
      createdByWorkforceUserId: principal.workforceUserId,
      activatedByWorkforceUserId: null,
      retiredByWorkforceUserId: null,
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PricingConflictError({ message: "Price book code already exists for this brand." });
    }
    throw error;
  }

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.created",
    brandId,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    targetType: "price_book",
    targetId: id,
    metadata: { scopeType: input.scopeType, code: input.code, revision: "1" },
  });

  return { id, revision };
}

export type AttachVariantPriceInput = Readonly<{
  actor: unknown;
  priceBookId: string;
  brandId: string;
  expectedPriceBookRevision: bigint | number | string;
  variantId: string;
  amountPaise: bigint;
  taxCategoryId: string;
  allowTerritoryOverride?: boolean;
  allowOrganizationOverride?: boolean;
  allowOutletOverride?: boolean;
  floorPaise?: bigint | null;
  ceilingPaise?: bigint | null;
}>;

export async function attachDraftVariantPrice(
  context: PersistenceTransactionContext,
  input: AttachVariantPriceInput,
): Promise<{ id: string; priceBookRevision: bigint }> {
  assertTransactionContext(context, "attachDraftVariantPrice");
  const brandId = assertUuid(input.brandId, "brandId");
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  const expected = parseExpectedPriceBookRevision(input.expectedPriceBookRevision);
  await requirePricingManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const book = await lockBrandPriceBook(context, brandId, priceBookId);
  if (book.lifecycleStatus !== "draft") {
    throw new PricingInvalidStateError({
      message: "Price rows may only be attached to draft price books.",
    });
  }
  if (input.amountPaise < BigInt(0)) {
    throw new PricingValidationError({ message: "amountPaise must be >= 0." });
  }
  if (input.floorPaise != null && input.floorPaise < BigInt(0)) {
    throw new PricingValidationError({ message: "floorPaise must be >= 0 when set." });
  }
  if (input.ceilingPaise != null && input.ceilingPaise < BigInt(0)) {
    throw new PricingValidationError({ message: "ceilingPaise must be >= 0 when set." });
  }
  if (input.floorPaise != null && input.amountPaise < input.floorPaise) {
    throw new PricingValidationError({ message: "amountPaise must be >= floorPaise." });
  }
  if (input.ceilingPaise != null && input.amountPaise > input.ceilingPaise) {
    throw new PricingValidationError({ message: "amountPaise must be <= ceilingPaise." });
  }
  if (
    input.floorPaise != null &&
    input.ceilingPaise != null &&
    input.floorPaise > input.ceilingPaise
  ) {
    throw new PricingValidationError({ message: "floorPaise must be <= ceilingPaise." });
  }

  await requireBrandVariant(context, brandId, input.variantId);
  await requireActiveTaxCategory(context, input.taxCategoryId);

  const variantId = assertUuid(input.variantId, "variantId");
  const existingRows = await context.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(
      and(
        eq(priceBookVariantPricesTable.priceBookId, priceBookId),
        eq(priceBookVariantPricesTable.variantId, variantId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  const allowTerritoryOverride = input.allowTerritoryOverride ?? false;
  const allowOrganizationOverride = input.allowOrganizationOverride ?? false;
  const allowOutletOverride = input.allowOutletOverride ?? false;
  const floorPaise = input.floorPaise ?? null;
  const ceilingPaise = input.ceilingPaise ?? null;

  if (
    existing &&
    existing.amountPaise === input.amountPaise &&
    existing.taxCategoryId === input.taxCategoryId &&
    existing.allowTerritoryOverride === allowTerritoryOverride &&
    existing.allowOrganizationOverride === allowOrganizationOverride &&
    existing.allowOutletOverride === allowOutletOverride &&
    existing.floorPaise === floorPaise &&
    existing.ceilingPaise === ceilingPaise
  ) {
    if (book.revision !== expected) stalePriceBookRevision();
    return { id: existing.id, priceBookRevision: book.revision };
  }

  const now = new Date();
  const rowId = existing?.id ?? randomUUID();
  if (existing) {
    await context.db
      .update(priceBookVariantPricesTable)
      .set({
        amountPaise: input.amountPaise,
        taxCategoryId: input.taxCategoryId,
        allowTerritoryOverride,
        allowOrganizationOverride,
        allowOutletOverride,
        floorPaise,
        ceilingPaise,
      })
      .where(eq(priceBookVariantPricesTable.id, existing.id));
  } else {
    try {
      await context.db.insert(priceBookVariantPricesTable).values({
        id: rowId,
        brandId,
        priceBookId,
        variantId,
        amountPaise: input.amountPaise,
        allowTerritoryOverride,
        allowOrganizationOverride,
        allowOutletOverride,
        floorPaise,
        ceilingPaise,
        taxCategoryId: input.taxCategoryId,
        createdAt: now,
      });
    } catch (error) {
      if (isUniqueViolation(error)) stalePriceBookRevision();
      throw error;
    }
  }

  const next = await advancePriceBookRevision(context, book, expected, {}, now);
  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.variant_price_attached",
    brandId,
    territoryId: book.territoryId,
    organizationId: book.organizationId,
    outletId: book.outletId,
    targetType: "price_book_variant_price",
    targetId: rowId,
    metadata: {
      priceBookId,
      variantId,
      amountPaise: input.amountPaise.toString(10),
      previousRevision: expected.toString(10),
      newRevision: next.toString(10),
    },
  });
  return { id: rowId, priceBookRevision: next };
}

export type AttachModifierPriceInput = Readonly<{
  actor: unknown;
  priceBookId: string;
  brandId: string;
  expectedPriceBookRevision: bigint | number | string;
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  priceDeltaPaise: bigint;
  allowTerritoryOverride?: boolean;
  allowOrganizationOverride?: boolean;
  allowOutletOverride?: boolean;
}>;

export async function attachDraftModifierPrice(
  context: PersistenceTransactionContext,
  input: AttachModifierPriceInput,
): Promise<{ id: string; priceBookRevision: bigint }> {
  assertTransactionContext(context, "attachDraftModifierPrice");
  const brandId = assertUuid(input.brandId, "brandId");
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  const expected = parseExpectedPriceBookRevision(input.expectedPriceBookRevision);
  await requirePricingManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const book = await lockBrandPriceBook(context, brandId, priceBookId);
  if (book.lifecycleStatus !== "draft") {
    throw new PricingInvalidStateError({
      message: "Price rows may only be attached to draft price books.",
    });
  }
  if (input.priceDeltaPaise < BigInt(0)) {
    throw new PricingValidationError({ message: "priceDeltaPaise must be >= 0." });
  }

  const variantModifierGroupId = assertUuid(
    input.variantModifierGroupId,
    "variantModifierGroupId",
  );
  const modifierGroupOptionId = assertUuid(input.modifierGroupOptionId, "modifierGroupOptionId");

  const groupRows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.id, variantModifierGroupId),
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
      ),
    )
    .limit(1);
  const group = groupRows[0];
  if (!group) throw new PricingNotFoundError("variant_modifier_group");

  const optionRows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.id, modifierGroupOptionId),
        eq(catalogModifierGroupOptionsTable.brandId, brandId),
      ),
    )
    .limit(1);
  const option = optionRows[0];
  if (!option) throw new PricingNotFoundError("modifier_option");
  if (option.modifierGroupId !== group.modifierGroupId) {
    throw new PricingValidationError({
      message: "modifierGroupOptionId must belong to the Variant modifier group.",
    });
  }

  const existingRows = await context.db
    .select()
    .from(priceBookModifierPricesTable)
    .where(
      and(
        eq(priceBookModifierPricesTable.priceBookId, priceBookId),
        eq(priceBookModifierPricesTable.variantModifierGroupId, variantModifierGroupId),
        eq(priceBookModifierPricesTable.modifierGroupOptionId, modifierGroupOptionId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  const allowTerritoryOverride = input.allowTerritoryOverride ?? false;
  const allowOrganizationOverride = input.allowOrganizationOverride ?? false;
  const allowOutletOverride = input.allowOutletOverride ?? false;

  if (
    existing &&
    existing.priceDeltaPaise === input.priceDeltaPaise &&
    existing.allowTerritoryOverride === allowTerritoryOverride &&
    existing.allowOrganizationOverride === allowOrganizationOverride &&
    existing.allowOutletOverride === allowOutletOverride
  ) {
    if (book.revision !== expected) stalePriceBookRevision();
    return { id: existing.id, priceBookRevision: book.revision };
  }

  const now = new Date();
  const rowId = existing?.id ?? randomUUID();
  if (existing) {
    await context.db
      .update(priceBookModifierPricesTable)
      .set({
        priceDeltaPaise: input.priceDeltaPaise,
        allowTerritoryOverride,
        allowOrganizationOverride,
        allowOutletOverride,
      })
      .where(eq(priceBookModifierPricesTable.id, existing.id));
  } else {
    try {
      await context.db.insert(priceBookModifierPricesTable).values({
        id: rowId,
        brandId,
        priceBookId,
        variantModifierGroupId,
        modifierGroupOptionId,
        priceDeltaPaise: input.priceDeltaPaise,
        allowTerritoryOverride,
        allowOrganizationOverride,
        allowOutletOverride,
        createdAt: now,
      });
    } catch (error) {
      if (isUniqueViolation(error)) stalePriceBookRevision();
      throw error;
    }
  }

  const next = await advancePriceBookRevision(context, book, expected, {}, now);
  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.modifier_price_attached",
    brandId,
    territoryId: book.territoryId,
    organizationId: book.organizationId,
    outletId: book.outletId,
    targetType: "price_book_modifier_price",
    targetId: rowId,
    metadata: {
      priceBookId,
      variantModifierGroupId,
      modifierGroupOptionId,
      priceDeltaPaise: input.priceDeltaPaise.toString(10),
      previousRevision: expected.toString(10),
      newRevision: next.toString(10),
    },
  });
  return { id: rowId, priceBookRevision: next };
}

function overlapWhere(book: PriceBookRecord) {
  return and(
    eq(priceBooksTable.brandId, book.brandId),
    eq(priceBooksTable.scopeType, book.scopeType),
    eq(priceBooksTable.salesChannel, "direct"),
    eq(priceBooksTable.currency, "INR"),
    eq(priceBooksTable.lifecycleStatus, "active"),
    ne(priceBooksTable.id, book.id),
    book.scopeType === "brand"
      ? sql`true`
      : book.scopeType === "territory"
        ? eq(priceBooksTable.territoryId, book.territoryId!)
        : book.scopeType === "organization"
          ? eq(priceBooksTable.organizationId, book.organizationId!)
          : eq(priceBooksTable.outletId, book.outletId!),
    sql`${priceBooksTable.effectiveFrom} < coalesce(${book.effectiveTo}, 'infinity'::timestamptz)`,
    sql`${book.effectiveFrom} < coalesce(${priceBooksTable.effectiveTo}, 'infinity'::timestamptz)`,
  );
}

export async function findOverlappingActivePriceBooks(
  context: PersistenceQueryContext,
  book: PriceBookRecord,
): Promise<readonly string[]> {
  const overlapping = await context.db
    .select({ id: priceBooksTable.id })
    .from(priceBooksTable)
    .where(overlapWhere(book));
  return overlapping.map((row) => row.id);
}

export async function activatePriceBook(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    priceBookId: string;
    brandId: string;
    expectedPriceBookRevision: bigint | number | string;
  },
): Promise<{ revision: bigint }> {
  assertTransactionContext(context, "activatePriceBook");
  const brandId = assertUuid(input.brandId, "brandId");
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  const expected = parseExpectedPriceBookRevision(input.expectedPriceBookRevision);
  await requirePricingManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const book = await lockBrandPriceBook(context, brandId, priceBookId);
  if (book.revision !== expected) stalePriceBookRevision();
  if (book.lifecycleStatus !== "draft") {
    throw new PricingInvalidStateError({ message: "Only draft price books can be activated." });
  }

  const overlapping = await findOverlappingActivePriceBooks(context, book);
  if (overlapping.length > 0) {
    throw new PricingConflictError({
      code: "PRICE_BOOK_OVERLAP",
      message: "Active price books may not overlap at the same scope/channel/currency.",
    });
  }

  const now = new Date();
  const next = await advancePriceBookRevision(
    context,
    book,
    expected,
    {
      lifecycleStatus: "active",
      activatedAt: now,
      activatedByWorkforceUserId: principal.workforceUserId,
    },
    now,
  );

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.activated",
    brandId: book.brandId,
    territoryId: book.territoryId,
    organizationId: book.organizationId,
    outletId: book.outletId,
    targetType: "price_book",
    targetId: book.id,
    metadata: {
      previousRevision: expected.toString(10),
      newRevision: next.toString(10),
    },
  });
  return { revision: next };
}

export async function retirePriceBook(
  context: PersistenceTransactionContext,
  input: { actor: unknown; priceBookId: string; brandId: string },
): Promise<void> {
  assertTransactionContext(context, "retirePriceBook");
  await requirePricingManage(context, input.actor, input.brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(
      and(
        eq(priceBooksTable.id, input.priceBookId),
        eq(priceBooksTable.brandId, input.brandId),
      ),
    )
    .limit(1);
  const book = bookRows[0];
  if (!book) {
    throw new PricingNotFoundError("price_book");
  }
  if (book.lifecycleStatus === "retired") {
    throw new PricingInvalidStateError({ message: "Price book is already retired." });
  }

  const now = new Date();
  await context.db
    .update(priceBooksTable)
    .set({
      lifecycleStatus: "retired",
      retiredAt: now,
      retiredByWorkforceUserId: principal.workforceUserId,
      updatedAt: now,
    })
    .where(eq(priceBooksTable.id, book.id));

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.retired",
    brandId: book.brandId,
    territoryId: book.territoryId,
    organizationId: book.organizationId,
    outletId: book.outletId,
    targetType: "price_book",
    targetId: book.id,
  });
}
