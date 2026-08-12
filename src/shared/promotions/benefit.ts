/**
 * Promotion benefit calculation (IMP-016) — separate from allocation.
 */
import { PromotionAdminError, PromotionFatalError } from "./errors";
import { minPaise, percentageDiscountPaise } from "./money";
import {
  assertBogoTargetRelationship,
  resolveBenefitComponents,
  resolveQualifierUnits,
  unitMatchesTargets,
} from "./targets";
import type {
  BenefitCalculationResult,
  BogoRewardUnitEvidence,
  PrePromotionSnapshot,
  PromotionDefinition,
  SnapshotLineUnit,
} from "./types";

function sortUnitsDeterministic(units: SnapshotLineUnit[]): SnapshotLineUnit[] {
  return [...units].sort((a, b) => {
    if (a.lineSequence !== b.lineSequence) return a.lineSequence - b.lineSequence;
    if (a.variantId !== b.variantId) return a.variantId.localeCompare(b.variantId);
    return a.unitId.localeCompare(b.unitId);
  });
}

function sortCheapestFirst(units: SnapshotLineUnit[]): SnapshotLineUnit[] {
  return [...units].sort((a, b) => {
    if (a.unitBasePaise !== b.unitBasePaise) {
      return a.unitBasePaise < b.unitBasePaise ? -1 : 1;
    }
    if (a.lineSequence !== b.lineSequence) return a.lineSequence - b.lineSequence;
    if (a.variantId !== b.variantId) return a.variantId.localeCompare(b.variantId);
    return a.unitId.localeCompare(b.unitId);
  });
}

export function validateBogoConfiguration(promotion: PromotionDefinition): void {
  if (promotion.benefit.benefitType !== "buy_x_get_y") return;
  if (promotion.stackingPolicy !== "exclusive") {
    throw new PromotionAdminError(
      "PROMOTION_BOGO_STACKING_INVALID",
      "BOGO promotions must use exclusive stacking.",
    );
  }
  if (promotion.minimumItemQuantity !== null) {
    throw new PromotionAdminError(
      "PROMOTION_BENEFIT_INVALID",
      "BOGO promotions must not set minimum_item_quantity.",
    );
  }
  if (promotion.benefit.includeModifiers || promotion.benefit.includeBundleDeltas) {
    throw new PromotionAdminError(
      "PROMOTION_BENEFIT_INVALID",
      "BOGO must keep include_modifiers and include_bundle_deltas false.",
    );
  }
  if (
    promotion.benefit.buyQuantity === null ||
    promotion.benefit.getQuantity === null ||
    promotion.benefit.repeatable === null
  ) {
    throw new PromotionAdminError("PROMOTION_BENEFIT_INVALID", "BOGO quantities incomplete.");
  }
  if (promotion.benefit.repeatable === false && promotion.benefit.maximumRewardQuantity !== null) {
    throw new PromotionAdminError(
      "PROMOTION_BENEFIT_INVALID",
      "Non-repeatable BOGO must leave maximum_reward_quantity null.",
    );
  }
  if (
    promotion.benefit.maximumRewardQuantity !== null &&
    promotion.benefit.maximumRewardQuantity % promotion.benefit.getQuantity !== 0
  ) {
    throw new PromotionAdminError(
      "PROMOTION_BENEFIT_INVALID",
      "maximum_reward_quantity must be a multiple of get_quantity.",
    );
  }
  assertBogoTargetRelationship(promotion.qualifierTargets, promotion.benefitTargets);
}

