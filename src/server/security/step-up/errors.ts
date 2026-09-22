/**
 * Step-up authentication errors (IMP-038 / capability §11).
 *
 * Never attach raw session tokens, passwords, TOTP codes, or cookies.
 */
import "server-only";

export const STEP_UP_ERROR_CODES = Object.freeze({
  STEP_UP_REQUIRED: "STEP_UP_REQUIRED",
  STEP_UP_INVALID: "STEP_UP_INVALID",
  STEP_UP_EXPIRED: "STEP_UP_EXPIRED",
  STEP_UP_REPLAY: "STEP_UP_REPLAY",
  STEP_UP_CLASS_MISMATCH: "STEP_UP_CLASS_MISMATCH",
} as const);

export type StepUpErrorCode = (typeof STEP_UP_ERROR_CODES)[keyof typeof STEP_UP_ERROR_CODES];

const STEP_UP_HTTP_STATUS: Readonly<Record<StepUpErrorCode, 401 | 403>> = Object.freeze({
  STEP_UP_REQUIRED: 401,
  STEP_UP_INVALID: 403,
  STEP_UP_EXPIRED: 403,
  STEP_UP_REPLAY: 403,
  STEP_UP_CLASS_MISMATCH: 403,
});

export class StepUpError extends Error {
  readonly code: StepUpErrorCode;
  readonly httpStatus: 401 | 403;

  constructor(code: StepUpErrorCode, message?: string) {
    super(message ?? code);
    this.name = "StepUpError";
    this.code = code;
    this.httpStatus = STEP_UP_HTTP_STATUS[code];
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, StepUpError);
    }
  }

  toSafeJSON(): Readonly<{ name: string; code: StepUpErrorCode; httpStatus: 401 | 403 }> {
    return Object.freeze({
      name: this.name,
      code: this.code,
      httpStatus: this.httpStatus,
    });
  }
}

export function isStepUpError(error: unknown): error is StepUpError {
  return error instanceof StepUpError;
}
