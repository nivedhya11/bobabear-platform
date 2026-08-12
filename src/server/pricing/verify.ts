/**
 * Read-only verify for existing-menu pricing bootstrap (IMP-015).
 */
import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import path from "node:path";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../shared/catalog/menu";
import {
  BOOTSTRAP_PRICE_BOOK_ID,
  EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH,
  TAX_CATEGORY_RESTAURANT_SERVICE_ID,
} from "../../shared/pricing";
import {
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { brandsTable } from "../../platform/database/schema/organizations";
import type { Persistence } from "../persistence/types";
import type { ExistingMenuV1Manifest } from "../catalog/menu-import/manifest-types";
import {
  deriveExistingMenuVariantPrices,
  type ExistingMenuPricingArtifact,
} from "./bootstrap";
import { PricingBootstrapError } from "./errors";

export type PricingVerifyResult = Readonly<{
  ok: boolean;
  brandId: string;
  priceBookId: string;
  expectedVariantPriceCount: number;
  matchedVariantPriceCount: number;
  missingVariantIds: readonly string[];
  mismatchedVariantIds: readonly string[];
}>;

export async function verifyExistingMenuPricing(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
}): Promise<PricingVerifyResult> {
  const manifest = JSON.parse(
    readFileSync(
      path.join(options.projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH),
      "utf8",
    ),
  ) as ExistingMenuV1Manifest;
  const artifact = JSON.parse(
    readFileSync(
      path.join(options.projectRoot, EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH),
      "utf8",
    ),
  ) as ExistingMenuPricingArtifact;

  const derived = deriveExistingMenuVariantPrices(options.projectRoot);
  if (derived.length !== artifact.variant_prices.length) {
    throw new PricingBootstrapError(
      "PRICING_BOOTSTRAP_CONFLICT",
      "Derived count diverges from artifact during verify.",
    );
  }

  return options.persistence.withContext(async (ctx) => {
    const brandRows = await ctx.db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.code, manifest.brand.code))
      .limit(1);
    const brand = brandRows[0];
    if (!brand) {
      throw new PricingBootstrapError("validation", "Brand missing.");
    }

    const bookRows = await ctx.db
      .select()
      .from(priceBooksTable)
      .where(eq(priceBooksTable.id, BOOTSTRAP_PRICE_BOOK_ID))
      .limit(1);
    const book = bookRows[0];
    if (!book) {
      return {
        ok: false,
        brandId: brand.id,
        priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
        expectedVariantPriceCount: artifact.variant_prices.length,
        matchedVariantPriceCount: 0,
        missingVariantIds: artifact.variant_prices.map((r) => r.variant_id),
        mismatchedVariantIds: [],
      };
    }

    const missing: string[] = [];
    const mismatched: string[] = [];
    let matched = 0;

    for (const row of artifact.variant_prices) {
      const priceRows = await ctx.db
        .select()
        .from(priceBookVariantPricesTable)
        .where(
          and(
            eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID),
            eq(priceBookVariantPricesTable.variantId, row.variant_id),
          ),
        )
        .limit(1);
      const price = priceRows[0];
      if (!price) {
        missing.push(row.variant_id);
        continue;
      }
      if (
        price.amountPaise !== BigInt(row.amount_paise) ||
        price.taxCategoryId !== TAX_CATEGORY_RESTAURANT_SERVICE_ID ||
        price.allowTerritoryOverride ||
        price.allowOrganizationOverride ||
        price.allowOutletOverride
      ) {
        mismatched.push(row.variant_id);
        continue;
      }
      matched += 1;
    }

    return {
      ok: missing.length === 0 && mismatched.length === 0,
      brandId: brand.id,
      priceBookId: BOOTSTRAP_PRICE_BOOK_ID,
      expectedVariantPriceCount: artifact.variant_prices.length,
      matchedVariantPriceCount: matched,
      missingVariantIds: missing,
      mismatchedVariantIds: mismatched,
    };
  });
}
