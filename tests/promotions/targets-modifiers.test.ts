/**
 * Targets, modifiers, bundle deltas, and charge promotion proofs (IMP-016).
 */
import { describe, expect, it } from "vitest";

import {
  allocateSinglePromotion,
  applyAllocationsToComponents,
  assertNoAmbiguousMerchandiseTargets,
  buildPromotionCandidates,
  calculateBenefit,
  qualifyingAmountPaise,
  resolveBenefitComponents,
  resolveQualifierUnits,
} from "../../src/shared/promotions";
import {
  CHARGE_DEFINITION_DELIVERY_ID,
  CHARGE_DEFINITION_PACKAGING_ID,
} from "../../src/shared/pricing";
import { PromotionAdminError } from "../../src/shared/promotions/errors";
import {
  ALL_MERCH_BENEFIT,
  ALL_MERCH_QUALIFIER,
  basePromo,
  fixedBenefit,
  moneyComponent,
  percentageBenefit,
  snapshotOf,
  unit,
} from "./helpers";

describe("target set resolution and deduplication", () => {
  const snapshot = snapshotOf(
    [
      moneyComponent({
        componentId: "v1-base",
        amountPaise: BigInt(100),
        variantId: "v1",
        productId: "p1",
      }),
      moneyComponent({
        componentId: "v2-base",
        amountPaise: BigInt(200),
        variantId: "v2",
        productId: "p1",
        lineId: "L2",
        lineSequence: 1,
      }),
      moneyComponent({
        componentId: "v3-base",
        amountPaise: BigInt(50),
        variantId: "v3",
        productId: "p2",
        lineId: "L3",
        lineSequence: 2,
      }),
    ],
    [
      unit({ unitId: "u1", unitBasePaise: BigInt(100), variantId: "v1", productId: "p1" }),
      unit({
        unitId: "u2",
        unitBasePaise: BigInt(200),
        variantId: "v2",
        productId: "p1",
        lineId: "L2",
        lineSequence: 1,
      }),
      unit({
        unitId: "u3",
        unitBasePaise: BigInt(50),
        variantId: "v3",
        productId: "p2",
        lineId: "L3",
        lineSequence: 2,
      }),
    ],
  );

  it("Product target includes its eligible Variants", () => {
    const targets = [
      {
        targetRole: "qualifier" as const,
        targetType: "product" as const,
        productId: "p1",
        variantId: null,
        chargeDefinitionId: null,
      },
    ];
    const units = resolveQualifierUnits(snapshot, targets);
    expect(units.map((u) => u.unitId).sort()).toEqual(["u1", "u2"]);
  });

  it("Variant target includes only that Variant", () => {
    const targets = [
      {
        targetRole: "qualifier" as const,
        targetType: "variant" as const,
        productId: null,
        variantId: "v1",
        chargeDefinitionId: null,
      },
    ];
    expect(resolveQualifierUnits(snapshot, targets).map((u) => u.unitId)).toEqual(["u1"]);
  });

  it("Product + child Variant does not double-count qualification quantity", () => {
    const targets = [
      {
        targetRole: "qualifier" as const,
        targetType: "product" as const,
        productId: "p1",
        variantId: null,
        chargeDefinitionId: null,
      },
      {
        targetRole: "qualifier" as const,
        targetType: "variant" as const,
        productId: null,
        variantId: "v1",
        chargeDefinitionId: null,
      },
    ];
    expect(resolveQualifierUnits(snapshot, targets)).toHaveLength(2);
  });

  it("Product + child Variant does not double-count monetary capacity", () => {
    const promo = basePromo({
      id: "pct",
      benefit: percentageBenefit(1000),
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "product",
          productId: "p1",
          variantId: null,
          chargeDefinitionId: null,
        },
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v1",
          chargeDefinitionId: null,
        },
      ],
    });
    const comps = resolveBenefitComponents(snapshot, promo);
    expect(comps.map((c) => c.componentId).sort()).toEqual(["v1-base", "v2-base"]);
    const capacity = comps.reduce((a, c) => a + c.amountPaise, BigInt(0));
    expect(capacity).toBe(BigInt(300));
  });

  it("all_merchandise + explicit Product/Variant in same role is rejected", () => {
    expect(() =>
      assertNoAmbiguousMerchandiseTargets(
        [
          ALL_MERCH_QUALIFIER,
          {
            targetRole: "qualifier",
            targetType: "product",
            productId: "p1",
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
        "qualifier",
      ),
    ).toThrow(PromotionAdminError);
  });

  it("qualifying amount for product target sums matching merchandise only", () => {
    const amount = qualifyingAmountPaise(snapshot, [
      {
        targetRole: "qualifier",
        targetType: "product",
        productId: "p1",
        variantId: null,
        chargeDefinitionId: null,
      },
    ]);
    expect(amount).toBe(BigInt(300));
  });
});

