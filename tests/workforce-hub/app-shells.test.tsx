import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationAppShell } from "../../src/components/administration/AdministrationAppShell";
import { WorkforceAppShell } from "../../src/components/workforce/WorkforceAppShell";

const fetchAdminSession = vi.fn<(...args: unknown[]) => unknown>();
const usePathname = vi.fn(() => "/workforce/");

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

beforeEach(() => {
  fetchAdminSession.mockReset();
  usePathname.mockReturnValue("/workforce/");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign: vi.fn(), reload: vi.fn() },
  });
});

describe("enterprise app shells", () => {
  it("exposes Applications and Operations from Administration when order.read is effective", async () => {
    usePathname.mockReturnValue("/workforce/admin/");
    fetchAdminSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "opaque-workforce-id-value-123456",
          signedInLabel: "psa@example.test",
          capabilities: { "order.read": true, "access.membership.read": true, "access.audit.read": true },
        },
      },
    });
    render(
      <AdministrationAppShell>
        <p>Admin body</p>
      </AdministrationAppShell>,
    );
    await waitFor(() => expect(screen.getByText("Admin body")).toBeInTheDocument());
    expect(screen.getAllByRole("link", { name: "Applications" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Operations" })[0]).toHaveAttribute("href", "/workforce/operations/");
    expect(screen.getByTestId("enterprise-signed-in-label")).toHaveTextContent("psa@example.test");
    expect(screen.queryByText("opaque-workforce-id-value-123456")).not.toBeInTheDocument();
    expect(screen.queryByText(/platform access & organization/i)).not.toBeInTheDocument();
    expect(screen.getByText("Access & organization")).toBeInTheDocument();
  });

  it("does not claim missing Administration permission when the session projection fails", async () => {
    usePathname.mockReturnValue("/workforce/admin/");
    fetchAdminSession.mockResolvedValue({
      ok: false,
      status: 500,
      code: "INVALID_RESPONSE",
    });
    render(
      <AdministrationAppShell>
        <p>Admin body</p>
      </AdministrationAppShell>,
    );
    await waitFor(() => expect(screen.getByTestId("enterprise-error-state")).toBeInTheDocument());
    expect(screen.queryByTestId("enterprise-access-denied")).not.toBeInTheDocument();
    expect(screen.queryByText(/you do not have administration access/i)).not.toBeInTheDocument();
  });

  it("exposes Administration from Operations only when authorized", async () => {
    usePathname.mockReturnValue("/workforce/operations/");
    fetchAdminSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-ops-only",
          signedInLabel: "kitchen@example.test",
          capabilities: { "order.read": true },
        },
      },
    });
    render(
      <WorkforceAppShell>
        <p>Ops body</p>
      </WorkforceAppShell>,
    );
    await waitFor(() => expect(screen.getByText("Ops body")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("exposes Administration from Operations when an administration capability is effective", async () => {
    usePathname.mockReturnValue("/workforce/operations/");
    fetchAdminSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-both",
          signedInLabel: "psa@example.test",
          capabilities: { "order.read": true, "brand.read": true },
        },
      },
    });
    render(
      <WorkforceAppShell>
        <p>Ops body</p>
      </WorkforceAppShell>,
    );
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Administration" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Administration" })[0]).toHaveAttribute("href", "/workforce/admin/");
  });

  it("shows retry rather than empty applications when workforce session load fails", async () => {
    usePathname.mockReturnValue("/workforce/operations/");
    fetchAdminSession.mockResolvedValue({
      ok: false,
      status: 0,
      code: "NETWORK_ERROR",
    });
    render(
      <WorkforceAppShell>
        <p>Ops body</p>
      </WorkforceAppShell>,
    );
    await waitFor(() => expect(screen.getByTestId("enterprise-error-state")).toBeInTheDocument());
    expect(screen.queryByText("Ops body")).not.toBeInTheDocument();
  });
});
