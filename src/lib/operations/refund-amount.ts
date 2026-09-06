/**
 * Operator-facing INR → integer paise conversion for Operations Refund UI.
 *
 * Transport remains `amountPaise`. Never uses floating-point arithmetic.
 * Server balance remains final authority.
 */
import { MoneyParseError, parseRupeeToPaise } from "@/shared/pricing";

export type RefundAmountParseResult =
  | Readonly<{ ok: true; amountPaise: string }>
  | Readonly<{ ok: false; reason: "malformed" | "non_positive" }>;

/**
 * Parse a decimal INR string into an exact positive paise decimal string.
 *
 * Accepts at most two fractional digits. Rejects zero, negative, and malformed
 * values for client-side usability.
 */
export function parseOperatorRefundAmountInrToPaise(raw: string): RefundAmountParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "malformed" };
  }
  try {
    const paise = parseRupeeToPaise(trimmed);
    if (paise <= BigInt(0)) {
      return { ok: false, reason: "non_positive" };
    }
    return { ok: true, amountPaise: paise.toString(10) };
  } catch (error) {
    if (error instanceof MoneyParseError) {
      return { ok: false, reason: "malformed" };
    }
    throw error;
  }
}
