/**
 * Secret-safe Customer Profile error types (IMP-017).
 * Never attach raw name/email/phone values to messages or JSON.
 */

import type { CustomerProfileErrorCode } from "./constants";

export class CustomerProfileError extends Error {
  readonly code: CustomerProfileErrorCode;
  readonly field?: string;

  constructor(code: CustomerProfileErrorCode, message: string, field?: string) {
    super(message);
    this.name = "CustomerProfileError";
    this.code = code;
    if (field !== undefined) this.field = field;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: CustomerProfileErrorCode;
    field?: string;
  } {
    const json: {
      name: string;
      message: string;
      code: CustomerProfileErrorCode;
      field?: string;
    } = {
      name: this.name,
      message: this.message,
      code: this.code,
    };
    if (this.field !== undefined) json.field = this.field;
    return json;
  }
}
