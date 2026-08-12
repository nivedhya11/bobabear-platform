/**
 * Unit tests for HMAC-derived temporary Better Auth identity helpers and
 * phone-auth service configuration loading (IMP-009).
 *
 * Docker-independent; no network, no database. Uses synthetic Indian mobile
 * numbers only (never a real subscriber number) and never asserts on the
 * *value* of anything secret-derived beyond checking it does not leak raw
 * input.
 */
import { describe, expect, it } from "vitest";

import type { E164IndianMobileNumber } from "../../shared/customer-auth/phone";
import { CustomerAuthConfigurationError } from "./errors";
import {
  assertSecretAbsentFromText,
  createCustomerTemporaryIdentityDeriver,
  CUSTOMER_TEMPORARY_DISPLAY_NAME,
  loadCustomerPhoneAuthServiceConfig,
  loadCustomerPiiHashSecret,
  type CustomerPiiHashSecret,
} from "./pii";

const PHONE_A = "+919876543210" as E164IndianMobileNumber;
const PHONE_B = "+919000000001" as E164IndianMobileNumber;
const SECRET_A = "customer-pii-hash-secret-fixture-32-chars-min-a" as CustomerPiiHashSecret;
const SECRET_B = "customer-pii-hash-secret-fixture-32-chars-min-b" as CustomerPiiHashSecret;

describe("createCustomerTemporaryIdentityDeriver — deriveTempEmail", () => {
  it("produces an email matching the expected safe shape", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    const email = deriver.deriveTempEmail(PHONE_A);
    expect(email).toMatch(/^u_[0-9a-f]{64}@phone\.invalid$/);
  });

  it("never contains the raw phone number or any substring of its digits", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    const email = deriver.deriveTempEmail(PHONE_A);
    expect(email).not.toContain(PHONE_A);
    expect(email).not.toContain("9876543210");
    expect(email).not.toContain("919876543210");
  });

  it("is deterministic for the same secret and phone number", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    expect(deriver.deriveTempEmail(PHONE_A)).toBe(deriver.deriveTempEmail(PHONE_A));
  });

  it("produces different emails for different phone numbers under the same secret", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    expect(deriver.deriveTempEmail(PHONE_A)).not.toBe(deriver.deriveTempEmail(PHONE_B));
  });

  it("produces different emails for the same phone number under different secrets", () => {
    const deriverA = createCustomerTemporaryIdentityDeriver(SECRET_A);
    const deriverB = createCustomerTemporaryIdentityDeriver(SECRET_B);
    expect(deriverA.deriveTempEmail(PHONE_A)).not.toBe(deriverB.deriveTempEmail(PHONE_A));
  });
});

describe("createCustomerTemporaryIdentityDeriver — deriveTempName", () => {
  it("always returns the fixed display name regardless of phone number", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    expect(deriver.deriveTempName(PHONE_A)).toBe(CUSTOMER_TEMPORARY_DISPLAY_NAME);
    expect(deriver.deriveTempName(PHONE_B)).toBe(CUSTOMER_TEMPORARY_DISPLAY_NAME);
  });

  it("never embeds a phone number in the display name", () => {
    const deriver = createCustomerTemporaryIdentityDeriver(SECRET_A);
    expect(deriver.deriveTempName(PHONE_A)).not.toContain("9876543210");
  });
});

