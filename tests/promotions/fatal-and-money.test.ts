/**
 * Fatal active-configuration and exact-money proofs (IMP-016).
 */
import { describe, expect, it } from "vitest";

import {
  allocateCombinablePromotions,
  allocateSinglePromotion,
  applyAllocationsToComponents,
  assertActivePromotionIntegrity,
  buildPromotionCandidates,
  calculateBenefit,
  evaluatePromotions,
  percentageDiscountPaise,
  selectBestCandidate,
} from "../../src/shared/promotions";
import { PromotionFatalError } from "../../src/shared/promotions/errors";
import {
  basePromo,
  fixedBenefit,
  moneyComponent,
  percentageBenefit,
  snapshotOf,
} from "./helpers";

describe("exact money", () => {
  it("round-half-up and basis points on awkward paise", () => {
    expect(percentageDiscountPaise(BigInt(17901), 1000)).toBe(BigInt(1790));
    expect(percentageDiscountPaise(BigInt(10000), 250)).toBe(BigInt(250));
    expect(percentageDiscountPaise(BigInt(1), 5000)).toBe(BigInt(1)); // 0.5 → 1
  });

  it("maximum percentage discount cap", () => {
    const snapshot = snapshotOf([moneyComponent({ componentId: "c", amountPaise: BigInt(8000) })]);
    const promo = basePromo({
      id: "cap",
      benefit: percentageBenefit(5000, { maximumDiscountPaise: BigInt(1000) }),
    });
    expect(calculateBenefit(promo, snapshot).nominalBenefitPaise).toBe(BigInt(1000));
  });

  it("fixed amount capacity cap; unused fixed Benefit disappears", () => {
    const snapshot = snapshotOf([moneyComponent({ componentId: "c", amountPaise: BigInt(8000) })]);
    const promo = basePromo({
      id: "fixed",
      benefit: fixedBenefit(BigInt(10000)),
    });
    const benefit = calculateBenefit(promo, snapshot);
    expect(benefit.nominalBenefitPaise).toBe(BigInt(8000));
    const allocations = allocateSinglePromotion(
      promo.id,
      benefit.nominalBenefitPaise,
      snapshot.components,
    );
    const post = applyAllocationsToComponents(snapshot.components, allocations);
    expect(post[0]!.amountPaise).toBe(BigInt(0));
    const sum = allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
    expect(sum).toBe(BigInt(8000));
  });

  it("rejects percentage > 100%", () => {
    expect(() => percentageDiscountPaise(BigInt(100), 10001)).toThrow(PromotionFatalError);
  });
});

describe("combinable optimizer adversarial", () => {
  it("maximizes realizable discount vs wide-first greed and never exceeds capacity", () => {
    const components = [
      moneyComponent({ componentId: "X", amountPaise: BigInt(5), lineSequence: 0 }),
      moneyComponent({ componentId: "Y", amountPaise: BigInt(5), lineSequence: 1 }),
    ];
    const promos = [
      {
        promotion: basePromo({
          id: "A",
          priority: 10,
          stackingPolicy: "combinable",
          benefit: fixedBenefit(BigInt(6)),
        }),
        nominalBenefitPaise: BigInt(6),
        eligibleComponentIds: ["X", "Y"],
      },
      {
        promotion: basePromo({
          id: "B",
          priority: 1,
          stackingPolicy: "combinable",
          benefit: fixedBenefit(BigInt(5)),
        }),
        nominalBenefitPaise: BigInt(5),
        eligibleComponentIds: ["X"],
      },
    ];
    const { allocations } = allocateCombinablePromotions(promos, components);
    const total = allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
    expect(total).toBe(BigInt(10));

    const used = new Map<string, bigint>();
    for (const a of allocations) {
      used.set(a.componentId, (used.get(a.componentId) ?? BigInt(0)) + a.amountPaise);
    }
    for (const c of components) {
      expect(used.get(c.componentId) ?? BigInt(0)).toBeLessThanOrEqual(c.amountPaise);
    }
    const post = applyAllocationsToComponents(components, allocations);
    for (const c of post) {
      expect(c.amountPaise >= BigInt(0)).toBe(true);
    }
  });

  it("deterministic equal-optimum tie behavior is stable across runs", () => {
    const components = [
      moneyComponent({ componentId: "X", amountPaise: BigInt(10), lineSequence: 0 }),
      moneyComponent({ componentId: "Y", amountPaise: BigInt(10), lineSequence: 1 }),
    ];
    const promos = [
      {
        promotion: basePromo({
          id: "p-a",
          stackingPolicy: "combinable",
          benefit: fixedBenefit(BigInt(10)),
        }),
        nominalBenefitPaise: BigInt(10),
        eligibleComponentIds: ["X", "Y"],
      },
      {
        promotion: basePromo({
          id: "p-b",
          stackingPolicy: "combinable",
          benefit: fixedBenefit(BigInt(10)),
        }),
        nominalBenefitPaise: BigInt(10),
        eligibleComponentIds: ["X", "Y"],
      },
    ];
    const first = allocateCombinablePromotions(promos, components);
    const second = allocateCombinablePromotions(promos, components);
    expect(first.allocations).toEqual(second.allocations);
    const total = first.allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
    expect(total).toBe(BigInt(20));
  });
});

