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
import { PricingNotFoundError, PricingResolutionError } from "./errors";
import { requirePricingManage } from "./authorize-pricing";
import { findOverlappingActivePriceBooks, loadOutletsInPriceBookScope, rowToBook } from "./price-books";
import {
  activationFailureMatchesModifier,
  activationFailureMatchesVariant,
  validatePriceBookActivation,
  type PriceBookActivationResolutionFailure,
} from "./validate-price-book-activation";
import {
  resolveBrandVariantPrice,
  resolveModifierDisplayPriceDeltas,
  resolveOutletVariantPrice,
  type PriceBookEvaluationOverlay,
} from "./resolve-price";
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
    outletId: string | null;
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
    outletId: string | null;
    currentAmountPaise: string | null;
    proposedAmountPaise: string | null;
  }>[];
  modifierPriceChanges: readonly Readonly<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    outletId: string | null;
    currentPriceDeltaPaise: string | null;
    proposedPriceDeltaPaise: string | null;
  }>[];
  customerMonetaryConsequence: string;
  overlapBlockers: readonly PricingPreviewBlocker[];
  referenceBlockers: readonly PricingPreviewBlocker[];
  wouldChangeCustomerPricing: boolean;
}>;

async function resolveCurrentVariantAmount(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    variantId: string;
    at: Date;
    outletId: string | null;
    evaluationOverlay?: PriceBookEvaluationOverlay | null;
  }>,
): Promise<{ amountPaise: string | null; code: string }> {
  try {
    if (input.outletId) {
      const resolved = await resolveOutletVariantPrice(context, {
        variantId: input.variantId,
        outletId: input.outletId,
        at: input.at,
        evaluationOverlay: input.evaluationOverlay,
      });
      return { amountPaise: resolved.amountPaise.toString(10), code: "PRICE_RESOLVED" };
    }
    const resolved = await resolveBrandVariantPrice(context, {
      brandId: input.brandId,
      variantId: input.variantId,
      at: input.at,
      evaluationOverlay: input.evaluationOverlay,
    });
    return { amountPaise: resolved.amountPaise.toString(10), code: "PRICE_RESOLVED" };
  } catch (error) {
    if (!(error instanceof PricingResolutionError)) throw error;
    return { amountPaise: null, code: error.pricingErrorCode };
  }
}

function modifierKey(variantModifierGroupId: string, modifierGroupOptionId: string): string {
  return `${variantModifierGroupId}:${modifierGroupOptionId}`;
}

