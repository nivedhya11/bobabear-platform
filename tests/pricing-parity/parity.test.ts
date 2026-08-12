/**
 * Pricing parity: static menu prices ↔ Brand baseline paise (IMP-015).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseRupeeToPaise } from "../../src/shared/pricing";
import { deriveExistingMenuVariantPrices } from "../../src/server/pricing/bootstrap";

describe("pricing parity existing menu", () => {
  it("maps every card price exactly once to a Variant baseline", () => {
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

    const menu = JSON.parse(
      readFileSync(path.join(process.cwd(), "src/data/menu.json"), "utf8"),
    ) as unknown;
    const staticByName = new Map<string, string | number>();
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
          staticByName.set(record.name, price);
        }
      }
      for (const value of Object.values(record)) visit(value);
    };
    visit(menu);

    expect(derived.length).toBe(staticByName.size);
    expect(new Set(derived.map((r) => r.variant_id)).size).toBe(derived.length);

    for (const row of artifact.variant_prices) {
      const source = staticByName.get(row.source_item_name);
      expect(source).toBeDefined();
      expect(row.amount_paise).toBe(Number(parseRupeeToPaise(source!)));
    }
  });
});
