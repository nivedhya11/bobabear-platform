/**
 * Live Promotion → GST integration proofs (IMP-016).
 *
 * Promotions allocate before tax; IMP-015 shared tax helpers consume
 * post-Promotion monetary components. GST math is not reimplemented here.
 */
import { describe, expect, it } from "vitest";

import {
  buildPromotionCandidates,
  evaluatePromotions,
  selectBestCandidate,
} from "../../src/shared/promotions";
import { taxExclusivePaise, taxInclusiveSplit } from "../../src/shared/pricing";
import {
  ALL_MERCH_BENEFIT,
  ALL_MERCH_QUALIFIER,
  basePromo,
  fixedBenefit,
  moneyComponent,
  percentageBenefit,
  snapshotOf,
} from "./helpers";

const AT = new Date("2026-06-01T00:00:00Z");
const CTX = {
  at: AT,
  brandId: "brand",
  territoryId: null,
  organizationId: null,
  outletId: "o1",
  salesChannel: "direct" as const,
};

describe("Promotion → GST exclusive / inclusive", () => {
  it("exclusive: allocation lowers taxable amount before GST", () => {
    const snapshot = snapshotOf([
      moneyComponent({ componentId: "food", amountPaise: BigInt(17901), taxCategoryId: "cat-a" }),
    ]);
    const promo = basePromo({
      id: "ten",
      benefit: percentageBenefit(1000),
    });
    const evaluated = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [promo],
    });
    const winnerCandidate = evaluated.candidates.find((c) => c.promotionIds.includes("ten"))!;
    expect(winnerCandidate.promotionDiscountTotalPaise).toBe(BigInt(1790));
    const post = winnerCandidate.postPromotionComponents[0]!.amountPaise;
    expect(post).toBe(BigInt(16111));

    const taxOnPre = taxExclusivePaise(BigInt(17901), 500);
    const taxOnPost = taxExclusivePaise(post, 500);
    expect(taxOnPost).toBeLessThan(taxOnPre);
    expect(taxOnPost).toBe(taxExclusivePaise(BigInt(16111), 500));

    const grandPre = BigInt(17901) + taxOnPre;
    const grandPost = post + taxOnPost;
    expect(grandPost).toBeLessThan(grandPre);
  });

  it("inclusive: allocation lowers gross then IMP-015 inclusive split applies", () => {
    const snapshot = snapshotOf([
      moneyComponent({ componentId: "food", amountPaise: BigInt(18800), taxCategoryId: "cat-a" }),
    ]);
    const promo = basePromo({
      id: "fixed",
      benefit: fixedBenefit(BigInt(800)),
    });
    const candidates = buildPromotionCandidates([{ promotion: promo }], snapshot);
    const withPromo = candidates.find((c) => c.promotionIds.includes("fixed"))!;
    expect(withPromo.postPromotionComponents[0]!.amountPaise).toBe(BigInt(18000));

    const preSplit = taxInclusiveSplit(BigInt(18800), 500);
    const postSplit = taxInclusiveSplit(BigInt(18000), 500);
    expect(postSplit.taxablePaise + postSplit.taxPaise).toBe(BigInt(18000));
    expect(postSplit.taxPaise).toBeLessThan(preSplit.taxPaise);
  });
});

describe("multi-tax-bucket Promotion", () => {
  it("allocates first then taxes each bucket independently with exact reconcile", () => {
    const snapshot = snapshotOf([
      moneyComponent({
        componentId: "a",
        amountPaise: BigInt(10000),
        taxCategoryId: "cat-food",
        lineSequence: 0,
      }),
      moneyComponent({
        componentId: "b",
        amountPaise: BigInt(10000),
        taxCategoryId: "cat-other",
        lineId: "L2",
        lineSequence: 1,
        variantId: "v2",
        productId: "p2",
      }),
    ]);
    const promo = basePromo({
      id: "split",
      benefit: fixedBenefit(BigInt(3000)),
      qualifierTargets: [ALL_MERCH_QUALIFIER],
      benefitTargets: [ALL_MERCH_BENEFIT],
    });
    const candidates = buildPromotionCandidates([{ promotion: promo }], snapshot);
    const withPromo = candidates.find((c) => c.promotionIds.includes("split"))!;
    expect(withPromo.promotionDiscountTotalPaise).toBe(BigInt(3000));

    const byCat = new Map<string, bigint>();
    for (const c of withPromo.postPromotionComponents) {
      const cat = c.taxCategoryId ?? "unknown";
      byCat.set(cat, (byCat.get(cat) ?? BigInt(0)) + c.amountPaise);
    }
    expect(byCat.get("cat-food")! + byCat.get("cat-other")!).toBe(BigInt(17000));

    let taxTotal = BigInt(0);
    let taxableTotal = BigInt(0);
    for (const [, amount] of byCat) {
      const tax = taxExclusivePaise(amount, 500);
      taxTotal += tax;
      taxableTotal += amount;
    }
    expect(taxableTotal).toBe(BigInt(17000));
    expect(taxTotal + taxableTotal).toBe(BigInt(17000) + taxTotal);
    // Baseline tax would be higher
    const baselineTax =
      taxExclusivePaise(BigInt(10000), 500) + taxExclusivePaise(BigInt(10000), 500);
    expect(taxTotal).toBeLessThan(baselineTax);
  });
});

