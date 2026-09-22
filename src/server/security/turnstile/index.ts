/**
 * Cloudflare Turnstile server-side boundary (IMP-038).
 */
import "server-only";

export { loadTurnstileConfig } from "./config";
export type { TurnstileConfig, TurnstileEnvSource } from "./config";
export {
  deleteExpiredTurnstileTokenRedemptions,
  hashTurnstileToken,
  claimTurnstileTokenRedemption,
  markTurnstileTokenRedemptionOutcome,
} from "./redemption-store";
export type { TurnstileRedemptionClaimResult } from "./redemption-store";
export {
  createTurnstileVerifier,
  verifyTurnstileToken,
} from "./siteverify";
export type { VerifyTurnstileTokenDeps } from "./siteverify";
export {
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  TURNSTILE_TOKEN_TTL_SECONDS,
  TurnstileServiceError,
} from "./types";
export type {
  TurnstileVerifier,
  TurnstileVerifyFailureReason,
  TurnstileVerifyInput,
  TurnstileVerifyOutcome,
} from "./types";
