/**
 * Guest Cart credential generation and verification (IMP-020).
 *
 * Raw token: 32 CSPRNG bytes → base64url. Persist only SHA-256 hex verifier.
 * Compare with timingSafeEqual. Never log the raw token.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { CartError } from "../../shared/cart";

const GUEST_TOKEN_BYTES = 32;
const VERIFIER_HEX_LENGTH = 64;

export function generateGuestCartToken(): Readonly<{
  rawToken: string;
  verifierHex: string;
}> {
  const bytes = randomBytes(GUEST_TOKEN_BYTES);
  const rawToken = bytes.toString("base64url");
  const verifierHex = hashGuestToken(rawToken);
  return Object.freeze({ rawToken, verifierHex });
}

export function hashGuestToken(rawToken: string): string {
  if (typeof rawToken !== "string" || rawToken.length === 0) {
    throw new CartError(
      "CART_INVALID_INPUT",
      "Guest token must be a non-empty string.",
      { field: "guestToken" },
    );
  }
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function guestVerifiersEqual(
  storedVerifierHex: string,
  candidateRawToken: string,
): boolean {
  if (
    typeof storedVerifierHex !== "string" ||
    storedVerifierHex.length !== VERIFIER_HEX_LENGTH ||
    !/^[0-9a-f]{64}$/.test(storedVerifierHex)
  ) {
    return false;
  }
  let candidateHex: string;
  try {
    candidateHex = hashGuestToken(candidateRawToken);
  } catch {
    return false;
  }
  const a = Buffer.from(storedVerifierHex, "utf8");
  const b = Buffer.from(candidateHex, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
