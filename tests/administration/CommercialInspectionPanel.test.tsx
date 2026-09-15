import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommercialInspectionPanel } from "../../src/components/administration/commercial/CommercialInspectionPanel";
import type { CommercialContext } from "../../src/components/administration/commercial/commercial-types";
import type { CommercialInspectionResponse } from "../../src/lib/administration/commercial";

const fetchCommercialInspection = vi.fn();
const fetchCommercialOutletInspection = vi.fn();

vi.mock("@/lib/administration/commercial", () => ({
  fetchCommercialInspection: (...args: unknown[]) => fetchCommercialInspection(...args),
  fetchCommercialOutletInspection: (...args: unknown[]) =>
    fetchCommercialOutletInspection(...args),
}));

function section(
  state: "available" | "unavailable_to_inspect",
  data: unknown = null,
  explanation = "Server composed explanation",
) {
  return {
    state,
    permission: "catalog.read",
    data,
    explanation,
  };
}

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: "product-1",
  productLabel: "Tea",
  variantId: "variant-1",
  variantLabel: "Regular",
  outletId: null,
  outletLabel: null,
  menuId: null,
};

beforeEach(() => {
  fetchCommercialInspection.mockReset();
  fetchCommercialOutletInspection.mockReset();
});

describe("CommercialInspectionPanel", () => {
  it("renders available vs unavailable_to_inspect without fabricating values", async () => {
    const inspection: CommercialInspectionResponse = {
      ok: true,
      brandId: "brand-1",
      variantId: "variant-1",
      productId: "product-1",
      outletId: null,
      catalog: section("available", { name: "Milk Tea", code: "MT" }),
      menu: section("unavailable_to_inspect", null, "Menu not authorized for inspection"),
      assortment: section("unavailable_to_inspect"),
      availability: section("unavailable_to_inspect"),
      operating: section("unavailable_to_inspect"),
      pricing: section("unavailable_to_inspect"),
      promotions: section("unavailable_to_inspect"),
      deliveryTariff: section("unavailable_to_inspect"),
      taxCharges: section("unavailable_to_inspect"),
      mediaReference: {
        state: "available" as const,
        permission: "catalog.read",
        data: { imagePath: null, source: "menu" },
        explanation: "Server composed explanation",
      },
      authoritiesRemainDistinct: true,
      diagnosisIsSourceOfTruth: false,
    };
    fetchCommercialInspection.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: inspection,
    });

    render(<CommercialInspectionPanel context={context} />);
    await waitFor(() => expect(screen.getByTestId("commercial-inspection")).toBeInTheDocument());

    expect(screen.getByText("Catalog identity")).toBeInTheDocument();
    expect(screen.getAllByText("available").length).toBeGreaterThan(0);
    expect(screen.getAllByText("unavailable_to_inspect").length).toBeGreaterThan(0);
    expect(screen.getByText(/name: Milk Tea/)).toBeInTheDocument();
    expect(screen.getByText(/code: MT/)).toBeInTheDocument();
    expect(screen.queryByText(/₹|fabricated|placeholder price/i)).not.toBeInTheDocument();
    expect(screen.getByText("Menu not authorized for inspection")).toBeInTheDocument();
  });
});
