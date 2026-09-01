/**
 * /workforce/login — workforce email/password + MFA sign-in (IMP-010).
 *
 * A plain static export route (no server component data fetching, no
 * server-side session check — the static export has no server at request
 * time). All session/password/MFA behaviour happens client-side in
 * `WorkforceLoginClient`, talking to the workforce-auth service through
 * the same-origin Nginx proxy path (`docker/nginx/nginx.conf`).
 *
 * Deliberately absent from customer-facing navigation.
 */
import type { Metadata } from "next";

import { Suspense } from "react";

import { WorkforceLoginClient } from "./WorkforceLoginClient";

export const metadata: Metadata = {
  title: "Workforce Sign In",
  description: "Sign in to the Boba Bear workforce portal.",
  alternates: { canonical: "/workforce/login" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkforceLoginPage() {
  return (
    <Suspense fallback={<p className="font-body text-[15px] text-[var(--text-secondary)]">Loading sign-in…</p>}>
      <WorkforceLoginClient />
    </Suspense>
  );
}
