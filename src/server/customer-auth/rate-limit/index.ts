/**
 * Customer OTP durable rate-limit boundary (IMP-009).
 */
import "server-only";

export { hashCustomerOtpIpKey, hashCustomerOtpPhoneKey } from "./hashing";
export {
  consumeCustomerOtpRateLimit,
  consumeCustomerOtpRateLimits,
  deleteExpiredCustomerOtpRateLimits,
} from "./store";
export {
  CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX,
  CUSTOMER_OTP_RATE_LIMIT_RULES,
  CUSTOMER_OTP_RATE_LIMIT_SCOPES,
} from "./types";
export type {
  CustomerOtpRateLimitOutcome,
  CustomerOtpRateLimitRule,
  CustomerOtpRateLimitScope,
} from "./types";
