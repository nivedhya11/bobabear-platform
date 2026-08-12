/**
 * Secret-safe Cart error types (IMP-020).
 * Never attach raw guest tokens, phone numbers, or connection strings.
 */

import type { CartErrorCode, CartReconciliationResolution } from "./constants";

export class CartError extends Error {
  readonly code: CartErrorCode;
  readonly field?: string;
  readonly resolutionOptions?: readonly CartReconciliationResolution[];

  constructor(
    code: CartErrorCode,
    message: string,
    options?: {
      field?: string;
      resolutionOptions?: readonly CartReconciliationResolution[];
    },
  ) {
    super(message);
    this.name = "CartError";
    this.code = code;
    if (options?.field !== undefined) this.field = options.field;
    if (options?.resolutionOptions !== undefined) {
      this.resolutionOptions = options.resolutionOptions;
    }
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: CartErrorCode;
    field?: string;
    resolutionOptions?: readonly CartReconciliationResolution[];
  } {
    const json: {
      name: string;
      message: string;
      code: CartErrorCode;
      field?: string;
      resolutionOptions?: readonly CartReconciliationResolution[];
    } = {
      name: this.name,
      message: this.message,
      code: this.code,
    };
    if (this.field !== undefined) json.field = this.field;
    if (this.resolutionOptions !== undefined) {
      json.resolutionOptions = this.resolutionOptions;
    }
    return json;
  }
}
