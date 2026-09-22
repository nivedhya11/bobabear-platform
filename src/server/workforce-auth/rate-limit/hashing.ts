/**
 * HMAC key hashing for durable workforce-auth rate limits (IMP-010 / IMP-038).
 *
 * Persists only lowercase 64-character HMAC-SHA256 hex digests. Domains:
 * `workforce-email:v1:`, `workforce-ip:v1:`, and `workforce-email-ip:v1:`.
 */
import { createHmac } from "node:crypto";

import type { NormalizedWorkforceEmail } from "../../../shared/workforce-auth/email";
import {
  hashWorkforceEmailKey,
  hashWorkforceIpKey,
  type WorkforcePiiHashSecret,
} from "../pii";

export function hashWorkforceAuthEmailKey(
  secret: WorkforcePiiHashSecret,
  email: NormalizedWorkforceEmail,
): string {
  return hashWorkforceEmailKey(secret, email);
}

export function hashWorkforceAuthIpKey(
  secret: WorkforcePiiHashSecret,
  canonicalIp: string,
): string {
  return hashWorkforceIpKey(secret, canonicalIp);
}

/** Combined email+IP scope key — never persists raw email or IP. */
export function hashWorkforceAuthEmailIpKey(
  secret: WorkforcePiiHashSecret,
  email: NormalizedWorkforceEmail,
  canonicalIp: string,
): string {
  return createHmac("sha256", secret)
    .update(`workforce-email-ip:v1:${email}:${canonicalIp}`, "utf8")
    .digest("hex");
}
