/**
 * Direct-order pricing quote builder (IMP-015 + IMP-016 promotion allocation).
 *
 * Framework-independent immutable value object. Promotion allocation runs after
 * pre-promotion monetary assembly and before the IMP-015 tax engine.
 * Does not assert orderability.
 */
import type { DirectPricingQuote, TaxInclusionMode } from "../../shared/pricing";
import {
  evaluatePromotions,
  finalizeCouponResult,
  selectBestCandidate,
  type MonetaryComponent,
  type PrePromotionSnapshot,
  type SnapshotLineUnit,
} from "../../shared/promotions";
import type { PersistenceQueryContext } from "../persistence/types";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import { eq } from "drizzle-orm";
import {
  loadApplicableAutomaticPromotions,
  loadSubmittedCoupon,
  resolveOutletHierarchy,
} from "../promotions/load-for-evaluation";
import { assertApplicationRole, assertUuid } from "./assert-role";
import {
  resolveBundleOptionPriceDelta,
  resolveModifierPriceDelta,
  resolveOutletVariantPrice,
} from "./resolve-price";
import { calculateTax } from "./tax";

export type BuildDirectPricingQuoteInput = Readonly<{
  outletId: string;
  at: Date;
  lines: readonly Readonly<{
    lineId: string;
    variantId: string;
    quantity: number;
    productId?: string;
    modifiers?: readonly Readonly<{
      variantModifierGroupId: string;
      modifierGroupOptionId: string;
      quantity: number;
    }>[];
    bundleOptions?: readonly Readonly<{
      bundleGroupOptionId: string;
      quantity: number;
      /** Nested modifiers on the selected bundle component (IMP-020). */
      modifiers?: readonly Readonly<{
        variantModifierGroupId: string;
        modifierGroupOptionId: string;
        quantity: number;
      }>[];
    }>[];
  }>[];
  /** Optional fixed_per_order charge definition amounts already resolved by caller. */
  charges?: readonly Readonly<{
    chargeDefinitionId: string;
    calculationMode: "fixed_per_order" | "per_item_quantity";
    amountPaise: bigint;
    taxCategoryId: string | null;
  }>[];
  customerId?: string | null;
  submittedCouponCode?: string | null;
}>;

type InternalTaxableLine = {
  lineId: string;
  amountPaise: bigint;
  entityId: string;
  taxCategoryId: string;
};

async function taxGrandTotal(
  context: PersistenceQueryContext,
  input: {
    outletId: string;
    at: Date;
    taxInclusionMode: TaxInclusionMode;
    prePromotionSubtotalPaise: bigint;
    promotionDiscountPaise: bigint;
    taxableLines: InternalTaxableLine[];
  },
): Promise<{
  taxablePaise: bigint;
  taxPaise: bigint;
  taxComponents: DirectPricingQuote["taxComponents"];
  taxPolicyIds: string[];
  grandTotalPaise: bigint;
}> {
  const byCategory = new Map<string, InternalTaxableLine[]>();
  for (const line of input.taxableLines) {
    const list = byCategory.get(line.taxCategoryId) ?? [];
    list.push(line);
    byCategory.set(line.taxCategoryId, list);
  }

  let taxablePaise = BigInt(0);
  let taxPaise = BigInt(0);
  const taxComponents = new Map<string, { taxType: string; rateBps: number; amountPaise: bigint }>();
  const taxPolicyIds: string[] = [];

  for (const [taxCategoryId, lines] of byCategory) {
    const tax = await calculateTax(context, {
      outletId: input.outletId,
      at: input.at,
      taxCategoryId,
      taxInclusionMode: input.taxInclusionMode,
      lines: lines.map((l) => ({
        lineId: l.lineId,
        amountPaise: l.amountPaise,
        entityId: l.entityId,
      })),
    });
    if (tax.taxPolicyId) taxPolicyIds.push(tax.taxPolicyId);
    taxablePaise += tax.taxablePaise;
    taxPaise += tax.taxPaise;
    for (const c of tax.components) {
      const key = `${c.taxType}:${c.rateBps}`;
      const prev = taxComponents.get(key);
      taxComponents.set(key, {
        taxType: c.taxType,
        rateBps: c.rateBps,
        amountPaise: (prev?.amountPaise ?? BigInt(0)) + c.amountPaise,
      });
    }
  }

  const grandTotalPaise =
    input.taxInclusionMode === "exclusive"
      ? input.prePromotionSubtotalPaise - input.promotionDiscountPaise + taxPaise
      : input.prePromotionSubtotalPaise - input.promotionDiscountPaise;

  return {
    taxablePaise,
    taxPaise,
    taxComponents: [...taxComponents.values()].map((c) => ({
      taxType: c.taxType as "cgst" | "sgst" | "utgst" | "igst",
      rateBps: c.rateBps,
      amountPaise: c.amountPaise,
    })),
    taxPolicyIds,
    grandTotalPaise,
  };
}

