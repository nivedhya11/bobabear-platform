/**
 * Workforce-auth durable rate-limit boundary (IMP-010).
 */
import "server-only";

export { hashWorkforceAuthEmailKey, hashWorkforceAuthIpKey } from "./hashing";
export {
  consumeWorkforceAuthRateLimit,
  consumeWorkforceAuthRateLimits,
  deleteExpiredWorkforceAuthRateLimits,
} from "./store";
export {
  WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX,
  WORKFORCE_AUTH_RATE_LIMIT_RULES,
  WORKFORCE_AUTH_RATE_LIMIT_SCOPES,
} from "./types";
export type {
  WorkforceAuthRateLimitOutcome,
  WorkforceAuthRateLimitRule,
  WorkforceAuthRateLimitScope,
} from "./types";
