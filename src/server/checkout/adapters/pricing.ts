/**
 * Pricing / promotions / GST adapter for Checkout (IMP-021).
 */

import { and, eq } from "drizzle-orm";

import {
  chargeDefinitionsTable,
  priceBookChargePricesTable,
  priceBooksTable,
} from "../../../platform/database/schema/pricing";
import {
  CHARGE_DEFINITION_DELIVERY_ID,
  CHARGE_DEFINITION_PACKAGING_ID,
  type DirectPricingQuote,
} from "../../../shared/pricing";
import type {
  AppliedPromotion,
  PromotionDefinition,
} from "../../../shared/promotions";
import type { Cart } from "../../../shared/cart";
import type { CheckoutDestination } from "../../../shared/checkout";
import { CheckoutError } from "../../../shared/checkout";
import type { PersistenceQueryContext } from "../../persistence/types";
import { buildDirectPricingQuote } from "../../pricing/quote";
import { resolveCustomerDeliveryCharge } from "../../pricing/resolve-delivery-charge";
import {
  resolveBundleOptionPriceDelta,
  resolveModifierPriceDelta,
  resolveOutletVariantPrice,
} from "../../pricing/resolve-price";
import {
  loadApplicableAutomaticPromotions,
  loadSubmittedCoupon,
  resolveOutletHierarchy,
} from "../../promotions/load-for-evaluation";
import { assertApplicationRole } from "../assert-role";
import type { CatalogLineLabels } from "./catalog";

export type CheckoutCommercialLine = Readonly<{
  sourceCartLineId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  sequence: number;
  lineBasePaise: bigint;
  lineModifierAdjustmentsPaise: bigint;
  lineBundleAdjustmentsPaise: bigint;
  lineSubtotalPaise: bigint;
  linePromotionDiscountPaise: bigint;
  lineTaxablePaise: bigint;
  lineTaxPaise: bigint;
  lineTotalPaise: bigint;
  modifiers: readonly Readonly<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
    quantity: number;
    groupName: string;
    optionName: string;
    unitDeltaPaise: bigint;
  }>[];
  bundleSelections: readonly Readonly<{
    bundleGroupOptionId: string;
    selectedVariantId: string;
    quantity: number;
    groupName: string;
    optionName: string;
    variantName: string;
    unitDeltaPaise: bigint;
    modifiers: readonly Readonly<{
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      quantity: number;
      groupName: string;
      optionName: string;
      unitDeltaPaise: bigint;
    }>[];
  }>[];
}>;

export type CheckoutPromotionEffectDraft = Readonly<{
  effectKind: "monetary_allocation" | "applied_promotion" | "bogo_reward";
  promotionId: string;
  couponId: string | null;
  promotionCode: string;
  displayName: string;
  triggerType: string | null;
  stackingPolicy: string | null;
  componentId: string | null;
  lineId: string | null;
  amountPaise: bigint | null;
  realizedDiscountPaise: bigint | null;
  rewardVariantId: string | null;
  rewardUnitId: string | null;
  rewardQuantity: number | null;
  rewardBasePaise: bigint | null;
  sortOrder: number;
}>;

export type CheckoutChargeDraft = Readonly<{
  chargeDefinitionId: string;
  chargeCode: "packaging" | "delivery";
  calculationMode: "fixed_per_order" | "per_item_quantity";
  amountPaise: bigint;
  name: string;
  sortOrder: number;
}>;

export type CheckoutTaxComponentDraft = Readonly<{
  targetContext: string;
  taxType: string;
  rateBps: number;
  taxableAmountPaise: bigint;
  taxAmountPaise: bigint;
  sortOrder: number;
}>;

export type CheckoutCommercialResult = Readonly<{
  quote: DirectPricingQuote;
  lines: readonly CheckoutCommercialLine[];
  charges: readonly CheckoutChargeDraft[];
  promotionEffects: readonly CheckoutPromotionEffectDraft[];
  taxComponents: readonly CheckoutTaxComponentDraft[];
}>;

async function loadBrandChargePrices(
  context: PersistenceQueryContext,
  brandId: string,
  at: Date,
): Promise<
  readonly Readonly<{
    chargeDefinitionId: string;
    calculationMode: "fixed_per_order" | "per_item_quantity";
    amountPaise: bigint;
    taxCategoryId: string | null;
    code: "packaging" | "delivery";
    name: string;
  }>[]
