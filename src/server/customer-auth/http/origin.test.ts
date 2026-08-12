/**
 * Unit tests for trusted-origin / fetch-metadata enforcement (IMP-009).
 * Docker-independent; no network, no database.
 */
import type { IncomingHttpHeaders } from "node:http";

import { describe, expect, it } from "vitest";

import { checkTrustedOrigin } from "./origin";

const TRUSTED = "https://example.test";

// @types/node types `origin` as `string | undefined` even though Node's
// own runtime can (rarely) deliver a repeated header as a string array —
// this cast lets the test below exercise that real, defensively-handled
// runtime shape.
function headersWithArray(value: Record<string, string | readonly string[] | undefined>): IncomingHttpHeaders {
  return value as IncomingHttpHeaders;
}

describe("checkTrustedOrigin", () => {
  it("accepts an exact match to the trusted origin", () => {
    expect(checkTrustedOrigin({ origin: TRUSTED }, TRUSTED)).toEqual({ ok: true });
  });

  it("accepts a trusted origin even when a benign Sec-Fetch-Site value is present", () => {
    expect(
      checkTrustedOrigin({ origin: TRUSTED, "sec-fetch-site": "same-origin" }, TRUSTED),
    ).toEqual({ ok: true });
  });

  it("rejects a missing Origin header", () => {
    expect(checkTrustedOrigin({}, TRUSTED)).toEqual({ ok: false, reason: "origin_missing" });
  });

  it("rejects an empty Origin header", () => {
    expect(checkTrustedOrigin({ origin: "" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_missing",
    });
  });

  it('rejects the literal string "null"', () => {
    expect(checkTrustedOrigin({ origin: "null" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_untrusted",
    });
  });

  it("rejects a malformed URL", () => {
    expect(checkTrustedOrigin({ origin: "not a url" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects a non-http(s) scheme", () => {
    expect(checkTrustedOrigin({ origin: "ftp://example.test" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects an origin carrying credentials", () => {
    expect(checkTrustedOrigin({ origin: "https://user:pass@example.test" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects an origin with a path", () => {
    expect(checkTrustedOrigin({ origin: "https://example.test/path" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects an origin with a query string", () => {
    expect(checkTrustedOrigin({ origin: "https://example.test/?a=b" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects an origin with a fragment", () => {
    expect(checkTrustedOrigin({ origin: "https://example.test/#frag" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });

  it("rejects a different (untrusted) origin", () => {
    expect(checkTrustedOrigin({ origin: "https://evil.example" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_untrusted",
    });
  });

  it("rejects a scheme mismatch against the trusted origin", () => {
    expect(checkTrustedOrigin({ origin: "http://example.test" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_untrusted",
    });
  });

  it("rejects a port mismatch against the trusted origin", () => {
    expect(checkTrustedOrigin({ origin: "https://example.test:8443" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_untrusted",
    });
  });

  it("rejects Sec-Fetch-Site: cross-site even when Origin is otherwise trusted", () => {
    expect(
      checkTrustedOrigin({ origin: TRUSTED, "sec-fetch-site": "cross-site" }, TRUSTED),
    ).toEqual({ ok: false, reason: "cross_site_rejected" });
  });

  it("handles an Origin header delivered as an array by taking the first value", () => {
    expect(
      checkTrustedOrigin(headersWithArray({ origin: [TRUSTED, "https://evil.example"] }), TRUSTED),
    ).toEqual({
      ok: true,
    });
  });

  it("rejects a wildcard origin value", () => {
    expect(checkTrustedOrigin({ origin: "*" }, TRUSTED)).toEqual({
      ok: false,
      reason: "origin_malformed",
    });
  });
});
