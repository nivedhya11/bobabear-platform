"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn, parseSafeReturnPath } from "@/lib/customer-auth/return-to";
import { createOwnProfile, getOwnProfile } from "@/lib/customer-commerce";

export function ProfileWelcomeClient() {
  const searchParams = useSearchParams();
  const returnTo = parseSafeReturnPath(searchParams.get("returnTo"));
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/account/welcome/"));
        return;
      }
      const profile = await getOwnProfile();
      if (cancelled) return;
      if (profile.ok && profile.data.profile) {
        window.location.assign(returnTo ?? "/order/");
        return;
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [returnTo]);

  function continueJourney(): void {
    window.location.assign(returnTo ?? "/order/");
  }

  async function handleSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending || givenName.trim().length === 0) return;
    setPending(true);
    setError(null);
    const result = await createOwnProfile({
      givenName: givenName.trim(),
      familyName: familyName.trim().length > 0 ? familyName.trim() : null,
      email: email.trim().length > 0 ? email.trim() : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      return;
    }
    continueJourney();
  }

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[480px] px-5 py-16 md:py-24 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Welcome
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Welcome to My BOBA
          </h1>
        </header>

        {loading ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Checking your profile…</p>
        ) : (
          <>
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Add a first name so we can greet you next time. Last name and email are optional, and
              you can skip this step entirely.
            </p>
            {error ? (
              <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
                {error}
              </p>
            ) : null}
            <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
              <label className="font-body text-[13px] font-semibold">
                First name
                <input
                  required
                  className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                  value={givenName}
                  autoComplete="given-name"
                  onChange={(event) => setGivenName(event.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="font-body text-[13px] font-semibold">
                Last name
                <input
                  className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                  value={familyName}
                  autoComplete="family-name"
                  onChange={(event) => setFamilyName(event.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="font-body text-[13px] font-semibold">
                Email
                <input
                  type="email"
                  className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={pending}
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Saving…" : "Save and continue"}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={continueJourney}>
                  Not now
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
