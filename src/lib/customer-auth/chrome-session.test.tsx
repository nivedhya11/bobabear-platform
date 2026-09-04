import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "@/shared/customer-auth/contracts";
import {
  CUSTOMER_SIGN_OUT_REDIRECT_HREF,
  notifyCustomerChromeSessionChanged,
  useCustomerChromeSession,
} from "./chrome-session";

function Probe() {
  const { session, signOut } = useCustomerChromeSession();
  return (
    <div>
      <div data-testid="chrome-session">{session}</div>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

describe("useCustomerChromeSession — existing session API contract", () => {
  const assign = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign });
  });

  it("maps a real unauthenticated session payload to anonymous chrome", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain(CUSTOMER_AUTH_PUBLIC_PATHS.session);
      return jsonResponse({ authenticated: false });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Probe />);
    expect(screen.getByTestId("chrome-session")).toHaveTextContent("unknown");
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("anonymous");
    });
  });

  it("maps a real authenticated session payload to authenticated chrome without displaying the user id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ authenticated: true, user: { id: "usr_opaque_1" } })),
    );

    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("authenticated");
    });
    expect(screen.queryByText("usr_opaque_1")).not.toBeInTheDocument();
  });

  it("refreshes when login notifies chrome of a session change", async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ authenticated: false }))
      .mockResolvedValueOnce(jsonResponse({ authenticated: true, user: { id: "usr_opaque_2" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("anonymous");
    });
    notifyCustomerChromeSessionChanged();
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("authenticated");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("navigates to /order/ only after successful signOut and publishes anonymous chrome", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
        expect(assign).not.toHaveBeenCalled();
        return jsonResponse({ authenticated: false });
      }
      if (fetchMock.mock.calls.some(([called]) => String(called).includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut))) {
        return jsonResponse({ authenticated: false });
      }
      return jsonResponse({ authenticated: true, user: { id: "usr_opaque_3" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("authenticated");
    });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("anonymous");
    });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(CUSTOMER_SIGN_OUT_REDIRECT_HREF);
    expect(CUSTOMER_SIGN_OUT_REDIRECT_HREF).toBe("/order/");
  });

  it("does not navigate or pretend logout succeeded when signOut fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
        return jsonResponse({ error: "forbidden" }, 403);
      }
      return jsonResponse({ authenticated: true, user: { id: "usr_opaque_4" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("chrome-session")).toHaveTextContent("authenticated");
    });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });
    expect(screen.getByTestId("chrome-session")).toHaveTextContent("authenticated");
    expect(assign).not.toHaveBeenCalled();
  });
});
