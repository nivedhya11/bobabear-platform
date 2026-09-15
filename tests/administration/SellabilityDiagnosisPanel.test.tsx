import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SellabilityDiagnosisPanel } from "../../src/components/administration/commercial/SellabilityDiagnosisPanel";
import type { CommercialContext } from "../../src/components/administration/commercial/commercial-types";

const postSellabilityDiagnosis = vi.fn();

vi.mock("@/lib/administration/commercial", () => ({
  postSellabilityDiagnosis: (...args: unknown[]) => postSellabilityDiagnosis(...args),
}));

const context: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: "product-1",
  productLabel: "Tea",
  variantId: "variant-1",
  variantLabel: "Regular",
  outletId: "outlet-1",
  outletLabel: "Main",
  menuId: null,
};

beforeEach(() => {
  postSellabilityDiagnosis.mockReset();
});

describe("SellabilityDiagnosisPanel", () => {
  it("renders distinct authority signals", async () => {
    const user = userEvent.setup();
    postSellabilityDiagnosis.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        ok: true,
        brandId: "brand-1",
        variantId: "variant-1",
        productId: "product-1",
        outletId: "outlet-1",
        signals: [
          {
            key: "catalog",
            authority: "catalog",
            subject: {
              brandId: "brand-1",
              variantId: "variant-1",
              productId: "product-1",
              outletId: "outlet-1",
            },
            outcome: "OK",
            explanation: "Catalog identity is active.",
            actionableContext: null,
            authoritative: true,
          },
          {
            key: "pricing",
            authority: "pricing",
            subject: {
              brandId: "brand-1",
              variantId: "variant-1",
              productId: "product-1",
              outletId: "outlet-1",
            },
            outcome: "BLOCKED",
            explanation: "No sellable baseline price.",
            actionableContext: "Set baseline pricing",
            authoritative: true,
          },
          {
            key: "serviceability",
            authority: "serviceability",
            subject: {
              brandId: "brand-1",
              variantId: "variant-1",
              productId: "product-1",
              outletId: "outlet-1",
            },
            outcome: "UNKNOWN",
            explanation: "No customer location provided.",
            actionableContext: null,
            authoritative: true,
          },
        ],
        diagnosisIsSourceOfTruth: false,
        newSellabilityDomain: false,
        underlyingAuthoritiesRemainAuthoritative: true,
      },
    });

    render(<SellabilityDiagnosisPanel context={context} onStatus={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /diagnose sellability/i }));
    await waitFor(() => expect(screen.getByTestId("sellability-diagnosis")).toBeInTheDocument());
    expect(screen.getByText("Authority: Catalog identity")).toBeInTheDocument();
    expect(screen.getByText("Authority: Pricing completeness")).toBeInTheDocument();
    expect(screen.getByText("Authority: Serviceability")).toBeInTheDocument();
    expect(screen.getByText("Catalog identity is active.")).toBeInTheDocument();
    expect(screen.getByText("No sellable baseline price.")).toBeInTheDocument();
  });
});
