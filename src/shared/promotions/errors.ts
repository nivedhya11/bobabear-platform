/**
 * Secret-safe promotion error types (IMP-016).
 */

import type {
  PromotionAdminErrorCode,
  PromotionFatalErrorCode,
} from "./constants";

export class PromotionFatalError extends Error {
  readonly code: PromotionFatalErrorCode;

  constructor(code: PromotionFatalErrorCode, message: string) {
    super(message);
    this.name = "PromotionFatalError";
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): { name: string; message: string; code: PromotionFatalErrorCode } {
    return { name: this.name, message: this.message, code: this.code };
  }
}

export class PromotionAdminError extends Error {
  readonly code: PromotionAdminErrorCode;

  constructor(code: PromotionAdminErrorCode, message: string) {
    super(message);
    this.name = "PromotionAdminError";
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): { name: string; message: string; code: PromotionAdminErrorCode } {
    return { name: this.name, message: this.message, code: this.code };
  }
}

export class PromotionValidationError extends PromotionAdminError {
  constructor(message: string, code: PromotionAdminErrorCode = "validation") {
    super(code, message);
    this.name = "PromotionValidationError";
  }
}

export class PromotionNotFoundError extends PromotionAdminError {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", `${resourceType} not found.`);
    this.name = "PromotionNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    code: PromotionAdminErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}
