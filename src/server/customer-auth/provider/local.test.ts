/**
 * Unit tests for the in-process local/test customer OTP provider (IMP-009).
 *
 * Docker-independent; no network, no database. Verifies lifecycle, expiry,
 * attempt-exhaustion, and the staging/production fail-closed guard. Never
 * asserts an OTP code value in a failure message — only presence/absence
 * via structural outcome checks.
 */
import { describe, expect, it } from "vitest";

import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";
import { CustomerOtpProviderError } from "../errors";
import { CUSTOMER_OTP_ALLOWED_ATTEMPTS } from "./types";
import {
  createLocalCustomerOtpProvider,
  createLocalCustomerOtpProviderForTests,
} from "./local";

const PHONE_A = "+919876543210" as E164IndianMobileNumber;
const PHONE_B = "+919000000001" as E164IndianMobileNumber;

function futureExpiry(now: Date, seconds = 300): Date {
  return new Date(now.getTime() + seconds * 1000);
}

describe("createLocalCustomerOtpProvider — environment gate", () => {
  it.each(["local", "test", "ci"] as const)(
    "allows construction in the %s environment",
    (environmentType) => {
      expect(() => createLocalCustomerOtpProvider({ environmentType })).not.toThrow();
    },
  );

  it.each(["staging", "production"] as const)(
    "throws in the %s environment",
    (environmentType) => {
      expect(() => createLocalCustomerOtpProvider({ environmentType })).toThrow(
        CustomerOtpProviderError,
      );
    },
  );

  it("throws with the CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE code in production", () => {
    try {
      createLocalCustomerOtpProvider({ environmentType: "production" });
      expect.unreachable("expected construction to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerOtpProviderError);
      expect((error as CustomerOtpProviderError).code).toBe(
        "CUSTOMER_OTP_PRODUCTION_PROVIDER_UNAVAILABLE",
      );
    }
  });

  it("rejects a fixed code that is not exactly six decimal digits", () => {
    expect(() =>
      createLocalCustomerOtpProvider({ environmentType: "test", fixedCode: "12345" }),
    ).toThrow(CustomerOtpProviderError);
    expect(() =>
      createLocalCustomerOtpProvider({ environmentType: "test", fixedCode: "abcdef" }),
    ).toThrow(CustomerOtpProviderError);
  });

  it("accepts a null or omitted fixed code", () => {
    expect(() => createLocalCustomerOtpProvider({ environmentType: "test", fixedCode: null })).not.toThrow();
    expect(() => createLocalCustomerOtpProvider({ environmentType: "test" })).not.toThrow();
  });
});

describe("createLocalCustomerOtpProvider — lifecycle", () => {
  it("reports its provider kind as local", () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    expect(provider.kind).toBe("local");
  });

  it("accepts a fresh startVerification and later approves the matching code", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    const start = await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });
    expect(start).toEqual({ outcome: "accepted" });

    const check = await provider.checkVerification({
      phoneNumber: PHONE_A,
      code: "123456",
      now,
    });
    expect(check).toEqual({ outcome: "approved" });
  });

  it("rejects an incorrect code as invalid without consuming the record entirely", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });

    const firstAttempt = await provider.checkVerification({
      phoneNumber: PHONE_A,
      code: "000000",
      now,
    });
    expect(firstAttempt).toEqual({ outcome: "invalid" });

    // The record survives one wrong attempt — the correct code still works.
    const secondAttempt = await provider.checkVerification({
      phoneNumber: PHONE_A,
      code: "123456",
      now,
    });
    expect(secondAttempt).toEqual({ outcome: "approved" });
  });

  it("checking verification for a phone number with no active record is invalid", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    const result = await provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now });
    expect(result).toEqual({ outcome: "invalid" });
  });

  it("checking verification after the successful approval consumes the record (replay fails)", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });
    await provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now });

    const replay = await provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now });
    expect(replay).toEqual({ outcome: "invalid" });
  });

  it("expires a record once `now` reaches its expiry instant", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    const expiresAt = futureExpiry(now, 60);
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt,
    });

    const result = await provider.checkVerification({
      phoneNumber: PHONE_A,
      code: "123456",
      now: expiresAt,
    });
    expect(result).toEqual({ outcome: "expired" });
  });

  it("an expired record is removed — a later correct-code check reports invalid, not approved", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    const expiresAt = futureExpiry(now, 60);
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt,
    });
    await provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now: expiresAt });

    const afterExpiry = await provider.checkVerification({
      phoneNumber: PHONE_A,
      code: "123456",
      now: expiresAt,
    });
    expect(afterExpiry).toEqual({ outcome: "invalid" });
  });

  it(`reports too_many_attempts after ${CUSTOMER_OTP_ALLOWED_ATTEMPTS} consecutive wrong attempts`, async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });

    let last;
    for (let attempt = 0; attempt < CUSTOMER_OTP_ALLOWED_ATTEMPTS; attempt += 1) {
      last = await provider.checkVerification({ phoneNumber: PHONE_A, code: "000000", now });
    }
    expect(last).toEqual({ outcome: "too_many_attempts" });
  });

  it("the correct code no longer works after attempts are exhausted", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });
    for (let attempt = 0; attempt < CUSTOMER_OTP_ALLOWED_ATTEMPTS; attempt += 1) {
      await provider.checkVerification({ phoneNumber: PHONE_A, code: "000000", now });
    }

    const finalTry = await provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now });
    expect(finalTry).toEqual({ outcome: "invalid" });
  });

  it("tracks independent records per phone number", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "111111",
      now,
      expiresAt: futureExpiry(now),
    });
    await provider.startVerification({
      phoneNumber: PHONE_B,
      generatedCode: "222222",
      now,
      expiresAt: futureExpiry(now),
    });

    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "222222", now }),
    ).resolves.toEqual({ outcome: "invalid" });
    await expect(
      provider.checkVerification({ phoneNumber: PHONE_B, code: "222222", now }),
    ).resolves.toEqual({ outcome: "approved" });
  });

  it("starting a new verification for the same phone number overwrites the previous code", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "111111",
      now,
      expiresAt: futureExpiry(now),
    });
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "222222",
      now,
      expiresAt: futureExpiry(now),
    });

    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "111111", now }),
    ).resolves.toEqual({ outcome: "invalid" });
    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "222222", now }),
    ).resolves.toEqual({ outcome: "approved" });
  });
});

