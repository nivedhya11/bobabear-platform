"use client";

/**
 * WorkforceLoginClient — email/password + TOTP MFA sign-in (IMP-010).
 *
 * A single state machine drives every screen the slice calls for: loading
 * session, enter email/password, authentication failed, rate limited,
 * password change required, MFA enrollment (QR + manual otpauth URI +
 * backup codes once), verify enrollment, reauthentication required, MFA
 * challenge, backup code, MFA locked, authenticated, signed out, and
 * service unavailable. The `screen` field picks which form renders;
 * `notice` carries the outcome message for the `aria-live` status line.
 *
 * Email, passwords, TOTP codes, the otpauth URI, and backup codes live
 * only in this component's React state — never the URL, `localStorage`,
 * `sessionStorage`, or an analytics event. Sensitive enrollment material
 * is cleared when leaving those screens. The session cookie itself is
 * opaque here: it is set and read by the browser and the workforce-auth
 * service via `credentials: "same-origin"` (see `@/lib/workforce-auth/client`).
 */

import { useEffect, useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import {
  changeWorkforcePassword,
  enrollWorkforceMfa,
  fetchWorkforceSession,
  signInWorkforce,
  signOutWorkforce,
  verifyWorkforceMfa,
  verifyWorkforceMfaBackupCode,
  verifyWorkforceMfaEnrollment,
} from "@/lib/workforce-auth/client";
import { fetchAdminSession } from "@/lib/administration/api";
import { resolvePostLoginLocation } from "@/lib/workforce-hub/post-login";
import { parseSafeWorkforceReturnPath } from "@/lib/workforce-hub/return-to";
import { normalizeWorkforceEmail } from "@/shared/workforce-auth/email";
import { cn } from "@/lib/utils";

type Screen =
  | "loading"
  | "sign-in"
  | "change-password"
  | "mfa-enroll-required"
  | "mfa-enroll-setup"
  | "mfa-enroll-verify"
  | "mfa-challenge"
  | "mfa-backup"
  | "mfa-locked"
  | "signed-in";

type Notice =
  | Readonly<{ kind: "signed-out" }>
  | Readonly<{ kind: "reauthentication-required" }>
  | Readonly<{ kind: "authentication-failed" }>
  | Readonly<{ kind: "invalid-email" }>
  | Readonly<{ kind: "password-policy-violation" }>
  | Readonly<{ kind: "mfa-invalid-code" }>
  | Readonly<{ kind: "rate-limited"; retryAfterSeconds: number }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "service-unavailable" }>
  | null;

/** Matches `WORKFORCE_PASSWORD_MIN_LENGTH` / `MAX` (server policy). */
const PASSWORD_MIN_LENGTH = 15;
const PASSWORD_MAX_LENGTH = 128;
const TOTP_LENGTH = 6;

