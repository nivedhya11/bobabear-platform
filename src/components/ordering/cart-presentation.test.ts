import { describe, expect, it } from "vitest";

import {
  cartUnitCount,
  estimateCartPresentationPaise,
  formatPresentationEstimateLabel,
} from "./cart-presentation";
import type { CommerceCart } from "@/lib/customer-commerce";
import type { OrderingCatalogItem } from "@/shared/ordering-catalog";

const cart: CommerceCart = {
  id: "cart-1",
  brandId: "brand-1",
  ownerMode: "guest",
  revision: "1",
  manualCouponCode: null,
  expiresAt: null,
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
  lines: [{ id: "line-1", variantId: "var-1", quantity: 2, modifiers: [], bundleSelections: [] }],
};

const item: OrderingCatalogItem = {
  sourceKey: "item-1",
  productId: "prod-1",
  variantId: "var-1",
  sectionId: "sec-1",
  name: "Classic Milk Tea",
  description: "Test",
  imagePath: "/img.png",
  tags: [],
  categorySlug: "drinks",
  subcategoryName: "Milk tea",
  position: 1,
  presentationPriceRupees: 199,
};

describe("cart presentation", () => {
  it("counts units and estimates menu presentation value", () => {
    const map = new Map([[item.variantId, item]]);
    expect(cartUnitCount(cart)).toBe(2);
    expect(estimateCartPresentationPaise(cart, map)).toBe(BigInt(39800));
    expect(formatPresentationEstimateLabel(BigInt(39800))).toBe("₹398.00 (menu prices)");
  });
});
