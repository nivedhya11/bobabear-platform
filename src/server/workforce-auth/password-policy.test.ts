/**
 * Unit tests for workforce password policy (IMP-010).
 */
import { describe, expect, it } from "vitest";

import {
  validateWorkforcePassword,
  WORKFORCE_PASSWORD_MAX_LENGTH,
  WORKFORCE_PASSWORD_MIN_LENGTH,
} from "./password-policy";

describe("validateWorkforcePassword", () => {
  it("accepts a password at the minimum length", () => {
    expect(validateWorkforcePassword("a".repeat(WORKFORCE_PASSWORD_MIN_LENGTH))).toEqual({
      ok: true,
    });
  });

  it("accepts a password at the maximum length", () => {
    expect(validateWorkforcePassword("a".repeat(WORKFORCE_PASSWORD_MAX_LENGTH))).toEqual({
      ok: true,
    });
  });

  it("rejects a password that is too short", () => {
    expect(validateWorkforcePassword("a".repeat(WORKFORCE_PASSWORD_MIN_LENGTH - 1))).toEqual({
      ok: false,
      reason: "too_short",
    });
  });

  it("rejects a password that is too long", () => {
    expect(validateWorkforcePassword("a".repeat(WORKFORCE_PASSWORD_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("rejects a non-string value", () => {
    expect(validateWorkforcePassword(null)).toEqual({ ok: false, reason: "invalid_type" });
  });

  it("does not impose composition rules", () => {
    expect(validateWorkforcePassword("aaaaaaaaaaaaaaa")).toEqual({ ok: true });
  });
});
