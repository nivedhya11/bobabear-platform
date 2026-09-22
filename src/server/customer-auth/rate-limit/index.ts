/**
 * Customer OTP durable rate-limit boundary (IMP-009 / IMP-038).
 */
import "server-only";

export {
  hashCustomerOtpIpKey,
  hashCustomerOtpPhoneIpKey,
  hashCustomerOtpPhoneKey,
} from "./hashing";
export {
  escalateProgressiveCooldown,
  retryAfterSecondsFrom,
} from "./progressive";
export {
  consumeCustomerOtpRateLimit,
  consumeCustomerOtpRateLimits,
  deleteExpiredCustomerOtpRateLimits,
} from "./store";
export {
  CUSTOMER_OTP_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
  CUSTOMER_OTP_RATE_LIMIT_CLEANUP_MAX,
  CUSTOMER_OTP_RATE_LIMIT_RULES,
  CUSTOMER_OTP_RATE_LIMIT_SCOPES,
} from "./types";
export type {
  CustomerOtpRateLimitOutcome,
  CustomerOtpRateLimitRule,
  CustomerOtpRateLimitScope,
} from "./types";
