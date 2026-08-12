/**
 * /login — customer phone + OTP sign-in (IMP-009).
 *
 * A plain static export route (no server component data fetching, no
 * server-side session check — the static export has no server at request
 * time). All session/OTP behaviour happens client-side in
 * `CustomerLoginClient`, talking to the customer-auth service through the
 * same-origin Nginx proxy path (`docker/nginx/nginx.conf`).
 */
import type { Metadata } from "next";

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
  return <CustomerLoginClient />;
}
