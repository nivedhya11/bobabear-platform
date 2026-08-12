/**
 * BOGO benefit unit tests (IMP-016) — full locked matrix.
 */
import { describe, expect, it } from "vitest";

import {
  allocateSinglePromotion,
  applyAllocationsToComponents,
  assertBogoTargetRelationship,
  calculateBenefit,
  type PrePromotionSnapshot,
  type PromotionDefinition,
} from "../../src/shared/promotions";
import { PromotionAdminError } from "../../src/shared/promotions/errors";
import { basePromo, bogoBenefit, moneyComponent, unit } from "./helpers";

function bogoPromo(partial: Partial<PromotionDefinition> = {}): PromotionDefinition {
  return basePromo({
    id: "bogo",
    code: "bogo",
    displayName: "BOGO",
    benefit: bogoBenefit(1, 1),
    qualifierTargets: [
      {
        targetRole: "qualifier",
        targetType: "variant",
        productId: null,
        variantId: "v1",
        chargeDefinitionId: null,
      },
    ],
    benefitTargets: [
      {
        targetRole: "benefit",
        targetType: "variant",
        productId: null,
        variantId: "v1",
        chargeDefinitionId: null,
      },
    ],
    ...partial,
  });
}

function twoUnitSnapshot(basePaise = BigInt(100)): PrePromotionSnapshot {
  return {
    components: [
      moneyComponent({
        componentId: "base",
        amountPaise: basePaise * BigInt(2),
        variantId: "v1",
      }),
    ],
    units: [
      unit({ unitId: "u0", unitBasePaise: basePaise, variantId: "v1", unitIndex: 0 }),
      unit({ unitId: "u1", unitBasePaise: basePaise, variantId: "v1", unitIndex: 1 }),
    ],
  };
}

