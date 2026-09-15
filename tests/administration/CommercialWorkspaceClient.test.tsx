import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommercialWorkspaceClient } from "../../src/components/administration/commercial/CommercialWorkspaceClient";
import { MOBILE_AUTHORING_MESSAGE } from "../../src/lib/administration/commercial-errors";

const fetchAdminSession = vi.fn();
const listAdminBrands = vi.fn();
const listAdminOutlets = vi.fn();
const listCatalogProducts = vi.fn();
const getCatalogProductGraph = vi.fn();
const useCommercialViewport = vi.fn();

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
  listAdminBrands: (...args: unknown[]) => listAdminBrands(...args),
  listAdminOutlets: (...args: unknown[]) => listAdminOutlets(...args),
}));

vi.mock("@/lib/administration/commercial-catalog", () => ({
  listCatalogProducts: (...args: unknown[]) => listCatalogProducts(...args),
  getCatalogProductGraph: (...args: unknown[]) => getCatalogProductGraph(...args),
  listCatalogModifierGroups: vi.fn(async () => ({ ok: true, status: 200, data: { groups: [] } })),
}));

vi.mock("../../src/components/administration/commercial/useCommercialViewport", () => ({
  useCommercialViewport: () => useCommercialViewport(),
}));

vi.mock("../../src/components/administration/commercial/CatalogEditor", () => ({
  CatalogEditor: (props: { authoringAllowed?: boolean }) =>
    props.authoringAllowed === false ? (
      <div>{MOBILE_AUTHORING_MESSAGE}</div>
    ) : (
      <div data-testid="catalog-editor-stub" />
    ),
}));
vi.mock("../../src/components/administration/commercial/MenuEditor", () => ({
  MenuEditor: () => null,
}));
vi.mock("../../src/components/administration/commercial/AssortmentEditor", () => ({
  AssortmentEditor: () => null,
}));
vi.mock("../../src/components/administration/commercial/PricingEditor", () => ({
  PricingEditor: () => null,
}));
vi.mock("../../src/components/administration/commercial/PromotionsEditor", () => ({
  PromotionsEditor: () => null,
}));
vi.mock("../../src/components/administration/commercial/DeliveryTariffEditor", () => ({
  DeliveryTariffEditor: () => null,
}));
vi.mock("../../src/components/administration/commercial/CommercialInspectionPanel", () => ({
  CommercialInspectionPanel: () => null,
}));
vi.mock("../../src/components/administration/commercial/CustomerVerificationPanel", () => ({
  CustomerVerificationPanel: () => null,
}));
vi.mock("../../src/components/administration/commercial/SellabilityDiagnosisPanel", () => ({
  SellabilityDiagnosisPanel: () => null,
}));
vi.mock("../../src/components/administration/commercial/CommercialActivityPanel", () => ({
  CommercialActivityPanel: () => null,
}));

beforeEach(() => {
  fetchAdminSession.mockReset();
  listAdminBrands.mockReset();
  listAdminOutlets.mockReset();
  listCatalogProducts.mockReset();
  getCatalogProductGraph.mockReset();
  useCommercialViewport.mockReset();
  useCommercialViewport.mockReturnValue({ authoringAllowed: true, viewportReady: true });
  listAdminOutlets.mockResolvedValue({ ok: true, status: 200, data: { items: [] } });
  listCatalogProducts.mockResolvedValue({ ok: true, status: 200, data: { products: [] } });
  getCatalogProductGraph.mockResolvedValue({
    ok: true,
    status: 200,
    data: { graph: { product: null, variants: [], variantModifierGroups: [] } },
  });
  window.history.replaceState({}, "", "/workforce/admin/commercial");
});

