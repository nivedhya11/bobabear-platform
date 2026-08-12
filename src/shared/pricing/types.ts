/**
 * Browser-safe pricing / tax value types (IMP-015 + IMP-016 promotion evidence).
 *
 * Amounts are serialized as decimal strings of integer paise where they cross
 * JSON boundaries — in-process domain code prefers `bigint`.
 */

import type {
  ChargeCalculationMode,
  PriceBookScopeType,
  PricingDecisionCode,
  TaxApplicability,
  TaxInclusionMode,
  TaxType,
} from "./constants";
import type {
  AppliedPromotion,
  PromotionAllocation,
  SubmittedCouponResult,
} from "../promotions/types";

export type ResolvedOutletVariantPrice = Readonly<{
  amountPaise: bigint;
  currency: "INR";
  taxInclusionMode: TaxInclusionMode;
  taxCategoryId: string;
  brandPriceBookId: string;
  winningPriceBookId: string;
  overrideScope: PriceBookScopeType;
  decisionCode: PricingDecisionCode;
}>;

export type TaxComponentAmount = Readonly<{
  taxType: TaxType;
  rateBps: number;
  amountPaise: bigint;
}>;

export type TaxLineAllocation = Readonly<{
  lineId: string;
  taxablePaise: bigint;
  taxPaise: bigint;
  components: readonly TaxComponentAmount[];
}>;

export type TaxCalculationResult = Readonly<{
  applicability: TaxApplicability;
  taxPolicyId: string;
  taxCategoryId: string;
  totalRateBps: number;
  taxablePaise: bigint;
  taxPaise: bigint;
  components: readonly TaxComponentAmount[];
  lineAllocations: readonly TaxLineAllocation[];
}>;

export type DirectPricingQuote = Readonly<{
  calculatedAt: string;
  currency: "INR";
  taxInclusionMode: TaxInclusionMode;
  basePaise: bigint;
  modifierAdjustmentsPaise: bigint;
  bundleAdjustmentsPaise: bigint;
  chargesPaise: bigint;
  prePromotionSubtotalPaise: bigint;
  /** Total realized promotion discount (0 when none applied). */
  promotionDiscountPaise: bigint;
  appliedPromotions: readonly AppliedPromotion[];
  promotionAllocations: readonly PromotionAllocation[];
  submittedCouponResult: SubmittedCouponResult | null;
  taxablePaise: bigint;
  taxPaise: bigint;
  taxComponents: readonly TaxComponentAmount[];
  grandTotalPaise: bigint;
  sourcePriceBookIds: readonly string[];
  taxPolicyIds: readonly string[];
  chargeLines: readonly Readonly<{
    chargeDefinitionId: string;
    calculationMode: ChargeCalculationMode;
    amountPaise: bigint;
  }>[];
}>;
