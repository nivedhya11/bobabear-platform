import { test } from "node:test";
import assert from "node:assert/strict";

import { base32 } from "@better-auth/utils/base32";

import {
  extractCookieHeader,
  mergeCookieHeader,
  parseTotpSecretFromOtpauthUri,
  rewriteDatabaseUrlForHost,
} from "./workforce-auth-smoke.mjs";

test("parseTotpSecretFromOtpauthUri decodes the Base32 secret to the raw string createOTP expects", () => {
  const rawSecret = "workforce-smoke-secret";
  const encoded = base32.encode(rawSecret, { padding: false });
  assert.equal(
    parseTotpSecretFromOtpauthUri(
      `otpauth://totp/BOBA%20Bear:ops@example.test?secret=${encoded}&issuer=BOBA%20Bear&digits=6&period=30`,
    ),
    rawSecret,
  );
});

test("parseTotpSecretFromOtpauthUri returns null for malformed input", () => {
  assert.equal(parseTotpSecretFromOtpauthUri(""), null);
  assert.equal(parseTotpSecretFromOtpauthUri("https://example.test/?secret=ABC"), null);
  assert.equal(parseTotpSecretFromOtpauthUri("otpauth://totp/x"), null);
  assert.equal(parseTotpSecretFromOtpauthUri("otpauth://totp/x?secret=not-base32!!"), null);
});

test("rewriteDatabaseUrlForHost rewrites the Compose hostname to loopback", () => {
  assert.equal(
    rewriteDatabaseUrlForHost("postgresql://boba_bear_app:pw@postgres:5432/boba_bear_local", "5433"),
    "postgresql://boba_bear_app:pw@127.0.0.1:5433/boba_bear_local",
  );
});

test("extractCookieHeader joins multiple Set-Cookie values into one Cookie header", () => {
  const cookieHeader = extractCookieHeader({
    headers: { "set-cookie": ["a=1; Path=/; HttpOnly", "b=2; Path=/; HttpOnly"] },
  });
  assert.equal(cookieHeader, "a=1; b=2");
});

test("extractCookieHeader returns null when there is no Set-Cookie header", () => {
  assert.equal(extractCookieHeader({ headers: {} }), null);
});

test("mergeCookieHeader replaces cookies by name and preserves others", () => {
  const merged = mergeCookieHeader("a=1; b=2", {
    headers: { "set-cookie": ["b=9; Path=/", "c=3; Path=/"] },
  });
  assert.equal(merged, "a=1; b=9; c=3");
});
