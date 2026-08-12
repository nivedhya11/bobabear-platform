/**
 * Price book administration (IMP-015).
 *
 * Active books and their price rows are financially immutable.
 */
import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";

import {
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import type {
  PriceBookScopeType,
  TaxInclusionMode,
} from "../../shared/pricing";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, assertUuid } from "./assert-role";
import { insertPricingTaxAuditEvent } from "./audit";
import {
  PricingConflictError,
  PricingInvalidStateError,
  PricingNotFoundError,
  PricingValidationError,
} from "./errors";
import { requireOutletPricingManage, requirePricingManage } from "./authorize-pricing";

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
): Promise<{ id: string }> {
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

  const principal = (await import("../access-control/principal")).requireWorkforcePrincipal(
    input.actor,
  );

  const id = randomUUID();
  const now = new Date();
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
    createdByWorkforceUserId: principal.workforceUserId,
    activatedByWorkforceUserId: null,
    retiredByWorkforceUserId: null,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    retiredAt: null,
  });

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.created",
    brandId,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    targetType: "price_book",
    targetId: id,
    metadata: { scopeType: input.scopeType, code: input.code },
  });

  return { id };
}

export type AttachVariantPriceInput = Readonly<{
  actor: unknown;
  priceBookId: string;
  brandId: string;
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
): Promise<{ id: string }> {
  assertTransactionContext(context, "attachDraftVariantPrice");
  await requirePricingManage(context, input.actor, input.brandId);

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(eq(priceBooksTable.id, input.priceBookId))
    .limit(1);
  const book = bookRows[0];
  if (!book || book.brandId !== input.brandId) {
    throw new PricingNotFoundError("price_book");
  }
  if (book.lifecycleStatus !== "draft") {
    throw new PricingInvalidStateError({
      message: "Price rows may only be attached to draft price books.",
    });
  }
  if (input.amountPaise < BigInt(0)) {
    throw new PricingValidationError({ message: "amountPaise must be >= 0." });
  }

  const id = randomUUID();
  await context.db.insert(priceBookVariantPricesTable).values({
    id,
    brandId: input.brandId,
    priceBookId: input.priceBookId,
    variantId: input.variantId,
    amountPaise: input.amountPaise,
    allowTerritoryOverride: input.allowTerritoryOverride ?? false,
    allowOrganizationOverride: input.allowOrganizationOverride ?? false,
    allowOutletOverride: input.allowOutletOverride ?? false,
    floorPaise: input.floorPaise ?? null,
    ceilingPaise: input.ceilingPaise ?? null,
    taxCategoryId: input.taxCategoryId,
    createdAt: new Date(),
  });
  return { id };
}

export async function activatePriceBook(
  context: PersistenceTransactionContext,
  input: { actor: unknown; priceBookId: string; brandId: string },
): Promise<void> {
  assertTransactionContext(context, "activatePriceBook");
  await requirePricingManage(context, input.actor, input.brandId);
  const principal = (await import("../access-control/principal")).requireWorkforcePrincipal(
    input.actor,
  );

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(eq(priceBooksTable.id, input.priceBookId))
    .limit(1);
  const book = bookRows[0];
  if (!book || book.brandId !== input.brandId) {
    throw new PricingNotFoundError("price_book");
  }
  if (book.lifecycleStatus !== "draft") {
    throw new PricingInvalidStateError({ message: "Only draft price books can be activated." });
  }

  // Overlap check against other active books at same scope identity
  const overlapping = await context.db
    .select({ id: priceBooksTable.id })
    .from(priceBooksTable)
    .where(
      and(
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
        // range overlap: existing.from < new.to AND new.from < existing.to (null to = +inf)
        sql`${priceBooksTable.effectiveFrom} < coalesce(${book.effectiveTo}, 'infinity'::timestamptz)`,
        sql`${book.effectiveFrom} < coalesce(${priceBooksTable.effectiveTo}, 'infinity'::timestamptz)`,
      ),
    );

  if (overlapping.length > 0) {
    throw new PricingConflictError({
      code: "PRICE_BOOK_OVERLAP",
      message: "Active price books may not overlap at the same scope/channel/currency.",
    });
  }

  const now = new Date();
  await context.db
    .update(priceBooksTable)
    .set({
      lifecycleStatus: "active",
      activatedAt: now,
      activatedByWorkforceUserId: principal.workforceUserId,
      updatedAt: now,
    })
    .where(eq(priceBooksTable.id, book.id));

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "price_book.activated",
    brandId: book.brandId,
    territoryId: book.territoryId,
    organizationId: book.organizationId,
    outletId: book.outletId,
    targetType: "price_book",
    targetId: book.id,
  });
}

export async function retirePriceBook(
  context: PersistenceTransactionContext,
  input: { actor: unknown; priceBookId: string; brandId: string },
): Promise<void> {
  assertTransactionContext(context, "retirePriceBook");
  await requirePricingManage(context, input.actor, input.brandId);
  const principal = (await import("../access-control/principal")).requireWorkforcePrincipal(
    input.actor,
  );

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(eq(priceBooksTable.id, input.priceBookId))
    .limit(1);
  const book = bookRows[0];
  if (!book || book.brandId !== input.brandId) {
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
