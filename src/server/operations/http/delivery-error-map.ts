/** Operations Delivery error → safe HTTP envelope (IMP-032). */
import "server-only";

import { DeliveryError } from "../../../shared/delivery";
import { OrderError } from "../../../shared/order";

export type DeliveryOperationsErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
}>;

const DELIVERY_ERROR_STATUSES: Readonly<Record<string, number>> = {
  WORKFORCE_AUTH_REQUIRED: 401,
  DELIVERY_UNAUTHORIZED: 403,
  DELIVERY_NOT_FOUND: 404,
  DELIVERY_INVALID_INPUT: 400,
  DELIVERY_REVISION_CONFLICT: 409,
  DELIVERY_STATE_CONFLICT: 409,
  DELIVERY_TRANSITION_NOT_ALLOWED: 409,
  DELIVERY_ACTIVE_EXISTS: 409,
  DELIVERY_ORDER_NOT_ELIGIBLE: 409,
  DELIVERY_BOOKING_AMBIGUOUS: 409,
  DELIVERY_RETURN_NOT_ELIGIBLE: 409,
  DELIVERY_RETURN_NOT_FOUND: 404,
  DELIVERY_RETURN_ACTIVE_EXISTS: 409,
  DELIVERY_OBSERVATION_KEY_REQUIRED: 400,
  ORDER_UNAUTHORIZED: 403,
  ORDER_NOT_FOUND: 404,
  ORDER_REQUEST_INVALID: 400,
  ORDER_CONFLICT: 409,
  ORDER_FULFIL_NOT_ALLOWED: 409,
};

export function mapDeliveryOperationsError(
  error: unknown,
  requestId: string,
): Readonly<{ status: number; body: DeliveryOperationsErrorBody }> {
  if (error instanceof DeliveryError) {
    const status = DELIVERY_ERROR_STATUSES[error.code] ?? 500;
    if (status !== 500) {
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
  if (error instanceof OrderError) {
    const status = DELIVERY_ERROR_STATUSES[error.code] ?? 500;
    if (status !== 500) {
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
