import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkforceHubClient } from "../../src/components/workforce/WorkforceHubClient";

const fetchAdminSession = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
}));

const assignMock = vi.fn();

beforeEach(() => {
  fetchAdminSession.mockReset();
  assignMock.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign: assignMock },
  });
});

describe("WorkforceHubClient", () => {
  it("redirects unauthenticated users to workforce login", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      code: "WORKFORCE_AUTH_REQUIRED",
      status: 401,
    });
    render(<WorkforceHubClient />);
    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith("/workforce/login/?returnTo=%2Fworkforce%2F"),
    );
  });

  it("auto-redirects to the only authorized destination", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { session: { workforceUserId: "wf-1", capabilities: { "order.read": true } } },
    });
    render(<WorkforceHubClient />);
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/workforce/operations/"));
  });

  it("renders only authorized destinations for multi-capability principals", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        session: {
          workforceUserId: "wf-admin",
          signedInLabel: "ops@example.test",
          capabilities: { "order.read": true, "access.membership.read": true },
        },
      },
    });
    render(<WorkforceHubClient />);
    await waitFor(() => expect(screen.getByTestId("workforce-hub")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /operations/i })).toHaveAttribute("href", "/workforce/operations/");
    expect(screen.getByRole("link", { name: /administration/i })).toHaveAttribute("href", "/workforce/admin/");
    expect(screen.queryByRole("link", { name: /store management/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("workforce-hub-identity")).toHaveTextContent("Signed in as ops@example.test");
    expect(screen.getByTestId("workforce-hub-identity")).not.toHaveTextContent("wf-admin");
  });

  it("does not treat a session failure as an empty destination set", async () => {
    fetchAdminSession.mockResolvedValueOnce({
      ok: false,
      status: 500,
      code: "INVALID_RESPONSE",
    });
    render(<WorkforceHubClient />);
    await waitFor(() => expect(screen.getByTestId("enterprise-error-state")).toBeInTheDocument());
    expect(screen.queryByText(/no applications available/i)).not.toBeInTheDocument();
  });
});
