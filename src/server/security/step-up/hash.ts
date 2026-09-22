/**
 * HMAC-SHA256 hashing for workforce step-up session binding (IMP-038).
 *
 * Persists only lowercase 64-character hex digests. Never logs or stores
 * the raw session token.
 */
import "server-only";

import { createHmac } from "node:crypto";

import { STEP_UP_SESSION_HASH_DOMAIN } from "./constants";

const HEX64_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Hash a workforce session token for durable step-up proof binding.
 * `secret` must be the shared WORKFORCE_AUTH_SECRET (same realm that issues
 * the session) so grant (workforce-auth) and consume (ops/admin) agree.
 */
export function hashStepUpSessionToken(secret: string, sessionToken: string): string {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("Step-up session hash secret is required.");
  }
  if (typeof sessionToken !== "string" || sessionToken.length === 0) {
    throw new Error("Step-up session token is required.");
  }
  return createHmac("sha256", secret)
    .update(`${STEP_UP_SESSION_HASH_DOMAIN}${sessionToken}`, "utf8")
    .digest("hex");
}

export function assertStepUpSessionTokenHash(hash: string): void {
  if (!HEX64_PATTERN.test(hash)) {
    throw new Error("Step-up session token hash must be a lowercase 64-character hex digest.");
  }
}