describe("modifier / bundle / charge targeting", () => {
  const richSnapshot = snapshotOf([
    moneyComponent({
      componentId: "food",
      amountPaise: BigInt(10000),
      variantId: "v1",
      productId: "p1",
    }),
    moneyComponent({
      componentId: "mod",
      kind: "modifier",
      amountPaise: BigInt(1000),
      variantId: "v1",
      productId: "p1",
    }),
    moneyComponent({
      componentId: "bundle",
      kind: "bundle_delta",
      amountPaise: BigInt(500),
      variantId: "v1",
      productId: "p1",
    }),
    moneyComponent({
      componentId: "pack",
      kind: "charge",
      amountPaise: BigInt(2000),
      variantId: null,
      productId: null,
      chargeDefinitionId: CHARGE_DEFINITION_PACKAGING_ID,
      taxCategoryId: "tax",
      lineId: null,
      lineSequence: 100,
    }),
    moneyComponent({
      componentId: "delivery",
      kind: "charge",
      amountPaise: BigInt(4000),
      variantId: null,
      productId: null,
      chargeDefinitionId: CHARGE_DEFINITION_DELIVERY_ID,
      taxCategoryId: "tax",
      lineId: null,
      lineSequence: 101,
    }),
  ]);

  it("defaults to Variant base only", () => {
    const promo = basePromo({
      id: "base-only",
      benefit: percentageBenefit(1000),
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v1",
          chargeDefinitionId: null,
        },
      ],
    });
    const ids = resolveBenefitComponents(richSnapshot, promo).map((c) => c.componentId);
    expect(ids).toEqual(["food"]);
  });

  it("include_modifiers=true adds related Modifier value", () => {
    const promo = basePromo({
      id: "with-mod",
      benefit: percentageBenefit(1000, { includeModifiers: true }),
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v1",
          chargeDefinitionId: null,
        },
      ],
    });
    expect(resolveBenefitComponents(richSnapshot, promo).map((c) => c.componentId).sort()).toEqual([
      "food",
      "mod",
    ]);
  });

  it("include_bundle_deltas=true adds related Bundle deltas", () => {
    const promo = basePromo({
      id: "with-bundle",
      benefit: percentageBenefit(1000, { includeBundleDeltas: true }),
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "v1",
          chargeDefinitionId: null,
        },
      ],
    });
    expect(resolveBenefitComponents(richSnapshot, promo).map((c) => c.componentId).sort()).toEqual([
      "bundle",
      "food",
    ]);
  });

  it("all_merchandise includes merchandise components and excludes charges by default", () => {
    const promo = basePromo({
      id: "all",
      benefit: percentageBenefit(1000, { includeModifiers: true, includeBundleDeltas: true }),
      qualifierTargets: [ALL_MERCH_QUALIFIER],
      benefitTargets: [ALL_MERCH_BENEFIT],
    });
    const ids = resolveBenefitComponents(richSnapshot, promo).map((c) => c.componentId).sort();
    expect(ids).toEqual(["bundle", "food", "mod"]);
  });

  it("explicit Charge target works for free delivery", () => {
    const promo = basePromo({
      id: "free-delivery",
      benefit: percentageBenefit(10000),
      qualifierTargets: [ALL_MERCH_QUALIFIER],
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "charge",
          productId: null,
          variantId: null,
          chargeDefinitionId: CHARGE_DEFINITION_DELIVERY_ID,
        },
      ],
    });
    const benefit = calculateBenefit(promo, richSnapshot);
    expect(benefit.nominalBenefitPaise).toBe(BigInt(4000));
    const allocations = allocateSinglePromotion(
      promo.id,
      benefit.nominalBenefitPaise,
      richSnapshot.components.filter((c) => benefit.eligibleComponentIds.includes(c.componentId)),
    );
    const post = applyAllocationsToComponents(richSnapshot.components, allocations);
    expect(post.find((c) => c.componentId === "delivery")!.amountPaise).toBe(BigInt(0));
    expect(post.find((c) => c.componentId === "food")!.amountPaise).toBe(BigInt(10000));
    expect(post.find((c) => c.componentId === "pack")!.amountPaise).toBe(BigInt(2000));
  });
});

describe("zero-realize and baseline invariants", () => {
  it("zero-paise realized promotion does not appear in appliedPromotions", () => {
    const snapshot = snapshotOf([moneyComponent({ componentId: "c1", amountPaise: BigInt(100) })]);
    const promo = basePromo({
      id: "noop",
      benefit: fixedBenefit(BigInt(1000)),
      benefitTargets: [
        {
          targetRole: "benefit",
          targetType: "variant",
          productId: null,
          variantId: "no-such",
          chargeDefinitionId: null,
        },
      ],
    });
    const candidates = buildPromotionCandidates([{ promotion: promo }], snapshot);
    const exclusive = candidates.find((c) => c.promotionIds.includes("noop") || c.promotionIds.length === 0);
    // When capacity is 0, candidate may have empty applied list
    const withPromo = candidates.find((c) => c.promotionIds.includes("noop"));
    if (withPromo) {
      expect(withPromo.appliedPromotions).toEqual([]);
      expect(withPromo.promotionDiscountTotalPaise).toBe(BigInt(0));
    }
    expect(candidates[0]!.appliedPromotions).toEqual([]);
    expect(exclusive).toBeDefined();
  });
});
