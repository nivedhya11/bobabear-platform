/**
 * Secret-safe assortment-module errors (IMP-014).
 */

export type AssortmentErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "BOOTSTRAP_CONFLICT"
  | "SOURCE_DRIFT"
  | "persistence";

interface BaseDetails {
  readonly message: string;
  readonly code?: AssortmentErrorCode;
}

abstract class AssortmentErrorBase extends Error {
  readonly assortmentErrorCode: AssortmentErrorCode;

  protected constructor(code: AssortmentErrorCode, details: BaseDetails) {
    super(details.message);
    this.assortmentErrorCode = details.code ?? code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    assortmentErrorCode: AssortmentErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      assortmentErrorCode: this.assortmentErrorCode,
    };
  }
}

export class AssortmentValidationError extends AssortmentErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "AssortmentValidationError";
  }
}

export class AssortmentNotFoundError extends AssortmentErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "AssortmentNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    assortmentErrorCode: AssortmentErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class AssortmentConflictError extends AssortmentErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "AssortmentConflictError";
  }
}

export class AssortmentInvalidStateError extends AssortmentErrorBase {
  constructor(details: BaseDetails) {
    super("invalid_state", details);
    this.name = "AssortmentInvalidStateError";
  }
}

export class AssortmentBootstrapError extends AssortmentErrorBase {
  constructor(
    code: "BOOTSTRAP_CONFLICT" | "SOURCE_DRIFT" | "validation",
    message: string,
  ) {
    super(code, { message, code });
    this.name = "AssortmentBootstrapError";
  }
}
