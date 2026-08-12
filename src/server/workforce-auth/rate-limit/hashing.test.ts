/**
 * Unit tests for HMAC key hashing used by durable workforce-auth rate limits
 * (IMP-010). Docker-independent; no network, no database.
 */
import { describe, expect, it } from "vitest";

import type { NormalizedWorkforceEmail } from "../../../shared/workforce-auth/email";
import type { WorkforcePiiHashSecret } from "../pii";
import { hashWorkforceAuthEmailKey, hashWorkforceAuthIpKey } from "./hashing";

const EMAIL_A = "ops@example.test" as NormalizedWorkforceEmail;
const EMAIL_B = "kitchen@example.test" as NormalizedWorkforceEmail;
const SECRET_A = "workforce-auth-rate-limit-hash-secret-fixture-32a" as WorkforcePiiHashSecret;
const SECRET_B = "workforce-auth-rate-limit-hash-secret-fixture-32b" as WorkforcePiiHashSecret;
const IP_A = "203.0.113.10";
const IP_B = "203.0.113.20";

const HEX64_PATTERN = /^[0-9a-f]{64}$/;

describe("hashWorkforceAuthEmailKey", () => {
  it("returns a lowercase 64-character hex digest", () => {
    expect(hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A)).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same secret and email", () => {
    expect(hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A)).toBe(
      hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A),
    );
  });

  it("differs for different emails under the same secret", () => {
    expect(hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A)).not.toBe(
      hashWorkforceAuthEmailKey(SECRET_A, EMAIL_B),
    );
  });

  it("differs for the same email under different secrets", () => {
    expect(hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A)).not.toBe(
      hashWorkforceAuthEmailKey(SECRET_B, EMAIL_A),
    );
  });

  it("never contains the raw email", () => {
    const hash = hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A);
    expect(hash).not.toContain("ops");
    expect(hash).not.toContain("example");
  });

  it("differs from the IP-key hash for the same secret and equivalent-looking input", () => {
    expect(hashWorkforceAuthEmailKey(SECRET_A, EMAIL_A)).not.toBe(
      hashWorkforceAuthIpKey(SECRET_A, EMAIL_A),
    );
  });
});

describe("hashWorkforceAuthIpKey", () => {
  it("returns a lowercase 64-character hex digest", () => {
    expect(hashWorkforceAuthIpKey(SECRET_A, IP_A)).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same secret and IP address", () => {
    expect(hashWorkforceAuthIpKey(SECRET_A, IP_A)).toBe(hashWorkforceAuthIpKey(SECRET_A, IP_A));
  });

  it("differs for different IP addresses under the same secret", () => {
    expect(hashWorkforceAuthIpKey(SECRET_A, IP_A)).not.toBe(
      hashWorkforceAuthIpKey(SECRET_A, IP_B),
    );
  });

  it("never contains the raw IP address", () => {
    expect(hashWorkforceAuthIpKey(SECRET_A, IP_A)).not.toContain(IP_A);
  });
});