async function resolveCurrentModifierDelta(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    outletId: string | null;
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    at: Date;
    evaluationOverlay?: PriceBookEvaluationOverlay | null;
  }>,
): Promise<{ deltaPaise: string | null; code: string }> {
  try {
    const deltas = await resolveModifierDisplayPriceDeltas(context, {
      brandId: input.brandId,
      outletId: input.outletId,
      keys: [
        {
          variantModifierGroupId: input.variantModifierGroupId,
          modifierGroupOptionId: input.modifierGroupOptionId,
        },
      ],
      at: input.at,
      evaluationOverlay: input.evaluationOverlay,
    });
    const delta = deltas.get(modifierKey(input.variantModifierGroupId, input.modifierGroupOptionId));
    if (delta == null) {
      return { deltaPaise: null, code: "MODIFIER_PRICE_MISSING" };
    }
    return { deltaPaise: delta.toString(10), code: "PRICE_RESOLVED" };
  } catch (error) {
    if (!(error instanceof PricingResolutionError)) throw error;
    return { deltaPaise: null, code: error.pricingErrorCode };
  }
}

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

  const activationFailures: PriceBookActivationResolutionFailure[] =
    book.lifecycleStatus === "draft"
      ? [...(await validatePriceBookActivation(context, { priceBookId: book.id, at }))]
      : [];
  const seenActivationBlockers = new Set<string>();
  for (const failure of activationFailures) {
    const key = `${failure.code}\0${failure.message}`;
    if (seenActivationBlockers.has(key)) continue;
    seenActivationBlockers.add(key);
    referenceBlockers.push({
      code: failure.code,
      message: failure.message,
    });
  }

  const overlapping = await findOverlappingActivePriceBooks(context, book);
  if (overlapping.length > 0) {
    overlapBlockers.push({
      code: "PRICE_BOOK_OVERLAP",
      message: "Active price books may not overlap at the same scope/channel/currency.",
    });
  }

  const affectedOutlets =
    book.scopeType === "brand" ? [] : [...(await loadOutletsInPriceBookScope(context, book))];
  const outletContexts: Array<string | null> =
    book.scopeType === "brand" ? [null] : affectedOutlets.map((outlet) => outlet.id);
  const overlay: PriceBookEvaluationOverlay | null =
    book.lifecycleStatus === "draft" ? { candidate: bookRow } : null;

  const currentEffective: Array<PriceBookConsequencePreview["currentEffective"][number]> = [];
  const variantPriceChanges: Array<PriceBookConsequencePreview["variantPriceChanges"][number]> =
    [];
  let wouldChange = false;
  for (const row of variantRows) {
    for (const outletId of outletContexts) {
      const current = await resolveCurrentVariantAmount(context, {
        brandId,
        variantId: row.variantId,
        at,
        outletId,
      });
      const projected = overlay
        ? await resolveCurrentVariantAmount(context, {
            brandId,
            variantId: row.variantId,
            at,
            outletId,
            evaluationOverlay: overlay,
          })
        : current;
      const proposedAmountPaise = activationFailureMatchesVariant(
        activationFailures,
        row.variantId,
        outletId,
      )
        ? null
        : projected.amountPaise;
      currentEffective.push({
        variantId: row.variantId,
        outletId,
        amountPaise: current.amountPaise,
        code: current.code,
      });
      variantPriceChanges.push({
        variantId: row.variantId,
        outletId,
        currentAmountPaise: current.amountPaise,
        proposedAmountPaise,
      });
      if (current.amountPaise !== proposedAmountPaise) wouldChange = true;
    }
  }

  const modifierPriceChanges: Array<PriceBookConsequencePreview["modifierPriceChanges"][number]> =
    [];
  for (const row of modifierRows) {
    for (const outletId of outletContexts) {
      const current = await resolveCurrentModifierDelta(context, {
        brandId,
        outletId,
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
        at,
      });
      const projected = overlay
        ? await resolveCurrentModifierDelta(context, {
            brandId,
            outletId,
            variantModifierGroupId: row.variantModifierGroupId,
            modifierGroupOptionId: row.modifierGroupOptionId,
            at,
            evaluationOverlay: overlay,
          })
        : current;
      const proposedPriceDeltaPaise = activationFailureMatchesModifier(
        activationFailures,
        row.variantModifierGroupId,
        row.modifierGroupOptionId,
        outletId,
      )
        ? null
        : projected.deltaPaise;
      modifierPriceChanges.push({
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
        outletId,
        currentPriceDeltaPaise: current.deltaPaise,
        proposedPriceDeltaPaise,
      });
      if (current.deltaPaise !== proposedPriceDeltaPaise) wouldChange = true;
    }
  }

  const variantChanged = variantPriceChanges.some(
    (row) => row.currentAmountPaise !== row.proposedAmountPaise,
  );
  const modifierChanged = modifierPriceChanges.some(
    (row) => row.currentPriceDeltaPaise !== row.proposedPriceDeltaPaise,
  );

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
    modifierPriceChanges,
    customerMonetaryConsequence: wouldChange
      ? variantChanged && modifierChanged
        ? "Activation would change customer-effective Variant prices and modifier deltas."
        : modifierChanged
          ? "Activation would change customer-effective modifier deltas."
          : "Activation would change customer-effective monetary amounts for listed Variants."
      : "Draft candidate does not change currently resolved customer Variant prices or modifier deltas.",
    overlapBlockers,
    referenceBlockers,
    wouldChangeCustomerPricing: wouldChange && book.lifecycleStatus === "draft",
  };
}