describe("loadCustomerPiiHashSecret", () => {
  const VALID = "a-sufficiently-long-customer-pii-hash-secret-value";

  it("accepts a sufficiently long, non-placeholder secret", () => {
    expect(loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: VALID })).toBe(VALID);
  });

  it("rejects a missing value", () => {
    expect(() => loadCustomerPiiHashSecret({})).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects an empty value", () => {
    expect(() =>
      loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: "" }),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a value shorter than the minimum length", () => {
    expect(() =>
      loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: "too-short" }),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects leading/trailing whitespace", () => {
    expect(() =>
      loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: ` ${VALID} ` }),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a known placeholder value", () => {
    expect(() =>
      loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: "customer-auth-pii-hash-secret" }),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a value equal to CUSTOMER_AUTH_SECRET", () => {
    expect(() =>
      loadCustomerPiiHashSecret(
        { CUSTOMER_AUTH_PII_HASH_SECRET: VALID },
        { customerAuthSecret: VALID },
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a value equal to WORKFORCE_AUTH_SECRET", () => {
    expect(() =>
      loadCustomerPiiHashSecret(
        { CUSTOMER_AUTH_PII_HASH_SECRET: VALID },
        { workforceAuthSecret: VALID },
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("never includes the raw secret value in the thrown error's message", () => {
    try {
      loadCustomerPiiHashSecret({ CUSTOMER_AUTH_PII_HASH_SECRET: "too-short" });
      expect.unreachable("expected loadCustomerPiiHashSecret to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerAuthConfigurationError);
      const message = (error as CustomerAuthConfigurationError).message;
      expect(message).not.toContain("too-short");
    }
  });
});

describe("assertSecretAbsentFromText", () => {
  it("does not throw when the secret is absent from the text", () => {
    expect(() => assertSecretAbsentFromText("hello world", "my-secret-value", "secret")).not.toThrow();
  });

  it("throws when the secret is present verbatim in the text", () => {
    expect(() =>
      assertSecretAbsentFromText("leaked: my-secret-value here", "my-secret-value", "secret"),
    ).toThrow(/secret must never appear/i);
  });

  it("is a no-op for an empty secret", () => {
    expect(() => assertSecretAbsentFromText("anything at all", "", "secret")).not.toThrow();
  });

  it("does not throw when the haystack is shorter than the secret", () => {
    expect(() => assertSecretAbsentFromText("hi", "a-much-longer-secret-value", "secret")).not.toThrow();
  });
});

describe("loadCustomerPhoneAuthServiceConfig — valid local configuration", () => {
  const validSource = {
    CUSTOMER_AUTH_PII_HASH_SECRET: "a-sufficiently-long-customer-pii-hash-secret-value",
    CUSTOMER_OTP_PROVIDER: "local",
    CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456",
    CUSTOMER_AUTH_TRUST_PROXY_HOPS: "1",
    CUSTOMER_AUTH_SERVICE_HOST: "0.0.0.0",
    CUSTOMER_AUTH_SERVICE_PORT: "8081",
  };

  it("loads a fully-specified local configuration", () => {
    const config = loadCustomerPhoneAuthServiceConfig(
      validSource,
      "local",
      "http://localhost:8080",
    );
    expect(config.environmentType).toBe("local");
    expect(config.otpProviderKind).toBe("local");
    expect(config.localFixedCode).toBe("123456");
    expect(config.trustProxyHops).toBe(1);
    expect(config.serviceHost).toBe("0.0.0.0");
    expect(config.servicePort).toBe(8081);
    expect(config.trustedOrigin).toBe("http://localhost:8080");
  });

  it("returns a frozen object", () => {
    const config = loadCustomerPhoneAuthServiceConfig(validSource, "local", "http://localhost:8080");
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("defaults otpProviderKind to disabled, host to 0.0.0.0, and port to 8081 when omitted", () => {
    const config = loadCustomerPhoneAuthServiceConfig(
      { CUSTOMER_AUTH_PII_HASH_SECRET: "a-sufficiently-long-customer-pii-hash-secret-value" },
      "local",
      "http://localhost:8080",
    );
    expect(config.otpProviderKind).toBe("disabled");
    expect(config.serviceHost).toBe("0.0.0.0");
    expect(config.servicePort).toBe(8081);
    expect(config.localFixedCode).toBeNull();
  });

  it("the identity deriver it returns is independently usable", () => {
    const config = loadCustomerPhoneAuthServiceConfig(validSource, "local", "http://localhost:8080");
    expect(config.identityDeriver.deriveTempEmail(PHONE_A)).toMatch(/^u_[0-9a-f]{64}@phone\.invalid$/);
  });
});

describe("loadCustomerPhoneAuthServiceConfig — rejections", () => {
  const baseSource = {
    CUSTOMER_AUTH_PII_HASH_SECRET: "a-sufficiently-long-customer-pii-hash-secret-value",
  };

  it("rejects local OTP provider in staging", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_OTP_PROVIDER: "local" },
        "staging",
        "https://example.test",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects local OTP provider in production", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_OTP_PROVIDER: "local" },
        "production",
        "https://example.test",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects the disabled provider in staging/production (no approved production adapter)", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(baseSource, "staging", "https://example.test"),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("uses CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE as the failure code in staging/production", () => {
    try {
      loadCustomerPhoneAuthServiceConfig(baseSource, "production", "https://example.test");
      expect.unreachable("expected loadCustomerPhoneAuthServiceConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerAuthConfigurationError);
      expect((error as CustomerAuthConfigurationError).code).toBe(
        "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
      );
    }
  });

  it("rejects a fixed local OTP code in staging even if somehow set", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456" },
        "staging",
        "https://example.test",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a fixed local OTP code that is not exactly six digits", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_OTP_LOCAL_FIXED_CODE: "12345" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_OTP_LOCAL_FIXED_CODE: "12a456" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects an out-of-range CUSTOMER_AUTH_TRUST_PROXY_HOPS", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_TRUST_PROXY_HOPS: "3" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_TRUST_PROXY_HOPS: "-1" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a non-integer CUSTOMER_AUTH_TRUST_PROXY_HOPS", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_TRUST_PROXY_HOPS: "one" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects an out-of-range CUSTOMER_AUTH_SERVICE_PORT", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_SERVICE_PORT: "0" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_SERVICE_PORT: "70000" },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects a host with surrounding whitespace or that is empty", () => {
    expect(() =>
      loadCustomerPhoneAuthServiceConfig(
        { ...baseSource, CUSTOMER_AUTH_SERVICE_HOST: " 0.0.0.0 " },
        "local",
        "http://localhost:8080",
      ),
    ).toThrow(CustomerAuthConfigurationError);
  });

  it("rejects an invalid CUSTOMER_AUTH_PII_HASH_SECRET alongside other issues, reporting both", () => {
    try {
      loadCustomerPhoneAuthServiceConfig(
        {
          CUSTOMER_AUTH_PII_HASH_SECRET: "too-short",
          CUSTOMER_AUTH_SERVICE_PORT: "0",
        },
        "local",
        "http://localhost:8080",
      );
      expect.unreachable("expected loadCustomerPhoneAuthServiceConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerAuthConfigurationError);
      const issues = (error as CustomerAuthConfigurationError).issues;
      const keys = issues.map((issue) => issue.key);
      expect(keys).toContain("CUSTOMER_AUTH_PII_HASH_SECRET");
      expect(keys).toContain("CUSTOMER_AUTH_SERVICE_PORT");
    }
  });

  it("never includes the raw secret value in the thrown error's message", () => {
    try {
      loadCustomerPhoneAuthServiceConfig(
        { CUSTOMER_AUTH_PII_HASH_SECRET: "leaked-secret-marker-too-short" },
        "local",
        "http://localhost:8080",
      );
      expect.unreachable("expected loadCustomerPhoneAuthServiceConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerAuthConfigurationError);
      expect((error as CustomerAuthConfigurationError).message).not.toContain(
        "leaked-secret-marker-too-short",
      );
    }
  });
});
