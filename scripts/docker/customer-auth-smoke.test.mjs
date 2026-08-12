import { test } from "node:test";
import assert from "node:assert/strict";

import { extractCookieHeader, resolveFixedOtpCode } from "./customer-auth-smoke.mjs";

test("resolveFixedOtpCode returns the code when the local provider is configured", () => {
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456" }),
    "123456",
  );
});

test("resolveFixedOtpCode returns null for a non-local provider", () => {
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "twilio", CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456" }),
    null,
  );
});

test("resolveFixedOtpCode returns null when the code is missing or malformed", () => {
  assert.equal(resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local" }), null);
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "12" }),
    null,
  );
  assert.equal(
    resolveFixedOtpCode({ CUSTOMER_OTP_PROVIDER: "local", CUSTOMER_OTP_LOCAL_FIXED_CODE: "abcdef" }),
    null,
  );
});

test("resolveFixedOtpCode returns null for an empty/undefined value map", () => {
  assert.equal(resolveFixedOtpCode(undefined), null);
  assert.equal(resolveFixedOtpCode({}), null);
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
