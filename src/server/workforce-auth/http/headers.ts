/**
 * Allowlisted header bridging between Node's `http` request/response and
 * the WHATWG `Headers` Better Auth expects (IMP-010).
 *
 * Only forwards headers Better Auth's session/CSRF logic actually needs.
 * Never forwards an unbounded header set, and never merges multiple
 * `Set-Cookie` values into one string — cookies are always forwarded
 * individually via `Headers.getSetCookie()`.
 */
import "server-only";

import type { IncomingHttpHeaders, ServerResponse } from "node:http";

/** Exhaustive allowlist. Any header not in this list is never forwarded to
 * Better Auth. */
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
 * Build a fresh WHATWG `Headers` object containing only the allowlisted
 * request headers present on `incoming`. Repeated headers (delivered as an
 * array by Node) are joined with the separator appropriate to that header.
 */
export function buildBetterAuthRequestHeaders(incoming: IncomingHttpHeaders): Headers {
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

/**
 * Forward every `Set-Cookie` value from a Better Auth response `Headers`
 * object onto a Node `ServerResponse`, one `Set-Cookie` header per cookie —
 * never concatenated into a single header value.
 */
export function forwardSetCookies(source: Headers, target: ServerResponse): void {
  for (const cookie of source.getSetCookie()) {
    target.appendHeader("Set-Cookie", cookie);
  }
}
