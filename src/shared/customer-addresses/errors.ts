/**
 * Secret-safe Customer Address error types (IMP-018).
 * Never attach raw address/contact/location values to messages or JSON.
 */

import type { CustomerAddressErrorCode } from "./constants";

export class CustomerAddressError extends Error {
  readonly code: CustomerAddressErrorCode;
  readonly field?: string;

  constructor(code: CustomerAddressErrorCode, message: string, field?: string) {
    super(message);
    this.name = "CustomerAddressError";
    this.code = code;
    if (field !== undefined) this.field = field;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: CustomerAddressErrorCode;
    field?: string;
  } {
    const json: {
      name: string;
      message: string;
      code: CustomerAddressErrorCode;
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