function componentsToTaxableLines(
  components: readonly MonetaryComponent[],
): InternalTaxableLine[] {
  // Collapse monetary components back to tax lines by lineId / charge id.
  const byLine = new Map<string, InternalTaxableLine>();
  for (const c of components) {
    if (!c.taxCategoryId) continue;
    const lineId =
      c.kind === "charge"
        ? `charge:${c.chargeDefinitionId}`
        : (c.lineId ?? c.componentId);
    const entityId =
      c.kind === "charge"
        ? (c.chargeDefinitionId ?? c.componentId)
        : (c.variantId ?? c.componentId);
    const prev = byLine.get(lineId);
    if (prev) {
      prev.amountPaise += c.amountPaise;
    } else {
      byLine.set(lineId, {
        lineId,
        amountPaise: c.amountPaise,
        entityId,
        taxCategoryId: c.taxCategoryId,
      });
    }
  }
  return [...byLine.values()];
}

export async function buildDirectPricingQuote(
  context: PersistenceQueryContext,
  input: BuildDirectPricingQuoteInput,
): Promise<DirectPricingQuote> {
  assertApplicationRole(context, "buildDirectPricingQuote");
  assertUuid(input.outletId, "outletId");

  let basePaise = BigInt(0);
  let modifierAdjustmentsPaise = BigInt(0);
  let bundleAdjustmentsPaise = BigInt(0);
  const sourcePriceBookIds = new Set<string>();
  let taxInclusionMode: TaxInclusionMode = "exclusive";

  const components: MonetaryComponent[] = [];
  const units: SnapshotLineUnit[] = [];
  let lineSequence = 0;

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("line quantity must be a positive integer");
    }
    const resolved = await resolveOutletVariantPrice(context, {
      variantId: line.variantId,
      outletId: input.outletId,
      at: input.at,
    });
    taxInclusionMode = resolved.taxInclusionMode;
    sourcePriceBookIds.add(resolved.brandPriceBookId);
    sourcePriceBookIds.add(resolved.winningPriceBookId);

    const seq = lineSequence++;
    const lineBase = resolved.amountPaise * BigInt(line.quantity);
    basePaise += lineBase;

    const productId = line.productId
      ?? (
        await context.db
          .select({ productId: catalogVariantsTable.productId })
          .from(catalogVariantsTable)
          .where(eq(catalogVariantsTable.id, line.variantId))
          .limit(1)
      )[0]?.productId
      ?? line.variantId;
    const baseComponentId = `base:${line.lineId}`;
    components.push({
      componentId: baseComponentId,
      kind: "variant_base",
      lineId: line.lineId,
      lineSequence: seq,
      variantId: line.variantId,
      productId,
      chargeDefinitionId: null,
      amountPaise: lineBase,
      taxCategoryId: resolved.taxCategoryId,
    });

    let lineModifier = BigInt(0);
    let lineBundle = BigInt(0);

    for (const mod of line.modifiers ?? []) {
      const modPrice = await resolveModifierPriceDelta(context, {
        outletId: input.outletId,
        variantModifierGroupId: mod.variantModifierGroupId,
        modifierGroupOptionId: mod.modifierGroupOptionId,
        quantity: mod.quantity * line.quantity,
        at: input.at,
      });
      modifierAdjustmentsPaise += modPrice.totalPaise;
      lineModifier += modPrice.totalPaise;
      sourcePriceBookIds.add(modPrice.brandPriceBookId);
      sourcePriceBookIds.add(modPrice.winningPriceBookId);
      components.push({
        componentId: `mod:${line.lineId}:${mod.modifierGroupOptionId}`,
        kind: "modifier",
        lineId: line.lineId,
        lineSequence: seq,
        variantId: line.variantId,
        productId,
        chargeDefinitionId: null,
        amountPaise: modPrice.totalPaise,
        taxCategoryId: resolved.taxCategoryId,
      });
    }

    for (const opt of line.bundleOptions ?? []) {
      const optPrice = await resolveBundleOptionPriceDelta(context, {
        outletId: input.outletId,
        bundleGroupOptionId: opt.bundleGroupOptionId,
        quantity: opt.quantity * line.quantity,
        at: input.at,
      });
      bundleAdjustmentsPaise += optPrice.totalPaise;
      lineBundle += optPrice.totalPaise;
      sourcePriceBookIds.add(optPrice.brandPriceBookId);
      sourcePriceBookIds.add(optPrice.winningPriceBookId);
      components.push({
        componentId: `bundle:${line.lineId}:${opt.bundleGroupOptionId}`,
        kind: "bundle_delta",
        lineId: line.lineId,
        lineSequence: seq,
        variantId: line.variantId,
        productId,
        chargeDefinitionId: null,
        amountPaise: optPrice.totalPaise,
        taxCategoryId: resolved.taxCategoryId,
      });

      for (const nested of opt.modifiers ?? []) {
        const nestedPrice = await resolveModifierPriceDelta(context, {
          outletId: input.outletId,
          variantModifierGroupId: nested.variantModifierGroupId,
          modifierGroupOptionId: nested.modifierGroupOptionId,
          quantity: nested.quantity * opt.quantity * line.quantity,
          at: input.at,
        });
        modifierAdjustmentsPaise += nestedPrice.totalPaise;
        lineModifier += nestedPrice.totalPaise;
        sourcePriceBookIds.add(nestedPrice.brandPriceBookId);
        sourcePriceBookIds.add(nestedPrice.winningPriceBookId);
        components.push({
          componentId: `bundle-mod:${line.lineId}:${opt.bundleGroupOptionId}:${nested.modifierGroupOptionId}`,
          kind: "modifier",
          lineId: line.lineId,
          lineSequence: seq,
          variantId: line.variantId,
          productId,
          chargeDefinitionId: null,
          amountPaise: nestedPrice.totalPaise,
          taxCategoryId: resolved.taxCategoryId,
        });
      }
    }

    const perUnitModifier = line.quantity > 0 ? lineModifier / BigInt(line.quantity) : BigInt(0);
    const perUnitBundle = line.quantity > 0 ? lineBundle / BigInt(line.quantity) : BigInt(0);
    for (let u = 0; u < line.quantity; u++) {
      units.push({
        unitId: `${line.lineId}#${u}`,
        lineId: line.lineId,
        lineSequence: seq,
        unitIndex: u,
        variantId: line.variantId,
        productId,
        unitBasePaise: resolved.amountPaise,
        modifierPaise: perUnitModifier,
        bundleDeltaPaise: perUnitBundle,
        taxCategoryId: resolved.taxCategoryId,
      });
    }
  }

  let chargesPaise = BigInt(0);
  const chargeLines: Array<DirectPricingQuote["chargeLines"][number]> = [];
  for (const charge of input.charges ?? []) {
    chargesPaise += charge.amountPaise;
    chargeLines.push({
      chargeDefinitionId: charge.chargeDefinitionId,
      calculationMode: charge.calculationMode,
      amountPaise: charge.amountPaise,
    });
    components.push({
      componentId: `charge:${charge.chargeDefinitionId}`,
      kind: "charge",
      lineId: null,
      lineSequence: 10_000 + components.length,
      variantId: null,
      productId: null,
      chargeDefinitionId: charge.chargeDefinitionId,
      amountPaise: charge.amountPaise,
      taxCategoryId: charge.taxCategoryId,
    });
  }

  const prePromotionSubtotalPaise =
    basePaise + modifierAdjustmentsPaise + bundleAdjustmentsPaise + chargesPaise;

  const snapshot: PrePromotionSnapshot = { components, units };
  const hierarchy = await resolveOutletHierarchy(context, input.outletId);
  const automatic = await loadApplicableAutomaticPromotions(context, {
    brandId: hierarchy.brandId,
    territoryId: hierarchy.territoryId,
    organizationId: hierarchy.organizationId,
    outletId: hierarchy.outletId,
    at: input.at,
  });

  let submittedCoupon:
    | {
        rawCode: string;
        coupon: Awaited<ReturnType<typeof loadSubmittedCoupon>>["coupon"];
        promotion: Awaited<ReturnType<typeof loadSubmittedCoupon>>["promotion"];
      }
    | null = null;
  if (input.submittedCouponCode) {
    const loaded = await loadSubmittedCoupon(context, input.submittedCouponCode);
    submittedCoupon = {
      rawCode: input.submittedCouponCode,
      coupon: loaded.coupon,
      promotion: loaded.promotion,
    };
  }

  const evaluation = evaluatePromotions({
    context: {
      at: input.at,
      brandId: hierarchy.brandId,
      territoryId: hierarchy.territoryId,
      organizationId: hierarchy.organizationId,
      outletId: hierarchy.outletId,
      salesChannel: "direct",
      customerId: input.customerId ?? null,
    },
    snapshot,
    promotions: automatic,
    submittedCoupon,
    redemptionEnforcementAvailable: true,
  });

  const promotionsById = new Map(
    evaluation.eligible.map((e) => [e.promotion.id, e.promotion] as const),
  );

  type Cand = (typeof evaluation.candidates)[number] & { grandTotalPaise: bigint };
  const scored: Cand[] = [];
  for (const candidate of evaluation.candidates) {
    const tax = await taxGrandTotal(context, {
      outletId: input.outletId,
      at: input.at,
      taxInclusionMode,
      prePromotionSubtotalPaise,
      promotionDiscountPaise: candidate.promotionDiscountTotalPaise,
      taxableLines: componentsToTaxableLines(candidate.postPromotionComponents),
    });
    scored.push({ ...candidate, grandTotalPaise: tax.grandTotalPaise });
  }

  const winner = selectBestCandidate(scored, promotionsById);
  const winnerTax = await taxGrandTotal(context, {
    outletId: input.outletId,
    at: input.at,
    taxInclusionMode,
    prePromotionSubtotalPaise,
    promotionDiscountPaise: winner.promotionDiscountTotalPaise,
    taxableLines: componentsToTaxableLines(winner.postPromotionComponents),
  });

  const submittedCouponResult = finalizeCouponResult(
    evaluation.submittedCouponResult,
    winner.promotionIds,
    winner.appliedPromotions.map((p) => p.promotionId),
  );

  return {
    calculatedAt: input.at.toISOString(),
    currency: "INR",
    taxInclusionMode,
    basePaise,
    modifierAdjustmentsPaise,
    bundleAdjustmentsPaise,
    chargesPaise,
    prePromotionSubtotalPaise,
    promotionDiscountPaise: winner.promotionDiscountTotalPaise,
    appliedPromotions: winner.appliedPromotions,
    promotionAllocations: winner.allocations,
    submittedCouponResult,
    taxablePaise: winnerTax.taxablePaise,
    taxPaise: winnerTax.taxPaise,
    taxComponents: winnerTax.taxComponents,
    grandTotalPaise: winnerTax.grandTotalPaise,
    sourcePriceBookIds: [...sourcePriceBookIds],
    taxPolicyIds: winnerTax.taxPolicyIds,
    chargeLines,
  };
}
