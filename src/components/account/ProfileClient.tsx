"use client";

import { useEffect, useState, type FormEvent } from "react";

import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import {
  createOwnProfile,
  deleteOwnProfile,
  getOwnProfile,
  updateOwnProfile,
  type CommerceProfile,
} from "@/lib/customer-commerce";

export function ProfileClient() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommerceProfile | null>(null);
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/account/profile/"));
        return;
      }
      const result = await getOwnProfile();
      if (cancelled) return;
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        setLoading(false);
        return;
      }
      const current = result.data.profile;
      setProfile(current);
      if (current) {
        setGivenName(current.givenName);
        setFamilyName(current.familyName ?? "");
        setEmail(current.email ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const payload = {
      givenName,
      familyName: familyName.trim().length > 0 ? familyName : null,
      email: email.trim().length > 0 ? email : null,
    };
    const result = profile
      ? await updateOwnProfile(payload)
      : await createOwnProfile(payload);
    setPending(false);
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      return;
    }
    setProfile(result.data.profile);
  }

  async function handleDeleteProfile(): Promise<void> {
    if (pending || !profile) return;
    const confirmed = window.confirm(
      "Remove your saved profile details? This does not delete your account or order history.",
    );
    if (!confirmed) return;
    setPending(true);
    setError(null);
    const result = await deleteOwnProfile();
    setPending(false);
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      return;
    }
    setProfile(null);
    setGivenName("");
    setFamilyName("");
    setEmail("");
  }

  return (
    <AccountShell title="Profile">
      {loading ? (
        <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading profile…</p>
      ) : null}

      {error ? (
        <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
          {error}
        </p>
      ) : null}

      {!loading ? (
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 max-w-md">
          <p className="font-body text-[15px] text-[var(--text-secondary)]">
            {profile
              ? "Update the details we use for your orders."
              : "Add optional profile details. You can skip this and still order."}
          </p>
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
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : profile ? "Save profile" : "Create profile"}
          </Button>
          {profile ? (
            <Button type="button" variant="destructive" disabled={pending} onClick={() => void handleDeleteProfile()}>
              Remove profile details
            </Button>
          ) : null}
        </form>
      ) : null}
    </AccountShell>
  );
}
