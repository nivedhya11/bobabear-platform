/**
 * Effective price resolution (IMP-015).
 *
 * Hierarchy: Brand → Territory → Organization → Outlet.
 * Most-specific permitted value wins. Missing lower scope = inherit.
 * Illegal configured overrides fail closed (never silently skipped).
 */
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import {
  priceBookModifierPricesTable,
  priceBookBundleOptionPricesTable,
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import { outletsTable } from "../../platform/database/schema/organizations";
import type {
  PriceBookScopeType,
  ResolvedOutletVariantPrice,
  TaxInclusionMode,
} from "../../shared/pricing";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { PricingNotFoundError, PricingResolutionError } from "./errors";

type PriceBookRow = typeof priceBooksTable.$inferSelect;
type VariantPriceRow = typeof priceBookVariantPricesTable.$inferSelect;

async function loadOutlet(context: PersistenceQueryContext, outletId: string) {
  const rows = await context.db
    .select()
    .from(outletsTable)
    .where(eq(outletsTable.id, outletId))
    .limit(1);
  const outlet = rows[0];
  if (!outlet) {
    throw new PricingNotFoundError("outlet");
  }
  return outlet;
}

function isEffectiveAt(book: PriceBookRow, at: Date): boolean {
  if (book.lifecycleStatus !== "active") return false;
  if (book.effectiveFrom.getTime() > at.getTime()) return false;
  if (book.effectiveTo !== null && book.effectiveTo.getTime() <= at.getTime()) return false;
  return true;
}

async function findActivePriceBook(
  context: PersistenceQueryContext,
  args: {
    brandId: string;
    scopeType: PriceBookScopeType;
    territoryId: string | null;
    organizationId: string | null;
    outletId: string | null;
    at: Date;
  },
): Promise<PriceBookRow | null> {
  const conditions = [
    eq(priceBooksTable.brandId, args.brandId),
    eq(priceBooksTable.scopeType, args.scopeType),
    eq(priceBooksTable.lifecycleStatus, "active"),
    eq(priceBooksTable.salesChannel, "direct"),
    eq(priceBooksTable.currency, "INR"),
    lte(priceBooksTable.effectiveFrom, args.at),
    or(isNull(priceBooksTable.effectiveTo), sql`${priceBooksTable.effectiveTo} > ${args.at}`),
  ];

  if (args.scopeType === "brand") {
    conditions.push(isNull(priceBooksTable.territoryId));
    conditions.push(isNull(priceBooksTable.organizationId));
    conditions.push(isNull(priceBooksTable.outletId));
  } else if (args.scopeType === "territory") {
    conditions.push(eq(priceBooksTable.territoryId, args.territoryId!));
  } else if (args.scopeType === "organization") {
    conditions.push(eq(priceBooksTable.organizationId, args.organizationId!));
  } else {
    conditions.push(eq(priceBooksTable.outletId, args.outletId!));
  }

  const rows = await context.db
    .select()
    .from(priceBooksTable)
    .where(and(...conditions));

  const effective = rows.filter((b) => isEffectiveAt(b, args.at));
  if (effective.length === 0) return null;
  if (effective.length > 1) {
    throw new PricingResolutionError(
      "OVERRIDE_NOT_PERMITTED",
      "Multiple overlapping active price books at the same scope.",
    );
  }
  return effective[0]!;
}

async function loadVariantPrice(
  context: PersistenceQueryContext,
  priceBookId: string,
  variantId: string,
): Promise<VariantPriceRow | null> {
  const rows = await context.db
    .select()
    .from(priceBookVariantPricesTable)
    .where(
      and(
        eq(priceBookVariantPricesTable.priceBookId, priceBookId),
        eq(priceBookVariantPricesTable.variantId, variantId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function assertWithinEnvelope(
  amountPaise: bigint,
  brandEnvelope: VariantPriceRow,
): void {
  if (brandEnvelope.floorPaise !== null && amountPaise < brandEnvelope.floorPaise) {
    throw new PricingResolutionError(
      "OVERRIDE_OUT_OF_BOUNDS",
      "Override amount is below the Brand floor.",
    );
  }
  if (brandEnvelope.ceilingPaise !== null && amountPaise > brandEnvelope.ceilingPaise) {
    throw new PricingResolutionError(
      "OVERRIDE_OUT_OF_BOUNDS",
      "Override amount is above the Brand ceiling.",
    );
  }
}

export async function resolveOutletVariantPrice(
  context: PersistenceQueryContext,
  input: {
    readonly variantId: string;
    readonly outletId: string;
    readonly at: Date;
  },
): Promise<ResolvedOutletVariantPrice> {
  assertApplicationRole(context, "resolveOutletVariantPrice");
  const variantId = assertUuid(input.variantId, "variantId");
  const outletId = assertUuid(input.outletId, "outletId");
  const at = input.at;

  const outlet = await loadOutlet(context, outletId);
  const variantRows = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.id, variantId))
    .limit(1);
  const variant = variantRows[0];
  if (!variant || variant.brandId !== outlet.brandId) {
    throw new PricingNotFoundError("variant");
  }

  const brandBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    at,
  });
  if (!brandBook) {
    throw new PricingResolutionError("PRICE_MISSING", "No active Brand price book at the requested time.");
  }

  const brandPrice = await loadVariantPrice(context, brandBook.id, variantId);
  if (!brandPrice) {
    throw new PricingResolutionError("PRICE_MISSING", "Brand baseline variant price is missing.");
  }

  let winningBook = brandBook;
  let winningPrice = brandPrice;
  let overrideScope: PriceBookScopeType = "brand";

  const territoryBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "territory",
    territoryId: outlet.territoryId,
    organizationId: null,
    outletId: null,
    at,
  });
  if (territoryBook) {
    const territoryPrice = await loadVariantPrice(context, territoryBook.id, variantId);
    if (territoryPrice) {
      if (!brandPrice.allowTerritoryOverride) {
        throw new PricingResolutionError(
          "OVERRIDE_NOT_PERMITTED",
          "Territory override is not permitted by the Brand baseline.",
        );
      }
      assertWithinEnvelope(territoryPrice.amountPaise, brandPrice);
      winningBook = territoryBook;
      winningPrice = territoryPrice;
      overrideScope = "territory";
    }
  }

  const organizationBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "organization",
    territoryId: null,
    organizationId: outlet.organizationId,
    outletId: null,
    at,
  });
  if (organizationBook) {
    const organizationPrice = await loadVariantPrice(context, organizationBook.id, variantId);
    if (organizationPrice) {
      if (!brandPrice.allowOrganizationOverride) {
        throw new PricingResolutionError(
          "OVERRIDE_NOT_PERMITTED",
          "Organization override is not permitted by the Brand baseline.",
        );
      }
      assertWithinEnvelope(organizationPrice.amountPaise, brandPrice);
      winningBook = organizationBook;
      winningPrice = organizationPrice;
      overrideScope = "organization";
    }
  }

  const outletBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "outlet",
    territoryId: outlet.territoryId,
    organizationId: outlet.organizationId,
    outletId: outlet.id,
    at,
  });
  if (outletBook) {
    const outletPrice = await loadVariantPrice(context, outletBook.id, variantId);
    if (outletPrice) {
      if (!brandPrice.allowOutletOverride) {
        throw new PricingResolutionError(
          "OVERRIDE_NOT_PERMITTED",
          "Outlet override is not permitted by the Brand baseline.",
        );
      }
      assertWithinEnvelope(outletPrice.amountPaise, brandPrice);
      winningBook = outletBook;
      winningPrice = outletPrice;
      overrideScope = "outlet";
    }
  }

  return {
    amountPaise: winningPrice.amountPaise,
    currency: "INR",
    taxInclusionMode: brandBook.taxInclusionMode as TaxInclusionMode,
    taxCategoryId: brandPrice.taxCategoryId,
    brandPriceBookId: brandBook.id,
    winningPriceBookId: winningBook.id,
    overrideScope,
    decisionCode: "PRICE_RESOLVED",
  };
}

