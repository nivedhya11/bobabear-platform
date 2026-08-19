"use client";

/**
 * Session mapping for global customer chrome (IMP-028A).
 *
 * Reuses IMP-009 `fetchCustomerSession` / `signOutCustomer`. Does not introduce
 * a new identity model, display name, or D-370 Cart isolation.
 *
 * Pending/unknown chrome is anonymous-safe: Sign In may appear; My BOBA must
 * not appear until `authenticated === true` is verified.
 */

import { useCallback, useEffect, useState } from "react";

import { fetchCustomerSession, signOutCustomer } from "@/lib/customer-auth/client";

export const CUSTOMER_CHROME_SESSION_EVENT = "boba-customer-chrome-session";

export type CustomerChromeSession = "unknown" | "anonymous" | "authenticated";

export function notifyCustomerChromeSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOMER_CHROME_SESSION_EVENT));
}

function mapSessionResult(
  result: Awaited<ReturnType<typeof fetchCustomerSession>>,
): Exclude<CustomerChromeSession, "unknown"> {
  if (result && result.ok && result.data.authenticated === true) return "authenticated";
  return "anonymous";
}

export function useCustomerChromeSession(): {
  session: CustomerChromeSession;
  signOut: () => Promise<boolean>;
} {
  const [session, setSession] = useState<CustomerChromeSession>("unknown");

  const refresh = useCallback(async () => {
    const result = await fetchCustomerSession();
    setSession(mapSessionResult(result));
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(CUSTOMER_CHROME_SESSION_EVENT, onChange);
    return () => window.removeEventListener(CUSTOMER_CHROME_SESSION_EVENT, onChange);
  }, [refresh]);

  const signOut = useCallback(async () => {
    const result = await signOutCustomer();
    const ok = result.ok && result.data.authenticated === false;
    if (ok) {
      setSession("anonymous");
      notifyCustomerChromeSessionChanged();
    }
    return ok;
  }, []);

  return { session, signOut };
}