describe("fatal persisted-state / integrity", () => {
  it("missing benefit on active promo fails closed", () => {
    const promo = basePromo({
      id: "bad",
      benefit: percentageBenefit(1000),
    });
    // simulate missing benefit structurally
    expect(() =>
      assertActivePromotionIntegrity({
        ...promo,
        benefit: undefined as unknown as typeof promo.benefit,
      }),
    ).toThrow(PromotionFatalError);
  });

  it("invalid active target graph fails closed", () => {
    const promo = basePromo({
      id: "bad",
      benefit: percentageBenefit(1000),
      qualifierTargets: [],
      benefitTargets: [],
    });
    expect(() => assertActivePromotionIntegrity(promo)).toThrowError(
      /PROMOTION_CONFIGURATION_INVALID|missing targets/i,
    );
    try {
      assertActivePromotionIntegrity(promo);
    } catch (e) {
      expect(e).toBeInstanceOf(PromotionFatalError);
      expect((e as PromotionFatalError).code).toBe("PROMOTION_CONFIGURATION_INVALID");
    }
  });

  it("active BOGO marked combinable fails closed", () => {
    const promo = basePromo({
      id: "bad-bogo",
      stackingPolicy: "combinable",
      benefit: {
        benefitType: "buy_x_get_y",
        percentageBps: null,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: 1,
        getQuantity: 1,
        repeatable: true,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    expect(() => assertActivePromotionIntegrity(promo)).toThrow(PromotionFatalError);
  });

  it("impossible percentage fields fail closed at calculate time", () => {
    const promo = basePromo({
      id: "bad-pct",
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: null,
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
    expect(() =>
      calculateBenefit(promo, snapshotOf([moneyComponent({ componentId: "c", amountPaise: BigInt(100) })])),
    ).toThrow(PromotionFatalError);
  });

  it("evaluatePromotions fail-closes on corrupted active promotions", () => {
    const bad = basePromo({
      id: "corrupt",
      benefit: percentageBenefit(1000),
      qualifierTargets: [],
      benefitTargets: [],
    });
    expect(() =>
      evaluatePromotions({
        context: {
          at: new Date("2026-06-01T00:00:00Z"),
          brandId: "brand",
          territoryId: null,
          organizationId: null,
          outletId: "o1",
          salesChannel: "direct",
        },
        snapshot: snapshotOf([moneyComponent({ componentId: "c", amountPaise: BigInt(100) })]),
        promotions: [bad],
      }),
    ).toThrow(PromotionFatalError);
  });
});

describe("baseline invariant", () => {
  it("always includes baseline and winner grand total <= baseline", () => {
    const snapshot = snapshotOf([
      moneyComponent({ componentId: "c1", amountPaise: BigInt(10000) }),
    ]);
    const promo = basePromo({ id: "p", benefit: percentageBenefit(1000) });
    const candidates = buildPromotionCandidates([{ promotion: promo }], snapshot);
    expect(candidates[0]!.promotionIds).toEqual([]);
    expect(candidates[0]!.promotionDiscountTotalPaise).toBe(BigInt(0));

    const scored = candidates.map((c) => ({
      ...c,
      grandTotalPaise: c.postPromotionComponents.reduce((a, x) => a + x.amountPaise, BigInt(0)),
    }));
    const winner = selectBestCandidate(scored, new Map([["p", promo]]));
    expect(winner.grandTotalPaise).toBeLessThanOrEqual(scored[0]!.grandTotalPaise);
  });
});
