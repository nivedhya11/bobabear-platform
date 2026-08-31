/**
 * Delivery domain errors (IMP-031).
 */

export const DELIVERY_ERROR_CODES = [
  "DELIVERY_NOT_FOUND",
  "DELIVERY_INVALID_INPUT",
  "DELIVERY_STATE_CONFLICT",
  "DELIVERY_REVISION_CONFLICT",
  "DELIVERY_TRANSITION_NOT_ALLOWED",
  "DELIVERY_ACTIVE_EXISTS",
  "DELIVERY_ORDER_NOT_ELIGIBLE",
  "DELIVERY_BOOKING_AMBIGUOUS",
  "DELIVERY_PROVIDER_UNAVAILABLE",
  "DELIVERY_RETURN_NOT_ELIGIBLE",
  "DELIVERY_RETURN_NOT_FOUND",
  "DELIVERY_RETURN_ACTIVE_EXISTS",
  "DELIVERY_OBSERVATION_KEY_REQUIRED",
  "DELIVERY_UNAUTHORIZED",
  "WORKFORCE_AUTH_REQUIRED",
] as const;

export type DeliveryErrorCode = (typeof DELIVERY_ERROR_CODES)[number];

export class DeliveryError extends Error {
  readonly code: DeliveryErrorCode;
  readonly field?: string;

  constructor(
    code: DeliveryErrorCode,
    message: string,
    options?: { field?: string },
  ) {
    super(message);
    this.name = "DeliveryError";
    this.code = code;
    if (options?.field !== undefined) {
      this.field = options.field;
    }
  }

  toSafeJSON(): Readonly<{
    code: DeliveryErrorCode;
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

export function isDeliveryError(value: unknown): value is DeliveryError {
  return value instanceof DeliveryError;
}
