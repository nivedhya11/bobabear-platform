import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrderingCatalogClient } from "./OrderingCatalogClient";
import type { CustomerMenuProjection } from "@/shared/customer-menu/types";
import {
  clearGuestCartCredential,
  readGuestCartCredential,
  writeGuestCartCredential,
} from "@/lib/customer-commerce/guest-token";

const getActiveCart = vi.fn<(...args: unknown[]) => unknown>();
const getCustomerMenu = vi.fn<(...args: unknown[]) => unknown>();
const addCartLine = vi.fn<(...args: unknown[]) => unknown>();
const setCartLineQuantity = vi.fn<(...args: unknown[]) => unknown>();
const removeCartLine = vi.fn<(...args: unknown[]) => unknown>();
const evaluateCart = vi.fn<(...args: unknown[]) => unknown>();
const clearCart = vi.fn<(...args: unknown[]) => unknown>();

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
    clearCart: (...args: unknown[]) => clearCart(...args),
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

const multiCategoryMenu: CustomerMenuProjection = {
  brandId: "brand-1",
  menuId: "menu-1",
  name: "Primary Menu",
  sections: [
    { id: "sec-1", parentSectionId: null, name: "Drinks", position: 1 },
    { id: "sec-2", parentSectionId: null, name: "Snacks", position: 2 },
    { id: "sec-1-child", parentSectionId: "sec-1", name: "Milk tea", position: 0 },
    { id: "sec-2-child", parentSectionId: "sec-2", name: "Bites", position: 0 },
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
    {
      productId: "prod-2",
      variantId: "var-2",
      sectionId: "sec-2-child",
      name: "Fish Balls",
      description: "Crispy",
      imagePath: null,
      displayPricePaise: 14900,
      currency: "INR",
      modifierGroups: [
        {
          modifierGroupId: "group-1",
          variantModifierGroupId: "binding-1",
          name: "Sauce",
          required: false,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
          options: [
            {
              modifierOptionId: "opt-1",
              modifierGroupOptionId: "option-1",
              name: "Chili",
              minQuantity: 0,
              maxQuantity: 1,
              defaultQuantity: 0,
              position: 0,
              displayPriceDeltaPaise: 1000,
              currency: "INR",
            },
          ],
        },
      ],
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
  clearCart.mockReset();
  clearGuestCartCredential();
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
    expect(
      within(screen.getByTestId("menu-category-nav")).getByRole("button", { name: "Drinks" }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Classic Milk Tea" })).toBeInTheDocument();
    expect(screen.getByText("₹199.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Classic Milk Tea" })).toHaveTextContent("Add +");
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

    await userEvent.click(screen.getByRole("button", { name: "Add Classic Milk Tea" }));
    await waitFor(() => expect(screen.getByTestId("sticky-cart")).toBeInTheDocument());
    const stickyCart = screen.getByTestId("sticky-cart");
    const mobileContent = within(stickyCart).getByTestId("mobile-sticky-cart-content");
    expect(mobileContent).toHaveTextContent("1 item · ₹199.00");
    expect(mobileContent).toHaveTextContent("Estimated subtotal");
    expect(stickyCart).toHaveTextContent("View cart");
    expect(stickyCart).toHaveTextContent("Checkout");
    expect(screen.queryByText("Cart · 1 · Estimated subtotal ₹199.00")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: /decrease classic milk tea quantity/i })[0]!,
    );
    await waitFor(() => expect(screen.queryByTestId("sticky-cart")).not.toBeInTheDocument());
  });

  it("shows deliver-to orientation without serviceable badge", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("deliver-to-orientation")).toBeInTheDocument());
    expect(screen.getByText(/Delivering to/i)).toBeInTheDocument();
    expect(screen.getByText("Dehradun")).toBeInTheDocument();
    expect(screen.queryByText(/serviceable/i)).not.toBeInTheDocument();
  });

  it("renders delivery orientation before the category heading on mobile page strip", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    const orientation = await screen.findByTestId("deliver-to-orientation");
    const heading = screen.getByRole("heading", { name: /drinks/i, level: 1 });
    expect(
      orientation.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders menu search without filter or ranking controls", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /drinks/i, level: 1 })).toBeInTheDocument());
    expect(screen.getByTestId("menu-search-input")).toBeInTheDocument();
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
    const customizableCue = await screen.findByText("Customisable");
    expect(customizableCue).toBeInTheDocument();
    expect(customizableCue).not.toHaveClass("hidden");
    await userEvent.click(await screen.findByRole("button", { name: "Add Classic Milk Tea" }));
    expect(screen.getByRole("dialog", { name: "Customize Classic Milk Tea" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /pearls/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /regular ice/i })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /pearls/i }));
    await userEvent.click(screen.getByRole("button", { name: /Add to cart/ }));
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
    await userEvent.click(await screen.findByRole("button", { name: "Add Classic Milk Tea" }));
    expect(screen.getByRole("button", { name: /Add to cart/ })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Size requires at least 1 selection");
    await userEvent.click(screen.getByRole("checkbox", { name: /large/i }));
    expect(screen.getByRole("button", { name: /Add to cart/ })).toBeEnabled();
  });
});

