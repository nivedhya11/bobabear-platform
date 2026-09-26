/**
 * Shared PriceBook activation legality check.
 *
 * Projects the candidate as the active book at its exact scope and requires
 * every represented Variant and Modifier price to resolve for each outlet
 * in that scope. Illegal hierarchy states block activation. This check does
 * not persist, and it does not change resolver rules.
 */
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

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

type PriceBookRow = typeof priceBooksTable.$inferSelect;

function isInsideEffectiveWindow(at: Date, book: PriceBookRow): boolean {
  if (at.getTime() < book.effectiveFrom.getTime()) return false;
  if (book.effectiveTo !== null && at.getTime() >= book.effectiveTo.getTime()) return false;
  return true;
}

function uniqueInstants(instants: readonly Date[]): Date[] {
  const byTime = new Map<number, Date>();
  for (const instant of instants) byTime.set(instant.getTime(), instant);
  return [...byTime.values()];
}

/**
 * Instants when the candidate would actually be the active book. A future
 * book is judged at its start (and at later Brand transitions inside its
 * window), not against today's Brand book via the preview overlay.
 */
function candidateEvaluationInstants(
  book: PriceBookRow,
  extraAt: Date,
  futureBrandStarts: readonly Date[],
  now: Date,
): Date[] {
  const instants: Date[] = [];
  if (isInsideEffectiveWindow(now, book)) instants.push(now);
  if (book.effectiveFrom.getTime() > now.getTime()) instants.push(book.effectiveFrom);
  if (book.effectiveTo !== null && book.effectiveTo.getTime() > now.getTime()) {
    const end = new Date(book.effectiveTo.getTime() - 1);
    if (isInsideEffectiveWindow(end, book)) instants.push(end);
  }
  for (const start of futureBrandStarts) {
    if (isInsideEffectiveWindow(start, book)) instants.push(start);
  }
  if (isInsideEffectiveWindow(extraAt, book)) instants.push(extraAt);
  if (instants.length === 0) instants.push(book.effectiveFrom);
  return uniqueInstants(instants);
}

async function futureBrandStartInstants(
  context: PersistenceQueryContext,
  book: PriceBookRow,
  now: Date,
): Promise<Date[]> {
  if (book.scopeType === "brand") return [];
  const rows = await context.db
    .select({ effectiveFrom: priceBooksTable.effectiveFrom })
    .from(priceBooksTable)
    .where(
      and(
        eq(priceBooksTable.brandId, book.brandId),
        eq(priceBooksTable.scopeType, "brand"),
        eq(priceBooksTable.lifecycleStatus, "active"),
        eq(priceBooksTable.salesChannel, "direct"),
        eq(priceBooksTable.currency, "INR"),
        isNull(priceBooksTable.territoryId),
        isNull(priceBooksTable.organizationId),
        isNull(priceBooksTable.outletId),
      ),
    );
  return rows
    .map((row) => row.effectiveFrom)
    .filter((effectiveFrom) => effectiveFrom.getTime() > now.getTime());
}

function isEffectiveBrandBook(book: PriceBookRow, at: Date): boolean {
  if (book.lifecycleStatus !== "active") return false;
  return isInsideEffectiveWindow(at, book);
}

async function findEffectiveBrandBook(
  context: PersistenceQueryContext,
  brandId: string,
  at: Date,
): Promise<PriceBookRow | null> {
  const rows = await context.db
    .select()
    .from(priceBooksTable)
    .where(
      and(
        eq(priceBooksTable.brandId, brandId),
        eq(priceBooksTable.scopeType, "brand"),
        eq(priceBooksTable.lifecycleStatus, "active"),
        eq(priceBooksTable.salesChannel, "direct"),
        eq(priceBooksTable.currency, "INR"),
        isNull(priceBooksTable.territoryId),
        isNull(priceBooksTable.organizationId),
        isNull(priceBooksTable.outletId),
        lte(priceBooksTable.effectiveFrom, at),
        or(isNull(priceBooksTable.effectiveTo), sql`${priceBooksTable.effectiveTo} > ${at}`),
      ),
    );
  const effective = rows.filter((row) => isEffectiveBrandBook(row, at));
  if (effective.length > 1) {
    throw new PricingResolutionError(
      "OVERRIDE_NOT_PERMITTED",
      "Multiple overlapping active price books at the same scope.",
    );
  }
  return effective[0] ?? null;
}

