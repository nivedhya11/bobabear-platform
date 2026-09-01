/**
 * /login — customer phone + OTP sign-in (IMP-009 / IMP-025 return-to).
 *
 * A plain static export route (no server component data fetching, no
 * server-side session check — the static export has no server at request
 * time). All session/OTP behaviour happens client-side in
 * `CustomerLoginClient`, talking to the customer-auth service through the
 * same-origin Nginx proxy path (`docker/nginx/nginx.conf`).
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerLoginClient } from "./CustomerLoginClient";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Boba Bear with your mobile number.",
  alternates: { canonical: "/login" },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
          <div className="mx-auto max-w-[420px] px-5 py-16 md:py-24 min-h-[70vh] flex flex-col justify-center">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">Checking your session…</p>
          </div>
        </main>
      }
    >
      <CustomerLoginClient />
    </Suspense>
  );
}
