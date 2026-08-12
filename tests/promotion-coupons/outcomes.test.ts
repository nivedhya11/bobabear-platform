/**
 * Coupon outcome / redemption-deferral tests (IMP-016).
 */
import { describe, expect, it } from "vitest";

import {
  evaluatePromotions,
  finalizeCouponResult,
  type CouponRecord,
  type PrePromotionSnapshot,
  type PromotionDefinition,
} from "../../src/shared/promotions";

function promo(partial: Partial<PromotionDefinition> & { id: string }): PromotionDefinition {
  return {
    brandId: "brand",
    code: partial.id,
    displayName: partial.id,
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
    benefit: {
      benefitType: "percentage_discount",
      percentageBps: 1000,
      fixedAmountPaise: null,
      maximumDiscountPaise: null,
      buyQuantity: null,
      getQuantity: null,
      repeatable: null,
      maximumRewardQuantity: null,
      includeModifiers: false,
      includeBundleDeltas: false,
    },
    qualifierTargets: [
      {
        targetRole: "qualifier",
        targetType: "all_merchandise",
        productId: null,
        variantId: null,
        chargeDefinitionId: null,
      },
    ],
    benefitTargets: [
      {
        targetRole: "benefit",
        targetType: "all_merchandise",
        productId: null,
        variantId: null,
        chargeDefinitionId: null,
      },
    ],
    ...partial,
  };
}

function coupon(
  partial: Partial<CouponRecord> & Pick<CouponRecord, "id" | "promotionId" | "canonicalCode">,
): CouponRecord {
  return {
    origin: "manual",
    status: "active",
    startsAt: null,
    endsAt: null,
    maximumRedemptions: null,
    maximumRedemptionsPerCustomer: null,
    ...partial,
  };
}

const snapshot: PrePromotionSnapshot = {
  components: [
    {
      componentId: "c1",
      kind: "variant_base",
      lineId: "L1",
      lineSequence: 0,
      variantId: "v1",
      productId: "p1",
      chargeDefinitionId: null,
      amountPaise: BigInt(10000),
      taxCategoryId: "tax",
    },
  ],
  units: [
    {
      unitId: "u1",
      lineId: "L1",
      lineSequence: 0,
      unitIndex: 0,
      variantId: "v1",
      productId: "p1",
      unitBasePaise: BigInt(10000),
      modifierPaise: BigInt(0),
      bundleDeltaPaise: BigInt(0),
      taxCategoryId: "tax",
    },
  ],
};

const CTX = {
  at: new Date("2026-06-01T00:00:00Z"),
  brandId: "brand",
  territoryId: null as string | null,
  organizationId: null as string | null,
  outletId: "o1",
  salesChannel: "direct" as const,
};

