/**
 * Workforce-auth durable rate-limit boundary (IMP-010 / IMP-038).
 */
import "server-only";

export {
  hashWorkforceAuthEmailIpKey,
  hashWorkforceAuthEmailKey,
  hashWorkforceAuthIpKey,
} from "./hashing";
export {
  escalateProgressiveCooldown,
  retryAfterSecondsFrom,
} from "./progressive";
export {
  consumeWorkforceAuthRateLimit,
  consumeWorkforceAuthRateLimits,
  deleteExpiredWorkforceAuthRateLimits,
} from "./store";
export {
  WORKFORCE_AUTH_PROGRESSIVE_COOLDOWN_LADDER_SECONDS,
  WORKFORCE_AUTH_RATE_LIMIT_CLEANUP_MAX,
  WORKFORCE_AUTH_RATE_LIMIT_RULES,
  WORKFORCE_AUTH_RATE_LIMIT_SCOPES,
} from "./types";
export type {
  WorkforceAuthRateLimitOutcome,
  WorkforceAuthRateLimitRule,
  WorkforceAuthRateLimitScope,
} from "./types";
