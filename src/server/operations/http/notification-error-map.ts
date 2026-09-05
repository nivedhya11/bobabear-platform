/** Operations Notification error → safe HTTP envelope (IMP-036D). */
import "server-only";

import { NotificationError } from "../../../shared/notifications";
import { OrderError } from "../../../shared/order";

export type NotificationOperationsErrorBody = Readonly<{
  ok: false;
  code: string;
  requestId: string;
  field?: string;
}>;

const NOTIFICATION_ERROR_STATUSES: Readonly<Record<string, number>> = {
  WORKFORCE_AUTH_REQUIRED: 401,
  NOTIFICATION_UNAUTHORIZED: 403,
  NOTIFICATION_NOT_FOUND: 404,
  NOTIFICATION_INVALID_INPUT: 400,
  NOTIFICATION_RESEND_NOT_ALLOWED: 409,
  NOTIFICATION_STATE_CONFLICT: 409,
  NOTIFICATION_TEMPLATE_NOT_APPROVED: 409,
  NOTIFICATION_TEMPLATE_VARIABLES_INVALID: 409,
  ORDER_UNAUTHORIZED: 403,
  ORDER_NOT_FOUND: 404,
  ORDER_REQUEST_INVALID: 400,
};

export function mapNotificationOperationsError(
  error: unknown,
  requestId: string,
): Readonly<{ status: number; body: NotificationOperationsErrorBody }> {
  if (error instanceof NotificationError) {
    const status = NOTIFICATION_ERROR_STATUSES[error.code];
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
  if (error instanceof OrderError) {
    const status = NOTIFICATION_ERROR_STATUSES[error.code];
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