export async function resolveModifierPriceDelta(
  context: PersistenceQueryContext,
  input: {
    readonly outletId: string;
    readonly variantModifierGroupId: string;
    readonly modifierGroupOptionId: string;
    readonly quantity: number;
    readonly at: Date;
  },
): Promise<{ priceDeltaPaise: bigint; totalPaise: bigint; brandPriceBookId: string; winningPriceBookId: string }> {
  assertApplicationRole(context, "resolveModifierPriceDelta");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new PricingResolutionError("OVERRIDE_OUT_OF_BOUNDS", "quantity must be a non-negative integer.");
  }
  const outlet = await loadOutlet(context, assertUuid(input.outletId, "outletId"));
  const at = input.at;

  const brandBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    at,
  });
  if (!brandBook) {
    throw new PricingResolutionError("MODIFIER_PRICE_MISSING", "No active Brand price book.");
  }

  async function loadDelta(priceBookId: string) {
    const rows = await context.db
      .select()
      .from(priceBookModifierPricesTable)
      .where(
        and(
          eq(priceBookModifierPricesTable.priceBookId, priceBookId),
          eq(priceBookModifierPricesTable.variantModifierGroupId, input.variantModifierGroupId),
          eq(priceBookModifierPricesTable.modifierGroupOptionId, input.modifierGroupOptionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  const brandDelta = await loadDelta(brandBook.id);
  if (!brandDelta) {
    throw new PricingResolutionError(
      "MODIFIER_PRICE_MISSING",
      "Brand modifier price is missing (explicit zero required).",
    );
  }

  let winningBookId = brandBook.id;
  let delta = brandDelta.priceDeltaPaise;

  const scopes: Array<{
    scopeType: PriceBookScopeType;
    allow: boolean;
    territoryId: string | null;
    organizationId: string | null;
    outletId: string | null;
  }> = [
    {
      scopeType: "territory",
      allow: brandDelta.allowTerritoryOverride,
      territoryId: outlet.territoryId,
      organizationId: null,
      outletId: null,
    },
    {
      scopeType: "organization",
      allow: brandDelta.allowOrganizationOverride,
      territoryId: null,
      organizationId: outlet.organizationId,
      outletId: null,
    },
    {
      scopeType: "outlet",
      allow: brandDelta.allowOutletOverride,
      territoryId: outlet.territoryId,
      organizationId: outlet.organizationId,
      outletId: outlet.id,
    },
  ];

  for (const scope of scopes) {
    const book = await findActivePriceBook(context, {
      brandId: outlet.brandId,
      scopeType: scope.scopeType,
      territoryId: scope.territoryId,
      organizationId: scope.organizationId,
      outletId: scope.outletId,
      at,
    });
    if (!book) continue;
    const row = await loadDelta(book.id);
    if (!row) continue;
    if (!scope.allow) {
      throw new PricingResolutionError(
        "OVERRIDE_NOT_PERMITTED",
        `${scope.scopeType} modifier override is not permitted.`,
      );
    }
    winningBookId = book.id;
    delta = row.priceDeltaPaise;
  }

  return {
    priceDeltaPaise: delta,
    totalPaise: delta * BigInt(input.quantity),
    brandPriceBookId: brandBook.id,
    winningPriceBookId: winningBookId,
  };
}

export async function resolveBundleOptionPriceDelta(
  context: PersistenceQueryContext,
  input: {
    readonly outletId: string;
    readonly bundleGroupOptionId: string;
    readonly quantity: number;
    readonly at: Date;
  },
): Promise<{ priceDeltaPaise: bigint; totalPaise: bigint; brandPriceBookId: string; winningPriceBookId: string }> {
  assertApplicationRole(context, "resolveBundleOptionPriceDelta");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new PricingResolutionError("OVERRIDE_OUT_OF_BOUNDS", "quantity must be a non-negative integer.");
  }
  const outlet = await loadOutlet(context, assertUuid(input.outletId, "outletId"));
  const at = input.at;

  const brandBook = await findActivePriceBook(context, {
    brandId: outlet.brandId,
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    at,
  });
  if (!brandBook) {
    throw new PricingResolutionError("BUNDLE_OPTION_PRICE_MISSING", "No active Brand price book.");
  }

  async function loadDelta(priceBookId: string) {
    const rows = await context.db
      .select()
      .from(priceBookBundleOptionPricesTable)
      .where(
        and(
          eq(priceBookBundleOptionPricesTable.priceBookId, priceBookId),
          eq(priceBookBundleOptionPricesTable.bundleGroupOptionId, input.bundleGroupOptionId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  const brandDelta = await loadDelta(brandBook.id);
  if (!brandDelta) {
    throw new PricingResolutionError(
      "BUNDLE_OPTION_PRICE_MISSING",
      "Brand bundle option price is missing (explicit zero required).",
    );
  }

  let winningBookId = brandBook.id;
  let delta = brandDelta.priceDeltaPaise;

  const scopes: Array<{
    scopeType: PriceBookScopeType;
    allow: boolean;
    territoryId: string | null;
    organizationId: string | null;
    outletId: string | null;
  }> = [
    {
      scopeType: "territory",
      allow: brandDelta.allowTerritoryOverride,
      territoryId: outlet.territoryId,
      organizationId: null,
      outletId: null,
    },
    {
      scopeType: "organization",
      allow: brandDelta.allowOrganizationOverride,
      territoryId: null,
      organizationId: outlet.organizationId,
      outletId: null,
    },
    {
      scopeType: "outlet",
      allow: brandDelta.allowOutletOverride,
      territoryId: outlet.territoryId,
      organizationId: outlet.organizationId,
      outletId: outlet.id,
    },
  ];

  for (const scope of scopes) {
    const book = await findActivePriceBook(context, {
      brandId: outlet.brandId,
      scopeType: scope.scopeType,
      territoryId: scope.territoryId,
      organizationId: scope.organizationId,
      outletId: scope.outletId,
      at,
    });
    if (!book) continue;
    const row = await loadDelta(book.id);
    if (!row) continue;
    if (!scope.allow) {
      throw new PricingResolutionError(
        "OVERRIDE_NOT_PERMITTED",
        `${scope.scopeType} bundle option override is not permitted.`,
      );
    }
    winningBookId = book.id;
    delta = row.priceDeltaPaise;
  }

  return {
    priceDeltaPaise: delta,
    totalPaise: delta * BigInt(input.quantity),
    brandPriceBookId: brandBook.id,
    winningPriceBookId: winningBookId,
  };
}
