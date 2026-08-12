/**
 * Secret-safe Checkout error types (IMP-021).
 * Never attach phone numbers, connection strings, or raw OTP codes.
 */

import type {
  CheckoutErrorCode,
  CheckoutMerchandiseProblemCode,
} from "./constants";

export type CheckoutMerchandiseProblem = Readonly<{
  cartLineId: string;
  code: CheckoutMerchandiseProblemCode;
}>;

export class CheckoutError extends Error {
  readonly code: CheckoutErrorCode;
  readonly field?: string;
  readonly problems?: readonly CheckoutMerchandiseProblem[];

  constructor(
    code: CheckoutErrorCode,
    message: string,
    options?: {
      field?: string;
      problems?: readonly CheckoutMerchandiseProblem[];
    },
  ) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    if (options?.field !== undefined) this.field = options.field;
    if (options?.problems !== undefined) this.problems = options.problems;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    code: CheckoutErrorCode;
    field?: string;
    problems?: readonly CheckoutMerchandiseProblem[];
  } {
    const json: {
      name: string;
      message: string;
      code: CheckoutErrorCode;
      field?: string;
      problems?: readonly CheckoutMerchandiseProblem[];
    } = {
      name: this.name,
      message: this.message,
      code: this.code,
    };
    if (this.field !== undefined) json.field = this.field;
    if (this.problems !== undefined) json.problems = this.problems;
    return json;
  }
}
