/**
 * Guest Cart credential header extraction (IMP-024).
 *
 * Guest token is Cart authority only — never CustomerActor authority.
 * Values must never be logged.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

export const GUEST_CART_TOKEN_HEADER = "x-boba-guest-cart-token";

export function extractGuestCartToken(headers: IncomingHttpHeaders): string | undefined {
  const raw = headers[GUEST_CART_TOKEN_HEADER];
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === undefined || value.length === 0) return undefined;
  return value;
}
