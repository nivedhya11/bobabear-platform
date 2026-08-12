import { describe, expect, it } from "vitest";

import { IdempotencyValidationError } from "./errors";
import { hashIdempotencyKey, hashRequestFingerprint } from "./hashing";

const HEX64_PATTERN = /^[0-9a-f]{64}$/;

describe("hashIdempotencyKey", () => {
  it("returns a lowercase 64-character hex digest", () => {
    const digest = hashIdempotencyKey("order:12345");
    expect(digest).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same input", () => {
    expect(hashIdempotencyKey("same-key")).toBe(hashIdempotencyKey("same-key"));
  });

  it("produces different digests for different input", () => {
    expect(hashIdempotencyKey("key-a")).not.toBe(hashIdempotencyKey("key-b"));
  });

  it("never returns the raw input", () => {
    const digest = hashIdempotencyKey("a-very-recognizable-raw-key");
    expect(digest).not.toContain("a-very-recognizable-raw-key");
  });

  it("rejects an empty string", () => {
    expect(() => hashIdempotencyKey("")).toThrow(IdempotencyValidationError);
  });
});

describe("hashRequestFingerprint", () => {
  it("returns a lowercase 64-character hex digest", () => {
    const digest = hashRequestFingerprint('{"a":1}');
    expect(digest).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same canonical material", () => {
    expect(hashRequestFingerprint('{"a":1}')).toBe(hashRequestFingerprint('{"a":1}'));
  });

  it("produces different digests for different canonical material", () => {
    expect(hashRequestFingerprint('{"a":1}')).not.toBe(hashRequestFingerprint('{"a":2}'));
  });

  it("rejects an empty string", () => {
    expect(() => hashRequestFingerprint("")).toThrow(IdempotencyValidationError);
  });
});
