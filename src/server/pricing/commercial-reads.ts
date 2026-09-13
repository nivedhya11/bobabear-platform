/**
 * Bounded Brand Pricing commercial inspection (IMP-036F F4).
 */
import { and, asc, eq } from "drizzle-orm";

import {
  priceBookModifierPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { requirePricingRead } from "./authorize-pricing";
import { PricingNotFoundError, PricingResolutionError } from "./errors";
import { loadOutletsInPriceBookScope } from "./price-books";
import { resolveBrandVariantPrice, resolveOutletVariantPrice } from "./resolve-price";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { rowToBook, type PriceBookRecord } from "./price-books";

export type PriceBookVariantPriceRow = Readonly<{
  id: string;
  variantId: string;
  amountPaise: bigint;
  taxCategoryId: string;
  allowTerritoryOverride: boolean;
  allowOrganizationOverride: boolean;
  allowOutletOverride: boolean;
  floorPaise: bigint | null;
  ceilingPaise: bigint | null;
}>;

export type PriceBookModifierPriceRow = Readonly<{
  id: string;
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  priceDeltaPaise: bigint;
  allowTerritoryOverride: boolean;
  allowOrganizationOverride: boolean;
  allowOutletOverride: boolean;
}>;

export type PriceBookInspection = Readonly<{
  priceBook: PriceBookRecord;
  variantPrices: readonly PriceBookVariantPriceRow[];
  modifierPrices: readonly PriceBookModifierPriceRow[];
  customerEffective: readonly Readonly<{
    variantId: string;
    outletId: string | null;
    amountPaise: string | null;
    code: string;
  }>[];
}>;

export async function listBrandPriceBooks(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string }>,
): Promise<{ brandId: string; priceBooks: readonly PriceBookRecord[] }> {
  assertApplicationRole(context, "listBrandPriceBooks");
  const brandId = assertUuid(input.brandId, "brandId");
  await requirePricingRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(priceBooksTable)
    .where(eq(priceBooksTable.brandId, brandId))
    .orderBy(asc(priceBooksTable.createdAt), asc(priceBooksTable.id));
  return { brandId, priceBooks: rows.map(rowToBook) };
}

export async function inspectBrandPriceBook(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; priceBookId: string; at?: Date }>,
): Promise<PriceBookInspection> {
  assertApplicationRole(context, "inspectBrandPriceBook");
  const brandId = assertUuid(input.brandId, "brandId");
  const priceBookId = assertUuid(input.priceBookId, "priceBookId");
  await requirePricingRead(context, input.actor, brandId);

  const bookRows = await context.db
    .select()
    .from(priceBooksTable)
    .where(and(eq(priceBooksTable.id, priceBookId), eq(priceBooksTable.brandId, brandId)))
    .limit(1);
  const bookRow = bookRows[0];
  if (!bookRow) throw new PricingNotFoundError("price_book");
  const priceBook = rowToBook(bookRow);

  const variantRows = await context.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(eq(priceBookVariantPricesTable.priceBookId, priceBookId))
    .orderBy(asc(priceBookVariantPricesTable.createdAt));
  const variantPrices: PriceBookVariantPriceRow[] = variantRows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    amountPaise: row.amountPaise,
    taxCategoryId: row.taxCategoryId,
    allowTerritoryOverride: row.allowTerritoryOverride,
    allowOrganizationOverride: row.allowOrganizationOverride,
    allowOutletOverride: row.allowOutletOverride,
    floorPaise: row.floorPaise,
    ceilingPaise: row.ceilingPaise,
  }));

  const modifierRows = await context.db
    .select()
    .from(priceBookModifierPricesTable)
    .where(eq(priceBookModifierPricesTable.priceBookId, priceBookId))
    .orderBy(asc(priceBookModifierPricesTable.createdAt));
  const modifierPrices: PriceBookModifierPriceRow[] = modifierRows.map((row) => ({
    id: row.id,
    variantModifierGroupId: row.variantModifierGroupId,
    modifierGroupOptionId: row.modifierGroupOptionId,
    priceDeltaPaise: row.priceDeltaPaise,
    allowTerritoryOverride: row.allowTerritoryOverride,
    allowOrganizationOverride: row.allowOrganizationOverride,
    allowOutletOverride: row.allowOutletOverride,
  }));

  const at = input.at ?? new Date();
  const customerEffective: Array<PriceBookInspection["customerEffective"][number]> = [];
  const outletContexts: Array<string | null> =
    priceBook.scopeType === "brand"
      ? [null]
      : (await loadOutletsInPriceBookScope(context, priceBook)).map((outlet) => outlet.id);
  for (const row of variantPrices) {
    for (const outletId of outletContexts) {
      try {
        if (outletId) {
          const resolved = await resolveOutletVariantPrice(context, {
            variantId: row.variantId,
            outletId,
            at,
          });
          customerEffective.push({
            variantId: row.variantId,
            outletId,
            amountPaise: resolved.amountPaise.toString(10),
            code: "PRICE_RESOLVED",
          });
        } else {
          const resolved = await resolveBrandVariantPrice(context, {
            brandId,
            variantId: row.variantId,
            at,
          });
          customerEffective.push({
            variantId: row.variantId,
            outletId: null,
            amountPaise: resolved.amountPaise.toString(10),
            code: "PRICE_RESOLVED",
          });
        }
      } catch (error) {
        if (error instanceof PricingResolutionError) {
          customerEffective.push({
            variantId: row.variantId,
            outletId,
            amountPaise: null,
            code: error.pricingErrorCode,
          });
          continue;
        }
        throw error;
      }
    }
  }

  return { priceBook, variantPrices, modifierPrices, customerEffective };
}
