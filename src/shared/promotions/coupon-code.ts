/**
 * Coupon code normalization and generation (IMP-016).
 */
import { randomBytes } from "node:crypto";

import { PromotionAdminError } from "./errors";

const CANONICAL_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCouponCode(raw: string): string {
  if (typeof raw !== "string") {
    throw new PromotionAdminError("COUPON_CODE_INVALID", "Coupon code must be a string.");
  }
  const normalized = raw.trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 64) {
    throw new PromotionAdminError(
      "COUPON_CODE_INVALID",
      "Coupon code length must be between 3 and 64.",
    );
  }
  if (!CANONICAL_PATTERN.test(normalized)) {
    throw new PromotionAdminError(
      "COUPON_CODE_INVALID",
      "Coupon code contains invalid characters.",
    );
  }
  return normalized;
}

/** Unpredictable generated code — never derived from IDs or PII. */
export function generateCouponCode(length = 12): string {
  if (!Number.isInteger(length) || length < 8 || length > 64) {
    throw new PromotionAdminError("validation", "Generated coupon length must be 8..64.");
  }
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]!;
  }
  return out;
}
