/**
 * Better Auth CLI schema-generation fixture (IMP-008 core; IMP-010
 * email/password + TOTP MFA, workforce realm only).
 *
 * Used only by `./node_modules/.bin/auth generate` (via
 * `npm run auth:schema:generate` / `auth:schema:check`) to introspect Better
 * Auth 1.6.25's model contract for the workforce realm. No network, no
 * database. The `twoFactor` plugin and `user.additionalFields` below exist
 * only so the CLI emits `twoFactorEnabled`, the lifecycle columns, and the
 * `twoFactor` table shape — matching production
 * `src/server/auth/workforce/options.ts`.
 */
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";

import {
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
} from "../../../src/server/auth/shared/constants";
import {
  WORKFORCE_AUTH_SESSION_POLICY,
  WORKFORCE_BACKUP_CODE_AMOUNT,
  WORKFORCE_BACKUP_CODE_LENGTH,
  WORKFORCE_MFA_LOCK_DURATION_SECONDS,
  WORKFORCE_MFA_MAX_FAILED_ATTEMPTS,
  WORKFORCE_PASSWORD_MAX_LENGTH,
  WORKFORCE_PASSWORD_MIN_LENGTH,
  WORKFORCE_TOTP_DIGITS,
  WORKFORCE_TOTP_ISSUER,
  WORKFORCE_TOTP_PERIOD_SECONDS,
  WORKFORCE_USER_ADDITIONAL_FIELDS,
} from "../../../src/server/auth/shared/workforce-session-policy";

export const auth = betterAuth({
  appName: "BOBA Bear Workforce (schema generation)",
  secret: "schema-generation-fixture-secret-not-a-real-secret-value",
  baseURL: "http://localhost:3100",
  basePath: WORKFORCE_AUTH_BASE_PATH,
  session: WORKFORCE_AUTH_SESSION_POLICY,
  user: {
    additionalFields: WORKFORCE_USER_ADDITIONAL_FIELDS,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: WORKFORCE_PASSWORD_MIN_LENGTH,
    maxPasswordLength: WORKFORCE_PASSWORD_MAX_LENGTH,
    disableSignUp: true,
  },
  socialProviders: {},
  plugins: [
    twoFactor({
      issuer: WORKFORCE_TOTP_ISSUER,
      skipVerificationOnEnable: false,
      trustDeviceMaxAge: 0,
      allowPasswordless: false,
      totpOptions: {
        digits: WORKFORCE_TOTP_DIGITS,
        period: WORKFORCE_TOTP_PERIOD_SECONDS,
      },
      backupCodeOptions: {
        amount: WORKFORCE_BACKUP_CODE_AMOUNT,
        length: WORKFORCE_BACKUP_CODE_LENGTH,
        storeBackupCodes: "encrypted",
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: WORKFORCE_MFA_MAX_FAILED_ATTEMPTS,
        durationSeconds: WORKFORCE_MFA_LOCK_DURATION_SECONDS,
      },
    }),
  ],
  advanced: { cookiePrefix: WORKFORCE_AUTH_COOKIE_PREFIX },
  rateLimit: { enabled: false },
  logger: { disabled: true },
  telemetry: { enabled: false },
});
