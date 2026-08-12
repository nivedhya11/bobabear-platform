/**
 * Promotion eligibility (IMP-016).
 */
import type { PromotionEligibilityReasonCode } from "./constants";
import { qualifyingAmountPaise, resolveQualifierUnits } from "./targets";
import type {
  EligibilityResult,
  PrePromotionSnapshot,
  PromotionDefinition,
  PromotionEvaluationContext,
} from "./types";

export function isPromotionEffective(
  startsAt: Date,
  endsAt: Date | null,
  at: Date,
): boolean {
  if (at.getTime() < startsAt.getTime()) return false;
  if (endsAt !== null && at.getTime() >= endsAt.getTime()) return false;
  return true;
}

export function matchesPromotionScope(
  promotion: Pick<
    PromotionDefinition,
    "brandId" | "scopeType" | "territoryId" | "organizationId" | "outletId"
  >,
  context: Pick<
    PromotionEvaluationContext,
    "brandId" | "territoryId" | "organizationId" | "outletId"
  >,
): boolean {
  if (promotion.brandId !== context.brandId) return false;
  switch (promotion.scopeType) {
    case "brand":
      return true;
    case "territory":
      return (
        promotion.territoryId !== null &&
        context.territoryId !== null &&
        promotion.territoryId === context.territoryId
      );
    case "organization":
      return (
        promotion.organizationId !== null &&
        context.organizationId !== null &&
        promotion.organizationId === context.organizationId
      );
    case "outlet":
      return (
        promotion.outletId !== null && promotion.outletId === context.outletId
      );
    default:
      return false;
  }
}

export function evaluateEligibility(
  promotion: PromotionDefinition,
  snapshot: PrePromotionSnapshot,
  context: PromotionEvaluationContext,
): EligibilityResult {
  const fail = (
    reasonCode: PromotionEligibilityReasonCode,
    qualifyingAmountPaiseValue = BigInt(0),
    qualifyingQuantity = 0,
  ): EligibilityResult => ({
    eligible: false,
    qualifyingAmountPaise: qualifyingAmountPaiseValue,
    qualifyingQuantity,
    reasonCode,
  });

  if (promotion.status === "retired") return fail("RETIRED");
  if (promotion.status !== "active") return fail("NOT_ACTIVE");
  if (promotion.salesChannel !== context.salesChannel) return fail("CHANNEL_MISMATCH");
  if (!matchesPromotionScope(promotion, context)) return fail("SCOPE_MISMATCH");
  if (!isPromotionEffective(promotion.startsAt, promotion.endsAt, context.at)) {
    return fail("NOT_EFFECTIVE");
  }

  const units = resolveQualifierUnits(snapshot, promotion.qualifierTargets);
  const amount = qualifyingAmountPaise(snapshot, promotion.qualifierTargets);
  const quantity = units.length;

  if (
    promotion.minimumQualifyingAmountPaise !== null &&
    amount < promotion.minimumQualifyingAmountPaise
  ) {
    return fail("MINIMUM_AMOUNT_NOT_MET", amount, quantity);
  }
  if (
    promotion.minimumItemQuantity !== null &&
    quantity < promotion.minimumItemQuantity
  ) {
    return fail("MINIMUM_QUANTITY_NOT_MET", amount, quantity);
  }

  return {
    eligible: true,
    qualifyingAmountPaise: amount,
    qualifyingQuantity: quantity,
    reasonCode: "ELIGIBLE",
  };
}
