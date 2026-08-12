/**
 * Deterministic key/request hashing for the idempotency store (IMP-007).
 *
 * `node:crypto` only — no hashing dependency added. Every function here is
 * pure, synchronous, never logs, and never returns or embeds the raw input
 * anywhere in its output (only the digest).
 */
import { createHash } from "node:crypto";

import { IdempotencyValidationError } from "./errors";

function sha256Hex(material: string): string {
  return createHash("sha256").update(material, "utf8").digest("hex");
}

/** Hashes a raw idempotency key into a lowercase 64-character SHA-256 hex
 * digest. The namespace is not mixed into this hash — composite uniqueness
 * is `(namespace, key_hash)` at the store layer, not the hash itself. */
export function hashIdempotencyKey(rawKey: string): string {
  if (typeof rawKey !== "string" || rawKey.length === 0) {
    throw new IdempotencyValidationError({ message: "rawKey must be a non-empty string." });
  }
  return sha256Hex(rawKey);
}

/** Hashes caller-supplied canonical request material into a lowercase
 * 64-character SHA-256 hex digest. Canonicalization itself is the caller's
 * responsibility — this function does not parse, sort, or normalize JSON. */
export function hashRequestFingerprint(canonicalMaterial: string): string {
  if (typeof canonicalMaterial !== "string" || canonicalMaterial.length === 0) {
    throw new IdempotencyValidationError({
      message: "canonicalRequestFingerprint must be a non-empty string.",
    });
  }
  return sha256Hex(canonicalMaterial);
}
