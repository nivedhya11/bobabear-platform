import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationPageClient } from "../../src/components/administration/AdministrationPageClient";

const getAdministrationSession = vi.fn();

vi.mock("@/lib/administration/api", () => ({
  getAdministrationSession: (...args: unknown[]) => getAdministrationSession(...args),
  listAdministrationAuditEventsClient: vi.fn(),
  listAdministrationMembershipsClient: vi.fn(),
  listAdministrationResourceClient: vi.fn(),
  getAdministrationMembershipClient: vi.fn(),
  listAdministrationRoleAssignmentsClient: vi.fn(),
}));

beforeEach(() => {
  getAdministrationSession.mockReset();
});

describe("IMP-035 Administration UI authorization states", () => {
  it("shows a clear 401 sign-in state", async () => {
    getAdministrationSession.mockResolvedValue({ ok: false, status: 401, code: "WORKFORCE_AUTH_REQUIRED" });
    render(<AdministrationPageClient view="hub" />);
    await waitFor(() => expect(screen.getByTestId("admin-unauthorized")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute("href", "/workforce/login/");
  });

  it("shows a clear 403 state when the permission is absent", async () => {
    getAdministrationSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, session: { workforceUserId: "wf-1", permissions: ["brand.read"] } },
    });
    render(<AdministrationPageClient view="audit" />);
    await waitFor(() => expect(screen.getByTestId("admin-forbidden")).toBeInTheDocument());
  });

  it("does not render navigation for capabilities the actor lacks", async () => {
    getAdministrationSession.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, session: { workforceUserId: "wf-1", permissions: ["access.membership.read"] } },
    });
    render(<AdministrationPageClient view="hub" />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Memberships" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Resources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Audit" })).not.toBeInTheDocument();
  });

  it("folds transport failures into a non-sensitive error state", async () => {
    getAdministrationSession.mockResolvedValue({ ok: false, status: 0, code: "NETWORK_ERROR" });
    render(<AdministrationPageClient view="hub" />);
    await waitFor(() => expect(screen.getByTestId("admin-error")).toHaveTextContent("Administration could not be loaded"));
  });
});