describe("OrderingCatalogClient IMP-028D", () => {
  it("clears the live cart through the existing clearCart mutation", async () => {
    const activeCart = {
      id: "cart-1", brandId: "brand-1", ownerMode: "guest" as const, revision: "1",
      manualCouponCode: null, expiresAt: null, createdAt: "2026-08-13T00:00:00.000Z",
      updatedAt: "2026-08-13T00:00:00.000Z",
      lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
    };
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: activeCart } });
    clearCart.mockResolvedValue({ ok: true, status: 200, data: { cart: { ...activeCart, revision: "2", lines: [] } } });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Clear cart" }));
    await waitFor(() => expect(clearCart).toHaveBeenCalledWith({ brandId: "brand-1", expectedRevision: "1" }));
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent("Your cart is empty");
  });

  it("exposes desktop ordering shell landmarks for category rail and live cart", async () => {
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: multiCategoryMenu },
    });
    getActiveCart.mockResolvedValue({
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
          lines: [
            {
              id: "line-1",
              variantId: "var-2",
              quantity: 1,
              modifiers: [
                {
                  variantModifierGroupId: "binding-1",
                  modifierGroupOptionId: "option-1",
                  quantity: 1,
                },
              ],
              bundleSelections: [],
            },
          ],
        },
      },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-ordering-shell")).toBeInTheDocument());
    expect(screen.getByTestId("desktop-category-rail")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-live-cart")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-menu")).toBeInTheDocument();
    expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument();
    expect(screen.getByTestId("menu-category-nav").className).toMatch(/xl:hidden/);
  });

  it("renders only the selected category and switches explicitly", async () => {
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: multiCategoryMenu },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument());
    const horizontal = screen.getByTestId("menu-category-nav");
    const drinks = within(horizontal).getByRole("button", { name: "Drinks" });
    const snacks = within(horizontal).getByRole("button", { name: "Snacks" });
    expect(drinks).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Classic Milk Tea" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fish Balls" })).not.toBeInTheDocument();
    await userEvent.click(snacks);
    expect(snacks).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Fish Balls" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Classic Milk Tea" })).not.toBeInTheDocument();
  });

  it("renders configured cart lines in the desktop live cart", async () => {
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: multiCategoryMenu },
    });
    getActiveCart.mockResolvedValue({
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
          lines: [
            {
              id: "line-1",
              variantId: "var-2",
              quantity: 1,
              modifiers: [
                {
                  variantModifierGroupId: "binding-1",
                  modifierGroupOptionId: "option-1",
                  quantity: 1,
                },
              ],
              bundleSelections: [],
            },
          ],
        },
      },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-live-cart")).toBeInTheDocument());
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent("Fish Balls");
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent(/Chili/i);
    expect(
      within(screen.getByTestId("desktop-live-cart")).getByRole("link", { name: /checkout/i }),
    ).toHaveAttribute("href", "/order/checkout/");
  });

  it("shows Estimated subtotal only for complete presentation and never engineering copy", async () => {
    getActiveCart.mockResolvedValue({
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
          lines: [
            {
              id: "line-plain",
              variantId: "var-1",
              quantity: 2,
              modifiers: [],
              bundleSelections: [],
            },
          ],
        },
      },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-live-cart")).toBeInTheDocument());
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent(/Estimated subtotal ₹398\.00/);
    expect(screen.queryByText(/menu prices/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/server-authoritative/i)).not.toBeInTheDocument();
  });

  it("falls back to Total shown at checkout when a cart line cannot resolve display price", async () => {
    getActiveCart.mockResolvedValue({
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
          lines: [
            {
              id: "line-missing",
              variantId: "gone-variant",
              quantity: 1,
              modifiers: [],
              bundleSelections: [],
            },
          ],
        },
      },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-live-cart")).toBeInTheDocument());
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent("Total shown at checkout");
    expect(screen.getByTestId("desktop-live-cart")).not.toHaveTextContent(/Estimated subtotal/);
  });

  it("makes the Cart item list the sole nested vertical scroll region", async () => {
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: { id: "cart-1", brandId: "brand-1", ownerMode: "guest", revision: "1", manualCouponCode: null, expiresAt: null, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z", lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }] } } });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-ordering-shell")).toBeInTheDocument());
    const shell = screen.getByTestId("desktop-ordering-shell");
    expect(shell.className).not.toMatch(/overflow-y-auto|overflow-auto/);
    expect(screen.getByTestId("desktop-category-rail").className).not.toMatch(
      /overflow-y-auto|overflow-auto/,
    );
    expect(screen.getByTestId("desktop-cart-items").className).toMatch(/overflow-y-auto/);
    expect(screen.getByTestId("desktop-cart-footer")).not.toBe(screen.getByTestId("desktop-cart-items"));
  });

  it("keeps delivery location compact while exposing the selector trigger", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    const orientation = await screen.findByTestId("deliver-to-orientation");
    expect(orientation.className).not.toMatch(/bg-\[var\(--bg-section\)\].*p-4/);
    expect(within(orientation).getByText(/Delivering to/i)).toBeInTheDocument();
  });

  it("shows a live-cart empty state without leaving the Menu", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    const cart = await screen.findByTestId("desktop-live-cart");
    expect(cart).toHaveTextContent("Your cart");
    expect(cart).toHaveTextContent("Your cart is empty");
  });
});

