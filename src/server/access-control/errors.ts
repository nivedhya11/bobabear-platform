/**
 * Secret-safe access-control errors (IMP-011).
 */

export type AccessControlErrorCode =
  | "validation"
  | "not_found"
  | "conflict"
  | "forbidden"
  | "invalid_transition"
  | "last_platform_admin"
  | "bootstrap_closed"
  | "bootstrap_ineligible"
  | "delegation_ceiling"
  | "self_elevation"
  | "unauthorized";

interface BaseDetails {
  readonly message: string;
}

abstract class AccessControlErrorBase extends Error {
  readonly accessControlErrorCode: AccessControlErrorCode;

  protected constructor(code: AccessControlErrorCode, details: BaseDetails) {
    super(details.message);
    this.accessControlErrorCode = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toSafeJSON(): {
    name: string;
    message: string;
    accessControlErrorCode: AccessControlErrorCode;
  } {
    return {
      name: this.name,
      message: this.message,
      accessControlErrorCode: this.accessControlErrorCode,
    };
  }
}

export class AccessControlValidationError extends AccessControlErrorBase {
  constructor(details: BaseDetails) {
    super("validation", details);
    this.name = "AccessControlValidationError";
  }
}

export class AccessControlNotFoundError extends AccessControlErrorBase {
  readonly resourceType: string;

  constructor(resourceType: string) {
    super("not_found", { message: `${resourceType} not found.` });
    this.name = "AccessControlNotFoundError";
    this.resourceType = resourceType;
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    accessControlErrorCode: AccessControlErrorCode;
    resourceType: string;
  } {
    return { ...super.toSafeJSON(), resourceType: this.resourceType };
  }
}

export class AccessControlConflictError extends AccessControlErrorBase {
  constructor(details: BaseDetails) {
    super("conflict", details);
    this.name = "AccessControlConflictError";
  }
}

export class AccessControlInvalidTransitionError extends AccessControlErrorBase {
  constructor(details: BaseDetails) {
    super("invalid_transition", details);
    this.name = "AccessControlInvalidTransitionError";
  }
}

export class LastPlatformAdminError extends AccessControlErrorBase {
  constructor(details: BaseDetails = { message: "Cannot remove the last Platform Super Admin." }) {
    super("last_platform_admin", details);
    this.name = "LastPlatformAdminError";
  }
}

export class BootstrapClosedError extends AccessControlErrorBase {
  constructor() {
    super("bootstrap_closed", {
      message: "Platform Super Admin bootstrap is closed.",
    });
    this.name = "BootstrapClosedError";
  }
}

export class BootstrapIneligibleError extends AccessControlErrorBase {
  constructor(details: BaseDetails = { message: "Workforce user is ineligible for bootstrap." }) {
    super("bootstrap_ineligible", details);
    this.name = "BootstrapIneligibleError";
  }
}

export class DelegationCeilingError extends AccessControlErrorBase {
  constructor(
    details: BaseDetails = {
      message: "Grant exceeds actor effective permissions at the target scope.",
    },
  ) {
    super("delegation_ceiling", details);
    this.name = "DelegationCeilingError";
  }
}

export class SelfElevationError extends AccessControlErrorBase {
  constructor(details: BaseDetails = { message: "Self-elevation is not allowed." }) {
    super("self_elevation", details);
    this.name = "SelfElevationError";
  }
}

/** Thrown by `requireAuthorization` on DENY. */
export class AuthorizationError extends AccessControlErrorBase {
  readonly decisionCode: "DENIED";

  constructor(details: BaseDetails = { message: "Authorization denied." }) {
    super("unauthorized", details);
    this.name = "AuthorizationError";
    this.decisionCode = "DENIED";
  }

  override toSafeJSON(): {
    name: string;
    message: string;
    accessControlErrorCode: AccessControlErrorCode;
    decisionCode: "DENIED";
  } {
    return { ...super.toSafeJSON(), decisionCode: this.decisionCode };
  }
}