function variantScopeDeniedMessage(scopeType: string): string {
  if (scopeType === "territory") {
    return "Territory override is not permitted by the Brand baseline.";
  }
  if (scopeType === "organization") {
    return "Organization override is not permitted by the Brand baseline.";
  }
  return "Outlet override is not permitted by the Brand baseline.";
}

function modifierScopeDeniedMessage(scopeType: string): string {
  if (scopeType === "territory") return "Territory modifier override is not permitted.";
  if (scopeType === "organization") return "Organization modifier override is not permitted.";
  return "Outlet modifier override is not permitted.";
}

function scopeAllowsVariantOverride(
  scopeType: string,
  brandPrice: typeof priceBookVariantPricesTable.$inferSelect,
): boolean {
  if (scopeType === "territory") return brandPrice.allowTerritoryOverride;
  if (scopeType === "organization") return brandPrice.allowOrganizationOverride;
  return brandPrice.allowOutletOverride;
}

function scopeAllowsModifierOverride(
  scopeType: string,
  brandPrice: typeof priceBookModifierPricesTable.$inferSelect,
): boolean {
  if (scopeType === "territory") return brandPrice.allowTerritoryOverride;
  if (scopeType === "organization") return brandPrice.allowOrganizationOverride;
  return brandPrice.allowOutletOverride;
}

function envelopeFailure(
  amountPaise: bigint,
  brandPrice: typeof priceBookVariantPricesTable.$inferSelect,
): PriceBookActivationResolutionFailure["code"] | null {
  if (brandPrice.floorPaise !== null && amountPaise < brandPrice.floorPaise) {
    return "OVERRIDE_OUT_OF_BOUNDS";
  }
  if (brandPrice.ceilingPaise !== null && amountPaise > brandPrice.ceilingPaise) {
    return "OVERRIDE_OUT_OF_BOUNDS";
  }
  return null;
}

function envelopeMessage(
  amountPaise: bigint,
  brandPrice: typeof priceBookVariantPricesTable.$inferSelect,
): string {
  if (brandPrice.floorPaise !== null && amountPaise < brandPrice.floorPaise) {
    return "Override amount is below the Brand floor.";
  }
  return "Override amount is above the Brand ceiling.";
}

function dedupeFailures(
  failures: readonly PriceBookActivationResolutionFailure[],
): PriceBookActivationResolutionFailure[] {
  const seen = new Set<string>();
  const unique: PriceBookActivationResolutionFailure[] = [];
  for (const failure of failures) {
    const key = [
      failure.code,
      failure.message,
      failure.subject,
      failure.variantId,
      failure.outletId,
      failure.variantModifierGroupId,
      failure.modifierGroupOptionId,
    ].join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(failure);
  }
  return unique;
}

/**
 * Lower-scope books must still be checked when the scope has no outlets yet.
 * The resolver is outlet-hosted, so this applies the same Brand allow and
 * envelope rules directly to the candidate rows.
 */
