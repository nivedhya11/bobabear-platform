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
}));

vi.mock("../../src/components/administration/commercial/useCommercialViewport", () => ({
  useCommercialViewport: () => useCommercialViewport(),
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
});
