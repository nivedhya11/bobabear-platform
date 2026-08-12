/**
 * Shared fixtures for IMP-016 pure promotion unit tests.
 */
import type {
  MonetaryComponent,
  PrePromotionSnapshot,
  PromotionBenefitConfig,
  PromotionDefinition,
  PromotionTargetConfig,
  SnapshotLineUnit,
} from "../../src/shared/promotions";

export function moneyComponent(
  partial: Partial<MonetaryComponent> & Pick<MonetaryComponent, "componentId" | "amountPaise">,
): MonetaryComponent {
  return {
    kind: "variant_base",
    lineId: "L1",
    lineSequence: 0,
    variantId: "v1",
    productId: "p1",
    chargeDefinitionId: null,
    taxCategoryId: "tax",
    ...partial,
  };
}

export function unit(
  partial: Partial<SnapshotLineUnit> &
    Pick<SnapshotLineUnit, "unitId" | "unitBasePaise" | "variantId">,
): SnapshotLineUnit {
  return {
    lineId: "L1",
    lineSequence: 0,
    unitIndex: 0,
    productId: "p1",
    modifierPaise: BigInt(0),
    bundleDeltaPaise: BigInt(0),
    taxCategoryId: "tax",
    ...partial,
  };
}

export const ALL_MERCH_QUALIFIER: PromotionTargetConfig = {
  targetRole: "qualifier",
  targetType: "all_merchandise",
  productId: null,
  variantId: null,
  chargeDefinitionId: null,
};

export const ALL_MERCH_BENEFIT: PromotionTargetConfig = {
  targetRole: "benefit",
  targetType: "all_merchandise",
  productId: null,
  variantId: null,
  chargeDefinitionId: null,
};

export function percentageBenefit(
  bps: number,
  extras: Partial<PromotionBenefitConfig> = {},
): PromotionBenefitConfig {
  return {
    benefitType: "percentage_discount",
    percentageBps: bps,
    fixedAmountPaise: null,
    maximumDiscountPaise: null,
    buyQuantity: null,
    getQuantity: null,
    repeatable: null,
    maximumRewardQuantity: null,
    includeModifiers: false,
    includeBundleDeltas: false,
    ...extras,
  };
}

export function fixedBenefit(
  amount: bigint,
  extras: Partial<PromotionBenefitConfig> = {},
): PromotionBenefitConfig {
  return {
    benefitType: "fixed_amount_discount",
    percentageBps: null,
    fixedAmountPaise: amount,
    maximumDiscountPaise: null,
    buyQuantity: null,
    getQuantity: null,
    repeatable: null,
    maximumRewardQuantity: null,
    includeModifiers: false,
    includeBundleDeltas: false,
    ...extras,
  };
}

export function bogoBenefit(
  buy: number,
  get: number,
  extras: Partial<PromotionBenefitConfig> = {},
): PromotionBenefitConfig {
  return {
    benefitType: "buy_x_get_y",
    percentageBps: null,
    fixedAmountPaise: null,
    maximumDiscountPaise: null,
    buyQuantity: buy,
    getQuantity: get,
    repeatable: true,
    maximumRewardQuantity: null,
    includeModifiers: false,
    includeBundleDeltas: false,
    ...extras,
  };
}

export function basePromo(
  overrides: Partial<PromotionDefinition> & Pick<PromotionDefinition, "id" | "benefit">,
): PromotionDefinition {
  return {
    brandId: "brand",
    code: "promo",
    displayName: "Promo",
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    salesChannel: "direct",
    status: "active",
    triggerType: "automatic",
    stackingPolicy: "exclusive",
    priority: 0,
    startsAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: null,
    minimumQualifyingAmountPaise: null,
    minimumItemQuantity: null,
    configurationFingerprint: "fp",
    qualifierTargets: [ALL_MERCH_QUALIFIER],
    benefitTargets: [ALL_MERCH_BENEFIT],
    ...overrides,
  };
}

export function snapshotOf(
  components: MonetaryComponent[],
  units: SnapshotLineUnit[] = [],
): PrePromotionSnapshot {
  return { components, units };
}
