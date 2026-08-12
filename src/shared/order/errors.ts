/**
 * Order domain errors (IMP-023).
 */

export const ORDER_ERROR_CODES = [
  "ORDER_NOT_FOUND",
  "ORDER_CONFLICT",
  "ORDER_ACCEPT_NOT_ALLOWED",
  "ORDER_FULFIL_NOT_ALLOWED",
  "ORDER_CANCEL_NOT_ALLOWED",
  "ORDER_CANCELLATION_REASON_INVALID",
  "ORDER_REQUEST_INVALID",
  "ORDER_CURSOR_INVALID",
  "ORDER_MATERIALIZATION_ANOMALY",
  "ORDER_NUMBER_COLLISION_EXHAUSTED",
  "CUSTOMER_AUTH_REQUIRED",
  "WORKFORCE_AUTH_REQUIRED",
  "ORDER_UNAUTHORIZED",
  "ORDER_POLICY_INVALID",
] as const;

export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];

export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly field?: string;

  constructor(
    code: OrderErrorCode,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{
    code: OrderErrorCode;
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

export function isOrderError(value: unknown): value is OrderError {
  return value instanceof OrderError;
}
