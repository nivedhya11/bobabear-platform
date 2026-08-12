/**
 * Secret-safe Serviceability domain errors (IMP-019).
 */
import {
  SERVICEABILITY_ERROR_CODES,
  type ServiceabilityErrorCode,
} from "./constants";

export class ServiceabilityError extends Error {
  readonly code: ServiceabilityErrorCode;
  readonly field: string | undefined;

  constructor(
    code: ServiceabilityErrorCode,
    message: string,
    field?: string,
  ) {
    super(message);
    this.name = "ServiceabilityError";
    this.code = code;
    this.field = field;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, ServiceabilityError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: ServiceabilityErrorCode;
    field?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...(this.field !== undefined ? { field: this.field } : {}),
    };
  }
}

export function isServiceabilityErrorCode(
  value: string,
): value is ServiceabilityErrorCode {
  return (SERVICEABILITY_ERROR_CODES as readonly string[]).includes(value);
}