describe("OrderingCatalogClient IMP-036C global search", () => {
  const globalSearchMenu: CustomerMenuProjection = {
    brandId: "brand-1",
    menuId: "menu-1",
    name: "Primary Menu",
    sections: [
      { id: "sec-bar", parentSectionId: null, name: "The Bar", position: 1 },
      { id: "sec-burger", parentSectionId: null, name: "Burger", position: 2 },
      { id: "sec-bar-child", parentSectionId: "sec-bar", name: "Boba", position: 0 },
      { id: "sec-burger-child", parentSectionId: "sec-burger", name: "Burgers", position: 0 },
    ],
    items: [
      {
        productId: "prod-taro",
        variantId: "var-taro",
        sectionId: "sec-bar-child",
        name: "Taro Boba",
        description: "Sweet taro milk tea",
        imagePath: null,
        displayPricePaise: 24900,
        currency: "INR",
      },
      {
        productId: "prod-burger",
        variantId: "var-burger",
        sectionId: "sec-burger-child",
        name: "Classic Burger",
        description: "Beef patty with cheese",
        imagePath: null,
        displayPricePaise: 34900,
        currency: "INR",
      },
      {
        productId: "prod-fish",
        variantId: "var-fish",
        sectionId: "sec-bar-child",
        name: "Fish Balls",
        description: "Crispy snack",
        imagePath: null,
        displayPricePaise: 14900,
        currency: "INR",
      },
    ],
  };

  beforeEach(() => {
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: globalSearchMenu },
    });
  });

  it("shows only the selected category when search is empty", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "The Bar", level: 1 })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Taro Boba" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Classic Burger" })).not.toBeInTheDocument();
  });

  it("finds items in the selected category when searching", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("menu-search-input"), "taro");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Search results", level: 1 })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Taro Boba" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Classic Burger" })).not.toBeInTheDocument();
  });

  it("searches globally across categories regardless of selected category", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument());
    await userEvent.click(within(screen.getByTestId("menu-category-nav")).getByRole("button", { name: "Burger" }));
    await userEvent.type(screen.getByTestId("menu-search-input"), "taro");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Taro Boba" })).toBeInTheDocument());
    expect(within(screen.getByTestId("desktop-menu")).getByRole("heading", { name: "The Bar", level: 2 })).toBeInTheDocument();
  });

  it("returns matching products from multiple categories", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("menu-search-input"), "crispy");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Fish Balls" })).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Classic Burger" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Taro Boba" })).not.toBeInTheDocument();
  });

  it("excludes nonmatching products from global search", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("menu-search-input"), "burger");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Classic Burger" })).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Taro Boba" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fish Balls" })).not.toBeInTheDocument();
  });

  it("restores the previously selected category when search is cleared", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument());
    await userEvent.click(within(screen.getByTestId("menu-category-nav")).getByRole("button", { name: "Burger" }));
    const search = screen.getByTestId("menu-search-input");
    await userEvent.type(search, "taro");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Taro Boba" })).toBeInTheDocument());
    await userEvent.clear(search);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Burger", level: 1 })).toBeInTheDocument());
    expect(within(screen.getByTestId("menu-category-nav")).getByRole("button", { name: "Burger" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Classic Burger" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Taro Boba" })).not.toBeInTheDocument();
  });

  it("shows a global no-results message when nothing matches", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("menu-search-input"), "unicorn");
    await waitFor(() =>
      expect(screen.getByText("Nothing in the menu matched your search.")).toBeInTheDocument(),
    );
  });

  it("matches item descriptions during global search", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("menu-search-input"), "beef patty");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Classic Burger" })).toBeInTheDocument());
  });
});

