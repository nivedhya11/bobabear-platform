/**
 * IMP-016 promotion value types (browser-safe).
 */

import type {
  CouponOutcomeStatus,
  CouponOrigin,
  CouponStatus,
  PromotionBenefitType,
  PromotionEligibilityReasonCode,
  PromotionScopeType,
  PromotionStackingPolicy,
  PromotionStatus,
  PromotionTargetRole,
  PromotionTargetType,
  PromotionTriggerType,
} from "./constants";

export type MonetaryComponentKind =
  | "variant_base"
  | "modifier"
  | "bundle_delta"
  | "charge";

export type MonetaryComponent = Readonly<{
  componentId: string;
  kind: MonetaryComponentKind;
  lineId: string | null;
  lineSequence: number;
  variantId: string | null;
  productId: string | null;
  chargeDefinitionId: string | null;
  amountPaise: bigint;
  taxCategoryId: string | null;
}>;

/** One physical orderable variant unit for quantity / BOGO selection. */
export type SnapshotLineUnit = Readonly<{
  unitId: string;
  lineId: string;
  lineSequence: number;
  unitIndex: number;
  variantId: string;
  productId: string;
  unitBasePaise: bigint;
  modifierPaise: bigint;
  bundleDeltaPaise: bigint;
  taxCategoryId: string | null;
}>;

export type PrePromotionSnapshot = Readonly<{
  components: readonly MonetaryComponent[];
  units: readonly SnapshotLineUnit[];
}>;

export type PromotionTargetConfig = Readonly<{
  targetRole: PromotionTargetRole;
  targetType: PromotionTargetType;
  productId: string | null;
  variantId: string | null;
  chargeDefinitionId: string | null;
}>;

export type PromotionBenefitConfig = Readonly<{
  benefitType: PromotionBenefitType;
  percentageBps: number | null;
  fixedAmountPaise: bigint | null;
  maximumDiscountPaise: bigint | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  repeatable: boolean | null;
  maximumRewardQuantity: number | null;
  includeModifiers: boolean;
  includeBundleDeltas: boolean;
}>;

export type PromotionDefinition = Readonly<{
  id: string;
  brandId: string;
  code: string;
  displayName: string;
  scopeType: PromotionScopeType;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  salesChannel: "direct";
  status: PromotionStatus;
  triggerType: PromotionTriggerType;
  stackingPolicy: PromotionStackingPolicy;
  priority: number;
  startsAt: Date;
  endsAt: Date | null;
  minimumQualifyingAmountPaise: bigint | null;
  minimumItemQuantity: number | null;
  configurationFingerprint: string | null;
  benefit: PromotionBenefitConfig;
  qualifierTargets: readonly PromotionTargetConfig[];
  benefitTargets: readonly PromotionTargetConfig[];
}>;

export type PromotionEvaluationContext = Readonly<{
  at: Date;
  brandId: string;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string;
  salesChannel: "direct";
  customerId?: string | null;
}>;

export type EligibilityResult = Readonly<{
  eligible: boolean;
  qualifyingAmountPaise: bigint;
  qualifyingQuantity: number;
  reasonCode: PromotionEligibilityReasonCode;
}>;

export type BogoRewardUnitEvidence = Readonly<{
  unitId: string;
  variantId: string;
  lineId: string;
  basePaise: bigint;
}>;

export type BenefitCalculationResult = Readonly<{
  nominalBenefitPaise: bigint;
  eligibleCapacityPaise: bigint;
  eligibleComponentIds: readonly string[];
  bogoRewardUnits?: readonly BogoRewardUnitEvidence[];
}>;

export type PromotionAllocation = Readonly<{
  promotionId: string;
  componentId: string;
  amountPaise: bigint;
}>;

export type AppliedPromotion = Readonly<{
  promotionId: string;
  code: string;
  displayName: string;
  triggerType: PromotionTriggerType;
  stackingPolicy: PromotionStackingPolicy;
  realizedDiscountPaise: bigint;
  couponId?: string | null;
}>;

export type SubmittedCouponResult = Readonly<{
  status: CouponOutcomeStatus;
  reasonCode: string;
  couponId: string | null;
  promotionId: string | null;
  canonicalCode: string | null;
}>;

export type PromotionCandidateResult = Readonly<{
  promotionIds: readonly string[];
  allocations: readonly PromotionAllocation[];
  promotionDiscountTotalPaise: bigint;
  postPromotionComponents: readonly MonetaryComponent[];
  appliedPromotions: readonly AppliedPromotion[];
}>;

export type PromotionEvaluationResult = Readonly<{
  baselineTotalPaise: bigint;
  eligiblePromotionIds: readonly string[];
  selectedPromotionIds: readonly string[];
  appliedPromotions: readonly AppliedPromotion[];
  allocations: readonly PromotionAllocation[];
  promotionDiscountTotalPaise: bigint;
  postPromotionComponents: readonly MonetaryComponent[];
  submittedCouponResult: SubmittedCouponResult | null;
  candidates: readonly PromotionCandidateResult[];
}>;

export type CouponRecord = Readonly<{
  id: string;
  promotionId: string;
  canonicalCode: string;
  origin: CouponOrigin;
  status: CouponStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  maximumRedemptions: number | null;
  maximumRedemptionsPerCustomer: number | null;
}>;