describe("best-price-after-tax selection", () => {
  it("selects lowest grand_total_paise even when pre-tax discount is smaller", () => {
    // Candidate A: larger pre-tax discount on a 0% tax bucket
    // Candidate B: smaller pre-tax discount on a 5% tax bucket → better final payable
    const candidates = [
      {
        promotionIds: [] as string[],
        promotionDiscountTotalPaise: BigInt(0),
        grandTotalPaise: BigInt(11000), // baseline
      },
      {
        promotionIds: ["big-pretax"],
        promotionDiscountTotalPaise: BigInt(2000),
        // After tax simulation: discounted untaxed line still yields higher payable
        grandTotalPaise: BigInt(10500),
      },
      {
        promotionIds: ["better-posttax"],
        promotionDiscountTotalPaise: BigInt(1000),
        grandTotalPaise: BigInt(10200),
      },
    ];
    const winner = selectBestCandidate(candidates, new Map());
    expect(winner.promotionIds).toEqual(["better-posttax"]);
    expect(winner.grandTotalPaise).toBeLessThanOrEqual(candidates[0]!.grandTotalPaise);
  });

  it("computes post-tax winner from real exclusive tax on post-promo components", () => {
    const snapshot = snapshotOf([
      moneyComponent({ componentId: "c1", amountPaise: BigInt(100000), taxCategoryId: "t" }),
    ]);
    const highDiscountUntaxedShape = basePromo({
      id: "a",
      priority: 1,
      benefit: percentageBenefit(2000),
    });
    const lowerDiscount = basePromo({
      id: "b",
      priority: 2,
      benefit: percentageBenefit(1000),
    });
    const evaluated = evaluatePromotions({
      context: CTX,
      snapshot,
      promotions: [highDiscountUntaxedShape, lowerDiscount],
    });

    const scored = evaluated.candidates.map((c) => {
      const taxable = c.postPromotionComponents.reduce((a, x) => a + x.amountPaise, BigInt(0));
      // Simulate different tax treatment: promo "a" taxed at 12%, "b" at 5%
      const rate =
        c.promotionIds.includes("a") ? 1200 : c.promotionIds.includes("b") ? 500 : 500;
      const tax = taxExclusivePaise(taxable, rate);
      return { ...c, grandTotalPaise: taxable + tax };
    });

    const promotionsById = new Map([
      ["a", highDiscountUntaxedShape],
      ["b", lowerDiscount],
    ] as const);
    const winner = selectBestCandidate(scored, promotionsById);
    // 20% off then 12% tax: 80000 + 9600 = 89600
    // 10% off then 5% tax: 90000 + 4500 = 94500
    // baseline 5%: 100000 + 5000 = 105000
    // So "a" still wins on absolute payable — assert invariant and that selection uses grand total
    expect(winner.grandTotalPaise).toBeLessThanOrEqual(scored[0]!.grandTotalPaise);
    expect(winner.promotionIds).toEqual(["a"]);

    // Flip rates so smaller discount wins after tax
    const flipped = evaluated.candidates.map((c) => {
      const taxable = c.postPromotionComponents.reduce((a, x) => a + x.amountPaise, BigInt(0));
      const rate =
        c.promotionIds.includes("a") ? 2800 : c.promotionIds.includes("b") ? 100 : 500;
      const tax = taxExclusivePaise(taxable, rate);
      return { ...c, grandTotalPaise: taxable + tax };
    });
    const winner2 = selectBestCandidate(flipped, promotionsById);
    // a: 80000 + 22400 = 102400
    // b: 90000 + 900 = 90900
    // baseline: 100000 + 5000 = 105000
    expect(winner2.promotionIds).toEqual(["b"]);
    expect(winner2.grandTotalPaise).toBeLessThan(
      flipped.find((c) => c.promotionIds.includes("a"))!.grandTotalPaise,
    );
  });
});
