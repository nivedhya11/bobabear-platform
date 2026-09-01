"use client";

/**
 * CustomerLoginClient — phone + OTP sign-in (IMP-009).
 *
 * A single small state machine drives every state the spec calls for:
 * loading session, enter phone, sending OTP, OTP sent, enter code,
 * verifying, signed in, signed out, rate limited, invalid/expired code,
 * attempts exhausted, delivery unavailable, and service unavailable. The
 * `screen` field picks which form renders; `notice` carries the specific
 * outcome message for the `aria-live` status line below it.
 *
 * Phone and OTP values live only in this component's own React state —
 * never the URL, `localStorage`, `sessionStorage`, or an analytics event.
 * The session cookie itself is opaque to this component: it is set and
 * read entirely by the browser and the customer-auth service via
 * `credentials: "same-origin"` (see `@/lib/customer-auth/client`).
 */

import { useEffect, useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import {
  fetchCustomerSession,
  sendCustomerOtp,
  signOutCustomer,
  verifyCustomerOtp,
} from "@/lib/customer-auth/client";
import { notifyCustomerChromeSessionChanged } from "@/lib/customer-auth/chrome-session";
import { parseSafeReturnPath } from "@/lib/customer-auth/return-to";
import { getOwnProfile } from "@/lib/customer-commerce";
import { shouldOfferWelcome, welcomeUrlWithReturn } from "@/lib/customer-commerce/welcome-flow";
import { normalizeIndianMobileNumber } from "@/shared/customer-auth/phone";
import { cn } from "@/lib/utils";

type Screen = "loading" | "phone" | "code" | "signed-in";

type Notice =
  | Readonly<{ kind: "otp-sent" }>
  | Readonly<{ kind: "signed-out" }>
  | Readonly<{ kind: "invalid-phone" }>
  | Readonly<{ kind: "invalid-code" }>
  | Readonly<{ kind: "attempts-exhausted" }>
  | Readonly<{ kind: "rate-limited"; context: "send" | "verify"; retryAfterSeconds: number }>
  | Readonly<{ kind: "delivery-unavailable" }>
  | Readonly<{ kind: "service-unavailable" }>
  | null;

const OTP_LENGTH = 6;

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

function secondsRemaining(resendAvailableAtMs: number | null, nowMs: number): number {
  if (resendAvailableAtMs === null) return 0;
  return Math.max(0, Math.ceil((resendAvailableAtMs - nowMs) / 1000));
}

function describeNotice(
  screen: Screen,
  notice: Notice,
  cooldownSeconds: number,
): string {
  if (notice) {
    switch (notice.kind) {
      case "otp-sent":
        return "Code sent — check your messages.";
      case "signed-out":
        return "You've been signed out.";
      case "invalid-phone":
        return "Enter a valid Indian mobile number.";
      case "invalid-code":
        return "That code is incorrect or has expired. Try again.";
      case "attempts-exhausted":
        return "Too many incorrect attempts. Request a new code.";
      case "rate-limited":
        return notice.context === "send"
          ? `Too many requests — try again in ${cooldownSeconds || notice.retryAfterSeconds}s.`
          : `Too many attempts — try again in ${notice.retryAfterSeconds}s.`;
      case "delivery-unavailable":
        return "We couldn't send a code right now. Please try again shortly.";
      case "service-unavailable":
        return "Something went wrong. Please try again.";
    }
  }
  if (screen === "phone") return "We'll text you a 6-digit code to sign in.";
  if (screen === "code") return "Enter the 6-digit code we sent you.";
  return "";
}

export function CustomerLoginClient() {
  const searchParams = useSearchParams();
  const returnTo = parseSafeReturnPath(searchParams.get("returnTo"));
  const [screen, setScreen] = useState<Screen>("loading");
  const [phoneInput, setPhoneInput] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const phoneInputId = useId();
  const codeInputId = useId();
  const statusId = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchCustomerSession();
      if (cancelled) return;
      if (result.ok && result.data.authenticated) {
        if (returnTo) {
          window.location.assign(returnTo);
          return;
        }
        setScreen("signed-in");
        return;
      }
      setScreen("phone");
    })();
    return () => {
      cancelled = true;
    };
  }, [returnTo]);

  useEffect(() => {
    if (resendAvailableAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  const cooldownSeconds = secondsRemaining(resendAvailableAt, now);

  async function requestOtp(phoneNumber: string): Promise<void> {
    setPending(true);
    setNotice(null);
    const result = await sendCustomerOtp(phoneNumber);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }
    const { data } = result;
    if (data.ok) {
      setNormalizedPhone(phoneNumber);
      setCode("");
      setResendAvailableAt(Date.now() + data.retryAfterSeconds * 1000);
      setNotice({ kind: "otp-sent" });
      setScreen("code");
      return;
    }
    if (data.code === "OTP_RATE_LIMITED") {
      setResendAvailableAt(Date.now() + data.retryAfterSeconds * 1000);
      setNotice({ kind: "rate-limited", context: "send", retryAfterSeconds: data.retryAfterSeconds });
      return;
    }
    if (data.code === "OTP_DELIVERY_UNAVAILABLE") {
      setNotice({ kind: "delivery-unavailable" });
      return;
    }
    setNotice({ kind: "invalid-phone" });
  }

  function handleSendOtp(event: FormEvent): void {
    event.preventDefault();
    if (pending) return;

    const normalized = normalizeIndianMobileNumber(phoneInput);
    if (!normalized.ok) {
      setNotice({ kind: "invalid-phone" });
      return;
    }
    void requestOtp(normalized.phoneNumber);
  }

  function handleResend(): void {
    if (pending || cooldownSeconds > 0 || normalizedPhone === null) return;
    void requestOtp(normalizedPhone);
  }

  async function handleVerifyOtp(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || normalizedPhone === null || code.length !== OTP_LENGTH) return;

    setPending(true);
    setNotice(null);
    const result = await verifyCustomerOtp(normalizedPhone, code);
    setPending(false);

    if (!result.ok) {
      setNotice({ kind: "service-unavailable" });
      return;
    }
    const { data } = result;
    if (data.authenticated) {
      setCode("");
      notifyCustomerChromeSessionChanged();
      const profile = await getOwnProfile();
      const hasProfile = profile.ok && profile.data.profile !== null;
      if (!hasProfile && shouldOfferWelcome(returnTo)) {
        window.location.assign(welcomeUrlWithReturn(returnTo));
        return;
      }
      if (returnTo) {
        window.location.assign(returnTo);
        return;
      }
      setScreen("signed-in");
      return;
    }
    if (data.code === "OTP_ATTEMPTS_EXHAUSTED") {
      setCode("");
      setNotice({ kind: "attempts-exhausted" });
      return;
    }
    if (data.code === "OTP_RATE_LIMITED") {
      setNotice({
        kind: "rate-limited",
        context: "verify",
        retryAfterSeconds: data.retryAfterSeconds ?? 0,
      });
      return;
    }
    if (data.code === "OTP_DELIVERY_UNAVAILABLE") {
      setNotice({ kind: "delivery-unavailable" });
      return;
    }
    // OTP_INVALID_OR_EXPIRED, INVALID_PHONE_NUMBER, and INVALID_REQUEST are
    // all retriable from this same screen — the code is left in place so
    // the customer can correct a typo instead of retyping it from scratch.
    setNotice({ kind: "invalid-code" });
  }

  function handleChangeNumber(): void {
    setScreen("phone");
    setCode("");
    setNormalizedPhone(null);
    setResendAvailableAt(null);
    setNotice(null);
  }

  async function handleSignOut(): Promise<void> {
    if (pending) return;
    setPending(true);
    await signOutCustomer();
    notifyCustomerChromeSessionChanged();
    setPending(false);
    setPhoneInput("");
    setNormalizedPhone(null);
    setCode("");
    setResendAvailableAt(null);
    setNotice({ kind: "signed-out" });
    setScreen("phone");
  }

  const statusMessage = describeNotice(screen, notice, cooldownSeconds);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[420px] px-5 py-16 md:py-24 min-h-[70vh] flex flex-col justify-center gap-8">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Account
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
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              You&rsquo;re signed in.
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={pending}
              className={BUTTON_SECONDARY_CLASS}
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}

        {screen === "phone" && (
          <form onSubmit={handleSendOtp} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={phoneInputId}
                className="font-body text-[13px] font-semibold text-[var(--text-primary)]"
              >
                Mobile number
              </label>
              <input
                id={phoneInputId}
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={phoneInput}
                onChange={(event) => {
                  setPhoneInput(event.target.value);
                  setNotice(null);
                }}
                placeholder="98765 43210"
                aria-describedby={statusId}
                disabled={pending}
                className={INPUT_CLASS}
              />
            </div>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY_CLASS}>
              {pending ? "Sending code…" : "Send code"}
            </button>
          </form>
        )}

        {screen === "code" && (
          <form onSubmit={(event) => void handleVerifyOtp(event)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={codeInputId}
                className="font-body text-[13px] font-semibold text-[var(--text-primary)]"
              >
                6-digit code
              </label>
              <input
                id={codeInputId}
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                pattern="\d*"
                required
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                  setNotice(null);
                }}
                aria-describedby={statusId}
                disabled={pending}
                className={cn(INPUT_CLASS, "text-center tracking-[0.3em] font-mono")}
              />
            </div>
            <button
              type="submit"
              disabled={pending || code.length !== OTP_LENGTH}
              className={BUTTON_PRIMARY_CLASS}
            >
              {pending ? "Verifying…" : "Verify code"}
            </button>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleChangeNumber}
                disabled={pending}
                className={LINK_CLASS}
              >
                Change number
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={pending || cooldownSeconds > 0}
                className={LINK_CLASS}
              >
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
              </button>
            </div>
          </form>
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
