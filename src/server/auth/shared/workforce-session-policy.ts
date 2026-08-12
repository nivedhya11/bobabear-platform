/**
 * Workforce-only Better Auth session policy (IMP-010).
 *
 * Intentionally stricter and distinct from the shared customer
 * {@link AUTH_SESSION_POLICY}: 12-hour absolute expiry, no sliding
 * refresh, 5-minute freshness, cookie cache disabled.
 */

export const WORKFORCE_AUTH_SESSION_POLICY = Object.freeze({
  expiresIn: 60 * 60 * 12,
  updateAge: 60 * 60 * 12,
  freshAge: 60 * 5,
  disableSessionRefresh: true,
  storeSessionInDatabase: true,
  cookieCache: Object.freeze({
    enabled: false,
  }),
});

export const WORKFORCE_PASSWORD_MIN_LENGTH = 15;
export const WORKFORCE_PASSWORD_MAX_LENGTH = 128;

export const WORKFORCE_TOTP_DIGITS = 6;
export const WORKFORCE_TOTP_PERIOD_SECONDS = 30;
export const WORKFORCE_TOTP_ISSUER = "BOBA Bear";

export const WORKFORCE_BACKUP_CODE_AMOUNT = 10;
export const WORKFORCE_BACKUP_CODE_LENGTH = 12;

export const WORKFORCE_MFA_MAX_FAILED_ATTEMPTS = 5;
export const WORKFORCE_MFA_LOCK_DURATION_SECONDS = 15 * 60;

/**
 * Shared Better Auth `user.additionalFields` for workforce lifecycle
 * columns. `input: false` / `returned: false` keep them server-controlled
 * and out of public Better Auth user payloads. Safe to import from the
 * schema-generation CLI (no `server-only` marker).
 */
export const WORKFORCE_USER_ADDITIONAL_FIELDS = Object.freeze({
  passwordChangeRequired: Object.freeze({
    type: "boolean" as const,
    required: true,
    defaultValue: true,
    input: false as const,
    returned: false as const,
  }),
  disabledAt: Object.freeze({
    type: "date" as const,
    required: false,
    input: false as const,
    returned: false as const,
  }),
});