describe("createLocalCustomerOtpProvider — fixed code", () => {
  it("always uses the configured fixed code regardless of the generated code", async () => {
    const provider = createLocalCustomerOtpProviderForTests({
      environmentType: "test",
      fixedCode: "000000",
    });
    const now = new Date("2025-01-01T00:00:00.000Z");
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "999999",
      now,
      expiresAt: futureExpiry(now),
    });

    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "999999", now }),
    ).resolves.toEqual({ outcome: "invalid" });
    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "000000", now }),
    ).resolves.toEqual({ outcome: "approved" });
  });
});

describe("createLocalCustomerOtpProvider — checkReadiness / close", () => {
  it("checkReadiness resolves while the provider is open", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    await expect(provider.checkReadiness()).resolves.toBeUndefined();
  });

  it("close() is idempotent", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    await expect(provider.close()).resolves.toBeUndefined();
    await expect(provider.close()).resolves.toBeUndefined();
  });

  it("startVerification rejects once the provider is closed", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    await provider.close();
    const now = new Date();
    await expect(
      provider.startVerification({
        phoneNumber: PHONE_A,
        generatedCode: "123456",
        now,
        expiresAt: futureExpiry(now),
      }),
    ).rejects.toBeInstanceOf(CustomerOtpProviderError);
  });

  it("checkVerification rejects once the provider is closed", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    await provider.close();
    await expect(
      provider.checkVerification({ phoneNumber: PHONE_A, code: "123456", now: new Date() }),
    ).rejects.toBeInstanceOf(CustomerOtpProviderError);
  });

  it("checkReadiness rejects once the provider is closed", async () => {
    const provider = createLocalCustomerOtpProvider({ environmentType: "test" });
    await provider.close();
    await expect(provider.checkReadiness()).rejects.toBeInstanceOf(CustomerOtpProviderError);
  });

  it("close() clears in-memory OTP state", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date();
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "123456",
      now,
      expiresAt: futureExpiry(now),
    });
    expect(provider.__testOnly_getActiveCode(PHONE_A)).toBe("123456");
    await provider.close();
    expect(provider.__testOnly_getActiveCode(PHONE_A)).toBeNull();
  });
});

describe("createLocalCustomerOtpProviderForTests — test-only capture seam", () => {
  it("exposes the active code for a pending phone number", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date();
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "654321",
      now,
      expiresAt: futureExpiry(now),
    });
    expect(provider.__testOnly_getActiveCode(PHONE_A)).toBe("654321");
  });

  it("returns null for a phone number with no pending code", () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    expect(provider.__testOnly_getActiveCode(PHONE_A)).toBeNull();
  });

  it("returns null after the code has been consumed by a successful check", async () => {
    const provider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
    const now = new Date();
    await provider.startVerification({
      phoneNumber: PHONE_A,
      generatedCode: "654321",
      now,
      expiresAt: futureExpiry(now),
    });
    await provider.checkVerification({ phoneNumber: PHONE_A, code: "654321", now });
    expect(provider.__testOnly_getActiveCode(PHONE_A)).toBeNull();
  });
});
