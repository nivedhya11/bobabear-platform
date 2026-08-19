import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderingCatalogClient } from "./OrderingCatalogClient";

const getActiveCart = vi.fn<(...args: unknown[]) => unknown>();
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
    addCartLine: (...args: unknown[]) => addCartLine(...args),
    setCartLineQuantity: (...args: unknown[]) => setCartLineQuantity(...args),
    removeCartLine: (...args: unknown[]) => removeCartLine(...args),
    evaluateCart: (...args: unknown[]) => evaluateCart(...args),
  };
});

const catalog = {
  brandId: "brand-1",
  brandCode: "boba",
  importId: "import-1",
  importVersion: 1,
  sourceInventorySha256: "abc",
  sections: [
    {
      id: "sec-1",
      parentSectionId: null,
      name: "Drinks",
      sourceKey: "category:drinks",
      position: 1,
    },
  ],
  items: [
    {
      sourceKey: "item-1",
      productId: "prod-1",
      variantId: "var-1",
      sectionId: "sec-1",
      name: "Classic Milk Tea",
      description: "Smooth milk tea",
      imagePath: "/img.png",
      tags: [],
      categorySlug: "drinks",
      subcategoryName: "Milk tea",
      position: 1,
      presentationPriceRupees: 199,
    },
  ],
};

beforeEach(() => {
  getActiveCart.mockReset();
  addCartLine.mockReset();
  setCartLineQuantity.mockReset();
  removeCartLine.mockReset();
  evaluateCart.mockReset();
  getActiveCart.mockResolvedValue({
    ok: true,
    status: 200,
    data: { cart: null },
  });
});

describe("OrderingCatalogClient", () => {
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

    render(<OrderingCatalogClient catalog={catalog} />);
    await waitFor(() => expect(screen.queryByTestId("sticky-cart")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /add classic milk tea to cart/i }));
    await waitFor(() => expect(screen.getByTestId("sticky-cart")).toBeInTheDocument());
    expect(screen.getByTestId("sticky-cart")).toHaveTextContent(/1 item/i);

    await userEvent.click(screen.getByRole("button", { name: /decrease classic milk tea quantity/i }));
    await waitFor(() => expect(screen.queryByTestId("sticky-cart")).not.toBeInTheDocument());
  });

  it("shows deliver-to orientation without serviceable badge", async () => {
    render(<OrderingCatalogClient catalog={catalog} />);
    await waitFor(() => expect(screen.getByTestId("deliver-to-orientation")).toBeInTheDocument());
    expect(screen.getByText("Dehradun")).toBeInTheDocument();
    expect(screen.queryByText(/serviceable/i)).not.toBeInTheDocument();
  });
});
