import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviousPaymentRecoveryView } from "./PreviousPaymentRecoveryView";
import type { CommerceCart, CommerceCheckoutSnapshot } from "@/lib/customer-commerce";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const catalog = {
  brandId: "brand-1",
  brandCode: "BOBA",
  importId: "imp-1",
  importVersion: 1,
  sourceInventorySha256: "abc",
  sections: [],
  items: [
    {
      sourceKey: "hk",
      productId: "p-1",
      variantId: "var-hk",
      sectionId: "s-1",
      name: "Hong Kong Milk Tea Boba",
      description: "",
      imagePath: "",
      presentationPriceRupees: 199,
      tags: [],
      categorySlug: "drinks",
      subcategoryName: "Tea",
      position: 1,
    },
    {
      sourceKey: "brown",
      productId: "p-2",
      variantId: "var-brown",
      sectionId: "s-1",
      name: "Brown Sugar Boba",
      description: "",
      imagePath: "",
      presentationPriceRupees: 220,
      tags: [],
      categorySlug: "drinks",
      subcategoryName: "Tea",
      position: 2,
    },
  ],
} as OrderingCatalog;

const currentCart: CommerceCart = {
  id: "cart-1",
  brandId: "brand-1",
  ownerMode: "customer",
  revision: "16",
  manualCouponCode: null,
  expiresAt: null,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  lines: [
    {
      id: "line-current",
      variantId: "var-brown",
      quantity: 1,
      modifiers: [],
      bundleSelections: [],
    },
  ],
};

const previousSnapshot = {
  id: "snap-1",
  checkoutId: "chk-1",
  checkoutRevision: "4",
  sourceCartRevision: "5",
  selectedOutletId: "outlet-1",
  evaluatedAt: "2026-09-04T00:00:00.000Z",
  serviceabilityEvaluatedAt: "2026-09-04T00:00:00.000Z",
  currency: "INR",
  manualCouponCode: null,
  destination: null,
  basePaise: "59700",
  modifierAdjustmentsPaise: "0",
  bundleAdjustmentsPaise: "0",
  chargesPaise: "6000",
  prePromotionSubtotalPaise: "65700",
  promotionDiscountPaise: "0",
  taxablePaise: "65700",
  taxPaise: "0",
  grandTotalPaise: "84700",
  taxInclusionMode: "TAX_INCLUSIVE",
  createdAt: "2026-09-04T00:00:00.000Z",
  lines: [
    {
      productName: "Hong Kong Milk Tea Boba",
      variantName: "Regular",
      quantity: 3,
      lineTotalPaise: "78700",
    },
  ],
  charges: [
    { code: "PACKAGING", amountPaise: "2000" },
    { code: "DELIVERY", amountPaise: "4000" },
  ],
  promotionEffects: [],
  taxComponents: [],
} as unknown as CommerceCheckoutSnapshot;

describe("PreviousPaymentRecoveryView", () => {
  it("labels previous checkout separately from current cart", () => {
    render(
      <PreviousPaymentRecoveryView
        cart={currentCart}
        catalog={catalog}
        previousSnapshot={previousSnapshot}
      />,
    );

    expect(screen.getByText("Previous payment is being checked")).toBeInTheDocument();
    expect(screen.getByTestId("previous-checkout-summary")).toHaveTextContent("Previous checkout");
    expect(screen.getByText("Previous checkout items")).toBeInTheDocument();
    expect(screen.getByText(/3 × Hong Kong Milk Tea Boba/)).toBeInTheDocument();
    expect(screen.queryByText("Your items")).not.toBeInTheDocument();

    expect(screen.getByTestId("current-cart-summary")).toHaveTextContent("Current cart");
    expect(screen.getByTestId("current-cart-summary")).toHaveTextContent("1 item");
    expect(screen.getByTestId("current-cart-lines")).toHaveTextContent("1 × Brown Sugar Boba");
    expect(screen.getByTestId("current-cart-summary")).not.toHaveTextContent(
      "Hong Kong Milk Tea Boba",
    );

    expect(screen.getByTestId("previous-checkout-lock-copy")).toBeInTheDocument();
    expect(screen.getByTestId("previous-checkout-address-lock")).toBeInTheDocument();
    expect(screen.getByTestId("cart-changed-back-to-cart")).toHaveAttribute("href", "/order/cart/");
    expect(screen.getByTestId("cart-changed-back-to-cart")).toHaveTextContent("View current cart");
  });
});
