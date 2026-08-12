/**
 * Exact INR paise money helpers (IMP-015).
 *
 * Authoritative money is always integer paise (`bigint`). Never use
 * JavaScript floating-point arithmetic for conversion or tax math.
 */

export class MoneyParseError extends Error {
  readonly code = "SOURCE_PRICE_INVALID" as const;

  constructor(message: string) {
    super(message);
    this.name = "MoneyParseError";
  }
}

const RUPEE_STRING_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

/**
 * Parse a source rupee amount into integer paise.
 *
 * Accepts exact integer numbers, or decimal strings with at most two
 * fractional digits. Rejects >2 decimal places and non-finite numbers.
 *
 * Never uses `Number(x) * 100` as the authoritative conversion.
 */
export function parseRupeeToPaise(source: string | number): bigint {
  if (typeof source === "number") {
    if (!Number.isFinite(source) || source < 0) {
      throw new MoneyParseError("SOURCE_PRICE_INVALID: non-finite or negative number.");
    }
    if (Number.isInteger(source)) {
      return BigInt(source) * BigInt(100);
    }
    // Convert via decimal string so float binary error cannot invent paise.
    const asString = String(source);
    return parseRupeeStringToPaise(asString);
  }
  return parseRupeeStringToPaise(String(source).trim());
}

function parseRupeeStringToPaise(raw: string): bigint {
  if (!RUPEE_STRING_PATTERN.test(raw)) {
    throw new MoneyParseError(
      "SOURCE_PRICE_INVALID: expected a non-negative rupee amount with at most 2 decimal places.",
    );
  }
  const [wholePart, fractionPart = ""] = raw.split(".");
  if (fractionPart.length > 2) {
    throw new MoneyParseError("SOURCE_PRICE_INVALID: more than 2 decimal places.");
  }
  const whole = BigInt(wholePart);
  const frac = BigInt(fractionPart.padEnd(2, "0") || "0");
  return whole * BigInt(100) + frac;
}

/**
 * Round-half-up division for non-negative (or signed) integer rationals.
 * `roundHalfUpDivide(n, d)` ≡ round_half_up(n / d) to nearest integer.
 */
export function roundHalfUpDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= BigInt(0)) {
    throw new MoneyParseError("denominator must be a positive integer.");
  }
  const negative = numerator < BigInt(0);
  const n = negative ? -numerator : numerator;
  const quotient = n / denominator;
  const remainder = n % denominator;
  const rounded = remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;
  return negative ? -rounded : rounded;
}

/** Exclusive GST: tax_paise = round_half_up(taxable × rate_bps / 10000). */
export function taxExclusivePaise(taxablePaise: bigint, rateBps: number): bigint {
  if (taxablePaise < BigInt(0)) {
    throw new MoneyParseError("taxablePaise must be non-negative.");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new MoneyParseError("rateBps must be an integer in 0..10000.");
  }
  return roundHalfUpDivide(taxablePaise * BigInt(rateBps), BigInt(10000));
}

/**
 * Inclusive GST extraction:
 * taxable = round_half_up(gross × 10000 / (10000 + rate_bps))
 * tax = gross - taxable
 */
export function taxInclusiveSplit(
  grossPaise: bigint,
  rateBps: number,
): { taxablePaise: bigint; taxPaise: bigint } {
  if (grossPaise < BigInt(0)) {
    throw new MoneyParseError("grossPaise must be non-negative.");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new MoneyParseError("rateBps must be an integer in 0..10000.");
  }
  const taxablePaise = roundHalfUpDivide(grossPaise * BigInt(10000), BigInt(10000) + BigInt(rateBps));
  return { taxablePaise, taxPaise: grossPaise - taxablePaise };
}
