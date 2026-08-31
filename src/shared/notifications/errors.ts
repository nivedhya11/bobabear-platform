/**
 * Notification domain errors (IMP-033).
 */

export const NOTIFICATION_ERROR_CODES = [
  "NOTIFICATION_NOT_FOUND",
  "NOTIFICATION_INVALID_INPUT",
  "NOTIFICATION_STATE_CONFLICT",
  "NOTIFICATION_TEMPLATE_NOT_APPROVED",
  "NOTIFICATION_TEMPLATE_VARIABLES_INVALID",
  "NOTIFICATION_RESEND_NOT_ALLOWED",
  "NOTIFICATION_UNAUTHORIZED",
  "WORKFORCE_AUTH_REQUIRED",
] as const;

export type NotificationErrorCode = (typeof NOTIFICATION_ERROR_CODES)[number];

export class NotificationError extends Error {
  readonly code: NotificationErrorCode;
  readonly field?: string;

  constructor(
    code: NotificationErrorCode,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{
    code: NotificationErrorCode;
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

export function isNotificationError(value: unknown): value is NotificationError {
  return value instanceof NotificationError;
}