describe("coupon outcomes", () => {
  it("marks invalid coupon without failing automatic promotions", () => {
    const automatic = promo({ id: "auto", triggerType: "automatic" });
    const result = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [automatic],
      submittedCoupon: { rawCode: "NOPE", coupon: null, promotion: null },
    });
    expect(result.submittedCouponResult?.status).toBe("INVALID");
    expect(result.eligiblePromotionIds).toContain("auto");
  });

  it("expired coupon fails only; automatic continues", () => {
    const automatic = promo({ id: "auto" });
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const result = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [automatic],
      submittedCoupon: {
        rawCode: "OLD",
        coupon: coupon({
          id: "c1",
          promotionId: "cpromo",
          canonicalCode: "OLD",
          endsAt: new Date("2026-01-01T00:00:00Z"),
        }),
        promotion: couponPromo,
      },
    });
    expect(result.submittedCouponResult?.status).toBe("INVALID");
    expect(result.eligiblePromotionIds).toContain("auto");
  });

  it("inactive coupon fails only", () => {
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const result = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({
          id: "c1",
          promotionId: "cpromo",
          canonicalCode: "SAVE10",
          status: "disabled",
        }),
        promotion: couponPromo,
      },
    });
    expect(result.submittedCouponResult?.status).toBe("INVALID");
  });

  it("basket not eligible → NOT_APPLICABLE", () => {
    const couponPromo = promo({
      id: "cpromo",
      triggerType: "coupon",
      minimumQualifyingAmountPaise: BigInt(50000),
    });
    const result = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({ id: "c1", promotionId: "cpromo", canonicalCode: "SAVE10" }),
        promotion: couponPromo,
      },
    });
    expect(result.submittedCouponResult?.status).toBe("NOT_APPLICABLE");
  });

  it("requires customer identity for per-customer redemption limits", () => {
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const result = evaluatePromotions({
      context: { ...CTX, customerId: null },
      snapshot,
      promotions: [],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({
          id: "coupon-1",
          promotionId: "cpromo",
          canonicalCode: "SAVE10",
          maximumRedemptionsPerCustomer: 1,
        }),
        promotion: couponPromo,
      },
    });
    expect(result.submittedCouponResult?.status).toBe("CUSTOMER_IDENTITY_REQUIRED");
  });

  it("fails closed when global maximum_redemptions without enforcement infra", () => {
    const automatic = promo({ id: "auto" });
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const result = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [automatic],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({
          id: "coupon-1",
          promotionId: "cpromo",
          canonicalCode: "SAVE10",
          maximumRedemptions: 100,
        }),
        promotion: couponPromo,
      },
      redemptionEnforcementAvailable: false,
    });
    expect(result.submittedCouponResult?.status).toBe("REDEMPTION_ENFORCEMENT_UNAVAILABLE");
    expect(result.eligiblePromotionIds).toContain("auto");
    expect(result.eligiblePromotionIds).not.toContain("cpromo");
  });

  it("per-customer limit with customer but no redemption infra → REDEMPTION_ENFORCEMENT_UNAVAILABLE", () => {
    const automatic = promo({ id: "auto" });
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const result = evaluatePromotions({
      context: { ...CTX, customerId: "cust-1" },
      snapshot,
      promotions: [automatic],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({
          id: "coupon-1",
          promotionId: "cpromo",
          canonicalCode: "SAVE10",
          maximumRedemptionsPerCustomer: 1,
        }),
        promotion: couponPromo,
      },
      redemptionEnforcementAvailable: false,
    });
    expect(result.submittedCouponResult?.status).toBe("REDEMPTION_ENFORCEMENT_UNAVAILABLE");
    expect(result.eligiblePromotionIds).toContain("auto");
  });

  it("finalizes APPLIED vs VALID_BUT_NOT_SELECTED", () => {
    const draft = {
      status: "VALID_BUT_NOT_SELECTED" as const,
      reasonCode: "COUPON_VALID_BUT_NOT_SELECTED",
      couponId: "c1",
      promotionId: "p1",
      canonicalCode: "SAVE10",
    };
    expect(finalizeCouponResult(draft, ["p1"], ["p1"])?.status).toBe("APPLIED");
    expect(finalizeCouponResult(draft, ["other"], [])?.status).toBe("VALID_BUT_NOT_SELECTED");
  });

  it("valid exclusive coupon beaten by better automatic → VALID_BUT_NOT_SELECTED", () => {
    const automatic = promo({
      id: "auto",
      priority: 10,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: 5000,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    const couponPromo = promo({
      id: "cpromo",
      triggerType: "coupon",
      stackingPolicy: "exclusive",
      priority: 1,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: 1000,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    const evaluated = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [automatic],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({ id: "c1", promotionId: "cpromo", canonicalCode: "SAVE10" }),
        promotion: couponPromo,
      },
    });
    expect(evaluated.eligiblePromotionIds).toEqual(expect.arrayContaining(["auto", "cpromo"]));
    // Simulate quote selecting automatic after tax (larger discount)
    const selectedIds = ["auto"];
    const appliedIds = ["auto"];
    const finalized = finalizeCouponResult(
      evaluated.submittedCouponResult,
      selectedIds,
      appliedIds,
    );
    expect(finalized?.status).toBe("VALID_BUT_NOT_SELECTED");
  });

  it("valid combinable coupon with zero realized allocation → VALID_BUT_NOT_SELECTED", () => {
    const draft = {
      status: "VALID_BUT_NOT_SELECTED" as const,
      reasonCode: "COUPON_VALID_BUT_NOT_SELECTED",
      couponId: "c1",
      promotionId: "cpromo",
      canonicalCode: "SAVE10",
    };
    // Selected candidate included the coupon id but applied list empty (0 realize)
    expect(finalizeCouponResult(draft, ["cpromo"], [])?.status).toBe("VALID_BUT_NOT_SELECTED");
  });

  it("valid + selected → APPLIED", () => {
    const couponPromo = promo({ id: "cpromo", triggerType: "coupon" });
    const evaluated = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [],
      submittedCoupon: {
        rawCode: "SAVE10",
        coupon: coupon({ id: "c1", promotionId: "cpromo", canonicalCode: "SAVE10" }),
        promotion: couponPromo,
      },
    });
    expect(evaluated.submittedCouponResult?.status).toBe("VALID_BUT_NOT_SELECTED");
    const finalized = finalizeCouponResult(
      evaluated.submittedCouponResult,
      ["cpromo"],
      ["cpromo"],
    );
    expect(finalized?.status).toBe("APPLIED");
  });
});
