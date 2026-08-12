/**
 * Canonical client-IP derivation for the customer-auth HTTP service
 * (IMP-009).
 *
 * Trusts at most `CUSTOMER_AUTH_TRUST_PROXY_HOPS` (0-2) `X-Forwarded-For`
 * entries in front of the TCP socket's own remote address. Never logs an IP
 * address — callers must only ever pass the result through HMAC hashing
 * (`../rate-limit/hashing.ts`).
 */
import "server-only";

import { isIP } from "node:net";
import type { IncomingHttpHeaders } from "node:http";

export type ClientIpResult =
  | Readonly<{ ok: true; canonicalIp: string }>
  | Readonly<{ ok: false }>;

const IPV4_MAPPED_IPV6_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;

function stripZoneAndBrackets(raw: string): string {
  let value = raw.trim();
  if (value.startsWith("[")) {
    const closingIndex = value.indexOf("]");
    if (closingIndex !== -1) {
      value = value.slice(1, closingIndex);
    }
  }
  const zoneIndex = value.indexOf("%");
  if (zoneIndex !== -1) {
    value = value.slice(0, zoneIndex);
  }
  return value;
}

/**
 * Normalize one candidate address string to a canonical IPv4 or IPv6 form.
 * Returns `null` for anything that is not a syntactically valid IP address —
 * callers must fall back rather than trust an unparseable value.
 */
export function canonicalizeIpAddress(raw: string): string | null {
  const candidate = stripZoneAndBrackets(raw);
  if (candidate.length === 0) return null;

  const version = isIP(candidate);
  if (version === 4) {
    return candidate;
  }
  if (version === 6) {
    const mapped = IPV4_MAPPED_IPV6_PATTERN.exec(candidate);
    if (mapped) {
      const v4 = mapped[1];
      return isIP(v4) === 4 ? v4 : candidate.toLowerCase();
    }
    return candidate.toLowerCase();
  }
  return null;
}

function parseForwardedForChain(headerValue: string): readonly string[] {
  return headerValue
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function firstHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Derive the canonical client IP for one request. With `trustProxyHops`
 * hops of `X-Forwarded-For` trusted, the client address is the entry
 * `trustProxyHops` positions from the right of the forwarded-for chain;
 * with zero trusted hops the header is ignored entirely and only the
 * socket's own remote address is used.
 */
export function deriveClientIp(
  headers: IncomingHttpHeaders,
  socketRemoteAddress: string | undefined,
  trustProxyHops: number,
): ClientIpResult {
  const directAddress = socketRemoteAddress
    ? canonicalizeIpAddress(socketRemoteAddress)
    : null;

  if (trustProxyHops <= 0) {
    return directAddress ? { ok: true, canonicalIp: directAddress } : { ok: false };
  }

  const forwardedForRaw = firstHeaderValue(headers["x-forwarded-for"]);
  if (!forwardedForRaw) {
    return directAddress ? { ok: true, canonicalIp: directAddress } : { ok: false };
  }

  const chain = parseForwardedForChain(forwardedForRaw);
  if (chain.length === 0) {
    return directAddress ? { ok: true, canonicalIp: directAddress } : { ok: false };
  }

  const clientIndex = Math.max(0, chain.length - trustProxyHops);
  const candidate = chain[Math.min(clientIndex, chain.length - 1)];
  const canonical = canonicalizeIpAddress(candidate);
  if (canonical) {
    return { ok: true, canonicalIp: canonical };
  }
  return directAddress ? { ok: true, canonicalIp: directAddress } : { ok: false };
}
