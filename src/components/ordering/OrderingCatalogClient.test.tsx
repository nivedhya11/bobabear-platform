import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderingCatalogClient } from "./OrderingCatalogClient";
import type { CustomerMenuProjection } from "@/shared/customer-menu/types";

const getActiveCart = vi.fn<(...args: unknown[]) => unknown>();
const getCustomerMenu = vi.fn<(...args: unknown[]) => unknown>();
const addCartLine = vi.fn<(...args: unknown[]) => unknown>();
const setCartLineQuantity = vi.fn<(...args: unknown[]) => unknown>();
const removeCartLine = vi.fn<(...args: unknown[]) => unknown>();
const evaluateCart = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    getActiveCart: (...args: unknown[]) => getActiveCart(...args),
    getCustomerMenu: (...args: unknown[]) => getCustomerMenu(...args),
    addCartLine: (...args: unknown[]) => addCartLine(...args),
    setCartLineQuantity: (...args: unknown[]) => setCartLineQuantity(...args),
    removeCartLine: (...args: unknown[]) => removeCartLine(...args),
    evaluateCart: (...args: unknown[]) => evaluateCart(...args),
  };
});

const menu: CustomerMenuProjection = {
  brandId: "brand-1",
  menuId: "menu-1",
  name: "Primary Menu",
  sections: [
    {
      id: "sec-1",
      parentSectionId: null,
      name: "Drinks",
      position: 1,
    },
    {
      id: "sec-1-child",
      parentSectionId: "sec-1",
      name: "Milk tea",
      position: 0,
    },
  ],
  items: [
    {
      productId: "prod-1",
      variantId: "var-1",
      sectionId: "sec-1-child",
      name: "Classic Milk Tea",
      description: "Smooth milk tea",
      imagePath: "/img.png",
      displayPricePaise: 19900,
      currency: "INR",
    },
  ],
};

beforeEach(() => {
  getActiveCart.mockReset();
  getCustomerMenu.mockReset();
  addCartLine.mockReset();
  setCartLineQuantity.mockReset();
  removeCartLine.mockReset();
  evaluateCart.mockReset();
  getCustomerMenu.mockResolvedValue({
    ok: true,
    status: 200,
    data: { menu },
  });
  getActiveCart.mockResolvedValue({
    ok: true,
    status: 200,
    data: { cart: null },
  });
});

describe("OrderingCatalogClient", () => {
  it("loads menu from customer-commerce and renders category navigation", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument());
    expect(getCustomerMenu).toHaveBeenCalledWith({ brandId: "brand-1" });
    expect(screen.getByRole("link", { name: "Drinks" })).toHaveAttribute("href", "#cat-sec-1");
    expect(screen.getByRole("heading", { name: "Classic Milk Tea" })).toBeInTheDocument();
    expect(screen.getByText("₹199.00")).toBeInTheDocument();
  });

  it("shows sticky cart after add and hides when cart empties", async () => {
    addCartLine.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        cart: {
          id: "cart-1",
          brandId: "brand-1",
          ownerMode: "guest",
          revision: "1",
          manualCouponCode: null,
          expiresAt: null,
          createdAt: "2026-08-13T00:00:00.000Z",
          updatedAt: "2026-08-13T00:00:00.000Z",
          lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
        },
      },
    });
    removeCartLine.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        cart: {
          id: "cart-1",
          brandId: "brand-1",
          ownerMode: "guest",
          revision: "2",
          manualCouponCode: null,
          expiresAt: null,
          createdAt: "2026-08-13T00:00:00.000Z",
          updatedAt: "2026-08-13T00:00:00.000Z",
          lines: [],
        },
      },
    });

    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.queryByTestId("sticky-cart")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add classic milk tea to cart/i }));
    await waitFor(() => expect(screen.getByTestId("sticky-cart")).toBeInTheDocument());
    expect(screen.getByTestId("sticky-cart")).toHaveTextContent(/1 item/i);

    await userEvent.click(screen.getByRole("button", { name: /decrease classic milk tea quantity/i }));
    await waitFor(() => expect(screen.queryByTestId("sticky-cart")).not.toBeInTheDocument());
  });

  it("shows deliver-to orientation without serviceable badge", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("deliver-to-orientation")).toBeInTheDocument());
    expect(screen.getByText("Dehradun")).toBeInTheDocument();
    expect(screen.queryByText(/serviceable/i)).not.toBeInTheDocument();
  });

  it("does not render search, filter, or ranking controls", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Menu" })).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /filter/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/most ordered/i)).not.toBeInTheDocument();
  });

  it("uses an accessible customization dialog and sends only explicit configured modifier intent", async () => {
    const customizedMenu: CustomerMenuProjection = {
      ...menu,
      items: [{
        ...menu.items[0]!,
        modifierGroups: [{
          modifierGroupId: "group-1",
          variantModifierGroupId: "binding-1",
          name: "Toppings",
          required: true,
          minTotalQuantity: 1,
          maxTotalQuantity: 2,
          position: 0,
          options: [
            { modifierOptionId: "free", modifierGroupOptionId: "option-free", name: "Regular ice", minQuantity: 0, maxQuantity: 1, defaultQuantity: 1, position: 0, displayPriceDeltaPaise: 0, currency: "INR" },
            { modifierOptionId: "paid", modifierGroupOptionId: "option-paid", name: "Pearls", minQuantity: 0, maxQuantity: 1, defaultQuantity: 1, position: 1, displayPriceDeltaPaise: 3000, currency: "INR" },
          ],
        }],
      }],
    };
    getCustomerMenu.mockResolvedValueOnce({ ok: true, status: 200, data: { menu: customizedMenu } });
    addCartLine.mockResolvedValueOnce({
      ok: true, status: 200, data: { cart: { id: "cart-1", brandId: "brand-1", ownerMode: "guest", revision: "1", manualCouponCode: null, expiresAt: null, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z", lines: [] } },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Customize Classic Milk Tea" }));
    expect(screen.getByRole("dialog", { name: "Customize Classic Milk Tea" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /pearls/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /regular ice/i })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /pearls/i }));
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await waitFor(() => expect(addCartLine).toHaveBeenCalledWith({
      brandId: "brand-1", variantId: "var-1", quantity: 1, expectedRevision: undefined,
      modifiers: [
        { variantModifierGroupId: "binding-1", modifierGroupOptionId: "option-free", quantity: 1 },
        { variantModifierGroupId: "binding-1", modifierGroupOptionId: "option-paid", quantity: 1 },
      ],
    }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires an explicit paid choice when no free default satisfies a required group", async () => {
    const customizedMenu: CustomerMenuProjection = {
      ...menu,
      items: [{
        ...menu.items[0]!,
        modifierGroups: [{
          modifierGroupId: "group-1", variantModifierGroupId: "binding-1", name: "Size", required: true,
          minTotalQuantity: 1, maxTotalQuantity: 1, position: 0,
          options: [{ modifierOptionId: "paid", modifierGroupOptionId: "option-paid", name: "Large", minQuantity: 0, maxQuantity: 1, defaultQuantity: 1, position: 0, displayPriceDeltaPaise: 3000, currency: "INR" }],
        }],
      }],
    };
    getCustomerMenu.mockResolvedValueOnce({ ok: true, status: 200, data: { menu: customizedMenu } });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Customize Classic Milk Tea" }));
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Size requires at least 1 selection");
    await userEvent.click(screen.getByRole("checkbox", { name: /large/i }));
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });
});
