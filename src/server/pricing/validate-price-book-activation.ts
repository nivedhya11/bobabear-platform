/**
 * Shared PriceBook activation legality check.
 *
 * Projects the candidate as the active book at its exact scope and requires
 * every represented Variant and Modifier price to resolve for each outlet
 * in that scope. Illegal hierarchy states block activation. This check does
 * not persist, and it does not change resolver rules.
 */
import { eq } from "drizzle-orm";

import { outletsTable } from "../../platform/database/schema/organizations";
import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertUuid } from "./assert-role";
import { PricingNotFoundError, PricingResolutionError } from "./errors";
import {
  resolveModifierDisplayPriceDeltas,
  resolveOutletVariantPrice,
  type PriceBookEvaluationOverlay,
} from "./resolve-price";

const ACTIVATION_BLOCK_CODES = [
  "OVERRIDE_NOT_PERMITTED",
  "OVERRIDE_OUT_OF_BOUNDS",
  "PRICE_MISSING",
  "MODIFIER_PRICE_MISSING",
  "BUNDLE_OPTION_PRICE_MISSING",
] as const;

export type PriceBookActivationBlockCode = (typeof ACTIVATION_BLOCK_CODES)[number];

export type PriceBookActivationResolutionFailure = Readonly<{
  code: PriceBookActivationBlockCode;
  message: string;
  subject: "variant" | "modifier";
  variantId: string | null;
  outletId: string | null;
  variantModifierGroupId: string | null;
  modifierGroupOptionId: string | null;
}>;

function isActivationBlockCode(code: string): code is PriceBookActivationBlockCode {
  return (ACTIVATION_BLOCK_CODES as readonly string[]).includes(code);
}

function modifierKey(variantModifierGroupId: string, modifierGroupOptionId: string): string {
  return `${variantModifierGroupId}:${modifierGroupOptionId}`;
}

/**
 * Same outlet membership as loadOutletsInPriceBookScope. Kept local so this
 * module does not import price-book mutations.
 */
async function outletsAffectedByCandidate(
  context: PersistenceQueryContext,
  book: typeof priceBooksTable.$inferSelect,
): Promise<readonly string[]> {
  const rows = await context.db
    .select({
      id: outletsTable.id,
      territoryId: outletsTable.territoryId,
      organizationId: outletsTable.organizationId,
    })
    .from(outletsTable)
    .where(eq(outletsTable.brandId, book.brandId));
  return rows
    .filter((outlet) => {
      if (book.scopeType === "brand") return true;
      if (book.scopeType === "territory") return outlet.territoryId === book.territoryId;
      if (book.scopeType === "organization") return outlet.organizationId === book.organizationId;
      return outlet.id === book.outletId;
    })
    .map((outlet) => outlet.id);
}

function recordResolutionFailure(
  failures: PriceBookActivationResolutionFailure[],
  error: unknown,
  subject: Omit<PriceBookActivationResolutionFailure, "code" | "message">,
): void {
  if (!(error instanceof PricingResolutionError)) throw error;
  if (!isActivationBlockCode(error.pricingErrorCode)) throw error;
  failures.push({
    code: error.pricingErrorCode,
    message: error.message,
    subject: subject.subject,
    variantId: subject.variantId,
    outletId: subject.outletId,
    variantModifierGroupId: subject.variantModifierGroupId,
    modifierGroupOptionId: subject.modifierGroupOptionId,
  });
}

/**
 * Prove the candidate can become the active book at its scope without leaving
 * effective pricing unresolved or illegal. Read-only.
 */
export async function validatePriceBookActivation(
  context: PersistenceQueryContext,
  input: Readonly<{ priceBookId: string; at: Date }>,
): Promise<readonly PriceBookActivationResolutionFailure[]> {
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(eq(priceBooksTable.id, priceBookId))
    .limit(1);
  const book = bookRows[0];
  if (!book) throw new PricingNotFoundError("price_book");

  const variantRows = await context.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(eq(priceBookVariantPricesTable.priceBookId, priceBookId));
  const modifierRows = await context.db
    .select()
    .from(priceBookModifierPricesTable)
    .where(eq(priceBookModifierPricesTable.priceBookId, priceBookId));
  const outletIds = await outletsAffectedByCandidate(context, book);
  const overlay: PriceBookEvaluationOverlay = { candidate: book };
  const failures: PriceBookActivationResolutionFailure[] = [];

  for (const row of variantRows) {
    for (const outletId of outletIds) {
      try {
        await resolveOutletVariantPrice(context, {
          variantId: row.variantId,
          outletId,
          at: input.at,
          evaluationOverlay: overlay,
        });
      } catch (error) {
        recordResolutionFailure(failures, error, {
          subject: "variant",
          variantId: row.variantId,
          outletId,
          variantModifierGroupId: null,
          modifierGroupOptionId: null,
        });
      }
    }
  }

  for (const row of modifierRows) {
    for (const outletId of outletIds) {
      try {
        await resolveModifierDisplayPriceDeltas(context, {
          brandId: book.brandId,
          outletId,
          keys: [
            {
              variantModifierGroupId: row.variantModifierGroupId,
              modifierGroupOptionId: row.modifierGroupOptionId,
            },
          ],
          at: input.at,
          evaluationOverlay: overlay,
        });
      } catch (error) {
        recordResolutionFailure(failures, error, {
          subject: "modifier",
          variantId: null,
          outletId,
          variantModifierGroupId: row.variantModifierGroupId,
          modifierGroupOptionId: row.modifierGroupOptionId,
        });
      }
    }
  }

  return failures;
}

export function activationFailureMatchesVariant(
  failures: readonly PriceBookActivationResolutionFailure[],
  variantId: string,
  outletId: string | null,
): boolean {
  return failures.some((failure) => {
    if (failure.subject !== "variant" || failure.variantId !== variantId) return false;
    if (outletId === null) return true;
    return failure.outletId === outletId;
  });
}

export function activationFailureMatchesModifier(
  failures: readonly PriceBookActivationResolutionFailure[],
  variantModifierGroupId: string,
  modifierGroupOptionId: string,
  outletId: string | null,
): boolean {
  const key = modifierKey(variantModifierGroupId, modifierGroupOptionId);
  return failures.some((failure) => {
    if (failure.subject !== "modifier") return false;
    if (modifierKey(failure.variantModifierGroupId ?? "", failure.modifierGroupOptionId ?? "") !== key) {
      return false;
    }
    if (outletId === null) return true;
    return failure.outletId === outletId;
  });
}
