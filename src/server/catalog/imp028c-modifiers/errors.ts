/**
 * Secret-safe IMP-028C modifier bootstrap errors (Slice 4).
 */

export type Imp028cModifiersBootstrapErrorCode =
  | "validation"
  | "SOURCE_DRIFT"
  | "PREREQUISITE_MISSING"
  | "MODIFIER_BOOTSTRAP_CONFLICT"
  | "persistence";

interface BaseDetails {
  readonly message: string;
  readonly code?: Imp028cModifiersBootstrapErrorCode;
}

export class Imp028cModifiersBootstrapError extends Error {
  readonly bootstrapErrorCode: Imp028cModifiersBootstrapErrorCode;

  constructor(code: Imp028cModifiersBootstrapErrorCode, details: BaseDetails) {
    super(details.message);
    this.bootstrapErrorCode = details.code ?? code;
    this.name = "Imp028cModifiersBootstrapError";
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, Imp028cModifiersBootstrapError);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    bootstrapErrorCode: Imp028cModifiersBootstrapErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      bootstrapErrorCode: this.bootstrapErrorCode,
    };
  }
}
