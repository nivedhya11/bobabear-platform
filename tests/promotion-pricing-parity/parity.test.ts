/**
 * Zero-promotion pricing parity gate (IMP-016).
 *
 * With no promotions configured, IMP-015 monetary behavior must remain intact.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseRupeeToPaise } from "../../src/shared/pricing";
import { deriveExistingMenuVariantPrices } from "../../src/server/pricing/bootstrap";
import {
  buildPromotionCandidates,
  evaluatePromotions,
  type PrePromotionSnapshot,
} from "../../src/shared/promotions";

describe("promotion pricing parity", () => {
  it("preserves all 74 imported menu variant prices exactly", () => {
    const derived = deriveExistingMenuVariantPrices(process.cwd());
    const artifact = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data/platform/pricing/existing-menu-pricing-v1.json"),
        "utf8",
      ),
    ) as {
      variant_prices: Array<{
        variant_id: string;
        source_item_name: string;
        amount_paise: number;
      }>;
    };
    expect(artifact.variant_prices.length).toBe(74);
    expect(derived.length).toBe(74);
    for (const row of artifact.variant_prices) {
      const match = derived.find((d) => d.variant_id === row.variant_id);
      expect(match?.amount_paise).toBe(row.amount_paise);
    }
  });

  it("zero promotions yields baseline-only candidate with zero discount", () => {
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
          amountPaise: BigInt(19900),
          taxCategoryId: "tax",
        },
      ],
      units: [],
    };
    const evaluated = evaluatePromotions({
      context: {
        at: new Date("2026-06-01T00:00:00Z"),
        brandId: "brand",
        territoryId: null,
        organizationId: null,
        outletId: "outlet",
        salesChannel: "direct",
      },
      snapshot,
      promotions: [],
    });
    expect(evaluated.eligiblePromotionIds).toEqual([]);
    expect(evaluated.candidates).toHaveLength(1);
    expect(evaluated.candidates[0]!.promotionDiscountTotalPaise).toBe(BigInt(0));
    expect(evaluated.candidates[0]!.postPromotionComponents[0]!.amountPaise).toBe(BigInt(19900));
    expect(evaluated.submittedCouponResult).toBeNull();

    const candidates = buildPromotionCandidates([], snapshot);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.appliedPromotions).toEqual([]);
  });

  it("static menu display prices remain parseable to paise", () => {
    const menu = JSON.parse(
      readFileSync(path.join(process.cwd(), "src/data/menu.json"), "utf8"),
    ) as unknown;
    let count = 0;
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const entry of node) visit(entry);
        return;
      }
      if (typeof node !== "object" || node === null) return;
      const record = node as Record<string, unknown>;
      if (typeof record.name === "string" && "price" in record) {
        const price = record.price;
        if (typeof price === "number" || typeof price === "string") {
          expect(parseRupeeToPaise(price) >= BigInt(0)).toBe(true);
          count += 1;
        }
      }
      for (const value of Object.values(record)) visit(value);
    };
    visit(menu);
    expect(count).toBe(74);
  });
});
