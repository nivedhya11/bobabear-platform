/**
 * Meta WhatsApp webhook verification (IMP-034).
 *
 * GET: hub.mode=subscribe + hub.verify_token → return hub.challenge plain text.
 * POST: X-Hub-Signature-256 = sha256=<hmac-sha256(app_secret, raw_body)> with
 * timing-safe compare.
 */
import { metaWhatsAppWebhookSignatureHex, timingSafeStringEqual } from "./crypto";

export type MetaWhatsAppGetVerificationInput = Readonly<{
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedVerifyToken: string;
}>;

export type MetaWhatsAppGetVerificationResult =
  | Readonly<{ ok: true; challenge: string }>
  | Readonly<{ ok: false; reason: "mode" | "token" | "challenge" }>;

export function verifyMetaWhatsAppWebhookGet(
  input: MetaWhatsAppGetVerificationInput,
): MetaWhatsAppGetVerificationResult {
  if (input.mode !== "subscribe") {
    return Object.freeze({ ok: false, reason: "mode" });
  }
  if (
    typeof input.verifyToken !== "string" ||
    !timingSafeStringEqual(input.expectedVerifyToken, input.verifyToken)
  ) {
    return Object.freeze({ ok: false, reason: "token" });
  }
  if (typeof input.challenge !== "string" || input.challenge.length === 0) {
    return Object.freeze({ ok: false, reason: "challenge" });
  }
  return Object.freeze({ ok: true, challenge: input.challenge });
}

export type MetaWhatsAppPostSignatureInput = Readonly<{
  rawBody: Uint8Array;
  signatureHeader: string | null | undefined;
  appSecret: string;
}>;

/**
 * Verify `X-Hub-Signature-256`. Returns false on missing/malformed header or
 * mismatch — never throws with secret material.
 */
export function verifyMetaWhatsAppWebhookSignature(
  input: MetaWhatsAppPostSignatureInput,
): boolean {
  const header = input.signatureHeader;
  if (typeof header !== "string" || !header.startsWith("sha256=")) {
    return false;
  }
  const provided = header.slice("sha256=".length).trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(provided)) {
    return false;
  }
  const expected = metaWhatsAppWebhookSignatureHex(input.appSecret, input.rawBody).toLowerCase();
  return timingSafeStringEqual(expected, provided);
}
