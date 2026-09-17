import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationHubClient } from "../../src/components/administration/AdministrationHubClient";

const fetchAdminSession = vi.fn<(...args: unknown[]) => unknown>();
const fetchAdminOverview = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
  fetchAdminOverview: (...args: unknown[]) => fetchAdminOverview(...args),
}));

const emptyOverview = {
  hierarchy: {
    brands: { count: 0, sample: [], more: false },
    organizations: { count: 0, sample: [], more: false },
    territories: { count: 0, sample: [], more: false },
    legalEntities: { count: 0, sample: [], more: false },
    outlets: { count: 0, sample: [], more: false },
  },
  membershipAttention: {
    invited: 0,
    suspended: 0,
    active: 0,
    revoked: 0,
    expired: 0,
    sample: [],
    more: false,
  },
  recentAudit: { items: [], more: false },
  operationalHealth: { available: false, reason: "unauthorized" },
};

beforeEach(() => {
  fetchAdminSession.mockReset();
  fetchAdminOverview.mockReset();
  fetchAdminOverview.mockResolvedValue({
    ok: true,
    status: 200,
    data: { ok: true, overview: emptyOverview },
  });
});

describe("AdministrationHubClient", () => {
  it("renders loading state", () => {
    fetchAdminSession.mockReturnValue(new Promise(() => {}));
    render(<AdministrationHubClient />);
    expect(screen.getByTestId("enterprise-loading-state")).toBeInTheDocument();
  });

  it("renders unauthorized state with sign-in link", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      code: "WORKFORCE_AUTH_REQUIRED",
      status: 401,
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByTestId("admin-unauthorized")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute(
      "href",
      "/workforce/login/",
    );
  });

  it("renders overview composition sections", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          signedInLabel: "admin@example.com",
          capabilities: {
            "access.membership.read": true,
            "access.audit.read": true,
          },
        },
      },
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByTestId("admin-hub")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /open workforce/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open audit/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open system/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Commercial$/i })).not.toBeInTheDocument();
  });

  it("shows truthful authorized counts without trailing + for truncated samples", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          signedInLabel: "admin@example.com",
          capabilities: { "access.membership.read": true },
        },
      },
    });
    fetchAdminOverview.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        ok: true,
        overview: {
          ...emptyOverview,
          hierarchy: {
            ...emptyOverview.hierarchy,
            brands: {
              count: 12,
              more: true,
              sample: [
                { id: "1", name: "A" },
                { id: "2", name: "B" },
                { id: "3", name: "C" },
                { id: "4", name: "D" },
                { id: "5", name: "E" },
              ],
            },
          },
        },
      },
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByTestId("admin-overview-count-brands")).toBeInTheDocument());
    expect(screen.getByTestId("admin-overview-count-brands")).toHaveTextContent("12");
    expect(screen.getByTestId("admin-overview-count-brands").textContent).not.toContain("+");
    expect(screen.getByText("sample of 5")).toBeInTheDocument();
  });

  it("renders a generic error state", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      code: "NETWORK_ERROR",
      status: 0,
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
