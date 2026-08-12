/**
 * Secret-safe catalog-module errors (IMP-012).
 */

export type CatalogErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "persistence";

interface BaseDetails {
  readonly message: string;
  readonly code?: CatalogErrorCode;
}

abstract class CatalogErrorBase extends Error {
  readonly catalogErrorCode: CatalogErrorCode;

  protected constructor(code: CatalogErrorCode, details: BaseDetails) {
    super(details.message);
    this.catalogErrorCode = details.code ?? code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    catalogErrorCode: CatalogErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      catalogErrorCode: this.catalogErrorCode,
    };
  }
}

export class CatalogValidationError extends CatalogErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "CatalogValidationError";
  }
}

export class CatalogNotFoundError extends CatalogErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "CatalogNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    catalogErrorCode: CatalogErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class CatalogConflictError extends CatalogErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "CatalogConflictError";
  }
}

export class CatalogInvalidStateError extends CatalogErrorBase {
  constructor(details: BaseDetails) {
    super("invalid_state", details);
    this.name = "CatalogInvalidStateError";
  }
}
