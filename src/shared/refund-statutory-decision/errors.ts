/**
 * RefundStatutoryDecision domain errors (IMP-028 / D-366).
 */

export const REFUND_STATUTORY_DECISION_ERROR_CODES = [
  "REFUND_STATUTORY_DECISION_INVALID_INPUT",
  "REFUND_STATUTORY_DECISION_NOT_FOUND",
  "REFUND_NOT_FOUND",
  "REFUND_NOT_PROCESSED",
  "REFUND_STATUTORY_DECISION_IDEMPOTENCY_CONFLICT",
  "REFUND_STATUTORY_DECISION_NOT_ELIGIBLE",
  "REFUND_STATUTORY_ISSUANCE_ALLOCATION_REQUIRED",
] as const;

export type RefundStatutoryDecisionErrorCode =
  (typeof REFUND_STATUTORY_DECISION_ERROR_CODES)[number];

export class RefundStatutoryDecisionError extends Error {
  readonly code: RefundStatutoryDecisionErrorCode;
  readonly field?: string;

  constructor(
    code: RefundStatutoryDecisionErrorCode,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "RefundStatutoryDecisionError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{
    code: RefundStatutoryDecisionErrorCode;
    message: string;
    field?: string;
  }> {
    return Object.freeze({
      code: this.code,
      message: this.message,
      ...(this.field !== undefined ? { field: this.field } : {}),
    });
  }
}

export function isRefundStatutoryDecisionError(
  value: unknown,
): value is RefundStatutoryDecisionError {
  return value instanceof RefundStatutoryDecisionError;
}