describe("OrderingCatalogClient IMP-036C stale guest cart recovery", () => {
  const guestCredential = {
    token: "stale-guest-token",
    brandId: "brand-1",
    cartId: "cart-stale",
    revision: "7",
  } as const;

  beforeEach(() => {
    writeGuestCartCredential(guestCredential);
  });

  afterEach(() => {
    clearGuestCartCredential();
  });

  it("recovers transparently from an expired guest cart on initial load", async () => {
    getActiveCart.mockResolvedValue({ ok: false, code: "CART_EXPIRED", status: 410 });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Classic Milk Tea" })).toBeInTheDocument());
    expect(screen.queryByText("Your guest cart expired. Add your items again.")).not.toBeInTheDocument();
    expect(readGuestCartCredential()).toBeNull();
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent("Your cart is empty");
  });

  it("recovers transparently from a missing guest cart on initial load", async () => {
    getActiveCart.mockResolvedValue({ ok: false, code: "CART_NOT_FOUND", status: 404 });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Classic Milk Tea" })).toBeInTheDocument());
    expect(screen.queryByText(/couldn't find that cart/i)).not.toBeInTheDocument();
    expect(readGuestCartCredential()).toBeNull();
  });

  it("creates a fresh cart after stale recovery on add without sending the stale token", async () => {
    getActiveCart.mockResolvedValue({ ok: false, code: "CART_EXPIRED", status: 410 });
    addCartLine
      .mockResolvedValueOnce({ ok: false, code: "CART_EXPIRED", status: 410 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          cart: {
            id: "cart-fresh",
            brandId: "brand-1",
            ownerMode: "guest",
            revision: "1",
            manualCouponCode: null,
            expiresAt: null,
            createdAt: "2026-08-13T00:00:00.000Z",
            updatedAt: "2026-08-13T00:00:00.000Z",
            lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
          },
          guestToken: "fresh-token",
        },
      });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Add Classic Milk Tea" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Add Classic Milk Tea" }));
    await waitFor(() => expect(addCartLine).toHaveBeenCalledTimes(2));
    expect(addCartLine.mock.calls[1]?.[0]).not.toHaveProperty("expectedRevision");
    expect(screen.getByTestId("sticky-cart")).toBeInTheDocument();
  });

  it("retries configured add once after stale cart expiry during mutation", async () => {
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: null } });
    const customizedMenu: CustomerMenuProjection = {
      ...menu,
      items: [{
        ...menu.items[0]!,
        modifierGroups: [{
          modifierGroupId: "group-1",
          variantModifierGroupId: "binding-1",
          name: "Toppings",
          required: false,
          minTotalQuantity: 0,
          maxTotalQuantity: 1,
          position: 0,
          options: [
            { modifierOptionId: "paid", modifierGroupOptionId: "option-paid", name: "Pearls", minQuantity: 0, maxQuantity: 1, defaultQuantity: 0, position: 0, displayPriceDeltaPaise: 3000, currency: "INR" },
          ],
        }],
      }],
    };
    getCustomerMenu.mockResolvedValue({ ok: true, status: 200, data: { menu: customizedMenu } });
    addCartLine
      .mockResolvedValueOnce({ ok: false, code: "CART_EXPIRED", status: 410 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          cart: {
            id: "cart-fresh",
            brandId: "brand-1",
            ownerMode: "guest",
            revision: "1",
            manualCouponCode: null,
            expiresAt: null,
            createdAt: "2026-08-13T00:00:00.000Z",
            updatedAt: "2026-08-13T00:00:00.000Z",
            lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
          },
          guestToken: "fresh-token",
        },
      });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Add Classic Milk Tea" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /pearls/i }));
    await userEvent.click(screen.getByRole("button", { name: /Add to cart/ }));
    await waitFor(() => expect(addCartLine).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Your guest cart expired. Add your items again.")).not.toBeInTheDocument();
  });

  it("does not retry quantity changes against a new cart after expiry", async () => {
    const activeCart = {
      id: "cart-1",
      brandId: "brand-1",
      ownerMode: "guest" as const,
      revision: "1",
      manualCouponCode: null,
      expiresAt: null,
      createdAt: "2026-08-13T00:00:00.000Z",
      updatedAt: "2026-08-13T00:00:00.000Z",
      lines: [{ id: "line-1", variantId: "var-1", quantity: 1, modifiers: [], bundleSelections: [] }],
    };
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: activeCart } });
    setCartLineQuantity.mockResolvedValue({ ok: false, code: "CART_EXPIRED", status: 410 });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: /increase classic milk tea quantity/i }));
    await waitFor(() => expect(setCartLineQuantity).toHaveBeenCalledTimes(1));
    expect(setCartLineQuantity).not.toHaveBeenCalledTimes(2);
    expect(readGuestCartCredential()).toBeNull();
    expect(screen.getByTestId("desktop-live-cart")).toHaveTextContent("Your cart is empty");
  });

  it("still surfaces ordinary non-stale cart errors", async () => {
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: null } });
    addCartLine.mockResolvedValue({ ok: false, code: "CART_ITEM_NOT_ORDERABLE", status: 409 });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Add Classic Milk Tea" }));
    await waitFor(() =>
      expect(screen.getByText("That item can't be ordered right now.")).toBeInTheDocument(),
    );
  });
});
