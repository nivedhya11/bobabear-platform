/**
 * Post-login welcome flow helpers (IMP-036B).
 */
import { parseSafeReturnPath, withTrailingSlash } from "@/lib/customer-auth/return-to";

const COMMERCE_SKIP_PREFIXES = ["/order/checkout/", "/order/cart/", "/order/payment/"] as const;

export function shouldOfferWelcome(returnTo: string | null): boolean {
  const safe = parseSafeReturnPath(returnTo);
  if (!safe) return true;
  try {
    const url = new URL(safe, "https://boba.local");
    const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return !COMMERCE_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
  } catch {
    return true;
  }
}

export function welcomeUrlWithReturn(returnTo: string | null): string {
  const safe = parseSafeReturnPath(returnTo);
  if (!safe) return "/account/welcome/";
  return `/account/welcome/?returnTo=${encodeURIComponent(withTrailingSlash(safe))}`;
}