describe("CommercialWorkspaceClient", () => {
  it("renders loading state", () => {
    fetchAdminSession.mockReturnValue(new Promise(() => {}));
    render(<CommercialWorkspaceClient />);
    expect(screen.getByTestId("enterprise-loading-state")).toBeInTheDocument();
  });

  it("renders unauthorized state", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      code: "WORKFORCE_AUTH_REQUIRED",
      status: 401,
    });
    render(<CommercialWorkspaceClient />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /workforce sign in/i })).toBeInTheDocument(),
    );
  });

  it("renders ready workspace with section nav", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: {
            "catalog.read": true,
            "menu.read": true,
            "assortment.read": true,
            "pricing.read": true,
            "promotions.read": true,
          },
        },
      },
    });
    listAdminBrands.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    render(<CommercialWorkspaceClient />);
    await waitFor(() => expect(screen.getByTestId("commercial-workspace")).toBeInTheDocument());
    expect(screen.getByRole("navigation", { name: /commercial sections/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Offering" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify & diagnose" })).toBeInTheDocument();
  });

  it("shows mobile boundary message when authoringAllowed is false", async () => {
    useCommercialViewport.mockReturnValue({ authoringAllowed: false, viewportReady: true });
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: { "catalog.read": true, "catalog.manage": true },
        },
      },
    });
    listAdminBrands.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    const user = userEvent.setup();
    render(<CommercialWorkspaceClient />);
    await waitFor(() => expect(screen.getByTestId("commercial-workspace")).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Brand"), "brand-1");
    await waitFor(() => expect(screen.getByText(MOBILE_AUTHORING_MESSAGE)).toBeInTheDocument());
  });

  it("preserves deep-link query while session is pending then restores authorized context", async () => {
    let resolveSession!: (value: unknown) => void;
    fetchAdminSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    listAdminBrands.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        items: [{ id: "outlet-1", name: "Dehradun", code: "DDN", brandId: "brand-1" }],
      },
    });
    listCatalogProducts.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        products: [
          {
            id: "product-1",
            code: "TEA",
            draft: { name: "Milk Tea" },
          },
        ],
      },
    });
    getCatalogProductGraph.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        graph: {
          product: { id: "product-1" },
          variants: [{ id: "variant-1", code: "REG", draft: { name: "Regular" } }],
          variantModifierGroups: [],
        },
      },
    });

    window.history.replaceState(
      {},
      "",
      "/workforce/admin/commercial?brandId=brand-1&productId=product-1&variantId=variant-1&outletId=outlet-1",
    );

    render(<CommercialWorkspaceClient />);
    expect(screen.getByTestId("enterprise-loading-state")).toBeInTheDocument();
    expect(window.location.search).toContain("brandId=brand-1");
    expect(window.location.search).toContain("productId=product-1");
    expect(window.location.search).toContain("variantId=variant-1");
    expect(window.location.search).toContain("outletId=outlet-1");

    resolveSession({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: {
            "catalog.read": true,
            "menu.read": true,
            "assortment.read": true,
            "pricing.read": true,
          },
        },
      },
    });

    await waitFor(() => expect(screen.getByTestId("commercial-workspace")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText("Brand")).toHaveValue("brand-1"));
    await waitFor(() => expect(screen.getByLabelText("Product")).toHaveValue("product-1"));
    await waitFor(() => expect(screen.getByLabelText("Variant")).toHaveValue("variant-1"));
    await waitFor(() => expect(screen.getByLabelText("Outlet")).toHaveValue("outlet-1"));
    await waitFor(() =>
      expect(screen.getByTestId("commercial-context-selector")).toHaveTextContent(/Selected brand:\s*BOBA/),
    );
    await waitFor(() =>
      expect(screen.getByTestId("commercial-context-selector")).toHaveTextContent(/Milk Tea/),
    );
    await waitFor(() =>
      expect(screen.getByTestId("commercial-context-selector")).toHaveTextContent(/Regular/),
    );
    await waitFor(() =>
      expect(screen.getByTestId("commercial-context-selector")).toHaveTextContent(/Dehradun/),
    );
    expect(window.location.search).toContain("brandId=brand-1");
    expect(window.location.search).toContain("productId=product-1");
    expect(window.location.search).toContain("variantId=variant-1");
    expect(window.location.search).toContain("outletId=outlet-1");
  });

  it("changing Product clears Variant and updates the URL", async () => {
    const user = userEvent.setup();
    fetchAdminSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: { "catalog.read": true },
        },
      },
    });
    listAdminBrands.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    listCatalogProducts.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        products: [
          { id: "product-1", code: "TEA", draft: { name: "Milk Tea" } },
          { id: "product-2", code: "COF", draft: { name: "Coffee" } },
        ],
      },
    });
    getCatalogProductGraph.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        graph: {
          product: { id: "product-1" },
          variants: [{ id: "variant-1", code: "REG", draft: { name: "Regular" } }],
          variantModifierGroups: [],
        },
      },
    });
    window.history.replaceState(
      {},
      "",
      "/workforce/admin/commercial?brandId=brand-1&productId=product-1&variantId=variant-1",
    );
    render(<CommercialWorkspaceClient />);
    await waitFor(() => expect(screen.getByLabelText("Variant")).toHaveValue("variant-1"));
    await user.selectOptions(screen.getByLabelText("Product"), "product-2");
    await waitFor(() => expect(screen.getByLabelText("Variant")).toHaveValue(""));
    expect(window.location.search).toContain("productId=product-2");
    expect(window.location.search).not.toContain("variantId=");
  });

  it("does not restore unauthorized brandId from the deep link", async () => {
    fetchAdminSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: { "catalog.read": true },
        },
      },
    });
    listAdminBrands.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    window.history.replaceState(
      {},
      "",
      "/workforce/admin/commercial?brandId=foreign-brand&productId=product-1",
    );
    render(<CommercialWorkspaceClient />);
    await waitFor(() => expect(screen.getByTestId("commercial-workspace")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText("Brand")).toHaveValue(""));
    expect(window.location.search).not.toContain("foreign-brand");
    expect(window.location.search).not.toContain("productId=");
  });

  it("ordinary no-query startup still reaches ready workspace", async () => {
    window.history.replaceState({}, "", "/workforce/admin/commercial");
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: { "catalog.read": true },
        },
      },
    });
    listAdminBrands.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { items: [{ id: "brand-1", name: "BOBA", code: "BOBA" }] },
    });
    render(<CommercialWorkspaceClient />);
    await waitFor(() => expect(screen.getByTestId("commercial-workspace")).toBeInTheDocument());
    expect(screen.getByLabelText("Brand")).toHaveValue("");
  });
});
