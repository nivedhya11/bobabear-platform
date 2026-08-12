/**
 * Trusted workforce principal for authorization (IMP-011).
 *
 * Only {@link createWorkforcePrincipalFromTrustedIdentity} can produce a
 * usable principal. Plain objects without the brand symbol are rejected by
 * authorize / requireAuthorization / getEffectivePermissions.
 */

const WORKFORCE_PRINCIPAL_BRAND = Symbol.for("boba-bear.WorkforcePrincipal");

export type WorkforcePrincipalIdentity = Readonly<{
  workforceUserId: string;
  disabledAt: Date | null;
  passwordChangeRequired: boolean;
  twoFactorEnabled: boolean | null;
}>;

export type WorkforcePrincipal = Readonly<{
  readonly workforceUserId: string;
  readonly disabledAt: null;
  readonly passwordChangeRequired: false;
  readonly twoFactorEnabled: true;
}> & {
  readonly [WORKFORCE_PRINCIPAL_BRAND]: true;
};

export class WorkforcePrincipalError extends Error {
  readonly code:
    | "missing_user_id"
    | "disabled"
    | "password_change_required"
    | "mfa_required"
    | "untrusted";

  constructor(
    code: WorkforcePrincipalError["code"],
    message: string,
  ) {
    super(message);
    this.name = "WorkforcePrincipalError";
    this.code = code;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, WorkforcePrincipalError);
    }
  }

  toSafeJSON(): { name: string; message: string; code: WorkforcePrincipalError["code"] } {
    return { name: this.name, message: this.message, code: this.code };
  }
}

/**
 * Build a branded principal from server-loaded workforce identity flags.
 * Rejects disabled users, password-change-required, and MFA-not-enabled.
 */
export function createWorkforcePrincipalFromTrustedIdentity(
  identity: WorkforcePrincipalIdentity,
): WorkforcePrincipal {
  if (
    typeof identity !== "object" ||
    identity === null ||
    typeof identity.workforceUserId !== "string" ||
    identity.workforceUserId.length === 0
  ) {
    throw new WorkforcePrincipalError("missing_user_id", "workforceUserId is required.");
  }
  if (identity.disabledAt !== null && identity.disabledAt !== undefined) {
    throw new WorkforcePrincipalError("disabled", "Workforce user is disabled.");
  }
  if (identity.passwordChangeRequired !== false) {
    throw new WorkforcePrincipalError(
      "password_change_required",
      "Workforce user must change password before authorization.",
    );
  }
  if (identity.twoFactorEnabled !== true) {
    throw new WorkforcePrincipalError(
      "mfa_required",
      "Workforce user must have MFA enabled before authorization.",
    );
  }

  const principal = {
    workforceUserId: identity.workforceUserId,
    disabledAt: null,
    passwordChangeRequired: false as const,
    twoFactorEnabled: true as const,
  };
  Object.defineProperty(principal, WORKFORCE_PRINCIPAL_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(principal) as WorkforcePrincipal;
}

/** True only for principals created by {@link createWorkforcePrincipalFromTrustedIdentity}. */
export function isWorkforcePrincipal(value: unknown): value is WorkforcePrincipal {
  if (typeof value !== "object" || value === null) return false;
  return (
    Object.prototype.hasOwnProperty.call(value, WORKFORCE_PRINCIPAL_BRAND) &&
    (value as Record<symbol, unknown>)[WORKFORCE_PRINCIPAL_BRAND] === true &&
    typeof (value as WorkforcePrincipal).workforceUserId === "string" &&
    (value as WorkforcePrincipal).disabledAt === null &&
    (value as WorkforcePrincipal).passwordChangeRequired === false &&
    (value as WorkforcePrincipal).twoFactorEnabled === true
  );
}

export function requireWorkforcePrincipal(value: unknown): WorkforcePrincipal {
  if (!isWorkforcePrincipal(value)) {
    throw new WorkforcePrincipalError(
      "untrusted",
      "Actor must be a trusted WorkforcePrincipal.",
    );
  }
  return value;
}
