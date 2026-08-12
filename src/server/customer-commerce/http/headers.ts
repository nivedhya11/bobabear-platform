/**
 * Allowlisted header bridging for customer-commerce session trust (IMP-024).
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

const ALLOWED_REQUEST_HEADERS = [
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "x-forwarded-for",
  "x-forwarded-proto",
  "host",
] as const;

function joinSeparator(headerName: string): string {
  return headerName === "cookie" ? "; " : ", ";
}

/**
 * Build WHATWG Headers for `resolveTrustedCustomerAuthIdentity`.
 * Never forwards unbounded or identity-spoofing headers.
 */
export function buildCustomerAuthRequestHeaders(incoming: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const name of ALLOWED_REQUEST_HEADERS) {
    const value = incoming[name];
    if (typeof value === "string" && value.length > 0) {
      headers.set(name, value);
    } else if (Array.isArray(value) && value.length > 0) {
      headers.set(name, value.join(joinSeparator(name)));
    }
  }
  return headers;
}
