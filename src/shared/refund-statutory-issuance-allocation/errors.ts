/**
 * RefundStatutoryIssuanceAllocation domain errors (IMP-028 / D-366 Slice 3A).
 */

export const REFUND_STATUTORY_ISSUANCE_ALLOCATION_ERROR_CODES = [
  "REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT",
  "REFUND_STATUTORY_ISSUANCE_ALLOCATION_NOT_ELIGIBLE",
  "REFUND_STATUTORY_ISSUANCE_ALLOCATION_CONFLICT",
  "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
  "REFUND_STATUTORY_DECISION_NOT_FOUND",
] as const;

export type RefundStatutoryIssuanceAllocationErrorCode =
  (typeof REFUND_STATUTORY_ISSUANCE_ALLOCATION_ERROR_CODES)[number];

export class RefundStatutoryIssuanceAllocationError extends Error {
  readonly code: RefundStatutoryIssuanceAllocationErrorCode;
  readonly field?: string;

  constructor(
    code: RefundStatutoryIssuanceAllocationErrorCode,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "RefundStatutoryIssuanceAllocationError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{
    code: RefundStatutoryIssuanceAllocationErrorCode;
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

export function isRefundStatutoryIssuanceAllocationError(
  value: unknown,
): value is RefundStatutoryIssuanceAllocationError {
  return value instanceof RefundStatutoryIssuanceAllocationError;
}
