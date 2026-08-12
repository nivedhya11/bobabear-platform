/**
 * Pure promotion evaluation orchestrator (IMP-016).
 *
 * Does not apply tax — caller evaluates each candidate's post-promotion
 * components through the IMP-015 tax engine and then calls selectBestCandidate.
 */
import { isPromotionEffective } from "./eligibility";
import { evaluateEligibility } from "./eligibility";
import { assertActivePromotionIntegrity } from "./targets";
import { buildPromotionCandidates, type EligiblePromotion } from "./select";
import type {
  CouponRecord,
  PrePromotionSnapshot,
  PromotionDefinition,
  PromotionEvaluationContext,
  PromotionEvaluationResult,
  SubmittedCouponResult,
} from "./types";

export type EvaluatePromotionsInput = Readonly<{
  context: PromotionEvaluationContext;
  snapshot: PrePromotionSnapshot;
  promotions: readonly PromotionDefinition[];
  submittedCoupon?: Readonly<{
    rawCode: string;
    coupon: CouponRecord | null;
    promotion: PromotionDefinition | null;
  }> | null;
  /** IMP-022: true when Payment redemption claims can enforce capacity. */
  redemptionEnforcementAvailable?: boolean;
}>;

function couponNotApplied(
  status: SubmittedCouponResult["status"],
  reasonCode: string,
  partial: Partial<SubmittedCouponResult> = {},
): SubmittedCouponResult {
  return {
    status,
    reasonCode,
    couponId: null,
    promotionId: null,
    canonicalCode: null,
    ...partial,
  };
}

function evaluateSubmittedCoupon(
  input: EvaluatePromotionsInput,
): {
  result: SubmittedCouponResult | null;
  couponPromotion: EligiblePromotion | null;
} {
  if (!input.submittedCoupon) return { result: null, couponPromotion: null };
  const { rawCode, coupon, promotion } = input.submittedCoupon;
  const canonical = rawCode.trim().toUpperCase();

  if (!coupon || !promotion) {
    return {
      result: couponNotApplied("INVALID", "COUPON_INVALID", { canonicalCode: canonical || null }),
      couponPromotion: null,
    };
  }

  if (coupon.status !== "active") {
    return {
      result: couponNotApplied("INVALID", "COUPON_NOT_ACTIVE", {
        couponId: coupon.id,
        promotionId: coupon.promotionId,
        canonicalCode: coupon.canonicalCode,
      }),
      couponPromotion: null,
    };
  }

  if (promotion.status !== "active" || promotion.id !== coupon.promotionId) {
    return {
      result: couponNotApplied("INVALID", "COUPON_NOT_APPLICABLE", {
        couponId: coupon.id,
        promotionId: coupon.promotionId,
        canonicalCode: coupon.canonicalCode,
      }),
      couponPromotion: null,
    };
  }

  const at = input.context.at;
  const promoEffective = isPromotionEffective(promotion.startsAt, promotion.endsAt, at);
  const couponStartOk = coupon.startsAt === null || at.getTime() >= coupon.startsAt.getTime();
  const couponEndOk = coupon.endsAt === null || at.getTime() < coupon.endsAt.getTime();
  if (!promoEffective || !couponStartOk || !couponEndOk) {
    return {
      result: couponNotApplied("INVALID", "COUPON_NOT_EFFECTIVE", {
        couponId: coupon.id,
        promotionId: coupon.promotionId,
        canonicalCode: coupon.canonicalCode,
      }),
      couponPromotion: null,
    };
  }

  if (coupon.maximumRedemptionsPerCustomer !== null && !input.context.customerId) {
    return {
      result: couponNotApplied("CUSTOMER_IDENTITY_REQUIRED", "CUSTOMER_IDENTITY_REQUIRED", {
        couponId: coupon.id,
        promotionId: coupon.promotionId,
        canonicalCode: coupon.canonicalCode,
      }),
      couponPromotion: null,
    };
  }

  const redemptionEnforcementAvailable = input.redemptionEnforcementAvailable === true;
  if (
    (coupon.maximumRedemptions !== null || coupon.maximumRedemptionsPerCustomer !== null) &&
    !redemptionEnforcementAvailable
  ) {
    return {
      result: couponNotApplied(
        "REDEMPTION_ENFORCEMENT_UNAVAILABLE",
        "REDEMPTION_ENFORCEMENT_UNAVAILABLE",
        {
          couponId: coupon.id,
          promotionId: coupon.promotionId,
          canonicalCode: coupon.canonicalCode,
        },
      ),
      couponPromotion: null,
    };
  }

  const eligibility = evaluateEligibility(promotion, input.snapshot, input.context);
  if (!eligibility.eligible) {
    return {
      result: couponNotApplied("NOT_APPLICABLE", eligibility.reasonCode, {
        couponId: coupon.id,
        promotionId: coupon.promotionId,
        canonicalCode: coupon.canonicalCode,
      }),
      couponPromotion: null,
    };
  }

  return {
    result: couponNotApplied("VALID_BUT_NOT_SELECTED", "COUPON_VALID_BUT_NOT_SELECTED", {
      couponId: coupon.id,
      promotionId: coupon.promotionId,
      canonicalCode: coupon.canonicalCode,
    }),
    couponPromotion: { promotion, couponId: coupon.id },
  };
}

