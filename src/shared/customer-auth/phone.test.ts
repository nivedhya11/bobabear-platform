/**
 * Unit tests for India-only mobile-number normalization (IMP-009).
 *
 * All test numbers are synthetic and verified against libphonenumber-js to
 * be structurally valid Indian MOBILE numbers — never a real subscriber
 * number. Docker-independent; no network, no database.
 */
import { describe, expect, it } from "vitest";

import {
  isValidIndianMobileNumber,
  normalizeIndianMobileNumber,
} from "./phone";

const CANONICAL = "+919876543210";

describe("normalizeIndianMobileNumber — accepted forms", () => {
  it.each([
    ["canonical E.164", "+919876543210"],
    ["10-digit national", "9876543210"],
    ["leading 0 (trunk prefix)", "09876543210"],
    ["91 prefix without +", "919876543210"],
    ["+91 with spaces", "+91 98765 43210"],
    ["hyphenated with leading 0", "098765-43210"],
    ["parenthesized STD-style grouping", "(98765) 43210"],
    ["spaced national number", "98765 43210"],
    ["surrounding whitespace", "  9876543210  "],
  ])("accepts %s (%s)", (_label, input) => {
    const result = normalizeIndianMobileNumber(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.phoneNumber).toBe(CANONICAL);
    }
  });

  it("accepts a different valid mobile number distinctly", () => {
    const result = normalizeIndianMobileNumber("9000000001");
    expect(result).toEqual({ ok: true, phoneNumber: "+919000000001" });
  });
});

describe("normalizeIndianMobileNumber — rejected forms", () => {
  it("rejects a non-Indian (US) number", () => {
    const result = normalizeIndianMobileNumber("+14155552671");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a structurally invalid short number", () => {
    const result = normalizeIndianMobileNumber("123");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a too-long digit sequence", () => {
    const result = normalizeIndianMobileNumber("98765432100");
    expect(result.ok).toBe(false);
  });

  it("rejects an Indian landline-only number", () => {
    // Delhi STD landline shape — not a mobile number.
    const result = normalizeIndianMobileNumber("01123456789");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a number with an extension", () => {
    const result = normalizeIndianMobileNumber("9876543210 ext 123");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a value containing alphabetic characters", () => {
    const result = normalizeIndianMobileNumber("987654321A");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a value that is entirely non-numeric", () => {
    const result = normalizeIndianMobileNumber("not-a-phone-number");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects an empty string", () => {
    expect(normalizeIndianMobileNumber("")).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
  });

  it("rejects whitespace-only input", () => {
    expect(normalizeIndianMobileNumber("   ")).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
  });

  it("rejects non-string input", () => {
    expect(normalizeIndianMobileNumber(9876543210)).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
    expect(normalizeIndianMobileNumber(null)).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
    expect(normalizeIndianMobileNumber(undefined)).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
    expect(normalizeIndianMobileNumber({})).toEqual({
      ok: false,
      reason: "invalid_phone_number",
    });
  });

  it("rejects input longer than the maximum accepted length", () => {
    const result = normalizeIndianMobileNumber("+91" + "9".repeat(40));
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects control characters embedded in the input", () => {
    const result = normalizeIndianMobileNumber("9876543210\u0000");
    expect(result).toEqual({ ok: false, reason: "invalid_phone_number" });
  });

  it("rejects a second number appended after a separator", () => {
    const result = normalizeIndianMobileNumber("9876543210,9000000001");
    expect(result.ok).toBe(false);
  });
});

describe("normalizeIndianMobileNumber — stability and purity", () => {
  it("produces the same canonical result for every equivalent input form", () => {
    const forms = ["+919876543210", "919876543210", "09876543210", "9876543210"];
    const results = forms.map((form) => normalizeIndianMobileNumber(form));
    for (const result of results) {
      expect(result).toEqual({ ok: true, phoneNumber: CANONICAL });
    }
  });

  it("re-normalizing an already-canonical number is idempotent", () => {
    const first = normalizeIndianMobileNumber("9876543210");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = normalizeIndianMobileNumber(first.phoneNumber);
    expect(second).toEqual(first);
  });

  it("does not mutate the input string", () => {
    const input = "  9876543210  ";
    const snapshot = String(input);
    normalizeIndianMobileNumber(input);
    expect(input).toBe(snapshot);
  });

  it("does not mutate a frozen input object passed as a non-string", () => {
    const input = Object.freeze({ phoneNumber: "9876543210" });
    expect(() => normalizeIndianMobileNumber(input)).not.toThrow();
    expect(Object.isFrozen(input)).toBe(true);
  });
});

describe("isValidIndianMobileNumber", () => {
  it("returns true for a valid Indian mobile number", () => {
    expect(isValidIndianMobileNumber("9876543210")).toBe(true);
  });

  it("returns false for an invalid number", () => {
    expect(isValidIndianMobileNumber("not-a-phone-number")).toBe(false);
  });

  it("returns false for a non-Indian number", () => {
    expect(isValidIndianMobileNumber("+14155552671")).toBe(false);
  });
});
