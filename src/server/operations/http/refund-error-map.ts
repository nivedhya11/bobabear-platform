/** Operations Refund error → safe HTTP envelope (IMP-036D). */
import "server-only";

import { RefundError } from "../../../shared/refund";

export type RefundOperationsErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
}>;

const REFUND_ERROR_STATUSES: Readonly<Record<string, number>> = {
  WORKFORCE_AUTH_REQUIRED: 401,
  REFUND_UNAUTHORIZED: 403,
  REFUND_NOT_FOUND: 404,
  REFUND_INVALID_INPUT: 400,
  REFUND_REASON_REQUIRED: 400,
  REFUND_CURRENCY_MISMATCH: 400,
  REFUND_PAYMENT_NOT_ELIGIBLE: 409,
  REFUND_AMOUNT_EXCEEDS_REMAINING: 409,
  REFUND_FULLY_REFUNDED: 409,
  REFUND_PROVIDER_REFERENCE_MISSING: 409,
  REFUND_PROVIDER_UNSUPPORTED: 409,
  REFUND_PROVIDER_UNAVAILABLE: 409,
  REFUND_STATE_CONFLICT: 409,
  REFUND_IDEMPOTENCY_CONFLICT: 409,
};

export function mapRefundOperationsError(
  error: unknown,
  requestId: string,
): Readonly<{ status: number; body: RefundOperationsErrorBody }> {
  if (error instanceof RefundError) {
    const status = REFUND_ERROR_STATUSES[error.code];
    if (status !== undefined) {
      return {
        status,
        body: {
          ok: false,
          code: error.code,
          requestId,
          ...(error.field !== undefined ? { field: error.field } : {}),
        },
      };
    }
  }
  return { status: 500, body: { ok: false, code: "INTERNAL_ERROR", requestId } };
}
