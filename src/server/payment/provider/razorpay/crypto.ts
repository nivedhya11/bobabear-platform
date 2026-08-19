/**
 * Timing-safe Razorpay HMAC helpers (IMP-026A).
 *
 * Never log secrets or signatures.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string | Uint8Array): string {
  const hmac = createHmac("sha256", secret);
  if (typeof payload === "string") {
    hmac.update(payload, "utf8");
  } else {
    hmac.update(payload);
  }
  return hmac.digest("hex");
}

/**
 * Compare two hex/utf8 strings in constant time when lengths match.
 * Length mismatch still digests both sides before returning false.
 */
export function timingSafeStringEqual(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length === providedBuf.length) {
    return timingSafeEqual(expectedBuf, providedBuf);
  }
  const left = createHmac("sha256", "boba.timing.pad").update(expectedBuf).digest();
  const right = createHmac("sha256", "boba.timing.pad").update(providedBuf).digest();
  timingSafeEqual(left, right);
  return false;
}

export function razorpayClientSignatureHex(
  keySecret: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
): string {
  return hmacSha256Hex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`);
}

export function razorpayWebhookSignatureHex(
  webhookSecret: string,
  rawBody: Uint8Array,
): string {
  return hmacSha256Hex(webhookSecret, rawBody);
}
