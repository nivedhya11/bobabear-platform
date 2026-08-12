/**
 * Unit tests for canonical client-IP derivation (IMP-009). Docker-
 * independent; no network, no database. Never asserts a real-looking public
 * IP address literal beyond well-known documentation/test ranges
 * (RFC 5737 / RFC 3849).
 */
import { describe, expect, it } from "vitest";

import { canonicalizeIpAddress, deriveClientIp } from "./client-ip";

describe("canonicalizeIpAddress", () => {
  it("returns a valid IPv4 address unchanged", () => {
    expect(canonicalizeIpAddress("203.0.113.10")).toBe("203.0.113.10");
  });

  it("lowercases a valid IPv6 address", () => {
    expect(canonicalizeIpAddress("2001:DB8::1")).toBe("2001:db8::1");
  });

  it("strips brackets from a bracketed IPv6 address", () => {
    expect(canonicalizeIpAddress("[2001:db8::1]")).toBe("2001:db8::1");
  });

  it("strips a zone index from an IPv6 address", () => {
    expect(canonicalizeIpAddress("fe80::1%eth0")).toBe("fe80::1");
  });

  it("maps an IPv4-mapped IPv6 address to its IPv4 form", () => {
    expect(canonicalizeIpAddress("::ffff:203.0.113.10")).toBe("203.0.113.10");
  });

  it("trims surrounding whitespace", () => {
    expect(canonicalizeIpAddress("  203.0.113.10  ")).toBe("203.0.113.10");
  });

  it("returns null for an empty string", () => {
    expect(canonicalizeIpAddress("")).toBeNull();
  });

  it("returns null for a syntactically invalid address", () => {
    expect(canonicalizeIpAddress("not-an-ip")).toBeNull();
    expect(canonicalizeIpAddress("999.999.999.999")).toBeNull();
  });
});

describe("deriveClientIp — trustProxyHops <= 0", () => {
  it("uses only the socket's remote address, ignoring X-Forwarded-For", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": "198.51.100.5" },
      "203.0.113.10",
      0,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("reports failure when there is no usable socket remote address", () => {
    const result = deriveClientIp({}, undefined, 0);
    expect(result).toEqual({ ok: false });
  });

  it("reports failure when the socket remote address is malformed", () => {
    const result = deriveClientIp({}, "not-an-ip", 0);
    expect(result).toEqual({ ok: false });
  });
});

describe("deriveClientIp — trustProxyHops = 1", () => {
  it("takes the last (rightmost trusted hop) entry of X-Forwarded-For", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": "198.51.100.5, 203.0.113.10" },
      "192.0.2.1",
      1,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("falls back to the socket address when X-Forwarded-For is absent", () => {
    const result = deriveClientIp({}, "203.0.113.10", 1);
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("falls back to the socket address when X-Forwarded-For is empty", () => {
    const result = deriveClientIp({ "x-forwarded-for": "" }, "203.0.113.10", 1);
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("falls back to the socket address when the selected entry is malformed", () => {
    const result = deriveClientIp({ "x-forwarded-for": "not-an-ip" }, "203.0.113.10", 1);
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("trims whitespace around comma-separated entries", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": " 198.51.100.5 ,  203.0.113.10  " },
      "192.0.2.1",
      1,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });

  it("reports failure when neither X-Forwarded-For nor the socket address is usable", () => {
    const result = deriveClientIp({}, undefined, 1);
    expect(result).toEqual({ ok: false });
  });
});

describe("deriveClientIp — trustProxyHops = 2", () => {
  it("takes the entry two positions from the right", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": "198.51.100.1, 198.51.100.2, 203.0.113.10" },
      "192.0.2.1",
      2,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "198.51.100.2" });
  });

  it("clamps to the leftmost entry when the chain is shorter than the trusted hop count", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": "203.0.113.10" },
      "192.0.2.1",
      2,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });
});

describe("deriveClientIp — X-Forwarded-For delivered as an array", () => {
  it("uses only the first header value (Node folds repeated headers into an array)", () => {
    const result = deriveClientIp(
      { "x-forwarded-for": ["198.51.100.5, 203.0.113.10", "192.0.2.99"] },
      "192.0.2.1",
      1,
    );
    expect(result).toEqual({ ok: true, canonicalIp: "203.0.113.10" });
  });
});

describe("deriveClientIp — never leaks a spoofed forwarded value beyond trust boundary", () => {
  it("a spoofed extra hop beyond trustProxyHops does not become the resolved client IP", () => {
    // Attacker prepends a fake entry; only the trusted rightmost hop counts.
    const result = deriveClientIp(
      { "x-forwarded-for": "1.2.3.4, 203.0.113.10" },
      "192.0.2.1",
      1,
    );
    expect(result.ok).toBe(true);
    expect(result).not.toEqual({ ok: true, canonicalIp: "1.2.3.4" });
  });
});
