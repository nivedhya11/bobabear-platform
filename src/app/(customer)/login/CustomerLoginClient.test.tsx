import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerLoginClient } from "./CustomerLoginClient";

const useSearchParams = vi.fn<() => URLSearchParams>();
const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const sendCustomerOtp = vi.fn<(...args: unknown[]) => unknown>();
const verifyCustomerOtp = vi.fn<(...args: unknown[]) => unknown>();
const getOwnProfile = vi.fn<(...args: unknown[]) => unknown>();
const notifyCustomerChromeSessionChanged = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}));

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
  sendCustomerOtp: (...args: unknown[]) => sendCustomerOtp(...args),
  verifyCustomerOtp: (...args: unknown[]) => verifyCustomerOtp(...args),
}));

vi.mock("@/lib/customer-auth/chrome-session", () => ({
  notifyCustomerChromeSessionChanged: () => notifyCustomerChromeSessionChanged(),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    getOwnProfile: (...args: unknown[]) => getOwnProfile(...args),
  };
});

describe("CustomerLoginClient — sign-in continuity (IMP-036C)", () => {
  const assign = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    assign.mockReset();
    notifyCustomerChromeSessionChanged.mockReset();
    fetchCustomerSession.mockReset();
    sendCustomerOtp.mockReset();
    verifyCustomerOtp.mockReset();
    getOwnProfile.mockReset();
    useSearchParams.mockReturnValue(new URLSearchParams());
    fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: false } });
    getOwnProfile.mockResolvedValue({ ok: true, status: 200, data: { profile: { id: "p1" } } });
    vi.stubGlobal("location", { ...window.location, assign });
  });

  async function completeOtpFlow(): Promise<void> {
    const user = userEvent.setup();
    render(<CustomerLoginClient />);
    await waitFor(() => expect(screen.getByLabelText(/Mobile number/i)).toBeInTheDocument());

    sendCustomerOtp.mockResolvedValue({
      ok: true,
      data: { ok: true, code: "OTP_REQUEST_ACCEPTED", retryAfterSeconds: 30 },
    });
    await user.type(screen.getByLabelText(/Mobile number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /Send code/i }));
    await waitFor(() => expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument());

    verifyCustomerOtp.mockResolvedValue({
      ok: true,
      data: { authenticated: true, user: { id: "usr_1" } },
    });
    await user.type(screen.getByLabelText(/6-digit code/i), "123456");
    await user.click(screen.getByRole("button", { name: /Verify code/i }));
  }

  it("navigates to returnTo after successful OTP", async () => {
    useSearchParams.mockReturnValue(new URLSearchParams("returnTo=%2Forder%2Fcart%2F"));
    await completeOtpFlow();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/cart/"));
    expect(notifyCustomerChromeSessionChanged).toHaveBeenCalled();
    expect(screen.queryByText(/You're signed in/i)).not.toBeInTheDocument();
  });

  it("navigates to /order/ after successful OTP with no returnTo", async () => {
    await completeOtpFlow();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/"));
    expect(notifyCustomerChromeSessionChanged).toHaveBeenCalled();
    expect(screen.queryByText(/You're signed in/i)).not.toBeInTheDocument();
  });

  it("redirects already-authenticated customers with returnTo immediately", async () => {
    useSearchParams.mockReturnValue(new URLSearchParams("returnTo=%2Forder%2Fcart%2F"));
    fetchCustomerSession.mockResolvedValue({
      ok: true,
      data: { authenticated: true, user: { id: "usr_1" } },
    });
    render(<CustomerLoginClient />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/cart/"));
    expect(screen.queryByText(/You're signed in/i)).not.toBeInTheDocument();
  });

  it("redirects already-authenticated customers without returnTo to /order/", async () => {
    fetchCustomerSession.mockResolvedValue({
      ok: true,
      data: { authenticated: true, user: { id: "usr_1" } },
    });
    render(<CustomerLoginClient />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/"));
    expect(screen.queryByText(/You're signed in/i)).not.toBeInTheDocument();
  });

  it("rejects unsafe returnTo and falls back to /order/", async () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("returnTo=https%3A%2F%2Fevil.example%2Fphish"),
    );
    await completeOtpFlow();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/"));
  });

  it("preserves first-time welcome flow when profile is absent", async () => {
    getOwnProfile.mockResolvedValue({ ok: true, status: 200, data: { profile: null } });
    await completeOtpFlow();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/account/welcome/"));
    expect(assign).not.toHaveBeenCalledWith("/order/");
  });

  it("does not navigate when OTP verification fails", async () => {
    const user = userEvent.setup();
    render(<CustomerLoginClient />);
    await waitFor(() => expect(screen.getByLabelText(/Mobile number/i)).toBeInTheDocument());

    sendCustomerOtp.mockResolvedValue({
      ok: true,
      data: { ok: true, code: "OTP_REQUEST_ACCEPTED", retryAfterSeconds: 30 },
    });
    await user.type(screen.getByLabelText(/Mobile number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /Send code/i }));
    await waitFor(() => expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument());

    verifyCustomerOtp.mockResolvedValue({
      ok: true,
      data: { authenticated: false, code: "OTP_INVALID_OR_EXPIRED" },
    });
    await user.type(screen.getByLabelText(/6-digit code/i), "000000");
    await user.click(screen.getByRole("button", { name: /Verify code/i }));

    await waitFor(() =>
      expect(screen.getByText(/That code is incorrect or has expired/i)).toBeInTheDocument(),
    );
    expect(assign).not.toHaveBeenCalled();
    expect(notifyCustomerChromeSessionChanged).not.toHaveBeenCalled();
  });

  it("does not redirect-loop when returnTo points at /login/", async () => {
    useSearchParams.mockReturnValue(new URLSearchParams("returnTo=%2Flogin%2F"));
    fetchCustomerSession.mockResolvedValue({
      ok: true,
      data: { authenticated: true, user: { id: "usr_1" } },
    });
    render(<CustomerLoginClient />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/"));
    expect(assign).not.toHaveBeenCalledWith("/login/");
  });
});
