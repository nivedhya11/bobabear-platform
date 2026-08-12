/**
 * Workforce authentication lifecycle state mapping (IMP-010).
 *
 * Fully authenticated requires a valid session, `disabledAt === null`,
 * `passwordChangeRequired === false`, and `twoFactorEnabled === true`.
 */

export const WORKFORCE_AUTH_LIFECYCLE_STATES = [
  "UNAUTHENTICATED",
  "PASSWORD_CHANGE_REQUIRED",
  "MFA_ENROLLMENT_REQUIRED",
  "MFA_CHALLENGE_REQUIRED",
  "AUTHENTICATED",
] as const;

export type WorkforceAuthLifecycleState =
  (typeof WORKFORCE_AUTH_LIFECYCLE_STATES)[number];

export type WorkforceAuthLifecycleUser = Readonly<{
  id: string;
  disabledAt: Date | string | null;
  passwordChangeRequired: boolean;
  /** Nullable to match Better Auth 1.6.25's `required: false` column. */
  twoFactorEnabled: boolean | null;
}>;

export type ResolveWorkforceAuthLifecycleInput = Readonly<{
  sessionPresent: boolean;
  user: WorkforceAuthLifecycleUser | null;
  /** Set when Better Auth returned `twoFactorRedirect: true` (no live session). */
  twoFactorChallengePending?: boolean;
}>;

function isDisabled(disabledAt: Date | string | null): boolean {
  if (disabledAt === null || disabledAt === undefined) return false;
  if (disabledAt instanceof Date) return !Number.isNaN(disabledAt.getTime());
  if (typeof disabledAt === "string") return disabledAt.length > 0;
  return true;
}

/**
 * Map session + user lifecycle fields to a single workforce auth state.
 */
export function resolveWorkforceAuthLifecycle(
  input: ResolveWorkforceAuthLifecycleInput,
): WorkforceAuthLifecycleState {
  if (input.twoFactorChallengePending) {
    return "MFA_CHALLENGE_REQUIRED";
  }

  if (!input.sessionPresent || input.user === null) {
    return "UNAUTHENTICATED";
  }

  if (isDisabled(input.user.disabledAt)) {
    return "UNAUTHENTICATED";
  }

  if (input.user.passwordChangeRequired) {
    return "PASSWORD_CHANGE_REQUIRED";
  }

  if (!input.user.twoFactorEnabled) {
    return "MFA_ENROLLMENT_REQUIRED";
  }

  return "AUTHENTICATED";
}

export function isFullyAuthenticated(
  state: WorkforceAuthLifecycleState,
): boolean {
  return state === "AUTHENTICATED";
}
