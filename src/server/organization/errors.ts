/**
 * Secret-safe organization-module errors (IMP-011).
 */

export type OrganizationErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "persistence";

interface BaseDetails {
  readonly message: string;
  readonly code?: OrganizationErrorCode;
}

abstract class OrganizationErrorBase extends Error {
  readonly organizationErrorCode: OrganizationErrorCode;

  protected constructor(code: OrganizationErrorCode, details: BaseDetails) {
    super(details.message);
    this.organizationErrorCode = details.code ?? code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    organizationErrorCode: OrganizationErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      organizationErrorCode: this.organizationErrorCode,
    };
  }
}

export class OrganizationValidationError extends OrganizationErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "OrganizationValidationError";
  }
}

export class OrganizationNotFoundError extends OrganizationErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "OrganizationNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    organizationErrorCode: OrganizationErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class OrganizationConflictError extends OrganizationErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "OrganizationConflictError";
  }
}
