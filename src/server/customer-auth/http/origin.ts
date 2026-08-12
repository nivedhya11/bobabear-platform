/**
 * Origin / fetch-metadata enforcement for state-changing customer-auth
 * requests (IMP-009).
 *
 * Every state-changing endpoint (`send-otp`, `verify-otp`, `sign-out`)
 * requires an exact, trusted `Origin` header — no `null`, no wildcard, no
 * credential-bearing URL, and (when the browser sends it) no
 * `Sec-Fetch-Site: cross-site`.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

export type OriginCheckFailureReason =
  | "origin_missing"
  | "origin_malformed"
  | "origin_untrusted"
  | "cross_site_rejected";

export type OriginCheckResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: OriginCheckFailureReason }>;

function firstHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Require `headers.origin` to be present, syntactically a bare http(s)
 * origin with no credentials, path, query, or fragment, and identical to
 * `trustedOrigin`. Also rejects `Sec-Fetch-Site: cross-site` when the
 * client sent that fetch-metadata header, as defense in depth alongside
 * the Origin check.
 */
export function checkTrustedOrigin(
  headers: IncomingHttpHeaders,
  trustedOrigin: string,
): OriginCheckResult {
  const rawOrigin = firstHeaderValue(headers.origin);
  if (!rawOrigin || rawOrigin.length === 0) {
    return { ok: false, reason: "origin_missing" };
  }
  if (rawOrigin === "null") {
    return { ok: false, reason: "origin_untrusted" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    return { ok: false, reason: "origin_malformed" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "origin_malformed" };
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return { ok: false, reason: "origin_malformed" };
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return { ok: false, reason: "origin_malformed" };
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    return { ok: false, reason: "origin_malformed" };
  }

  const normalizedOrigin = `${parsed.protocol}//${parsed.host}`;
  if (normalizedOrigin !== trustedOrigin) {
    return { ok: false, reason: "origin_untrusted" };
  }

  const fetchSite = firstHeaderValue(headers["sec-fetch-site"]);
  if (fetchSite === "cross-site") {
    return { ok: false, reason: "cross_site_rejected" };
  }

  return { ok: true };
}