function calculateBogoBenefit(
  promotion: PromotionDefinition,
  snapshot: PrePromotionSnapshot,
): BenefitCalculationResult {
  validateBogoConfiguration(promotion);
  const buyQty = promotion.benefit.buyQuantity!;
  const getQty = promotion.benefit.getQuantity!;
  const repeatable = promotion.benefit.repeatable!;
  const relationship = assertBogoTargetRelationship(
    promotion.qualifierTargets,
    promotion.benefitTargets,
  );

  const buyUnits = sortUnitsDeterministic(
    resolveQualifierUnits(snapshot, promotion.qualifierTargets),
  );
  const rewardPool = sortCheapestFirst(
    snapshot.units.filter((u) => unitMatchesTargets(u, promotion.benefitTargets)),
  );

  let completedGroups = 0;
  if (relationship === "identical") {
    const groupSize = buyQty + getQty;
    const raw = Math.floor(buyUnits.length / groupSize);
    completedGroups = repeatable ? raw : Math.min(1, raw);
  } else {
    const buyGroups = Math.floor(buyUnits.length / buyQty);
    const rewardGroups = Math.floor(rewardPool.length / getQty);
    const raw = Math.min(buyGroups, rewardGroups);
    completedGroups = repeatable ? raw : Math.min(1, raw);
  }

  let rewardUnitCount = completedGroups * getQty;
  if (promotion.benefit.maximumRewardQuantity !== null) {
    rewardUnitCount = Math.min(rewardUnitCount, promotion.benefit.maximumRewardQuantity);
    // Only complete groups
    rewardUnitCount = rewardUnitCount - (rewardUnitCount % getQty);
  }

  const selected = rewardPool.slice(0, rewardUnitCount);
  const evidence: BogoRewardUnitEvidence[] = selected.map((u) => ({
    unitId: u.unitId,
    variantId: u.variantId,
    lineId: u.lineId,
    basePaise: u.unitBasePaise,
  }));
  const nominal = selected.reduce((a, u) => a + u.unitBasePaise, BigInt(0));

  // Eligible capacity = selected unit base components only
  const eligibleComponentIds: string[] = [];
  let capacity = BigInt(0);
  for (const unit of selected) {
    for (const c of snapshot.components) {
      if (
        c.kind === "variant_base" &&
        c.lineId === unit.lineId &&
        c.variantId === unit.variantId &&
        c.amountPaise > BigInt(0)
      ) {
        // For multi-quantity lines, capacity is shared; use unit base as nominal guide.
        // Allocation will distribute across matching base components.
        if (!eligibleComponentIds.includes(c.componentId)) {
          eligibleComponentIds.push(c.componentId);
          capacity += c.amountPaise;
        }
      }
    }
  }

  // Prefer precise: build synthetic per-unit component ids if present
  if (eligibleComponentIds.length === 0 && nominal > BigInt(0)) {
    // Fall back to any matching variant_base benefit components
    for (const c of resolveBenefitComponents(snapshot, {
      ...promotion,
      benefit: { ...promotion.benefit, includeModifiers: false, includeBundleDeltas: false },
    })) {
      if (c.kind === "variant_base") {
        eligibleComponentIds.push(c.componentId);
        capacity += c.amountPaise;
      }
    }
  }

  return {
    nominalBenefitPaise: minPaise(nominal, capacity > BigInt(0) ? capacity : nominal),
    eligibleCapacityPaise: capacity > BigInt(0) ? capacity : nominal,
    eligibleComponentIds,
    bogoRewardUnits: evidence,
  };
}

export function calculateBenefit(
  promotion: PromotionDefinition,
  snapshot: PrePromotionSnapshot,
): BenefitCalculationResult {
  const components = resolveBenefitComponents(snapshot, promotion);
  const capacity = components.reduce((a, c) => a + c.amountPaise, BigInt(0));
  const eligibleComponentIds = components.map((c) => c.componentId);

  if (promotion.benefit.benefitType === "buy_x_get_y") {
    return calculateBogoBenefit(promotion, snapshot);
  }

  if (promotion.benefit.benefitType === "percentage_discount") {
    if (promotion.benefit.percentageBps === null) {
      throw new PromotionFatalError(
        "PROMOTION_CONFIGURATION_INVALID",
        "percentage_discount missing percentageBps.",
      );
    }
    let nominal = percentageDiscountPaise(capacity, promotion.benefit.percentageBps);
    if (promotion.benefit.maximumDiscountPaise !== null) {
      nominal = minPaise(nominal, promotion.benefit.maximumDiscountPaise);
    }
    nominal = minPaise(nominal, capacity);
    return { nominalBenefitPaise: nominal, eligibleCapacityPaise: capacity, eligibleComponentIds };
  }

  if (promotion.benefit.benefitType === "fixed_amount_discount") {
    if (promotion.benefit.fixedAmountPaise === null) {
      throw new PromotionFatalError(
        "PROMOTION_CONFIGURATION_INVALID",
        "fixed_amount_discount missing fixedAmountPaise.",
      );
    }
    const nominal = minPaise(promotion.benefit.fixedAmountPaise, capacity);
    return { nominalBenefitPaise: nominal, eligibleCapacityPaise: capacity, eligibleComponentIds };
  }

  throw new PromotionFatalError(
    "PROMOTION_CONFIGURATION_INVALID",
    "Unknown benefit type.",
  );
}
