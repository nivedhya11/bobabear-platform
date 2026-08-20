/**
 * Customer Menu projection errors (IMP-028B).
 */

export type CustomerMenuErrorCode =
  | "MENU_INVALID_INPUT"
  | "MENU_UNAVAILABLE"
  | "OUTLET_NOT_FOUND";

export class CustomerMenuError extends Error {
  readonly code: CustomerMenuErrorCode;
  readonly field?: string;

  constructor(code: CustomerMenuErrorCode, message: string, options?: { field?: string }) {
    super(message);
    this.name = "CustomerMenuError";
    this.code = code;
    this.field = options?.field;
  }
}
