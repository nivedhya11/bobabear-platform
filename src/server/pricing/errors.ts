/**
 * Secret-safe pricing-module errors (IMP-015).
 */

export type PricingErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "PRICE_MISSING"
  | "MODIFIER_PRICE_MISSING"
  | "BUNDLE_OPTION_PRICE_MISSING"
  | "OVERRIDE_NOT_PERMITTED"
  | "OVERRIDE_OUT_OF_BOUNDS"
  | "PRICE_BOOK_OVERLAP"
  | "TAX_CONFIGURATION_MISSING"
  | "SOURCE_PRICE_INVALID"
  | "PRICING_BOOTSTRAP_CONFLICT"
  | "SOURCE_DRIFT"
  | "persistence";

interface BaseDetails {
  readonly message: string;
  readonly code?: PricingErrorCode;
}

abstract class PricingErrorBase extends Error {
  readonly pricingErrorCode: PricingErrorCode;

  protected constructor(code: PricingErrorCode, details: BaseDetails) {
    super(details.message);
    this.pricingErrorCode = details.code ?? code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    pricingErrorCode: PricingErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      pricingErrorCode: this.pricingErrorCode,
    };
  }
}

export class PricingValidationError extends PricingErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "PricingValidationError";
  }
}

export class PricingNotFoundError extends PricingErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "PricingNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    pricingErrorCode: PricingErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class PricingConflictError extends PricingErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "PricingConflictError";
  }
}

export class PricingInvalidStateError extends PricingErrorBase {
  constructor(details: BaseDetails) {
    super("invalid_state", details);
    this.name = "PricingInvalidStateError";
  }
}

export class PricingResolutionError extends PricingErrorBase {
  constructor(
    code:
      | "PRICE_MISSING"
      | "MODIFIER_PRICE_MISSING"
      | "BUNDLE_OPTION_PRICE_MISSING"
      | "OVERRIDE_NOT_PERMITTED"
      | "OVERRIDE_OUT_OF_BOUNDS"
      | "TAX_CONFIGURATION_MISSING",
    message: string,
  ) {
    super(code, { message, code });
    this.name = "PricingResolutionError";
  }
}

export class PricingBootstrapError extends PricingErrorBase {
  constructor(
    code: "PRICING_BOOTSTRAP_CONFLICT" | "SOURCE_DRIFT" | "SOURCE_PRICE_INVALID" | "validation",
    message: string,
  ) {
    super(code, { message, code });
    this.name = "PricingBootstrapError";
  }
}