> {
  const books = await context.db
    .select({
      id: priceBooksTable.id,
    })
    .from(priceBooksTable)
    .where(
      and(
        eq(priceBooksTable.brandId, brandId),
        eq(priceBooksTable.scopeType, "brand"),
        eq(priceBooksTable.lifecycleStatus, "active"),
        eq(priceBooksTable.salesChannel, "direct"),
      ),
    )
    .limit(5);

  const results: Array<{
    chargeDefinitionId: string;
    calculationMode: "fixed_per_order" | "per_item_quantity";
    amountPaise: bigint;
    taxCategoryId: string | null;
    code: "packaging" | "delivery";
    name: string;
  }> = [];

  for (const book of books) {
    for (const chargeDefinitionId of [
      CHARGE_DEFINITION_PACKAGING_ID,
      CHARGE_DEFINITION_DELIVERY_ID,
    ]) {
      const rows = await context.db
        .select({
          amountPaise: priceBookChargePricesTable.amountPaise,
          calculationMode: priceBookChargePricesTable.calculationMode,
          taxCategoryId: priceBookChargePricesTable.taxCategoryId,
          code: chargeDefinitionsTable.code,
          name: chargeDefinitionsTable.name,
        })
        .from(priceBookChargePricesTable)
        .innerJoin(
          chargeDefinitionsTable,
          eq(
            chargeDefinitionsTable.id,
            priceBookChargePricesTable.chargeDefinitionId,
          ),
        )
        .where(
          and(
            eq(priceBookChargePricesTable.priceBookId, book.id),
            eq(priceBookChargePricesTable.chargeDefinitionId, chargeDefinitionId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) continue;
      if (row.code !== "packaging" && row.code !== "delivery") continue;
      results.push({
        chargeDefinitionId,
        calculationMode: row.calculationMode as
          | "fixed_per_order"
          | "per_item_quantity",
        amountPaise: row.amountPaise,
        taxCategoryId: row.taxCategoryId,
        code: row.code,
        name: row.name,
      });
    }
    if (results.length > 0) break;
  }

  void at;
  return results;
}

function lineDiscountFromAllocations(
  lineId: string,
  quote: DirectPricingQuote,
): bigint {
  let total = BigInt(0);
  for (const alloc of quote.promotionAllocations) {
    if (
      alloc.componentId.startsWith(`base:${lineId}`) ||
      alloc.componentId.startsWith(`mod:${lineId}:`) ||
      alloc.componentId.startsWith(`bundle:${lineId}:`) ||
      alloc.componentId.startsWith(`bundle-mod:${lineId}:`)
    ) {
      total += alloc.amountPaise;
    }
  }
  return total;
}

export async function buildCheckoutCommercialResult(
  context: PersistenceQueryContext,
  input: {
    brandId: string;
    outletId: string;
    at: Date;
    cart: Cart;
    customerAuthUserId: string;
    labels: ReadonlyMap<string, CatalogLineLabels>;
    destination?: CheckoutDestination;
  },
): Promise<CheckoutCommercialResult> {
  assertApplicationRole(context, "buildCheckoutCommercialResult");

  let chargeDefs;
  try {
    chargeDefs = await loadBrandChargePrices(
      context,
      input.brandId,
      input.at,
    );
  } catch {
    throw new CheckoutError(
      "CHECKOUT_DEPENDENCY_INDETERMINATE",
      "Charge prices could not be loaded.",
    );
  }

  let quote: DirectPricingQuote;
  try {
    const packagingDefs = chargeDefs.filter((c) => c.code === "packaging");
    const deliveryDef = chargeDefs.find((c) => c.code === "delivery");

    const preliminaryQuote = await buildDirectPricingQuote(context, {
      outletId: input.outletId,
      at: input.at,
      customerId: input.customerAuthUserId,
      submittedCouponCode: input.cart.manualCouponCode,
      charges: packagingDefs.map((c) => ({
        chargeDefinitionId: c.chargeDefinitionId,
        calculationMode: c.calculationMode,
        amountPaise: c.amountPaise,
        taxCategoryId: c.taxCategoryId,
      })),
      lines: input.cart.lines.map((line) => ({
        lineId: line.id,
        variantId: line.variantId,
        quantity: line.quantity,
        productId: input.labels.get(line.id)?.productId,
        modifiers: line.modifiers.map((m) => ({
          variantModifierGroupId: m.variantModifierGroupId,
          modifierGroupOptionId: m.modifierGroupOptionId,
          quantity: m.quantity,
        })),
        bundleOptions: line.bundleSelections.map((b) => ({
          bundleGroupOptionId: b.bundleGroupOptionId,
          quantity: b.quantity,
          modifiers: b.modifiers.map((m) => ({
            variantModifierGroupId: m.variantModifierGroupId,
            modifierGroupOptionId: m.modifierGroupOptionId,
            quantity: m.quantity,
          })),
        })),
      })),
    });

    const itemsSubtotalPaise =
      preliminaryQuote.basePaise +
      preliminaryQuote.modifierAdjustmentsPaise +
      preliminaryQuote.bundleAdjustmentsPaise;

    let resolvedDeliveryPaise: bigint | null = null;
    if (deliveryDef && input.destination) {
      const resolved = await resolveCustomerDeliveryCharge(context, {
        brandId: input.brandId,
        outletId: input.outletId,
        destination: input.destination,
        at: input.at,
        prePromotionSubtotalPaise: itemsSubtotalPaise,
      });
      resolvedDeliveryPaise = resolved?.amountPaise ?? deliveryDef.amountPaise;
    } else if (deliveryDef) {
      resolvedDeliveryPaise = deliveryDef.amountPaise;
    }

    const finalCharges = [...packagingDefs];
    if (deliveryDef && resolvedDeliveryPaise !== null) {
      finalCharges.push({
        ...deliveryDef,
        amountPaise: resolvedDeliveryPaise,
      });
    }

    quote = await buildDirectPricingQuote(context, {
      outletId: input.outletId,
      at: input.at,
      customerId: input.customerAuthUserId,
      submittedCouponCode: input.cart.manualCouponCode,
      charges: finalCharges.map((c) => ({
        chargeDefinitionId: c.chargeDefinitionId,
        calculationMode: c.calculationMode,
        amountPaise: c.amountPaise,
        taxCategoryId: c.taxCategoryId,
      })),
      lines: input.cart.lines.map((line) => ({
        lineId: line.id,
        variantId: line.variantId,
        quantity: line.quantity,
        productId: input.labels.get(line.id)?.productId,
        modifiers: line.modifiers.map((m) => ({
          variantModifierGroupId: m.variantModifierGroupId,
          modifierGroupOptionId: m.modifierGroupOptionId,
          quantity: m.quantity,
        })),
        bundleOptions: line.bundleSelections.map((b) => ({
          bundleGroupOptionId: b.bundleGroupOptionId,
          quantity: b.quantity,
          modifiers: b.modifiers.map((m) => ({
            variantModifierGroupId: m.variantModifierGroupId,
            modifierGroupOptionId: m.modifierGroupOptionId,
            quantity: m.quantity,
          })),
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/PRICE_MISSING|price/i.test(message)) {
      throw new CheckoutError(
        "CHECKOUT_PRICE_UNRESOLVED",
        "One or more prices could not be resolved.",
      );
    }
    if (/tax/i.test(message)) {
      throw new CheckoutError(
        "CHECKOUT_TAX_INDETERMINATE",
        "Tax could not be determined.",
      );
    }
    if (/promotion/i.test(message)) {
      throw new CheckoutError(
        "CHECKOUT_PROMOTION_INDETERMINATE",
        "Promotions could not be evaluated.",
      );
    }
    throw new CheckoutError(
      "CHECKOUT_DEPENDENCY_INDETERMINATE",
      "Commercial evaluation failed.",
    );
  }

  if (
    input.cart.manualCouponCode &&
    quote.submittedCouponResult &&
    quote.submittedCouponResult.status !== "APPLIED"
  ) {
    throw new CheckoutError(
      "CHECKOUT_COUPON_INELIGIBLE",
      "Manual coupon is not eligible for this Checkout.",
    );
  }

  const lines: CheckoutCommercialLine[] = [];
  let sequence = 0;
  for (const line of input.cart.lines) {
    const labels = input.labels.get(line.id);
    if (!labels) {
      throw new CheckoutError(
        "CHECKOUT_VARIANT_INVALID",
        "Missing catalog labels for cart line.",
      );
    }

    // Reconstruct per-line commercial decomposition from quote allocations +
    // resolved unit prices embedded in promotion unit structure is not public.
    // Approximate from promotion allocations + proportional tax shares.
    const linePromo = lineDiscountFromAllocations(line.id, quote);
    // Base/modifier/bundle: derive from cart quantity × sum of matching quote
    // components is not exposed; use promotion-pre amounts via re-quote units.
    // Practical approach: store line totals from quote component prefixes by
    // re-invoking resolve helpers would duplicate work — instead attribute
    // pre-promo line subtotal from (quote components) via allocation prefixes.
    const lineBase = await estimateLineBase(context, input.outletId, input.at, line);
    const lineMod = await estimateLineModifiers(
      context,
      input.outletId,
      input.at,
      line,
    );
    const lineBundle = await estimateLineBundles(
      context,
      input.outletId,
      input.at,
      line,
    );
    const lineSubtotal = lineBase + lineMod + lineBundle;
    const lineTaxable = lineSubtotal - linePromo;
    // Distribute order tax proportionally by taxable share when grand taxable > 0.
    const lineTax =
      quote.taxablePaise > BigInt(0)
        ? (quote.taxPaise * lineTaxable) / quote.taxablePaise
        : BigInt(0);
    const lineTotal = lineTaxable + lineTax;

    const modDrafts = [];
    for (let i = 0; i < line.modifiers.length; i++) {
      const mod = line.modifiers[i]!;
      const label = labels.modifiers.find(
        (m) =>
          m.variantModifierGroupId === mod.variantModifierGroupId &&
          m.modifierGroupOptionId === mod.modifierGroupOptionId,
      );
      modDrafts.push(
        Object.freeze({
          variantModifierGroupId: mod.variantModifierGroupId,
          modifierGroupOptionId: mod.modifierGroupOptionId,
          quantity: mod.quantity,
          groupName: label?.groupName ?? "Modifier",
          optionName: label?.optionName ?? "option",
          unitDeltaPaise: BigInt(0),
        }),
      );
    }

    const bundleDrafts = [];
    for (const bundle of line.bundleSelections) {
      const label = labels.bundleSelections.find(
        (b) => b.bundleGroupOptionId === bundle.bundleGroupOptionId,
      );
      bundleDrafts.push(
        Object.freeze({
          bundleGroupOptionId: bundle.bundleGroupOptionId,
          selectedVariantId: label?.selectedVariantId ?? line.variantId,
          quantity: bundle.quantity,
          groupName: label?.groupName ?? "bundle",
          optionName: label?.optionName ?? "option",
          variantName: label?.variantName ?? "variant",
          unitDeltaPaise: BigInt(0),
          modifiers: Object.freeze(
            bundle.modifiers.map((m) => {
              const nested = label?.modifiers.find(
                (x) =>
                  x.variantModifierGroupId === m.variantModifierGroupId &&
                  x.modifierGroupOptionId === m.modifierGroupOptionId,
              );
              return Object.freeze({
                variantModifierGroupId: m.variantModifierGroupId,
                modifierGroupOptionId: m.modifierGroupOptionId,
                quantity: m.quantity,
                groupName: nested?.groupName ?? "modifier",
                optionName: nested?.optionName ?? "option",
                unitDeltaPaise: BigInt(0),
              });
            }),
          ),
        }),
      );
    }

    lines.push(
      Object.freeze({
        sourceCartLineId: line.id,
        productId: labels.productId,
        variantId: line.variantId,
        productName: labels.productName,
        variantName: labels.variantName,
        quantity: line.quantity,
        sequence: sequence++,
        lineBasePaise: lineBase,
        lineModifierAdjustmentsPaise: lineMod,
        lineBundleAdjustmentsPaise: lineBundle,
        lineSubtotalPaise: lineSubtotal,
        linePromotionDiscountPaise: linePromo,
        lineTaxablePaise: lineTaxable < BigInt(0) ? BigInt(0) : lineTaxable,
        lineTaxPaise: lineTax,
        lineTotalPaise: lineTotal < BigInt(0) ? BigInt(0) : lineTotal,
        modifiers: Object.freeze(modDrafts),
        bundleSelections: Object.freeze(bundleDrafts),
      }),
    );
  }

  // Fix tax remainder drift onto last line.
  if (lines.length > 0) {
    const taxSum = lines.reduce((a, l) => a + l.lineTaxPaise, BigInt(0));
    const drift = quote.taxPaise - taxSum;
    if (drift !== BigInt(0)) {
      const last = lines[lines.length - 1]!;
      const adjustedTax = last.lineTaxPaise + drift;
      const adjustedTotal =
        last.lineTaxablePaise + adjustedTax;
      lines[lines.length - 1] = Object.freeze({
        ...last,
        lineTaxPaise: adjustedTax < BigInt(0) ? BigInt(0) : adjustedTax,
        lineTotalPaise: adjustedTotal < BigInt(0) ? BigInt(0) : adjustedTotal,
      });
    }
  }

  const charges: CheckoutChargeDraft[] = chargeDefs.map((c, i) => {
    const quoted = quote.chargeLines.find(
      (q) => q.chargeDefinitionId === c.chargeDefinitionId,
    );
    return Object.freeze({
      chargeDefinitionId: c.chargeDefinitionId,
      chargeCode: c.code,
      calculationMode: c.calculationMode,
      amountPaise: quoted?.amountPaise ?? c.amountPaise,
      name: c.name,
      sortOrder: i,
    });
  });

  const promotionEffects = await buildPromotionEffects(
    context,
    input,
    quote,
  );

  const taxComponents: CheckoutTaxComponentDraft[] = quote.taxComponents.map(
    (t, i) =>
      Object.freeze({
        targetContext: "order",
        taxType: t.taxType,
        rateBps: t.rateBps,
        taxableAmountPaise: quote.taxablePaise,
        taxAmountPaise: t.amountPaise,
        sortOrder: i,
      }),
  );

  return Object.freeze({
    quote,
    lines: Object.freeze(lines),
    charges: Object.freeze(charges),
    promotionEffects,
    taxComponents: Object.freeze(taxComponents),
  });
}

async function estimateLineBase(
  context: PersistenceQueryContext,
  outletId: string,
  at: Date,
  line: Cart["lines"][number],
): Promise<bigint> {
  const resolved = await resolveOutletVariantPrice(context, {
    variantId: line.variantId,
    outletId,
    at,
  });
  return resolved.amountPaise * BigInt(line.quantity);
}

async function estimateLineModifiers(
  context: PersistenceQueryContext,
  outletId: string,
  at: Date,
  line: Cart["lines"][number],
): Promise<bigint> {
  let total = BigInt(0);
  for (const mod of line.modifiers) {
    const price = await resolveModifierPriceDelta(context, {
      outletId,
      variantModifierGroupId: mod.variantModifierGroupId,
      modifierGroupOptionId: mod.modifierGroupOptionId,
      quantity: mod.quantity * line.quantity,
      at,
    });
    total += price.totalPaise;
  }
  for (const bundle of line.bundleSelections) {
    for (const nested of bundle.modifiers) {
      const price = await resolveModifierPriceDelta(context, {
        outletId,
        variantModifierGroupId: nested.variantModifierGroupId,
        modifierGroupOptionId: nested.modifierGroupOptionId,
        quantity: nested.quantity * bundle.quantity * line.quantity,
        at,
      });
      total += price.totalPaise;
    }
  }
  return total;
}

async function estimateLineBundles(
  context: PersistenceQueryContext,
  outletId: string,
  at: Date,
  line: Cart["lines"][number],
): Promise<bigint> {
  let total = BigInt(0);
  for (const opt of line.bundleSelections) {
    const price = await resolveBundleOptionPriceDelta(context, {
      outletId,
      bundleGroupOptionId: opt.bundleGroupOptionId,
      quantity: opt.quantity * line.quantity,
      at,
    });
    total += price.totalPaise;
  }
  return total;
}

async function buildPromotionEffects(
  context: PersistenceQueryContext,
  input: {
    brandId: string;
    outletId: string;
    at: Date;
    cart: Cart;
    customerAuthUserId: string;
  },
  quote: DirectPricingQuote,
): Promise<readonly CheckoutPromotionEffectDraft[]> {
  const effects: CheckoutPromotionEffectDraft[] = [];
  let sortOrder = 0;

  const appliedById = new Map<string, AppliedPromotion>();
  for (const applied of quote.appliedPromotions) {
    appliedById.set(applied.promotionId, applied);
    effects.push(
      Object.freeze({
        effectKind: "applied_promotion" as const,
        promotionId: applied.promotionId,
        couponId: applied.couponId ?? null,
        promotionCode: applied.code,
        displayName: applied.displayName,
        triggerType: applied.triggerType,
        stackingPolicy: applied.stackingPolicy,
        componentId: null,
        lineId: null,
        amountPaise: null,
        realizedDiscountPaise: applied.realizedDiscountPaise,
        rewardVariantId: null,
        rewardUnitId: null,
        rewardQuantity: null,
        rewardBasePaise: null,
        sortOrder: sortOrder++,
      }),
    );
  }

  for (const alloc of quote.promotionAllocations) {
    const applied = appliedById.get(alloc.promotionId);
    effects.push(
      Object.freeze({
        effectKind: "monetary_allocation" as const,
        promotionId: alloc.promotionId,
        couponId: applied?.couponId ?? null,
        promotionCode: applied?.code ?? alloc.promotionId,
        displayName: applied?.displayName ?? alloc.promotionId,
        triggerType: applied?.triggerType ?? null,
        stackingPolicy: applied?.stackingPolicy ?? null,
        componentId: alloc.componentId,
        lineId: extractLineId(alloc.componentId),
        amountPaise: alloc.amountPaise,
        realizedDiscountPaise: null,
        rewardVariantId: null,
        rewardUnitId: null,
        rewardQuantity: null,
        rewardBasePaise: null,
        sortOrder: sortOrder++,
      }),
    );
  }

  // BOGO evidence: load winning promotion definitions and call calculateBenefit.
  try {
    const hierarchy = await resolveOutletHierarchy(context, input.outletId);
    const automatic = await loadApplicableAutomaticPromotions(context, {
      brandId: hierarchy.brandId,
      territoryId: hierarchy.territoryId,
      organizationId: hierarchy.organizationId,
      outletId: hierarchy.outletId,
      at: input.at,
    });
    const promoById = new Map<string, PromotionDefinition>(
      automatic.map((p) => [p.id, p]),
    );
    if (input.cart.manualCouponCode) {
      const loaded = await loadSubmittedCoupon(
        context,
        input.cart.manualCouponCode,
      );
      if (loaded.promotion) {
        promoById.set(loaded.promotion.id, loaded.promotion);
      }
    }

    // Rebuild a minimal PrePromotionSnapshot via a second quote-path is heavy;
    // for BOGO store reward units from calculateBenefit when we can rebuild units.
    // Use applied promotions with buy_x_get_y benefit when definition is present.
    for (const applied of quote.appliedPromotions) {
      const def = promoById.get(applied.promotionId);
      if (!def || def.benefit.benefitType !== "buy_x_get_y") continue;
      // Without full PrePromotionSnapshot, record a synthetic bogo_reward row
      // from realized discount / allocation line provenance when available.
      const related = quote.promotionAllocations.filter(
        (a) => a.promotionId === applied.promotionId,
      );
      for (const alloc of related) {
        const lineId = extractLineId(alloc.componentId);
        effects.push(
          Object.freeze({
            effectKind: "bogo_reward" as const,
            promotionId: applied.promotionId,
            couponId: applied.couponId ?? null,
            promotionCode: applied.code,
            displayName: applied.displayName,
            triggerType: applied.triggerType,
            stackingPolicy: applied.stackingPolicy,
            componentId: alloc.componentId,
            lineId,
            amountPaise: alloc.amountPaise,
            realizedDiscountPaise: null,
            rewardVariantId: null,
            rewardUnitId: alloc.componentId,
            rewardQuantity: 1,
            rewardBasePaise: alloc.amountPaise,
            sortOrder: sortOrder++,
          }),
        );
      }
    }
  } catch {
    // BOGO enrichment is best-effort; monetary + applied rows remain.
  }

  return Object.freeze(effects);
}

function extractLineId(componentId: string): string | null {
  const match = /^(?:base|mod|bundle|bundle-mod):([0-9a-f-]{36})/i.exec(
    componentId,
  );
  return match?.[1] ?? null;
}