const INPUT_CLASS = cn(
  "h-12 px-3.5 rounded-sm w-full",
  "bg-transparent text-[var(--text-primary)]",
  "border border-[var(--border-strong)]",
  "placeholder:text-[var(--text-tertiary)]",
  "font-body text-body-md",
  "transition-[border-color,box-shadow] duration-[150ms] ease-out",
  "focus:border-[var(--interactive-secondary)] focus:outline-none",
  "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

const BUTTON_PRIMARY_CLASS = cn(
  "h-12 px-6 rounded-sm",
  "bg-[var(--interactive-secondary)] text-[var(--text-on-secondary)]",
  "font-mono text-[12px] font-bold uppercase tracking-[0.16em]",
  "hover:bg-[var(--interactive-secondary-hover)]",
  "transition-colors duration-[150ms] ease-out",
  "disabled:opacity-60 disabled:cursor-not-allowed",
  "focus-ring",
);

const BUTTON_SECONDARY_CLASS = cn(
  "h-11 px-5 rounded-sm",
  "border border-[var(--border-strong)] text-[var(--text-primary)]",
  "font-mono text-[12px] font-bold uppercase tracking-[0.16em]",
  "hover:border-[var(--interactive-secondary)]",
  "transition-colors duration-[150ms] ease-out",
  "disabled:opacity-60 disabled:cursor-not-allowed",
  "focus-ring self-start",
);

const LINK_CLASS = cn(
  "font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]",
  "hover:text-[var(--interactive-secondary)] transition-colors duration-[150ms] ease-out",
  "focus-ring rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-tertiary)]",
);

const LABEL_CLASS = "font-body text-[13px] font-semibold text-[var(--text-primary)]";

function isPasswordLengthValid(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;
}

function describeNotice(screen: Screen, notice: Notice): string {
  if (notice) {
    switch (notice.kind) {
      case "signed-out":
        return "You've been signed out.";
      case "reauthentication-required":
        return "Authenticator set up. Sign in again to continue.";
      case "authentication-failed":
        return "Email or password is incorrect.";
      case "invalid-email":
        return "Enter a valid work email address.";
      case "password-policy-violation":
        return `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters.`;
      case "mfa-invalid-code":
        return "That code is incorrect. Try again.";
      case "rate-limited":
        return `Too many attempts — try again in ${notice.retryAfterSeconds}s.`;
      case "forbidden":
        return "This step isn't available right now. Sign in again.";
      case "service-unavailable":
        return "Something went wrong. Please try again.";
    }
  }
  if (screen === "sign-in") return "Use your workforce email and password.";
  if (screen === "change-password") {
    return "Choose a new password to replace your temporary one.";
  }
  if (screen === "mfa-enroll-required") {
    return "Confirm your password to set up an authenticator app.";
  }
  if (screen === "mfa-enroll-setup") {
    return "Scan the QR code or enter the setup URI, then save your backup codes.";
  }
  if (screen === "mfa-enroll-verify") {
    return "Enter the 6-digit code from your authenticator app.";
  }
  if (screen === "mfa-challenge") return "Enter the 6-digit code from your authenticator.";
  if (screen === "mfa-backup") return "Enter one unused backup code.";
  if (screen === "mfa-locked") {
    return "Too many incorrect MFA attempts. Try again later or contact an operator.";
  }
  return "";
}

export function WorkforceLoginClient() {
  const searchParams = useSearchParams();
  const returnTo = parseSafeWorkforceReturnPath(searchParams.get("returnTo"));
  const [screen, setScreen] = useState<Screen>("loading");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [enrollPassword, setEnrollPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<readonly string[] | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const emailInputId = useId();
  const passwordInputId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const enrollPasswordId = useId();
  const totpCodeId = useId();
  const backupCodeId = useId();
  const statusId = useId();

  function clearPasswordFields(): void {
    setPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setEnrollPassword("");
  }

  function clearEnrollmentSecrets(): void {
    setTotpUri(null);
    setBackupCodes(null);
    setQrDataUrl(null);
    setTotpCode("");
    setBackupCode("");
  }

  function goToSignIn(nextNotice: Notice = null): void {
    clearPasswordFields();
    clearEnrollmentSecrets();
    setNotice(nextNotice);
    setScreen("sign-in");
  }

  async function redirectAfterAuthentication(): Promise<void> {
    setScreen("loading");
    const session = await fetchAdminSession();
    const resolution = resolvePostLoginLocation({
      returnTo,
      session: session.ok
        ? { ok: true, capabilities: session.data.session.capabilities }
        : { ok: false, status: session.status, code: session.code },
    });
    if (resolution.kind === "authentication_required") {
      goToSignIn();
      return;
    }
    if (resolution.kind === "service_failure") {
      setNotice({ kind: "service-unavailable" });
      window.location.assign("/workforce/");
      return;
    }
    window.location.assign(resolution.href);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchWorkforceSession();
      if (cancelled) return;
      if (!result.ok) {
        setNotice({ kind: "service-unavailable" });
        setScreen("sign-in");
        return;
      }
      const { data } = result;
      if (data.authenticated) {
        void redirectAfterAuthentication();
        return;
      }
      if (data.next === "change_password") {
        setScreen("change-password");
        return;
      }
      if (data.next === "mfa_enrollment") {
        setScreen("mfa-enroll-required");
        return;
      }
      if (data.next === "mfa") {
        setScreen("mfa-challenge");
        return;
      }
      setScreen("sign-in");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== "mfa-enroll-setup" || totpUri === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(totpUri, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 216,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, totpUri]);

  async function handleSignIn(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;

    const normalized = normalizeWorkforceEmail(emailInput);
    if (!normalized.ok) {
      setNotice({ kind: "invalid-email" });
      return;
    }

    setPending(true);
    setNotice(null);
    const result = await signInWorkforce(normalized.email, password);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if ("authenticated" in data && data.authenticated) {
      void redirectAfterAuthentication();
      return;
    }
    if ("next" in data) {
      clearPasswordFields();
      if (data.next === "change_password") {
        setScreen("change-password");
        return;
      }
      if (data.next === "mfa_enrollment") {
        setScreen("mfa-enroll-required");
        return;
      }
      setScreen("mfa-challenge");
      return;
    }

    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    setNotice({ kind: "authentication-failed" });
  }

  async function handleChangePassword(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;

    if (!isPasswordLengthValid(newPassword)) {
      setNotice({ kind: "password-policy-violation" });
      return;
    }

    setPending(true);
    setNotice(null);
    const result = await changeWorkforcePassword(currentPassword, newPassword);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if ("next" in data && data.next === "mfa_enrollment") {
      clearPasswordFields();
      setScreen("mfa-enroll-required");
      return;
    }

    if ("code" in data && data.code === "PASSWORD_POLICY_VIOLATION") {
      setNotice({ kind: "password-policy-violation" });
      return;
    }
    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if ("code" in data && data.code === "FORBIDDEN") {
      goToSignIn({ kind: "forbidden" });
      return;
    }
    setNotice({ kind: "authentication-failed" });
  }

  async function handleStartMfaEnrollment(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setNotice(null);
    const result = await enrollWorkforceMfa(enrollPassword);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if ("totpUri" in data) {
      setEnrollPassword("");
      setTotpUri(data.totpUri);
      setBackupCodes(data.backupCodes);
      setTotpCode("");
      setScreen("mfa-enroll-setup");
      return;
    }

    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if ("code" in data && data.code === "FORBIDDEN") {
      goToSignIn({ kind: "forbidden" });
      return;
    }
    setNotice({ kind: "authentication-failed" });
  }

  function handleContinueToEnrollmentVerify(): void {
    if (pending) return;
    // Codes and URI were shown once on the setup screen — clear them before
    // leaving so they do not linger in component memory during verification.
    setTotpUri(null);
    setBackupCodes(null);
    setQrDataUrl(null);
    setTotpCode("");
    setNotice(null);
    setScreen("mfa-enroll-verify");
  }

  async function handleVerifyEnrollment(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || totpCode.length !== TOTP_LENGTH) return;

    setPending(true);
    setNotice(null);
    const result = await verifyWorkforceMfaEnrollment(totpCode);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if ("next" in data && data.next === "sign_in") {
      clearEnrollmentSecrets();
      clearPasswordFields();
      setEmailInput("");
      setNotice({ kind: "reauthentication-required" });
      setScreen("sign-in");
      return;
    }

    if ("code" in data && data.code === "MFA_LOCKED") {
      clearEnrollmentSecrets();
      setScreen("mfa-locked");
      return;
    }
    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if ("code" in data && data.code === "FORBIDDEN") {
      goToSignIn({ kind: "forbidden" });
      return;
    }
    setNotice({ kind: "mfa-invalid-code" });
  }

  async function handleVerifyMfa(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || totpCode.length !== TOTP_LENGTH) return;

    setPending(true);
    setNotice(null);
    const result = await verifyWorkforceMfa(totpCode);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if (data.authenticated) {
      setTotpCode("");
      setBackupCode("");
      void redirectAfterAuthentication();
      return;
    }

    if ("code" in data && data.code === "MFA_LOCKED") {
      setTotpCode("");
      setBackupCode("");
      setScreen("mfa-locked");
      return;
    }
    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if ("code" in data && data.code === "AUTHENTICATION_FAILED") {
      goToSignIn({ kind: "authentication-failed" });
      return;
    }
    setNotice({ kind: "mfa-invalid-code" });
  }

  async function handleVerifyBackupCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || backupCode.trim().length === 0) return;

    setPending(true);
    setNotice(null);
    const result = await verifyWorkforceMfaBackupCode(backupCode.trim());
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }

    const { data } = result;
    if (data.authenticated) {
      setTotpCode("");
      setBackupCode("");
      void redirectAfterAuthentication();
      return;
    }

    if ("code" in data && data.code === "MFA_LOCKED") {
      setTotpCode("");
      setBackupCode("");
      setScreen("mfa-locked");
      return;
    }
    if ("code" in data && data.code === "RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if ("code" in data && data.code === "AUTHENTICATION_FAILED") {
      goToSignIn({ kind: "authentication-failed" });
      return;
    }
    setNotice({ kind: "mfa-invalid-code" });
  }

  async function handleSignOut(): Promise<void> {
    if (pending) return;
    setPending(true);
    await signOutWorkforce();
    setPending(false);
    setEmailInput("");
    goToSignIn({ kind: "signed-out" });
  }

  function handleAbortToSignIn(): void {
    if (pending) return;
    goToSignIn(null);
  }

  function handleOpenBackupCode(): void {
    if (pending) return;
    setTotpCode("");
    setBackupCode("");
    setNotice(null);
    setScreen("mfa-backup");
  }

  function handleBackToMfaChallenge(): void {
    if (pending) return;
    setBackupCode("");
    setTotpCode("");
    setNotice(null);
    setScreen("mfa-challenge");
  }

  const statusMessage = describeNotice(screen, notice);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[420px] px-5 py-16 md:py-24 min-h-[70vh] flex flex-col justify-center gap-8">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Workforce
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Sign In
          </h1>
        </header>

        {screen === "loading" && (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Checking your session…</p>
        )}

        {screen === "signed-in" && (
          <div className="flex flex-col gap-5">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Redirecting to your workforce application…</p>
          </div>
        )}

        {screen === "sign-in" && (
          <form onSubmit={(event) => void handleSignIn(event)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={emailInputId} className={LABEL_CLASS}>
                Work email
              </label>
              <input
                id={emailInputId}
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={emailInput}
                onChange={(event) => {
                  setEmailInput(event.target.value);
                  setNotice(null);
                }}
                placeholder="you@example.com"
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordInputId} className={LABEL_CLASS}>
                Password
              </label>
              <input
                id={passwordInputId}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY_CLASS}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {screen === "change-password" && (
          <form
            onSubmit={(event) => void handleChangePassword(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={currentPasswordId} className={LABEL_CLASS}>
                Temporary password
              </label>
              <input
                id={currentPasswordId}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={newPasswordId} className={LABEL_CLASS}>
                New password
              </label>
              <input
                id={newPasswordId}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY_CLASS}>
              {pending ? "Updating…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={handleAbortToSignIn}
              disabled={pending}
              className={LINK_CLASS}
            >
              Back to sign in
            </button>
          </form>
        )}

        {screen === "mfa-enroll-required" && (
          <form
            onSubmit={(event) => void handleStartMfaEnrollment(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Multi-factor authentication is required before you can continue.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={enrollPasswordId} className={LABEL_CLASS}>
                Confirm password
              </label>
              <input
                id={enrollPasswordId}
                name="enrollPassword"
                type="password"
                autoComplete="current-password"
                required
                value={enrollPassword}
                onChange={(event) => {
                  setEnrollPassword(event.target.value);
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY_CLASS}>
              {pending ? "Starting setup…" : "Set up authenticator"}
            </button>
            <button
              type="button"
              onClick={handleAbortToSignIn}
              disabled={pending}
              className={LINK_CLASS}
            >
              Back to sign in
            </button>
          </form>
        )}

        {screen === "mfa-enroll-setup" && totpUri !== null && backupCodes !== null && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
                Authenticator QR code
              </p>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL from qrcode; no remote asset
                <img
                  src={qrDataUrl}
                  alt="QR code for authenticator app setup"
                  width={216}
                  height={216}
                  className="rounded-sm border border-[var(--border-strong)] bg-white self-start"
                />
              ) : (
                <p className="font-body text-[13px] text-[var(--text-tertiary)]">
                  Preparing QR code… Use the setup URI below if it does not appear.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
                Manual authenticator setup
              </p>
              <code
                className={cn(
                  "block whitespace-pre-wrap break-all rounded-sm p-3",
                  "border border-[var(--border-strong)]",
                  "font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]",
                )}
              >
                {totpUri}
              </code>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
                Backup codes
              </p>
              <p className="font-body text-[13px] text-[var(--text-tertiary)]">
                Save these now — they are shown only once.
              </p>
              <ul className="grid grid-cols-1 gap-1.5 font-mono text-[12px] text-[var(--text-secondary)]">
                {backupCodes.map((code) => (
                  <li
                    key={code}
                    className="rounded-sm border border-[var(--border-strong)] px-3 py-2 tracking-[0.08em]"
                  >
                    {code}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleContinueToEnrollmentVerify}
              disabled={pending}
              className={BUTTON_PRIMARY_CLASS}
            >
              Continue to verification
            </button>
            <button
              type="button"
              onClick={handleAbortToSignIn}
              disabled={pending}
              className={LINK_CLASS}
            >
              Cancel setup
            </button>
          </div>
        )}

        {screen === "mfa-enroll-verify" && (
          <form
            onSubmit={(event) => void handleVerifyEnrollment(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={totpCodeId} className={LABEL_CLASS}>
                Authenticator code
              </label>
              <input
                id={totpCodeId}
                name="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={TOTP_LENGTH}
                pattern="\d*"
                required
                value={totpCode}
                onChange={(event) => {
                  setTotpCode(event.target.value.replace(/\D/g, "").slice(0, TOTP_LENGTH));
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={cn(INPUT_CLASS, "text-center tracking-[0.3em] font-mono")}
              />
            </div>
            <button
              type="submit"
              disabled={pending || totpCode.length !== TOTP_LENGTH}
              className={BUTTON_PRIMARY_CLASS}
            >
              {pending ? "Verifying…" : "Verify authenticator"}
            </button>
            <button
              type="button"
              onClick={handleAbortToSignIn}
              disabled={pending}
              className={LINK_CLASS}
            >
              Cancel
            </button>
          </form>
        )}

        {screen === "mfa-challenge" && (
          <form
            onSubmit={(event) => void handleVerifyMfa(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={totpCodeId} className={LABEL_CLASS}>
                Authenticator code
              </label>
              <input
                id={totpCodeId}
                name="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={TOTP_LENGTH}
                pattern="\d*"
                required
                value={totpCode}
                onChange={(event) => {
                  setTotpCode(event.target.value.replace(/\D/g, "").slice(0, TOTP_LENGTH));
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={cn(INPUT_CLASS, "text-center tracking-[0.3em] font-mono")}
              />
            </div>
            <button
              type="submit"
              disabled={pending || totpCode.length !== TOTP_LENGTH}
              className={BUTTON_PRIMARY_CLASS}
            >
              {pending ? "Verifying…" : "Verify"}
            </button>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenBackupCode}
                disabled={pending}
                className={LINK_CLASS}
              >
                Use a backup code
              </button>
              <button
                type="button"
                onClick={handleAbortToSignIn}
                disabled={pending}
                className={LINK_CLASS}
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {screen === "mfa-backup" && (
          <form
            onSubmit={(event) => void handleVerifyBackupCode(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={backupCodeId} className={LABEL_CLASS}>
                Backup code
              </label>
              <input
                id={backupCodeId}
                name="backupCode"
                type="text"
                autoComplete="one-time-code"
                required
                value={backupCode}
                onChange={(event) => {
                  setBackupCode(event.target.value);
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={cn(INPUT_CLASS, "font-mono tracking-[0.08em]")}
              />
            </div>
            <button
              type="submit"
              disabled={pending || backupCode.trim().length === 0}
              className={BUTTON_PRIMARY_CLASS}
            >
              {pending ? "Verifying…" : "Verify backup code"}
            </button>
            <button
              type="button"
              onClick={handleBackToMfaChallenge}
              disabled={pending}
              className={LINK_CLASS}
            >
              Use authenticator code
            </button>
          </form>
        )}

        {screen === "mfa-locked" && (
          <div className="flex flex-col gap-5">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              This account is temporarily locked after too many MFA attempts.
            </p>
            <button
              type="button"
              onClick={handleAbortToSignIn}
              disabled={pending}
              className={BUTTON_SECONDARY_CLASS}
            >
              Back to sign in
            </button>
          </div>
        )}

        <p
          id={statusId}
          aria-live="polite"
          className="font-body text-[13px] min-h-[1.25rem] text-[var(--text-tertiary)]"
        >
          {statusMessage}
        </p>
      </div>
    </main>
  );
}
