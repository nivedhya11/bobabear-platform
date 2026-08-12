/**
 * HMAC key hashing for durable workforce-auth rate limits (IMP-010).
 *
 * Persists only lowercase 64-character HMAC-SHA256 hex digests. Domains:
 * `workforce-email:v1:` and `workforce-ip:v1:` (see `../pii.ts`).
 */
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
