import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CartLineList } from "./CartLineList";
import type { CartLinePresentation } from "./cart-presentation";

const line: CartLinePresentation = {
  lineId: "line-1",
  variantId: "var-purple-rain",
  itemName: "Purple Rain Taro Boba",
  quantity: 1,
  imagePath: "/assets/menu/Purple_Rain_Taro_Boba.jpg",
  unitPricePaise: 25900,
  lineTotalPaise: 25900,
  fullyResolvable: true,
  customizable: false,
  editEligible: false,
  modifiers: [],
  hasBundleSelections: false,
};

describe("CartLineList", () => {
  it("exposes separate increment and remove controls on full cart lines", () => {
    render(
      <CartLineList
        lines={[line]}
        onChangeQuantity={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /increase purple rain taro boba quantity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove purple rain taro boba from cart/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decrease purple rain taro boba quantity/i }),
    ).toBeInTheDocument();
  });

  it("keeps compact live-cart lines on the stepper without a remove control", () => {
    render(
      <CartLineList
        lines={[line]}
        compact
        onChangeQuantity={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /increase purple rain taro boba quantity/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove purple rain taro boba from cart/i }),
    ).not.toBeInTheDocument();
  });
});
