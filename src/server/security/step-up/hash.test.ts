/**
 * Unit tests for step-up session token hashing (IMP-038).
 */
import { describe, expect, it } from "vitest";

import { hashStepUpSessionToken } from "./hash";
import { extractWorkforceSessionTokenFromCookieHeader } from "./session-token";
import { STEP_UP_TTL_SECONDS, isStepUpActionClass } from "./constants";
import { StepUpError, STEP_UP_ERROR_CODES } from "./errors";

const SECRET_A = "workforce-step-up-hash-secret-fixture-32a";
const SECRET_B = "workforce-step-up-hash-secret-fixture-32b";
const TOKEN_A = "session-token-alpha-value";
const TOKEN_B = "session-token-beta-value";
const HEX64 = /^[0-9a-f]{64}$/;

describe("STEP_UP_TTL_SECONDS", () => {
  it("is 10 minutes within the locked 5–15 minute band", () => {
    expect(STEP_UP_TTL_SECONDS).toBe(600);
    expect(STEP_UP_TTL_SECONDS).toBeGreaterThanOrEqual(300);
    expect(STEP_UP_TTL_SECONDS).toBeLessThanOrEqual(900);
  });
});

describe("isStepUpActionClass", () => {
  it("accepts the four locked classes and rejects others", () => {
    expect(isStepUpActionClass("CLASS_ACCESS_MUTATION")).toBe(true);
    expect(isStepUpActionClass("CLASS_CREDENTIAL_SECURITY")).toBe(true);
    expect(isStepUpActionClass("CLASS_PRIVACY_DESTRUCTIVE")).toBe(true);
    expect(isStepUpActionClass("CLASS_FINANCIAL_REVERSAL")).toBe(true);
    expect(isStepUpActionClass("CLASS_OTHER")).toBe(false);
    expect(isStepUpActionClass(null)).toBe(false);
  });
});

describe("hashStepUpSessionToken", () => {
  it("returns a lowercase 64-character hex digest", () => {
    expect(hashStepUpSessionToken(SECRET_A, TOKEN_A)).toMatch(HEX64);
  });

  it("is deterministic", () => {
    expect(hashStepUpSessionToken(SECRET_A, TOKEN_A)).toBe(
      hashStepUpSessionToken(SECRET_A, TOKEN_A),
    );
  });

  it("differs for different tokens and secrets", () => {
    expect(hashStepUpSessionToken(SECRET_A, TOKEN_A)).not.toBe(
      hashStepUpSessionToken(SECRET_A, TOKEN_B),
    );
    expect(hashStepUpSessionToken(SECRET_A, TOKEN_A)).not.toBe(
      hashStepUpSessionToken(SECRET_B, TOKEN_A),
    );
  });

  it("never embeds the raw token", () => {
    expect(hashStepUpSessionToken(SECRET_A, TOKEN_A)).not.toContain(TOKEN_A);
  });
});

describe("extractWorkforceSessionTokenFromCookieHeader", () => {
  it("extracts the workforce session cookie", () => {
    expect(
      extractWorkforceSessionTokenFromCookieHeader(
        "boba-workforce.session_token=abc%2Fdef; Path=/",
      ),
    ).toBe("abc/def");
  });

  it("returns null when missing", () => {
    expect(extractWorkforceSessionTokenFromCookieHeader("other=1")).toBeNull();
    expect(extractWorkforceSessionTokenFromCookieHeader(undefined)).toBeNull();
  });
});

describe("StepUpError", () => {
  it("maps codes to 401/403", () => {
    expect(new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REQUIRED).httpStatus).toBe(401);
    expect(new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_REPLAY).httpStatus).toBe(403);
    expect(new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_EXPIRED).httpStatus).toBe(403);
    expect(new StepUpError(STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH).httpStatus).toBe(403);
  });
});
