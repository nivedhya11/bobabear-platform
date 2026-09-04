import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "@/shared/customer-auth/contracts";

import { AccountShell } from "./AccountShell";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn<() => string>(() => "/account/profile/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

describe("AccountShell — sign-out navigation", () => {
  const assign = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    usePathname.mockReturnValue("/account/profile/");
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign });
  });

  it("navigates to /order/ after successful Sign out", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
        expect(assign).not.toHaveBeenCalled();
        return jsonResponse({ authenticated: false });
      }
      return jsonResponse({ authenticated: true, user: { id: "opaque-user" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AccountShell title="Profile">
        <p>Signed-in profile content</p>
      </AccountShell>,
    );

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/order/");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stays on the account page and surfaces an alert when Sign out fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
          return new Response("nope", { status: 500 });
        }
        return jsonResponse({ authenticated: true, user: { id: "opaque-user" } });
      }),
    );

    render(
      <AccountShell title="Profile">
        <p>Signed-in profile content</p>
      </AccountShell>,
    );

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/sign out failed/i);
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByText("Signed-in profile content")).toBeInTheDocument();
  });
});
