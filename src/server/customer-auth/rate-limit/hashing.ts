/**
 * HMAC key hashing for durable customer OTP rate limits (IMP-009).
 *
 * Persists only lowercase 64-character HMAC-SHA256 hex digests. Never log
 * hashes as stable identifiers.
 */
import { createHmac } from "node:crypto";

import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";
import type { CustomerPiiHashSecret } from "../pii";

export function hashCustomerOtpPhoneKey(
  secret: CustomerPiiHashSecret,
  phoneNumber: E164IndianMobileNumber,
): string {
  return createHmac("sha256", secret)
    .update(`otp-phone:v1:${phoneNumber}`, "utf8")
    .digest("hex");
}

export function hashCustomerOtpIpKey(
  secret: CustomerPiiHashSecret,
  canonicalIp: string,
): string {
  return createHmac("sha256", secret)
    .update(`otp-ip:v1:${canonicalIp}`, "utf8")
    .digest("hex");
}
