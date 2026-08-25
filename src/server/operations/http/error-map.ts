/** Operations Order-read error → safe HTTP envelope (IMP-029). */
import "server-only";

import { OrderError } from "../../../shared/order";

export type OperationsErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
}>;

export type MappedOperationsError = Readonly<{
  status: number;
  body: OperationsErrorBody;
}>;

const OPERATIONS_ERROR_STATUSES: Readonly<Record<string, number>> = {
  WORKFORCE_AUTH_REQUIRED: 401,
  ORDER_UNAUTHORIZED: 403,
  ORDER_NOT_FOUND: 404,
  ORDER_REQUEST_INVALID: 400,
  ORDER_CURSOR_INVALID: 400,
  ORDER_CANCELLATION_REASON_INVALID: 400,
  ORDER_CONFLICT: 409,
  ORDER_ACCEPT_NOT_ALLOWED: 409,
  ORDER_FULFIL_NOT_ALLOWED: 409,
  ORDER_CANCEL_NOT_ALLOWED: 409,
};

export function mapOperationsError(
  error: unknown,
  requestId: string,
): MappedOperationsError {
  if (error instanceof OrderError) {
    const status = OPERATIONS_ERROR_STATUSES[error.code];
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

  return {
    status: 500,
    body: { ok: false, code: "INTERNAL_ERROR", requestId },
  };
}