async function collectFailuresWithoutOutlets(
  context: PersistenceQueryContext,
  book: PriceBookRow,
  at: Date,
  variantRows: readonly (typeof priceBookVariantPricesTable.$inferSelect)[],
  modifierRows: readonly (typeof priceBookModifierPricesTable.$inferSelect)[],
  failures: PriceBookActivationResolutionFailure[],
): Promise<void> {
  let brandBook: PriceBookRow | null;
  try {
    brandBook = await findEffectiveBrandBook(context, book.brandId, at);
  } catch (error) {
    for (const row of variantRows) {
      recordResolutionFailure(failures, error, {
        subject: "variant",
        variantId: row.variantId,
        outletId: null,
        variantModifierGroupId: null,
        modifierGroupOptionId: null,
      });
    }
    for (const row of modifierRows) {
      recordResolutionFailure(failures, error, {
        subject: "modifier",
        variantId: null,
        outletId: null,
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
      });
    }
    return;
  }

  for (const row of variantRows) {
    if (!brandBook) {
      failures.push({
        code: "PRICE_MISSING",
        message: "No active Brand price book at the requested time.",
        subject: "variant",
        variantId: row.variantId,
        outletId: null,
        variantModifierGroupId: null,
        modifierGroupOptionId: null,
      });
      continue;
    }
    const brandPrices = await context.db
      .select()
      .from(priceBookVariantPricesTable)
      .where(
        and(
          eq(priceBookVariantPricesTable.priceBookId, brandBook.id),
          eq(priceBookVariantPricesTable.variantId, row.variantId),
        ),
      )
      .limit(1);
    const brandPrice = brandPrices[0];
    if (!brandPrice) {
      failures.push({
        code: "PRICE_MISSING",
        message: "Brand baseline variant price is missing.",
        subject: "variant",
        variantId: row.variantId,
        outletId: null,
        variantModifierGroupId: null,
        modifierGroupOptionId: null,
      });
      continue;
    }
    if (!scopeAllowsVariantOverride(book.scopeType, brandPrice)) {
      failures.push({
        code: "OVERRIDE_NOT_PERMITTED",
        message: variantScopeDeniedMessage(book.scopeType),
        subject: "variant",
        variantId: row.variantId,
        outletId: null,
        variantModifierGroupId: null,
        modifierGroupOptionId: null,
      });
      continue;
    }
    if (envelopeFailure(row.amountPaise, brandPrice)) {
      failures.push({
        code: "OVERRIDE_OUT_OF_BOUNDS",
        message: envelopeMessage(row.amountPaise, brandPrice),
        subject: "variant",
        variantId: row.variantId,
        outletId: null,
        variantModifierGroupId: null,
        modifierGroupOptionId: null,
      });
    }
  }

  for (const row of modifierRows) {
    if (!brandBook) {
      failures.push({
        code: "MODIFIER_PRICE_MISSING",
        message: "No active Brand price book.",
        subject: "modifier",
        variantId: null,
        outletId: null,
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
      });
      continue;
    }
    const brandPrices = await context.db
      .select()
      .from(priceBookModifierPricesTable)
      .where(
        and(
          eq(priceBookModifierPricesTable.priceBookId, brandBook.id),
          eq(priceBookModifierPricesTable.variantModifierGroupId, row.variantModifierGroupId),
          eq(priceBookModifierPricesTable.modifierGroupOptionId, row.modifierGroupOptionId),
        ),
      )
      .limit(1);
    const brandPrice = brandPrices[0];
    if (!brandPrice) {
      failures.push({
        code: "MODIFIER_PRICE_MISSING",
        message: "Brand modifier price is missing (explicit zero required).",
        subject: "modifier",
        variantId: null,
        outletId: null,
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
      });
      continue;
    }
    if (!scopeAllowsModifierOverride(book.scopeType, brandPrice)) {
      failures.push({
        code: "OVERRIDE_NOT_PERMITTED",
        message: modifierScopeDeniedMessage(book.scopeType),
        subject: "modifier",
        variantId: null,
        outletId: null,
        variantModifierGroupId: row.variantModifierGroupId,
        modifierGroupOptionId: row.modifierGroupOptionId,
      });
    }
  }
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
  const now = new Date();
  const instants = candidateEvaluationInstants(
    book,
    input.at,
    await futureBrandStartInstants(context, book, now),
    now,
  );
  const failures: PriceBookActivationResolutionFailure[] = [];

  for (const at of instants) {
    if (outletIds.length === 0) {
      if (book.scopeType !== "brand") {
        await collectFailuresWithoutOutlets(context, book, at, variantRows, modifierRows, failures);
      }
      continue;
    }
    for (const row of variantRows) {
      for (const outletId of outletIds) {
        try {
          await resolveOutletVariantPrice(context, {
            variantId: row.variantId,
            outletId,
            at,
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
            at,
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
  }

  return dedupeFailures(failures);
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