describe("BOGO matrix", () => {
  it("Buy 1 Get 1 identical set needs 2 units", () => {
    const result = calculateBenefit(bogoPromo(), twoUnitSnapshot());
    expect(result.nominalBenefitPaise).toBe(BigInt(100));
    expect(result.bogoRewardUnits).toHaveLength(1);
  });

  it("Buy 2 Get 1 with 2 units yields no benefit (insufficient)", () => {
    const result = calculateBenefit(
      bogoPromo({ benefit: bogoBenefit(2, 1, { repeatable: false }) }),
      twoUnitSnapshot(),
    );
    expect(result.nominalBenefitPaise).toBe(BigInt(0));
  });

  it("Buy 2 Get 1 with exact 3 units succeeds", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({ componentId: "base", amountPaise: BigInt(300), variantId: "v1" }),
      ],
      units: [
        unit({ unitId: "u0", unitBasePaise: BigInt(100), variantId: "v1", unitIndex: 0 }),
        unit({ unitId: "u1", unitBasePaise: BigInt(100), variantId: "v1", unitIndex: 1 }),
        unit({ unitId: "u2", unitBasePaise: BigInt(100), variantId: "v1", unitIndex: 2 }),
      ],
    };
    const result = calculateBenefit(
      bogoPromo({ benefit: bogoBenefit(2, 1, { repeatable: false }) }),
      snapshot,
    );
    expect(result.nominalBenefitPaise).toBe(BigInt(100));
    expect(result.bogoRewardUnits).toHaveLength(1);
  });

  it("one physical unit cannot satisfy Buy and Reward simultaneously", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [moneyComponent({ componentId: "base", amountPaise: BigInt(100) })],
      units: [unit({ unitId: "u0", unitBasePaise: BigInt(100), variantId: "v1", unitIndex: 0 })],
    };
    const result = calculateBenefit(bogoPromo(), snapshot);
    expect(result.nominalBenefitPaise).toBe(BigInt(0));
  });

  it("identical Buy/Reward target sets are accepted", () => {
    expect(
      assertBogoTargetRelationship(
        [
          {
            targetRole: "qualifier",
            targetType: "variant",
            productId: null,
            variantId: "v1",
            chargeDefinitionId: null,
          },
        ],
        [
          {
            targetRole: "benefit",
            targetType: "variant",
            productId: null,
            variantId: "v1",
            chargeDefinitionId: null,
          },
        ],
      ),
    ).toBe("identical");
  });

  it("disjoint Buy/Reward target sets are accepted", () => {
    expect(
      assertBogoTargetRelationship(
        [
          {
            targetRole: "qualifier",
            targetType: "variant",
            productId: null,
            variantId: "v-buy",
            chargeDefinitionId: null,
          },
        ],
        [
          {
            targetRole: "benefit",
            targetType: "variant",
            productId: null,
            variantId: "v-reward",
            chargeDefinitionId: null,
          },
        ],
      ),
    ).toBe("disjoint");
  });

  it("rejects partial non-identical overlap targets", () => {
    expect(() =>
      assertBogoTargetRelationship(
        [
          {
            targetRole: "qualifier",
            targetType: "product",
            productId: "p1",
            variantId: null,
            chargeDefinitionId: null,
          },
          {
            targetRole: "qualifier",
            targetType: "variant",
            productId: null,
            variantId: "v2",
            chargeDefinitionId: null,
          },
        ],
        [
          {
            targetRole: "benefit",
            targetType: "product",
            productId: "p1",
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      ),
    ).toThrow(PromotionAdminError);
  });

  it("disjoint BOGO: buy units free cheapest reward", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({
          componentId: "buy-base",
          amountPaise: BigInt(200),
          variantId: "v-buy",
          productId: "p-buy",
          lineId: "LB",
          lineSequence: 0,
        }),
        moneyComponent({
          componentId: "reward-cheap",
          amountPaise: BigInt(50),
          variantId: "v-reward",
          productId: "p-reward",
          lineId: "LR1",
          lineSequence: 1,
        }),
        moneyComponent({
          componentId: "reward-dear",
          amountPaise: BigInt(90),
          variantId: "v-reward",
          productId: "p-reward",
          lineId: "LR2",
          lineSequence: 2,
        }),
      ],
      units: [
        unit({
          unitId: "b0",
          unitBasePaise: BigInt(200),
          variantId: "v-buy",
          productId: "p-buy",
          lineId: "LB",
          lineSequence: 0,
        }),
        unit({
          unitId: "r0",
          unitBasePaise: BigInt(50),
          variantId: "v-reward",
          productId: "p-reward",
          lineId: "LR1",
          lineSequence: 1,
        }),
        unit({
          unitId: "r1",
          unitBasePaise: BigInt(90),
          variantId: "v-reward",
          productId: "p-reward",
          lineId: "LR2",
          lineSequence: 2,
        }),
      ],
    };
    const promo = bogoPromo({
      benefit: bogoBenefit(1, 1, { repeatable: false }),
      qualifierTargets: [
        {
          targetRole: "qualifier",
          targetType: "variant",
          productId: null,
          variantId: "v-buy",
          chargeDefinitionId: null,
        },
      ],
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v-reward",
          chargeDefinitionId: null,
        },
      ],
    });
    const result = calculateBenefit(promo, snapshot);
    expect(result.nominalBenefitPaise).toBe(BigInt(50));
    expect(result.bogoRewardUnits?.[0]?.unitId).toBe("r0");
  });

  it("equal-price reward tie is deterministic by lineSequence then unitId", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({
          componentId: "buy",
          amountPaise: BigInt(100),
          variantId: "v-buy",
          lineId: "LB",
          lineSequence: 0,
        }),
        moneyComponent({
          componentId: "r-a",
          amountPaise: BigInt(40),
          variantId: "v-reward",
          lineId: "LR-B",
          lineSequence: 2,
        }),
        moneyComponent({
          componentId: "r-b",
          amountPaise: BigInt(40),
          variantId: "v-reward",
          lineId: "LR-A",
          lineSequence: 1,
        }),
      ],
      units: [
        unit({
          unitId: "b0",
          unitBasePaise: BigInt(100),
          variantId: "v-buy",
          lineId: "LB",
          lineSequence: 0,
        }),
        unit({
          unitId: "later",
          unitBasePaise: BigInt(40),
          variantId: "v-reward",
          lineId: "LR-B",
          lineSequence: 2,
        }),
        unit({
          unitId: "earlier",
          unitBasePaise: BigInt(40),
          variantId: "v-reward",
          lineId: "LR-A",
          lineSequence: 1,
        }),
      ],
    };
    const promo = bogoPromo({
      benefit: bogoBenefit(1, 1),
      qualifierTargets: [
        {
          targetRole: "qualifier",
          targetType: "variant",
          productId: null,
          variantId: "v-buy",
          chargeDefinitionId: null,
        },
      ],
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v-reward",
          chargeDefinitionId: null,
        },
      ],
    });
    const result = calculateBenefit(promo, snapshot);
    expect(result.bogoRewardUnits?.[0]?.unitId).toBe("earlier");
  });

  it("repeatable BOGO yields multiple reward groups", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({ componentId: "base", amountPaise: BigInt(400), variantId: "v1" }),
      ],
      units: [0, 1, 2, 3].map((i) =>
        unit({
          unitId: `u${i}`,
          unitBasePaise: BigInt(100),
          variantId: "v1",
          unitIndex: i,
        }),
      ),
    };
    const result = calculateBenefit(
      bogoPromo({ benefit: bogoBenefit(1, 1, { repeatable: true }) }),
      snapshot,
    );
    expect(result.nominalBenefitPaise).toBe(BigInt(200));
    expect(result.bogoRewardUnits).toHaveLength(2);
  });

  it("non-repeatable BOGO caps at one group", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({ componentId: "base", amountPaise: BigInt(400), variantId: "v1" }),
      ],
      units: [0, 1, 2, 3].map((i) =>
        unit({
          unitId: `u${i}`,
          unitBasePaise: BigInt(100),
          variantId: "v1",
          unitIndex: i,
        }),
      ),
    };
    const result = calculateBenefit(
      bogoPromo({ benefit: bogoBenefit(1, 1, { repeatable: false }) }),
      snapshot,
    );
    expect(result.nominalBenefitPaise).toBe(BigInt(100));
    expect(result.bogoRewardUnits).toHaveLength(1);
  });

  it("maximum_reward_quantity caps to whole reward groups", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({ componentId: "base", amountPaise: BigInt(600), variantId: "v1" }),
      ],
      units: [0, 1, 2, 3, 4, 5].map((i) =>
        unit({
          unitId: `u${i}`,
          unitBasePaise: BigInt(100),
          variantId: "v1",
          unitIndex: i,
        }),
      ),
    };
    // getQuantity=2, max reward=2 → one complete group only (not 3 units)
    const result = calculateBenefit(
      bogoPromo({
        benefit: bogoBenefit(1, 2, { repeatable: true, maximumRewardQuantity: 2 }),
      }),
      snapshot,
    );
    expect(result.bogoRewardUnits).toHaveLength(2);
    expect(result.nominalBenefitPaise).toBe(BigInt(200));
  });

  it("rejects combinable BOGO", () => {
    expect(() =>
      calculateBenefit(bogoPromo({ stackingPolicy: "combinable" }), {
        components: [],
        units: [],
      }),
    ).toThrow();
  });

  it("rejects include_modifiers=true on BOGO", () => {
    expect(() =>
      calculateBenefit(
        bogoPromo({ benefit: bogoBenefit(1, 1, { includeModifiers: true }) }),
        { components: [], units: [] },
      ),
    ).toThrow(PromotionAdminError);
  });

  it("rejects include_bundle_deltas=true on BOGO", () => {
    expect(() =>
      calculateBenefit(
        bogoPromo({ benefit: bogoBenefit(1, 1, { includeBundleDeltas: true }) }),
        { components: [], units: [] },
      ),
    ).toThrow(PromotionAdminError);
  });

  it("rejects non-null minimum_item_quantity on BOGO", () => {
    expect(() =>
      calculateBenefit(bogoPromo({ minimumItemQuantity: 2 }), { components: [], units: [] }),
    ).toThrow(PromotionAdminError);
  });

  it("free reward Variant base becomes zero; paid modifiers/bundle remain", () => {
    const snapshot: PrePromotionSnapshot = {
      components: [
        moneyComponent({
          componentId: "base-L1",
          amountPaise: BigInt(200),
          variantId: "v1",
          lineId: "L1",
          lineSequence: 0,
        }),
        moneyComponent({
          componentId: "mod-L1",
          kind: "modifier",
          amountPaise: BigInt(30),
          variantId: "v1",
          lineId: "L1",
          lineSequence: 0,
        }),
        moneyComponent({
          componentId: "bundle-L1",
          kind: "bundle_delta",
          amountPaise: BigInt(20),
          variantId: "v1",
          lineId: "L1",
          lineSequence: 0,
        }),
      ],
      units: [
        unit({
          unitId: "u0",
          unitBasePaise: BigInt(100),
          variantId: "v1",
          unitIndex: 0,
          modifierPaise: BigInt(15),
          bundleDeltaPaise: BigInt(10),
        }),
        unit({
          unitId: "u1",
          unitBasePaise: BigInt(100),
          variantId: "v1",
          unitIndex: 1,
          modifierPaise: BigInt(15),
          bundleDeltaPaise: BigInt(10),
        }),
      ],
    };
    const promo = bogoPromo();
    const benefit = calculateBenefit(promo, snapshot);
    expect(benefit.nominalBenefitPaise).toBe(BigInt(100));
    expect(benefit.eligibleComponentIds.every((id) => !id.startsWith("mod"))).toBe(true);
    expect(benefit.eligibleComponentIds.every((id) => !id.startsWith("bundle"))).toBe(true);

    const comps = snapshot.components.filter((c) =>
      benefit.eligibleComponentIds.includes(c.componentId),
    );
    const allocations = allocateSinglePromotion(promo.id, benefit.nominalBenefitPaise, comps);
    const post = applyAllocationsToComponents(snapshot.components, allocations);
    const base = post.find((c) => c.componentId === "base-L1")!;
    const mod = post.find((c) => c.componentId === "mod-L1")!;
    const bundle = post.find((c) => c.componentId === "bundle-L1")!;
    expect(base.amountPaise).toBe(BigInt(100)); // 200 - 100 free unit base
    expect(mod.amountPaise).toBe(BigInt(30));
    expect(bundle.amountPaise).toBe(BigInt(20));
  });
});
