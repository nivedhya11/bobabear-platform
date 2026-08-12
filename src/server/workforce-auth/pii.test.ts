/**
 * Unit tests for workforce PII hashing and service-host configuration
 * (IMP-010). Docker-independent; no network, no database.
 */
import { describe, expect, it } from "vitest";

import type { NormalizedWorkforceEmail } from "../../shared/workforce-auth/email";
import { WorkforceAuthConfigurationError } from "./errors";
import {
  assertSecretAbsentFromText,
  hashWorkforceEmailKey,
  hashWorkforceIpKey,
  loadWorkforceAuthServiceHostConfig,
  loadWorkforcePiiHashSecret,
  type WorkforcePiiHashSecret,
} from "./pii";

const EMAIL_A = "ops@example.test" as NormalizedWorkforceEmail;
const SECRET_A = "workforce-pii-hash-secret-fixture-32-chars-min-a" as WorkforcePiiHashSecret;
const SECRET_B = "workforce-pii-hash-secret-fixture-32-chars-min-b" as WorkforcePiiHashSecret;

describe("hashWorkforceEmailKey / hashWorkforceIpKey", () => {
  it("returns lowercase 64-character hex digests", () => {
    expect(hashWorkforceEmailKey(SECRET_A, EMAIL_A)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashWorkforceIpKey(SECRET_A, "203.0.113.10")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never embeds the raw email or IP", () => {
    expect(hashWorkforceEmailKey(SECRET_A, EMAIL_A)).not.toContain("ops");
    expect(hashWorkforceIpKey(SECRET_A, "203.0.113.10")).not.toContain("203.0.113.10");
  });

  it("uses distinct domain prefixes for email vs IP", () => {
    expect(hashWorkforceEmailKey(SECRET_A, EMAIL_A)).not.toBe(
      hashWorkforceIpKey(SECRET_A, EMAIL_A),
    );
  });

  it("differs across secrets", () => {
    expect(hashWorkforceEmailKey(SECRET_A, EMAIL_A)).not.toBe(
      hashWorkforceEmailKey(SECRET_B, EMAIL_A),
    );
  });
});

describe("loadWorkforcePiiHashSecret", () => {
  const VALID = "a-sufficiently-long-workforce-pii-hash-secret-value";

  it("accepts a sufficiently long, non-placeholder secret", () => {
    expect(loadWorkforcePiiHashSecret({ WORKFORCE_AUTH_PII_HASH_SECRET: VALID })).toBe(VALID);
  });

  it("rejects a missing value", () => {
    expect(() => loadWorkforcePiiHashSecret({})).toThrow(WorkforceAuthConfigurationError);
  });

  it("rejects a value shorter than the minimum length", () => {
    expect(() =>
      loadWorkforcePiiHashSecret({ WORKFORCE_AUTH_PII_HASH_SECRET: "too-short" }),
    ).toThrow(WorkforceAuthConfigurationError);
  });

  it("rejects a value equal to WORKFORCE_AUTH_SECRET", () => {
    expect(() =>
      loadWorkforcePiiHashSecret(
        { WORKFORCE_AUTH_PII_HASH_SECRET: VALID },
        { workforceAuthSecret: VALID },
      ),
    ).toThrow(WorkforceAuthConfigurationError);
  });

  it("rejects a value equal to CUSTOMER_AUTH_SECRET", () => {
    expect(() =>
      loadWorkforcePiiHashSecret(
        { WORKFORCE_AUTH_PII_HASH_SECRET: VALID },
        { customerAuthSecret: VALID },
      ),
    ).toThrow(WorkforceAuthConfigurationError);
  });

  it("rejects a value equal to CUSTOMER_AUTH_PII_HASH_SECRET", () => {
    expect(() =>
      loadWorkforcePiiHashSecret(
        { WORKFORCE_AUTH_PII_HASH_SECRET: VALID },
        { customerPiiHashSecret: VALID },
      ),
    ).toThrow(WorkforceAuthConfigurationError);
  });

  it("never includes the raw secret value in the thrown error's message", () => {
    try {
      loadWorkforcePiiHashSecret({ WORKFORCE_AUTH_PII_HASH_SECRET: "too-short" });
      expect.unreachable("expected loadWorkforcePiiHashSecret to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkforceAuthConfigurationError);
      expect((error as WorkforceAuthConfigurationError).message).not.toContain("too-short");
    }
  });
});

describe("assertSecretAbsentFromText", () => {
  it("does not throw when the secret is absent", () => {
    expect(() => assertSecretAbsentFromText("hello world", "my-secret-value", "secret")).not.toThrow();
  });

  it("throws when the secret is present verbatim", () => {
    expect(() =>
      assertSecretAbsentFromText("leaked: my-secret-value here", "my-secret-value", "secret"),
    ).toThrow(/secret must never appear/i);
  });
});

describe("loadWorkforceAuthServiceHostConfig", () => {
  const validSource = {
    WORKFORCE_AUTH_PII_HASH_SECRET: "a-sufficiently-long-workforce-pii-hash-secret-value",
    WORKFORCE_AUTH_TRUST_PROXY_HOPS: "1",
    WORKFORCE_AUTH_SERVICE_HOST: "0.0.0.0",
    WORKFORCE_AUTH_SERVICE_PORT: "8082",
  };

  it("loads a fully-specified configuration", () => {
    const config = loadWorkforceAuthServiceHostConfig(
      validSource,
      "local",
      "http://localhost:8080",
    );
    expect(config.servicePort).toBe(8082);
    expect(config.trustProxyHops).toBe(1);
    expect(config.trustedOrigin).toBe("http://localhost:8080");
  });

  it("defaults port to 8082 and hops to 0 when omitted", () => {
    const config = loadWorkforceAuthServiceHostConfig(
      { WORKFORCE_AUTH_PII_HASH_SECRET: "a-sufficiently-long-workforce-pii-hash-secret-value" },
      "local",
      "http://localhost:8080",
    );
    expect(config.servicePort).toBe(8082);
    expect(config.trustProxyHops).toBe(0);
  });

  it("rejects WORKFORCE_AUTH_TOTP_TEST_SECRET in staging", () => {
    expect(() =>
      loadWorkforceAuthServiceHostConfig(
        { ...validSource, WORKFORCE_AUTH_TOTP_TEST_SECRET: "not-for-prod" },
        "staging",
        "https://example.test",
      ),
    ).toThrow(WorkforceAuthConfigurationError);
  });

  it("rejects an out-of-range trust-proxy hops value", () => {
    expect(() =>
      loadWorkforceAuthServiceHostConfig(
        { ...validSource, WORKFORCE_AUTH_TRUST_PROXY_HOPS: "3" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(WorkforceAuthConfigurationError);
  });
});
