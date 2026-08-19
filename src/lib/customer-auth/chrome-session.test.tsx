import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "@/shared/customer-auth/contracts";
import {
  notifyCustomerChromeSessionChanged,
  useCustomerChromeSession,
} from "./chrome-session";

function Probe() {
  const { session } = useCustomerChromeSession();
  return <div data-testid="chrome-session">{session}</div>;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

describe("useCustomerChromeSession — existing session API contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
