/**
 * Wire revision conversion for customer-commerce (IMP-024).
 *
 * Cart/Checkout application parsers require `typeof === "bigint"`. JSON
 * cannot carry bigint, so decimal strings on the wire are converted here
 * before application parse.
 */
import "server-only";

const REVISION_FIELDS = [
  "expectedRevision",
  "expectedGuestRevision",
  "expectedCustomerRevision",
  "expectedCheckoutRevision",
] as const;

function toPositiveBigint(raw: unknown): bigint | unknown {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return BigInt(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    try {
      const value = BigInt(raw);
      return value;
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Return a shallow copy of `body` with known revision fields coerced to bigint
 * when they arrive as decimal strings or positive integers.
 */
export function coerceRevisionFields(
  body: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  for (const field of REVISION_FIELDS) {
    if (field in out) {
      out[field] = toPositiveBigint(out[field]);
    }
  }
  return out;
}
