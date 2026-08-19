/**
 * Deterministic Razorpay Order receipt (IMP-026A).
 *
 * Provider correlation / idempotency only — not BOBA Bear Payment authority.
 * Derived from stable Attempt execution identity; never from display text or PII.
 */
import { createHash } from "node:crypto";

export const RAZORPAY_RECEIPT_MAX_LENGTH = 40;
const RECEIPT_PREFIX = "r";
const RECEIPT_DIGEST_CHARS = RAZORPAY_RECEIPT_MAX_LENGTH - RECEIPT_PREFIX.length;

export function razorpayReceiptFromExecutionIdentity(
  executionIdentity: string,
): string {
  if (typeof executionIdentity !== "string" || executionIdentity.trim().length === 0) {
    throw new Error("Razorpay receipt requires a non-empty execution identity.");
  }
  const digest = createHash("sha256")
    .update(`boba.razorpay.receipt.v1:${executionIdentity}`, "utf8")
    .digest("hex")
    .slice(0, RECEIPT_DIGEST_CHARS);
  const receipt = `${RECEIPT_PREFIX}${digest}`;
  if (receipt.length > RAZORPAY_RECEIPT_MAX_LENGTH) {
    throw new Error("Razorpay receipt exceeded provider maximum length.");
  }
  return receipt;
}
