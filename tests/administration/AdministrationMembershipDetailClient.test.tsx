/**
 * IMP-036G membership detail behaviour: managed-subject diagnostic reload,
 * confirmed high-consequence actions, and explicit success / denial feedback.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationMembershipDetailClient } from "../../src/components/administration/AdministrationMembershipDetailClient";

const fetchEffectivePermissions = vi.fn<(...args: unknown[]) => unknown>();
const getAdminMembership = vi.fn<(...args: unknown[]) => unknown>();
const grantMembershipRole = vi.fn<(...args: unknown[]) => unknown>();
const listMembershipRoleAssignments = vi.fn<(...args: unknown[]) => unknown>();
const revokeRoleAssignment = vi.fn<(...args: unknown[]) => unknown>();
const transitionMembership = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  fetchEffectivePermissions: (...args: unknown[]) => fetchEffectivePermissions(...args),
  getAdminMembership: (...args: unknown[]) => getAdminMembership(...args),
  grantMembershipRole: (...args: unknown[]) => grantMembershipRole(...args),
  listMembershipRoleAssignments: (...args: unknown[]) => listMembershipRoleAssignments(...args),
  revokeRoleAssignment: (...args: unknown[]) => revokeRoleAssignment(...args),
  transitionMembership: (...args: unknown[]) => transitionMembership(...args),
}));

const MEMBERSHIP_ID = "membership-1";

function membership(status: string) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      membership: {
        id: MEMBERSHIP_ID,
        workforceUserId: "wf-subject",
        memberLabel: "Subject Operator",
        scopeType: "outlet",
        status,
        brandId: "brand-1",
        organizationId: "org-1",
        territoryId: "terr-1",
        outletId: "outlet-1",
      },
    },
  };
}

function permissions(keys: readonly string[]) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      permissions: [...keys],
      subject: {
        membershipId: MEMBERSHIP_ID,
        workforceUserId: "wf-subject",
        memberLabel: "Subject Operator",
      },
    },
  };
}

function assignments(items: ReadonlyArray<Readonly<{ id: string; roleKey: string }>>) {
  return {
    ok: true,
    status: 200,
    data: { ok: true, items: items.map((item) => ({ ...item, revokedAt: null })) },
  };
}

function locateMembership(query: string) {
  window.history.replaceState({}, "", `/workforce/admin/memberships/detail/${query}`);
}

beforeEach(() => {
  fetchEffectivePermissions.mockReset();
  getAdminMembership.mockReset();
  grantMembershipRole.mockReset();
  listMembershipRoleAssignments.mockReset();
  revokeRoleAssignment.mockReset();
  transitionMembership.mockReset();

  locateMembership(`?membershipId=${MEMBERSHIP_ID}`);
  getAdminMembership.mockResolvedValue(membership("invited"));
  listMembershipRoleAssignments.mockResolvedValue(assignments([]));
  fetchEffectivePermissions.mockResolvedValue(permissions([]));
});

describe("AdministrationMembershipDetailClient", () => {
  it("requires a membershipId rather than guessing a subject", async () => {
    locateMembership("");
    render(<AdministrationMembershipDetailClient />);
    expect(screen.getByTestId("admin-membership-detail-missing")).toBeInTheDocument();
    expect(getAdminMembership).not.toHaveBeenCalled();
  });

  it("labels the managed subject and queries the subject's resource, not the caller's", async () => {
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());

    expect(screen.getByText(/Subject: Subject Operator/)).toBeInTheDocument();
    expect(fetchEffectivePermissions).toHaveBeenCalledWith({
      resourceType: "outlet",
      membershipId: MEMBERSHIP_ID,
      brandId: "brand-1",
      organizationId: "org-1",
      territoryId: "terr-1",
      outletId: "outlet-1",
    });
  });

  it("re-runs the managed-subject diagnostic on demand", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());
    expect(screen.getByTestId("admin-effective-permissions")).toHaveTextContent("None visible.");
    expect(fetchEffectivePermissions).toHaveBeenCalledTimes(1);

    // A grant made elsewhere becomes visible only because the diagnostic re-reads.
    fetchEffectivePermissions.mockResolvedValue(permissions(["order.read", "outlet.read"]));
    await user.click(screen.getByRole("button", { name: /reload diagnostic/i }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-effective-permissions")).toHaveTextContent(
        "order.read, outlet.read",
      ),
    );
    expect(fetchEffectivePermissions).toHaveBeenCalledTimes(2);
    expect(getAdminMembership).toHaveBeenCalledTimes(2);
  });

  it("confirms a role grant and reports success", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^grant$/i }));
    const dialog = screen.getByTestId("admin-confirm-dialog");
    expect(dialog).toHaveTextContent(/within delegation ceiling/i);

    grantMembershipRole.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, assignment: { id: "assignment-1" } },
    });
    listMembershipRoleAssignments.mockResolvedValue(
      assignments([{ id: "assignment-1", roleKey: "outlet_manager" }]),
    );
    await user.click(within(dialog).getByRole("button", { name: /grant role/i }));

    await waitFor(() => expect(screen.getByText("Role granted.")).toBeInTheDocument());
    expect(grantMembershipRole).toHaveBeenCalledWith(MEMBERSHIP_ID, "outlet_manager");
    expect(screen.queryByTestId("admin-confirm-dialog")).not.toBeInTheDocument();
  });

  it("confirms a role revoke and reports success", async () => {
    const user = userEvent.setup();
    listMembershipRoleAssignments.mockResolvedValue(
      assignments([{ id: "assignment-1", roleKey: "outlet_manager" }]),
    );
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^revoke role$/i }));
    const dialog = screen.getByTestId("admin-confirm-dialog");
    expect(dialog).toHaveTextContent(/Revoke outlet_manager from this membership/i);

    revokeRoleAssignment.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, assignment: { id: "assignment-1" } },
    });
    listMembershipRoleAssignments.mockResolvedValue(assignments([]));
    await user.click(within(dialog).getByRole("button", { name: /^revoke role$/i }));

    await waitFor(() => expect(screen.getByText("Role revoked.")).toBeInTheDocument());
    expect(revokeRoleAssignment).toHaveBeenCalledWith("assignment-1");
  });

  it("separates Expire from Revoke on an invited membership and reports the outcome", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^expire$/i }));
    const dialog = screen.getByTestId("admin-confirm-dialog");
    expect(dialog).toHaveTextContent(/Distinct from Revoke/i);

    transitionMembership.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, membership: { id: MEMBERSHIP_ID, status: "expired" } },
    });
    getAdminMembership.mockResolvedValue(membership("expired"));
    await user.click(within(dialog).getByRole("button", { name: /^expire$/i }));

    await waitFor(() => expect(screen.getByText("Membership expired.")).toBeInTheDocument());
    expect(transitionMembership).toHaveBeenCalledWith(MEMBERSHIP_ID, "expired");
    // Terminal status offers no further lifecycle controls.
    expect(screen.queryByRole("button", { name: /^activate$/i })).not.toBeInTheDocument();
  });

  it("surfaces a denied action code instead of a silent no-op", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() => expect(screen.getByTestId("admin-membership-detail")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /^grant$/i }));
    const dialog = screen.getByTestId("admin-confirm-dialog");
    grantMembershipRole.mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: "ADMIN_FORBIDDEN",
    });
    await user.click(within(dialog).getByRole("button", { name: /grant role/i }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-membership-action-error")).toHaveTextContent(
        "ADMIN_FORBIDDEN",
      ),
    );
    expect(screen.queryByText("Role granted.")).not.toBeInTheDocument();
  });

  it("shows the sign-in state when the session has expired", async () => {
    getAdminMembership.mockResolvedValue({
      ok: false,
      status: 401,
      code: "WORKFORCE_AUTH_REQUIRED",
    });
    render(<AdministrationMembershipDetailClient />);
    await waitFor(() =>
      expect(screen.getByTestId("admin-membership-detail-unauthorized")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute(
      "href",
      "/workforce/login/",
    );
  });
});