/**
 * Build candidates and return an evaluation scaffold.
 * Grand-total selection happens in the pricing quote after tax.
 */
export function evaluatePromotions(input: EvaluatePromotionsInput): Omit<
  PromotionEvaluationResult,
  "selectedPromotionIds" | "appliedPromotions" | "allocations" | "promotionDiscountTotalPaise" | "postPromotionComponents"
> & {
  eligible: EligiblePromotion[];
  candidates: ReturnType<typeof buildPromotionCandidates>;
  submittedCouponResult: SubmittedCouponResult | null;
  baselineTotalPaise: bigint;
} {
  for (const p of input.promotions) {
    if (p.status === "active") assertActivePromotionIntegrity(p);
  }

  const { result: couponResultDraft, couponPromotion } = evaluateSubmittedCoupon(input);

  const eligible: EligiblePromotion[] = [];
  for (const promotion of input.promotions) {
    if (promotion.triggerType === "coupon") continue; // only via submitted coupon
    if (promotion.status !== "active") continue;
    assertActivePromotionIntegrity(promotion);
    const eligibility = evaluateEligibility(promotion, input.snapshot, input.context);
    if (eligibility.eligible) {
      eligible.push({ promotion });
    }
  }
  if (couponPromotion) {
    eligible.push(couponPromotion);
  }

  const baselineTotalPaise = input.snapshot.components.reduce(
    (a, c) => a + c.amountPaise,
    BigInt(0),
  );
  const candidates = buildPromotionCandidates(eligible, input.snapshot);

  return {
    baselineTotalPaise,
    eligiblePromotionIds: eligible.map((e) => e.promotion.id),
    submittedCouponResult: couponResultDraft,
    eligible,
    candidates,
  };
}

export function finalizeCouponResult(
  draft: SubmittedCouponResult | null,
  selectedPromotionIds: readonly string[],
  appliedPromotionIds: readonly string[],
): SubmittedCouponResult | null {
  if (!draft || !draft.promotionId) return draft;
  if (
    draft.status === "INVALID" ||
    draft.status === "NOT_APPLICABLE" ||
    draft.status === "CUSTOMER_IDENTITY_REQUIRED" ||
    draft.status === "REDEMPTION_ENFORCEMENT_UNAVAILABLE"
  ) {
    return draft;
  }
  if (appliedPromotionIds.includes(draft.promotionId)) {
    return { ...draft, status: "APPLIED", reasonCode: "APPLIED" };
  }
  if (selectedPromotionIds.includes(draft.promotionId)) {
    // Selected candidate included it but zero realized
    return {
      ...draft,
      status: "VALID_BUT_NOT_SELECTED",
      reasonCode: "COUPON_VALID_BUT_NOT_SELECTED",
    };
  }
  return {
    ...draft,
    status: "VALID_BUT_NOT_SELECTED",
    reasonCode: "COUPON_VALID_BUT_NOT_SELECTED",
  };
}
