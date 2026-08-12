/**
 * Pure promotion calculation unit tests (IMP-016).
 */
import { describe, expect, it } from "vitest";

import {
  allocateCombinablePromotions,
  allocateSinglePromotion,
  buildPromotionCandidates,
  calculateBenefit,
  computePromotionConfigurationFingerprint,
  evaluateEligibility,
  generateCouponCode,
  normalizeCouponCode,
  percentageDiscountPaise,
  selectBestCandidate,
  type MonetaryComponent,
  type PrePromotionSnapshot,
  type PromotionDefinition,
} from "../../src/shared/promotions";

function moneyComponent(
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

function basePromo(
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
    ...overrides,
  };
}

describe("coupon normalization", () => {
  it("trims and uppercases", () => {
    expect(normalizeCouponCode("  save20 ")).toBe("SAVE20");
  });
  it("rejects invalid characters", () => {
    expect(() => normalizeCouponCode("BAD CODE")).toThrow();
  });
  it("generates unpredictable codes", () => {
    const a = generateCouponCode();
    const b = generateCouponCode();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("percentage math", () => {
  it("rounds half up on awkward paise", () => {
    // ₹179.01 = 17901 paise; 10% = 1790.1 → 1790
    expect(percentageDiscountPaise(BigInt(17901), 1000)).toBe(BigInt(1790));
  });
  it("supports fractional bps", () => {
    expect(percentageDiscountPaise(BigInt(10000), 250)).toBe(BigInt(250));
  });
  it("rejects >100%", () => {
    expect(() => percentageDiscountPaise(BigInt(100), 10001)).toThrow();
  });
});

describe("eligibility", () => {
  const snapshot: PrePromotionSnapshot = {
    components: [moneyComponent({ componentId: "c1", amountPaise: BigInt(50000) })],
    units: [
      {
        unitId: "u1",
        lineId: "L1",
        lineSequence: 0,
        unitIndex: 0,
        variantId: "v1",
        productId: "p1",
        unitBasePaise: BigInt(50000),
        modifierPaise: BigInt(0),
        bundleDeltaPaise: BigInt(0),
        taxCategoryId: "tax",
      },
    ],
  };

  it("matches brand scope and minimum amount", () => {
    const promo = basePromo({
      id: "p",
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
      minimumQualifyingAmountPaise: BigInt(40000),
    });
    const ok = evaluateEligibility(promo, snapshot, {
      at: new Date("2026-06-01T00:00:00Z"),
      brandId: "brand",
      territoryId: null,
      organizationId: null,
      outletId: "o1",
      salesChannel: "direct",
    });
    expect(ok.eligible).toBe(true);
  });

  it("fails minimum amount", () => {
    const promo = basePromo({
      id: "p",
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
      minimumQualifyingAmountPaise: BigInt(60000),
    });
    const bad = evaluateEligibility(promo, snapshot, {
      at: new Date("2026-06-01T00:00:00Z"),
      brandId: "brand",
      territoryId: null,
      organizationId: null,
      outletId: "o1",
      salesChannel: "direct",
    });
    expect(bad.eligible).toBe(false);
    expect(bad.reasonCode).toBe("MINIMUM_AMOUNT_NOT_MET");
  });
});

describe("fixed and percentage benefits", () => {
  const snapshot: PrePromotionSnapshot = {
    components: [moneyComponent({ componentId: "c1", amountPaise: BigInt(8000) })],
    units: [],
  };
  const benefitBase = {
    fixedAmountPaise: null as bigint | null,
    maximumDiscountPaise: null as bigint | null,
    buyQuantity: null as number | null,
    getQuantity: null as number | null,
    repeatable: null as boolean | null,
    maximumRewardQuantity: null as number | null,
    includeModifiers: false,
    includeBundleDeltas: false,
  };

  it("caps fixed discount to capacity", () => {
    const promo = basePromo({
      id: "fix",
      benefit: {
        ...benefitBase,
        benefitType: "fixed_amount_discount",
        percentageBps: null,
        fixedAmountPaise: BigInt(10000),
      },
    });
    const result = calculateBenefit(promo, snapshot);
    expect(result.nominalBenefitPaise).toBe(BigInt(8000));
  });

  it("applies maximum_discount_paise cap", () => {
    const promo = basePromo({
      id: "pct",
      benefit: {
        ...benefitBase,
        benefitType: "percentage_discount",
        percentageBps: 5000,
        maximumDiscountPaise: BigInt(1000),
      },
    });
    const result = calculateBenefit(promo, snapshot);
    expect(result.nominalBenefitPaise).toBe(BigInt(1000));
  });
});

describe("allocation", () => {
  it("reconciles single promotion exactly", () => {
    const comps = [
      moneyComponent({ componentId: "a", amountPaise: BigInt(100), lineSequence: 0 }),
      moneyComponent({ componentId: "b", amountPaise: BigInt(100), lineSequence: 1 }),
    ];
    const alloc = allocateSinglePromotion("p1", BigInt(101), comps);
    const sum = alloc.reduce((a, x) => a + x.amountPaise, BigInt(0));
    expect(sum).toBe(BigInt(101));
  });

  it("combinable optimizer maximizes realizable discount vs wide-first greed", () => {
    // X=5, Y=5; A wide nominal 6 on {X,Y}; B narrow nominal 5 on {X}
    // Wide-first greed: A takes 5+1=6, B gets 0 → total 6
    // Optimal max-flow: B takes 5 on X, A takes 5 on Y → total 10
    const components = [
      moneyComponent({ componentId: "X", amountPaise: BigInt(5), lineSequence: 0 }),
      moneyComponent({ componentId: "Y", amountPaise: BigInt(5), lineSequence: 1 }),
    ];
    const benefitFixed = (amount: bigint) => ({
      benefitType: "fixed_amount_discount" as const,
      percentageBps: null,
      fixedAmountPaise: amount,
      maximumDiscountPaise: null,
      buyQuantity: null,
      getQuantity: null,
      repeatable: null,
      maximumRewardQuantity: null,
      includeModifiers: false,
      includeBundleDeltas: false,
    });
    const promos = [
      {
        promotion: basePromo({
          id: "A",
          priority: 10,
          stackingPolicy: "combinable",
          benefit: benefitFixed(BigInt(6)),
        }),
        nominalBenefitPaise: BigInt(6),
        eligibleComponentIds: ["X", "Y"],
      },
      {
        promotion: basePromo({
          id: "B",
          priority: 1,
          stackingPolicy: "combinable",
          benefit: benefitFixed(BigInt(5)),
        }),
        nominalBenefitPaise: BigInt(5),
        eligibleComponentIds: ["X"],
      },
    ];
    const { allocations } = allocateCombinablePromotions(promos, components);
    const total = allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
    expect(total).toBe(BigInt(10));
  });
});

describe("stacking candidates", () => {
  it("does not compound percentages sequentially", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [moneyComponent({ componentId: "c1", amountPaise: BigInt(100000) })],
      units: [],
    };
    const mk = (id: string, bps: number): PromotionDefinition =>
      basePromo({
        id,
        stackingPolicy: "combinable",
        benefit: {
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
        },
      });
    const candidates = buildPromotionCandidates(
      [
        { promotion: mk("a", 1000) },
        { promotion: mk("b", 2000) },
      ],
      snapshot,
    );
    const combo = candidates.find((c) => c.promotionIds.length === 2)!;
    expect(combo.promotionDiscountTotalPaise).toBe(BigInt(30000));
  });
});

describe("fingerprint", () => {
  it("is order-independent for targets", () => {
    const benefit = {
      benefitType: "percentage_discount" as const,
      percentageBps: 1000,
      fixedAmountPaise: null,
      maximumDiscountPaise: null,
      buyQuantity: null,
      getQuantity: null,
      repeatable: null,
      maximumRewardQuantity: null,
      includeModifiers: false,
      includeBundleDeltas: false,
    };
    const t1 = {
      targetRole: "benefit" as const,
      targetType: "product" as const,
      productId: "p1",
      variantId: null,
      chargeDefinitionId: null,
    };
    const t2 = {
      targetRole: "benefit" as const,
      targetType: "product" as const,
      productId: "p2",
      variantId: null,
      chargeDefinitionId: null,
    };
    const base = {
      brandId: "b",
      code: "c",
      displayName: "n",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      salesChannel: "direct",
      triggerType: "automatic",
      stackingPolicy: "exclusive",
      priority: 0,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null,
      minimumQualifyingAmountPaise: null,
      minimumItemQuantity: null,
      benefit,
      qualifierTargets: [
        {
          targetRole: "qualifier" as const,
          targetType: "all_merchandise" as const,
          productId: null,
          variantId: null,
          chargeDefinitionId: null,
        },
      ],
    };
    const a = computePromotionConfigurationFingerprint({
      ...base,
      benefitTargets: [t1, t2],
    });
    const b = computePromotionConfigurationFingerprint({
      ...base,
      benefitTargets: [t2, t1],
    });
    expect(a).toBe(b);
  });
});

describe("best candidate selection", () => {
  it("prefers lower grand total after tax", () => {
    const winner = selectBestCandidate(
      [
        { promotionIds: [], promotionDiscountTotalPaise: BigInt(0), grandTotalPaise: BigInt(1100) },
        {
          promotionIds: ["a"],
          promotionDiscountTotalPaise: BigInt(100),
          grandTotalPaise: BigInt(1050),
        },
        {
          promotionIds: ["b"],
          promotionDiscountTotalPaise: BigInt(200),
          grandTotalPaise: BigInt(1080),
        },
      ],
      new Map(),
    );
    expect(winner.promotionIds).toEqual(["a"]);
  });
});
