/**
 * Payment domain errors (IMP-022).
 */

export const PAYMENT_ERROR_CODES = [
  "CUSTOMER_AUTH_REQUIRED",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_CONFLICT",
  "PAYMENT_STATE_CONFLICT",
  "PAYMENT_EXPIRED",
  "PAYMENT_ALREADY_PROCESSING",
  "PAYMENT_TERMINAL",
  "PAYMENT_UNRESOLVED_ATTEMPT",
  "PAYMENT_UNSUPPORTED_METHOD",
  "PAYMENT_INVALID_INPUT",
  "PAYMENT_IDEMPOTENCY_CONFLICT",
  "PAYMENT_PROVIDER_INDETERMINATE",
  "PAYMENT_PROVIDER_EVIDENCE_INVALID",
  "PAYMENT_PROVIDER_FINANCIAL_MISMATCH",
  "PAYMENT_RECONCILIATION_REQUIRED",
  "PAYMENT_RECONCILIATION_ANOMALY",
  "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
  "PAYMENT_CHECKOUT_NOT_READY",
  "PAYMENT_ZERO_PAYABLE_INVALID",
  "PAYMENT_NEGATIVE_PAYABLE",
  "PAYMENT_POLICY_INVALID",
] as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[number];

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly field?: string;

  constructor(code: PaymentErrorCode, message: string, options?: { field?: string }) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{ code: PaymentErrorCode; message: string; field?: string }> {
    return Object.freeze({
      code: this.code,
      message: this.message,
      ...(this.field !== undefined ? { field: this.field } : {}),
    });
  }
}

export function isPaymentError(value: unknown): value is PaymentError {
  return value instanceof PaymentError;
}
