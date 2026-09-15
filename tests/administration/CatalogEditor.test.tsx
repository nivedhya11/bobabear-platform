import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogEditor } from "../../src/components/administration/commercial/CatalogEditor";
import type {
  CommercialCapabilities,
  CommercialContext,
} from "../../src/components/administration/commercial/commercial-types";
import { MOBILE_AUTHORING_MESSAGE } from "../../src/lib/administration/commercial-errors";

const listCatalogProducts = vi.fn();
const getCatalogProductGraph = vi.fn();
const listCatalogModifierGroups = vi.fn();

vi.mock("@/lib/administration/commercial-catalog", () => ({
  listCatalogProducts: (...args: unknown[]) => listCatalogProducts(...args),
  getCatalogProductGraph: (...args: unknown[]) => getCatalogProductGraph(...args),
  listCatalogModifierGroups: (...args: unknown[]) => listCatalogModifierGroups(...args),
  createCatalogProduct: vi.fn(),
  createCatalogVariant: vi.fn(),
  saveProductContentDraft: vi.fn(),
  saveVariantContentDraft: vi.fn(),
  previewCatalogPublish: vi.fn(),
  publishCatalogProduct: vi.fn(),
  activateCatalogProduct: vi.fn(),
  activateCatalogVariant: vi.fn(),
  retireCatalogProduct: vi.fn(),
  retireCatalogVariant: vi.fn(),
  associateVariantModifierGroup: vi.fn(),
}));

const baseCapabilities: CommercialCapabilities = {
  catalogRead: true,
  catalogManage: true,
  menuRead: false,
  menuManage: false,
  assortmentRead: false,
  assortmentManage: false,
  pricingRead: false,
  pricingManage: false,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

const baseContext: CommercialContext = {
  brandId: "brand-1",
  brandName: "BOBA",
  productId: null,
  productLabel: null,
  variantId: null,
  variantLabel: null,
  outletId: null,
  outletLabel: null,
  menuId: null,
};

beforeEach(() => {
  listCatalogProducts.mockReset();
  getCatalogProductGraph.mockReset();
  listCatalogModifierGroups.mockReset();
  listCatalogProducts.mockResolvedValue({ ok: true, status: 200, data: { products: [] } });
  getCatalogProductGraph.mockResolvedValue({
    ok: true,
    status: 200,
    data: { graph: { product: null, variants: [], variantModifierGroups: [] } },
  });
  listCatalogModifierGroups.mockResolvedValue({
    ok: true,
    status: 200,
    data: { modifierGroups: [] },
  });
});

describe("CatalogEditor", () => {
  it("shows empty catalog copy", async () => {
    render(
      <CatalogEditor
        context={baseContext}
        capabilities={baseCapabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("No offerings yet")).toBeInTheDocument());
    expect(screen.queryByText(/hard.?delete|delete forever|permanently delete/i)).not.toBeInTheDocument();
  });

  it("does not offer hard-delete control text", async () => {
    render(
      <CatalogEditor
        context={baseContext}
        capabilities={baseCapabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("catalog-editor")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("mobile authoringAllowed=false shows boundary message and hides create controls", async () => {
    render(
      <CatalogEditor
        context={baseContext}
        capabilities={baseCapabilities}
        authoringAllowed={false}
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(MOBILE_AUTHORING_MESSAGE)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /introduce offering/i })).not.toBeInTheDocument();
  });

  it("when manage=false, mutation CTAs are hidden", async () => {
    render(
      <CatalogEditor
        context={baseContext}
        capabilities={{ ...baseCapabilities, catalogManage: false }}
        authoringAllowed
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("No offerings yet")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /introduce offering/i })).not.toBeInTheDocument();
  });

  it("keyboard: create form fields have labels", async () => {
    const user = userEvent.setup();
    render(
      <CatalogEditor
        context={baseContext}
        capabilities={baseCapabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /introduce offering/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /introduce offering/i }));
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });
});
