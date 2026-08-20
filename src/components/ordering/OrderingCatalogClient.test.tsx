import { render, screen, waitFor, within } from "@testing-library/react";
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

const scrollSpyState = vi.hoisted(() => ({
  activeSectionId: null as string | null,
}));

vi.mock("./useCategoryScrollSpy", () => ({
  useCategoryScrollSpy: () => ({
    activeSectionId: scrollSpyState.activeSectionId,
  }),
}));

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
  scrollSpyState.activeSectionId = null;
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
    expect(
      within(screen.getByTestId("menu-category-nav")).getByRole("link", { name: "Drinks" }),
    ).toHaveAttribute("href", "#cat-sec-1");
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

    await userEvent.click(
      screen.getAllByRole("button", { name: /decrease classic milk tea quantity/i })[0]!,
    );
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

describe("OrderingCatalogClient IMP-028D", () => {
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

  it("applies aria-current from scroll-spy active category", async () => {
    scrollSpyState.activeSectionId = "cat-sec-2";
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: multiCategoryMenu },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("menu-category-nav")).toBeInTheDocument());
    const horizontal = screen.getByTestId("menu-category-nav");
    expect(within(horizontal).getByRole("link", { name: "Snacks" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(within(horizontal).getByRole("link", { name: "Drinks" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps category anchors usable for click navigation", async () => {
    getCustomerMenu.mockResolvedValue({
      ok: true,
      status: 200,
      data: { menu: multiCategoryMenu },
    });
    render(<OrderingCatalogClient brandId="brand-1" />);
    const horizontal = await screen.findByTestId("menu-category-nav");
    const drinks = within(horizontal).getByRole("link", { name: "Drinks" });
    expect(drinks).toHaveAttribute("href", "#cat-sec-1");
    await userEvent.click(drinks);
    expect(drinks).toHaveAttribute("href", "#cat-sec-1");
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

  it("does not create nested independently scrolling panes in the ordering shell", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    await waitFor(() => expect(screen.getByTestId("desktop-ordering-shell")).toBeInTheDocument());
    const shell = screen.getByTestId("desktop-ordering-shell");
    expect(shell.className).not.toMatch(/overflow-y-auto|overflow-auto/);
    expect(screen.getByTestId("desktop-category-rail").className).not.toMatch(
      /overflow-y-auto|overflow-auto/,
    );
    expect(screen.getByTestId("desktop-live-cart").className).not.toMatch(
      /overflow-y-auto|overflow-auto/,
    );
  });

  it("keeps serviceability compact while retaining the delivery PIN control", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    const orientation = await screen.findByTestId("deliver-to-orientation");
    expect(orientation.className).not.toMatch(/bg-\[var\(--bg-section\)\].*p-4/);
    expect(within(orientation).getByText("Check delivery PIN")).toBeInTheDocument();
    expect(within(orientation).getByLabelText("Delivery PIN")).toBeInTheDocument();
  });

  it("shows a live-cart empty state without leaving the Menu", async () => {
    render(<OrderingCatalogClient brandId="brand-1" />);
    const cart = await screen.findByTestId("desktop-live-cart");
    expect(cart).toHaveTextContent("Your cart");
    expect(cart).toHaveTextContent("Your cart is empty.");
  });
});
