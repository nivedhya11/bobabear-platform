/**
 * Non-authoritative PriceBook consequence preview (IMP-036F F4).
 *
 * Read/validate only. Returns expectedPriceBookRevision for the subsequent
 * draft mutation or activation. Does not persist a review record.
 */
import { and, eq } from "drizzle-orm";

import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { PricingResolutionError } from "./errors";
import { requirePricingManage } from "./authorize-pricing";
import { findOverlappingActivePriceBooks, rowToBook } from "./price-books";
import { resolveBrandVariantPrice } from "./resolve-price";
import { PricingNotFoundError } from "./errors";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";

export type PricingPreviewBlocker = Readonly<{
  code: string;
  message: string;
}>;

export type PriceBookConsequencePreview = Readonly<{
  priceBookId: string;
  brandId: string;
  expectedPriceBookRevision: string;
  scopeType: string;
  currency: "INR";
  effectiveFrom: string;
  effectiveTo: string | null;
  lifecycleStatus: string;
  currentEffective: readonly Readonly<{
    variantId: string;
    amountPaise: string | null;
    code: string;
  }>[];
  draftCandidate: readonly Readonly<{
    variantId: string;
    amountPaise: string;
  }>[];
  modifierDraftCandidate: readonly Readonly<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    priceDeltaPaise: string;
  }>[];
  variantPriceChanges: readonly Readonly<{
    variantId: string;
    currentAmountPaise: string | null;
    proposedAmountPaise: string;
  }>[];
  modifierPriceChanges: readonly Readonly<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    proposedPriceDeltaPaise: string;
  }>[];
  customerMonetaryConsequence: string;
  overlapBlockers: readonly PricingPreviewBlocker[];
  referenceBlockers: readonly PricingPreviewBlocker[];
  wouldChangeCustomerPricing: boolean;
}>;

export async function previewPriceBookConsequence(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; priceBookId: string; at?: Date }>,
): Promise<PriceBookConsequencePreview> {
  assertApplicationRole(context, "previewPriceBookConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  await requirePricingManage(context, input.actor, brandId);

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(and(eq(priceBooksTable.id, priceBookId), eq(priceBooksTable.brandId, brandId)))
    .limit(1);
  const bookRow = bookRows[0];
  if (!bookRow) throw new PricingNotFoundError("price_book");
  const book = rowToBook(bookRow);
  const at = input.at ?? new Date();

  const variantRows = await context.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(eq(priceBookVariantPricesTable.priceBookId, priceBookId));
  const modifierRows = await context.db
    .select()
    .from(priceBookModifierPricesTable)
    .where(eq(priceBookModifierPricesTable.priceBookId, priceBookId));

  const overlapBlockers: PricingPreviewBlocker[] = [];
  const referenceBlockers: PricingPreviewBlocker[] = [];
  if (book.lifecycleStatus !== "draft") {
    referenceBlockers.push({
      code: "invalid_state",
      message: "Only draft price books can be activated.",
    });
  }

  const overlapping = await findOverlappingActivePriceBooks(context, book);
  if (overlapping.length > 0) {
    overlapBlockers.push({
      code: "PRICE_BOOK_OVERLAP",
      message: "Active price books may not overlap at the same scope/channel/currency.",
    });
  }

  const currentEffective: Array<PriceBookConsequencePreview["currentEffective"][number]> = [];
  const variantPriceChanges: Array<PriceBookConsequencePreview["variantPriceChanges"][number]> =
    [];
  let wouldChange = false;
  for (const row of variantRows) {
    let currentAmount: string | null = null;
    let code = "PRICE_MISSING";
    try {
      const resolved = await resolveBrandVariantPrice(context, {
        brandId,
        variantId: row.variantId,
        at,
      });
      currentAmount = resolved.amountPaise.toString(10);
      code = "PRICE_RESOLVED";
    } catch (error) {
      if (!(error instanceof PricingResolutionError)) throw error;
      code = error.pricingErrorCode;
    }
    currentEffective.push({
      variantId: row.variantId,
      amountPaise: currentAmount,
      code,
    });
    const proposed = row.amountPaise.toString(10);
    variantPriceChanges.push({
      variantId: row.variantId,
      currentAmountPaise: currentAmount,
      proposedAmountPaise: proposed,
    });
    if (currentAmount !== proposed) wouldChange = true;
  }

  return {
    priceBookId: book.id,
    brandId: book.brandId,
    expectedPriceBookRevision: book.revision.toString(10),
    scopeType: book.scopeType,
    currency: "INR",
    effectiveFrom: book.effectiveFrom.toISOString(),
    effectiveTo: book.effectiveTo ? book.effectiveTo.toISOString() : null,
    lifecycleStatus: book.lifecycleStatus,
    currentEffective,
    draftCandidate: variantRows.map((row) => ({
      variantId: row.variantId,
      amountPaise: row.amountPaise.toString(10),
    })),
    modifierDraftCandidate: modifierRows.map((row) => ({
      variantModifierGroupId: row.variantModifierGroupId,
      modifierGroupOptionId: row.modifierGroupOptionId,
      priceDeltaPaise: row.priceDeltaPaise.toString(10),
    })),
    variantPriceChanges,
    modifierPriceChanges: modifierRows.map((row) => ({
      variantModifierGroupId: row.variantModifierGroupId,
      modifierGroupOptionId: row.modifierGroupOptionId,
      proposedPriceDeltaPaise: row.priceDeltaPaise.toString(10),
    })),
    customerMonetaryConsequence: wouldChange
      ? "Activation would change customer-effective monetary amounts for listed Variants."
      : "Draft candidate does not change currently resolved customer Variant prices.",
    overlapBlockers,
    referenceBlockers,
    wouldChangeCustomerPricing: wouldChange && book.lifecycleStatus === "draft",
  };
}
