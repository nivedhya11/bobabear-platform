/**
 * Unit tests for workforce email normalization (IMP-010).
 * Docker-independent; no network, no database.
 */
import { describe, expect, it } from "vitest";

import { isValidWorkforceEmail, normalizeWorkforceEmail } from "./email";

describe("normalizeWorkforceEmail — accepted forms", () => {
  it.each([
    ["already lowercase", "ops@example.test", "ops@example.test"],
    ["uppercase local", "Ops@example.test", "ops@example.test"],
    ["mixed case domain", "ops@Example.TEST", "ops@example.test"],
    ["surrounding whitespace", "  ops@example.test  ", "ops@example.test"],
    ["plus addressing", "ops+kitchen@example.test", "ops+kitchen@example.test"],
  ])("accepts %s", (_label, input, expected) => {
    const result = normalizeWorkforceEmail(input);
    expect(result).toEqual({ ok: true, email: expected });
  });
});

describe("normalizeWorkforceEmail — rejected forms", () => {
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["missing @", "opsexample.test"],
    ["missing domain", "ops@"],
    ["missing local", "@example.test"],
    ["missing TLD dot", "ops@example"],
    ["spaces inside", "ops @example.test"],
    ["double dots", "ops@example..test"],
    ["non-string", 42],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, input) => {
    expect(normalizeWorkforceEmail(input)).toEqual({
      ok: false,
      reason: "invalid_email",
    });
  });
});

describe("isValidWorkforceEmail", () => {
  it("returns true for a valid email", () => {
    expect(isValidWorkforceEmail("ops@example.test")).toBe(true);
  });

  it("returns false for an invalid email", () => {
    expect(isValidWorkforceEmail("not-an-email")).toBe(false);
  });
});
