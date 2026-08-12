/**
 * Secret-safe menu-module errors (IMP-013).
 */

import type { MenuSafeErrorCode } from "../../../shared/catalog/menu";

interface BaseDetails {
  readonly message: string;
  readonly code?: MenuSafeErrorCode;
}

abstract class MenuErrorBase extends Error {
  readonly menuErrorCode: MenuSafeErrorCode;

  protected constructor(code: MenuSafeErrorCode, details: BaseDetails) {
    super(details.message);
    this.menuErrorCode = details.code ?? code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    menuErrorCode: MenuSafeErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      menuErrorCode: this.menuErrorCode,
    };
  }
}

export class MenuValidationError extends MenuErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "MenuValidationError";
  }
}

export class MenuNotFoundError extends MenuErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "MenuNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    menuErrorCode: MenuSafeErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class MenuConflictError extends MenuErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "MenuConflictError";
  }
}

export class MenuInvalidStateError extends MenuErrorBase {
  constructor(details: BaseDetails) {
    super("invalid_state", details);
    this.name = "MenuInvalidStateError";
  }
}
