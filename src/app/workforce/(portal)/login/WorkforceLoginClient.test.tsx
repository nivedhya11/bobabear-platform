import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkforceLoginClient } from "./WorkforceLoginClient";

const useSearchParams = vi.fn<() => URLSearchParams>();
const fetchWorkforceSession = vi.fn<(...args: unknown[]) => unknown>();
const signInWorkforce = vi.fn<(...args: unknown[]) => unknown>();
const changeWorkforcePassword = vi.fn<(...args: unknown[]) => unknown>();
const verifyWorkforceMfa = vi.fn<(...args: unknown[]) => unknown>();
const verifyWorkforceMfaBackupCode = vi.fn<(...args: unknown[]) => unknown>();
const fetchAdminSession = vi.fn<(...args: unknown[]) => unknown>();
const resolvePostLoginLocation = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}));

vi.mock("@/lib/workforce-auth/client", () => ({
  fetchWorkforceSession: (...args: unknown[]) => fetchWorkforceSession(...args),
  signInWorkforce: (...args: unknown[]) => signInWorkforce(...args),
  changeWorkforcePassword: (...args: unknown[]) => changeWorkforcePassword(...args),
  enrollWorkforceMfa: vi.fn(),
  verifyWorkforceMfaEnrollment: vi.fn(),
  verifyWorkforceMfa: (...args: unknown[]) => verifyWorkforceMfa(...args),
  verifyWorkforceMfaBackupCode: (...args: unknown[]) =>
    verifyWorkforceMfaBackupCode(...args),
  signOutWorkforce: vi.fn(),
}));

vi.mock("@/lib/administration/api", () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
}));

vi.mock("@/lib/workforce-hub/post-login", () => ({
  resolvePostLoginLocation: (...args: unknown[]) => resolvePostLoginLocation(...args),
}));

vi.mock("@/lib/workforce-hub/return-to", () => ({
  parseSafeWorkforceReturnPath: (value: string | null) => value,
}));

describe("WorkforceLoginClient — existing MFA password-reset transitions", () => {
  const assign = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    assign.mockReset();
    useSearchParams.mockReturnValue(new URLSearchParams());
    fetchWorkforceSession.mockReset();
    signInWorkforce.mockReset();
    changeWorkforcePassword.mockReset();
    verifyWorkforceMfa.mockReset();
    verifyWorkforceMfaBackupCode.mockReset();
    fetchAdminSession.mockReset();
    resolvePostLoginLocation.mockReset();
    fetchWorkforceSession.mockResolvedValue({
      ok: true,
      data: { authenticated: false },
    });
    vi.stubGlobal("location", { ...window.location, assign });
  });

  it("routes MFA success next=change_password to change-password without post-auth redirect", async () => {
    const user = userEvent.setup();
    render(<WorkforceLoginClient />);
    await waitFor(() => expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument());

    signInWorkforce.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "mfa" },
    });
    await user.type(screen.getByLabelText(/Work email/i), "ops@example.test");
    await user.type(screen.getByLabelText(/^Password$/i), "temporary-password-15+");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Authenticator code/i)).toBeInTheDocument(),
    );

    verifyWorkforceMfa.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "change_password" },
    });
    await user.type(screen.getByLabelText(/Authenticator code/i), "123456");
    await user.click(screen.getByRole("button", { name: /^Verify$/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Temporary password/i)).toBeInTheDocument(),
    );
    expect(fetchAdminSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not route existing-MFA password-change success to MFA enrollment", async () => {
    const user = userEvent.setup();
    fetchWorkforceSession.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "change_password" },
    });
    render(<WorkforceLoginClient />);
    await waitFor(() =>
      expect(screen.getByLabelText(/Temporary password/i)).toBeInTheDocument(),
    );

    changeWorkforcePassword.mockResolvedValue({
      ok: true,
      data: { authenticated: true },
    });
    fetchAdminSession.mockResolvedValue({
      ok: true,
      data: {
        session: {
          workforceUserId: "wf_1",
          capabilities: { canAccessAdmin: true },
        },
      },
    });
    resolvePostLoginLocation.mockReturnValue({
      kind: "redirect",
      href: "/workforce/admin/",
    });

    await user.type(screen.getByLabelText(/Temporary password/i), "temporary-password-15+");
    await user.type(screen.getByLabelText(/New password/i), "permanent-password-15x");
    await user.click(screen.getByRole("button", { name: /Update password/i }));

    await waitFor(() => expect(fetchAdminSession).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/set up an authenticator/i)).not.toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith("/workforce/admin/");
  });

  it("completes reset-existing-MFA journey to post-login destination exactly once", async () => {
    const user = userEvent.setup();
    render(<WorkforceLoginClient />);
    await waitFor(() => expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument());

    signInWorkforce.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "mfa" },
    });
    await user.type(screen.getByLabelText(/Work email/i), "ops@example.test");
    await user.type(screen.getByLabelText(/^Password$/i), "temporary-password-15+");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Authenticator code/i)).toBeInTheDocument(),
    );

    verifyWorkforceMfa.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "change_password" },
    });
    await user.type(screen.getByLabelText(/Authenticator code/i), "654321");
    await user.click(screen.getByRole("button", { name: /^Verify$/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Temporary password/i)).toBeInTheDocument(),
    );
    expect(fetchAdminSession).not.toHaveBeenCalled();

    changeWorkforcePassword.mockResolvedValue({
      ok: true,
      data: { authenticated: true },
    });
    fetchAdminSession.mockResolvedValue({
      ok: true,
      data: {
        session: {
          workforceUserId: "wf_1",
          capabilities: { canAccessAdmin: true },
        },
      },
    });
    resolvePostLoginLocation.mockReturnValue({
      kind: "redirect",
      href: "/workforce/admin/",
    });

    await user.type(screen.getByLabelText(/Temporary password/i), "temporary-password-15+");
    await user.type(screen.getByLabelText(/New password/i), "permanent-password-15x");
    await user.click(screen.getByRole("button", { name: /Update password/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith("/workforce/admin/");
    expect(fetchAdminSession).toHaveBeenCalledTimes(1);
  });

  it("routes password-change next=sign_in to reauthentication notice", async () => {
    const user = userEvent.setup();
    fetchWorkforceSession.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "change_password" },
    });
    render(<WorkforceLoginClient />);
    await waitFor(() =>
      expect(screen.getByLabelText(/Temporary password/i)).toBeInTheDocument(),
    );

    changeWorkforcePassword.mockResolvedValue({
      ok: true,
      data: { authenticated: false, next: "sign_in" },
    });

    await user.type(screen.getByLabelText(/Temporary password/i), "temporary-password-15+");
    await user.type(screen.getByLabelText(/New password/i), "permanent-password-15x");
    await user.click(screen.getByRole("button", { name: /Update password/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Password updated\. Sign in again with your new password/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
    expect(fetchAdminSession).not.toHaveBeenCalled();
  });
});
