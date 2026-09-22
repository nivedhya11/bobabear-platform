/**
 * Extract the workforce session token from Cookie / Headers (IMP-038).
 *
 * Never logs the token value.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

import { WORKFORCE_AUTH_SESSION_COOKIE_NAME } from "../../auth/workforce/trusted-identity";

/** Better Auth prefixes secure cookies with `__Secure-` when useSecureCookies is true. */
const SECURE_SESSION_COOKIE_NAME = `__Secure-${WORKFORCE_AUTH_SESSION_COOKIE_NAME}` as const;

function firstHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function isWorkforceSessionCookieName(name: string): boolean {
  return name === WORKFORCE_AUTH_SESSION_COOKIE_NAME || name === SECURE_SESSION_COOKIE_NAME;
}

/**
 * Parse `boba-workforce.session_token` (or `__Secure-` production variant)
 * from a Cookie header string.
 */
export function extractWorkforceSessionTokenFromCookieHeader(
  cookieHeader: string | undefined | null,
): string | null {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (!isWorkforceSessionCookieName(name)) continue;
    const raw = trimmed.slice(eq + 1).trim();
    if (raw.length === 0) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function extractWorkforceSessionTokenFromIncomingHeaders(
  headers: IncomingHttpHeaders | Headers,
): string | null {
  if (headers instanceof Headers) {
    return extractWorkforceSessionTokenFromCookieHeader(headers.get("cookie"));
  }
  return extractWorkforceSessionTokenFromCookieHeader(firstHeaderValue(headers.cookie));
}
