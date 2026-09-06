/**
 * Refund domain errors (IMP-027 / D-364).
 */

export const REFUND_ERROR_CODES = [
  "WORKFORCE_AUTH_REQUIRED",
  "REFUND_UNAUTHORIZED",
  "REFUND_NOT_FOUND",
  "REFUND_INVALID_INPUT",
  "REFUND_PAYMENT_NOT_ELIGIBLE",
  "REFUND_AMOUNT_EXCEEDS_REMAINING",
  "REFUND_PROVIDER_UNSUPPORTED",
  "REFUND_PROVIDER_UNAVAILABLE",
  "REFUND_PROVIDER_REFERENCE_MISSING",
  "REFUND_CURRENCY_MISMATCH",
  "REFUND_REASON_REQUIRED",
  "REFUND_STATE_CONFLICT",
  "REFUND_FULLY_REFUNDED",
  "REFUND_IDEMPOTENCY_CONFLICT",
] as const;

export type RefundErrorCode = (typeof REFUND_ERROR_CODES)[number];

export class RefundError extends Error {
  readonly code: RefundErrorCode;
  readonly field?: string;

  constructor(code: RefundErrorCode, message: string, options?: { field?: string }) {
    super(message);
    this.name = "RefundError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{ code: RefundErrorCode; message: string; field?: string }> {
    return Object.freeze({
      code: this.code,
      message: this.message,
      ...(this.field !== undefined ? { field: this.field } : {}),
    });
  }
}

export function isRefundError(value: unknown): value is RefundError {
  return value instanceof RefundError;
}
