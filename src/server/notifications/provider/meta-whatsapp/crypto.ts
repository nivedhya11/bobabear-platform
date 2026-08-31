/**
 * Timing-safe HMAC helpers for Meta WhatsApp webhooks (IMP-034).
 *
 * Local copy of the Razorpay crypto pattern — notifications must not depend
 * on the payment provider module. Never log secrets or signatures.
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

/** Meta `X-Hub-Signature-256` value is `sha256=<hex>`. */
export function metaWhatsAppWebhookSignatureHex(
  appSecret: string,
  rawBody: Uint8Array,
): string {
  return hmacSha256Hex(appSecret, rawBody);
}
