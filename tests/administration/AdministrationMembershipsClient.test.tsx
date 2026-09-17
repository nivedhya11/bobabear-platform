/**
 * IMP-036G Workforce workspace behaviour: membership continuation beyond the
 * first page, create feedback, and honest authorization states.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationMembershipsClient } from "../../src/components/administration/AdministrationMembershipsClient";

const listAdministrationMembershipsClient = vi.fn<(...args: unknown[]) => unknown>();
const createAdminMembership = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  listAdministrationMembershipsClient: (...args: unknown[]) =>
    listAdministrationMembershipsClient(...args),
  createAdminMembership: (...args: unknown[]) => createAdminMembership(...args),
}));

function membership(id: string) {
  return {
    id,
    workforceUserId: `wf-${id}`,
    memberLabel: `Member ${id}`,
    scopeType: "outlet",
    status: "invited",
    brandId: "brand-1",
    organizationId: "org-1",
    territoryId: "terr-1",
    outletId: "outlet-1",
  };
}

function page(
  ids: readonly string[],
  continuation: Readonly<{ more?: boolean; nextCursor?: string | null }> = {},
) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      items: ids.map(membership),
      more: continuation.more ?? false,
      nextCursor: continuation.nextCursor ?? null,
    },
  };
}

beforeEach(() => {
  listAdministrationMembershipsClient.mockReset();
  createAdminMembership.mockReset();
  listAdministrationMembershipsClient.mockResolvedValue(page(["m-1"]));
});

describe("AdministrationMembershipsClient", () => {
  it("continues past the first membership page and keeps earlier rows", async () => {
    const user = userEvent.setup();
    listAdministrationMembershipsClient.mockResolvedValueOnce(
      page(["m-1"], { more: true, nextCursor: "cursor-1" }),
    );
    render(<AdministrationMembershipsClient />);
    await waitFor(() => expect(screen.getByTestId("admin-memberships")).toBeInTheDocument());
    expect(listAdministrationMembershipsClient).toHaveBeenCalledWith({ cursor: undefined });

    listAdministrationMembershipsClient.mockResolvedValueOnce(page(["m-2"]));
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(screen.getByText("Member m-2")).toBeInTheDocument());
    expect(screen.getByText("Member m-1")).toBeInTheDocument();
    expect(listAdministrationMembershipsClient).toHaveBeenLastCalledWith({ cursor: "cursor-1" });
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("reports an empty in-scope list without offering a continuation", async () => {
    listAdministrationMembershipsClient.mockResolvedValueOnce(page([]));
    render(<AdministrationMembershipsClient />);
    await waitFor(() => expect(screen.getByTestId("admin-memberships-empty")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("confirms membership creation with an explicit success notice", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipsClient />);
    await waitFor(() => expect(screen.getByTestId("admin-memberships")).toBeInTheDocument());

    createAdminMembership.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true, membership: membership("m-9") },
    });
    listAdministrationMembershipsClient.mockResolvedValueOnce(page(["m-1", "m-9"]));

    await user.type(screen.getByLabelText(/workforce email/i), "new.member@example.invalid");
    await user.type(screen.getByLabelText(/brand id/i), "brand-1");
    await user.type(screen.getByLabelText(/organization id/i), "org-1");
    await user.type(screen.getByLabelText(/territory id/i), "terr-1");
    await user.type(screen.getByLabelText(/outlet id/i), "outlet-1");
    await user.click(screen.getByRole("button", { name: /create membership/i }));

    await waitFor(() => expect(screen.getByText("Membership created.")).toBeInTheDocument());
    expect(createAdminMembership).toHaveBeenCalledWith({
      workforceEmail: "new.member@example.invalid",
      scopeType: "outlet",
      brandId: "brand-1",
      organizationId: "org-1",
      territoryId: "terr-1",
      outletId: "outlet-1",
      status: "invited",
    });
  });

  it("surfaces a denied create as a code, not a silent failure", async () => {
    const user = userEvent.setup();
    render(<AdministrationMembershipsClient />);
    await waitFor(() => expect(screen.getByTestId("admin-memberships")).toBeInTheDocument());

    createAdminMembership.mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: "ADMIN_UNAUTHORIZED",
    });
    await user.click(screen.getByRole("button", { name: /create membership/i }));

    await waitFor(() => expect(screen.getByText("ADMIN_UNAUTHORIZED")).toBeInTheDocument());
    expect(screen.queryByText("Membership created.")).not.toBeInTheDocument();
  });

  it("recovers to the sign-in state when the session expires mid-session", async () => {
    const user = userEvent.setup();
    listAdministrationMembershipsClient.mockResolvedValueOnce(
      page(["m-1"], { more: true, nextCursor: "cursor-1" }),
    );
    render(<AdministrationMembershipsClient />);
    await waitFor(() => expect(screen.getByTestId("admin-memberships")).toBeInTheDocument());

    listAdministrationMembershipsClient.mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "WORKFORCE_AUTH_REQUIRED",
    });
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-memberships-unauthorized")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /workforce sign in/i })).toHaveAttribute(
      "href",
      "/workforce/login/",
    );
  });
});
