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

  it("shows Associated only for the variant that owns the modifier group link", async () => {
    const user = userEvent.setup();
    const product = {
      id: "product-1",
      brandId: "brand-1",
      code: "TEA",
      productKind: "standard" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      activatedAt: null,
      retiredAt: null,
      effectiveContentRevision: null,
      draftContentRevision: "1",
      draftDiffersFromEffective: true,
      effective: null,
      draft: {
        name: "Tea",
        description: null,
        lifecycleStatus: "draft" as const,
      },
    };
    const variantA = {
      id: "variant-a",
      brandId: "brand-1",
      productId: "product-1",
      code: "A",
      productKind: "standard" as const,
      effectiveContentRevision: null,
      draftContentRevision: "1",
      draftDiffersFromEffective: true,
      effective: null,
      draft: {
        name: "Variant A",
        description: null,
        isDefault: true,
        isSelectorVisible: true,
        lifecycleStatus: "draft" as const,
      },
    };
    const variantB = {
      ...variantA,
      id: "variant-b",
      code: "B",
      draft: { ...variantA.draft, name: "Variant B", isDefault: false },
    };
    const modifierGroup = {
      id: "mg-1",
      brandId: "brand-1",
      code: "TOPPINGS",
      draftContentRevision: "1",
      draft: {
        name: "Toppings",
        description: null,
        lifecycleStatus: "draft" as const,
      },
      effective: null,
    };

    listCatalogProducts.mockResolvedValue({
      ok: true,
      status: 200,
      data: { products: [product] },
    });
    listCatalogModifierGroups.mockResolvedValue({
      ok: true,
      status: 200,
      data: { modifierGroups: [modifierGroup] },
    });
    getCatalogProductGraph.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        graph: {
          product,
          variants: [variantA, variantB],
          modifierGroups: [modifierGroup],
          modifierOptions: [],
          modifierGroupOptions: [],
          variantModifierGroups: [
            {
              id: "vmg-1",
              brandId: "brand-1",
              variantId: "variant-a",
              modifierGroupId: "mg-1",
            },
          ],
        },
      },
    });

    render(
      <CatalogEditor
        context={{
          ...baseContext,
          productId: "product-1",
          productLabel: "Tea",
          variantId: "variant-a",
          variantLabel: "Variant A",
        }}
        capabilities={baseCapabilities}
        authoringAllowed
        onStatus={vi.fn()}
        onProductsChanged={vi.fn()}
        onSelectProduct={vi.fn()}
        onSelectVariant={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText(/Toppings \(TOPPINGS\)/)).toBeInTheDocument());
    expect(screen.getByText("Associated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Associate" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Variant B \(B\)/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Associate" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Associated")).not.toBeInTheDocument();
  });
});
