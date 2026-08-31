import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdministrationHubClient } from "../../src/components/administration/AdministrationHubClient";

const fetchAdminSession = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
}));

beforeEach(() => {
  fetchAdminSession.mockReset();
});

describe("AdministrationHubClient", () => {
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

  it("gates membership/audit links by capabilities", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-1",
          capabilities: {
            "access.membership.read": true,
            "access.audit.read": false,
          },
        },
      },
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByTestId("admin-hub")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /memberships/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /access audit/i })).not.toBeInTheDocument();
  });

  it("renders a generic error state", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      code: "NETWORK_ERROR",
      status: 0,
    });
    render(<AdministrationHubClient />);
    await waitFor(() => expect(screen.getByTestId("admin-error")).toBeInTheDocument());
  });
});
