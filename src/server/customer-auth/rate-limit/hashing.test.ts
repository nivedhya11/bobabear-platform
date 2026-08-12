/**
 * Unit tests for HMAC key hashing used by durable customer OTP rate limits
 * (IMP-009). Docker-independent; no network, no database.
 */
import { describe, expect, it } from "vitest";

import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";
import type { CustomerPiiHashSecret } from "../pii";
import { hashCustomerOtpIpKey, hashCustomerOtpPhoneKey } from "./hashing";

const PHONE_A = "+919876543210" as E164IndianMobileNumber;
const PHONE_B = "+919000000001" as E164IndianMobileNumber;
const SECRET_A = "customer-otp-rate-limit-hash-secret-fixture-32ch-a" as CustomerPiiHashSecret;
const SECRET_B = "customer-otp-rate-limit-hash-secret-fixture-32ch-b" as CustomerPiiHashSecret;
const IP_A = "203.0.113.10";
const IP_B = "203.0.113.20";

const HEX64_PATTERN = /^[0-9a-f]{64}$/;

describe("hashCustomerOtpPhoneKey", () => {
  it("returns a lowercase 64-character hex digest", () => {
    const hash = hashCustomerOtpPhoneKey(SECRET_A, PHONE_A);
    expect(hash).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same secret and phone number", () => {
    expect(hashCustomerOtpPhoneKey(SECRET_A, PHONE_A)).toBe(hashCustomerOtpPhoneKey(SECRET_A, PHONE_A));
  });

  it("differs for different phone numbers under the same secret", () => {
    expect(hashCustomerOtpPhoneKey(SECRET_A, PHONE_A)).not.toBe(hashCustomerOtpPhoneKey(SECRET_A, PHONE_B));
  });

  it("differs for the same phone number under different secrets", () => {
    expect(hashCustomerOtpPhoneKey(SECRET_A, PHONE_A)).not.toBe(hashCustomerOtpPhoneKey(SECRET_B, PHONE_A));
  });

  it("never contains the raw phone number's digits", () => {
    const hash = hashCustomerOtpPhoneKey(SECRET_A, PHONE_A);
    expect(hash).not.toContain("9876543210");
  });

  it("differs from the IP-key hash for the same underlying secret and equivalent-looking input", () => {
    const phoneHash = hashCustomerOtpPhoneKey(SECRET_A, PHONE_A);
    const ipHash = hashCustomerOtpIpKey(SECRET_A, PHONE_A);
    expect(phoneHash).not.toBe(ipHash);
  });
});

describe("hashCustomerOtpIpKey", () => {
  it("returns a lowercase 64-character hex digest", () => {
    const hash = hashCustomerOtpIpKey(SECRET_A, IP_A);
    expect(hash).toMatch(HEX64_PATTERN);
  });

  it("is deterministic for the same secret and IP address", () => {
    expect(hashCustomerOtpIpKey(SECRET_A, IP_A)).toBe(hashCustomerOtpIpKey(SECRET_A, IP_A));
  });

  it("differs for different IP addresses under the same secret", () => {
    expect(hashCustomerOtpIpKey(SECRET_A, IP_A)).not.toBe(hashCustomerOtpIpKey(SECRET_A, IP_B));
  });

  it("differs for the same IP address under different secrets", () => {
    expect(hashCustomerOtpIpKey(SECRET_A, IP_A)).not.toBe(hashCustomerOtpIpKey(SECRET_B, IP_A));
  });

  it("never contains the raw IP address", () => {
    const hash = hashCustomerOtpIpKey(SECRET_A, IP_A);
    expect(hash).not.toContain(IP_A);
  });

  it("distinguishes IPv4 and IPv6-shaped strings that happen to share a substring", () => {
    const v4Hash = hashCustomerOtpIpKey(SECRET_A, "127.0.0.1");
    const v6Hash = hashCustomerOtpIpKey(SECRET_A, "::1");
    expect(v4Hash).not.toBe(v6Hash);
  });
});
