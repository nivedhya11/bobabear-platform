import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssortmentEditor } from "../../src/components/administration/commercial/AssortmentEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";

const inspectAssortmentVariant = vi.fn();

vi.mock("@/lib/administration/commercial-assortment", () => ({
  inspectAssortmentVariant: (...args: unknown[]) => inspectAssortmentVariant(...args),
  includeAssortmentVariant: vi.fn(),
  excludeAssortmentTarget: vi.fn(),
  previewAssortmentConsequence: vi.fn(),
}));

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

const capabilities: CommercialCapabilities = {
  catalogRead: false,
  catalogManage: false,
  menuRead: false,
  menuManage: false,
  assortmentRead: true,
  assortmentManage: true,
  pricingRead: false,
  pricingManage: false,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

beforeEach(() => {
  inspectAssortmentVariant.mockReset();
  inspectAssortmentVariant.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      inspection: {
        brandId: "brand-1",
        variantId: "variant-1",
        includeRule: null,
        relatedRules: [],
        outletConsequences: [],
        availabilityIsSeparate: true,
      },
    },
  });
});

describe("AssortmentEditor", () => {
  it("distinguishes Assortment vs Availability", async () => {
    render(
      <AssortmentEditor
        context={context}
        capabilities={capabilities}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("assortment-editor")).toBeInTheDocument());
    expect(screen.getByText(/Brand assortment vs availability/i)).toBeInTheDocument();
    expect(screen.getByText(/ASSORTMENT/)).toBeInTheDocument();
    expect(screen.getByText(/AVAILABILITY/)).toBeInTheDocument();
  });

  it("manage=false does not offer include mutation", async () => {
    render(
      <AssortmentEditor
        context={context}
        capabilities={{ ...capabilities, assortmentManage: false }}
        authoringAllowed
        onStatus={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("assortment-editor")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /include variant/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /exclude variant/i })).not.toBeInTheDocument();
  });
});
