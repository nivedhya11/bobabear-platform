/**
 * Workforce realm Better Auth options (IMP-008 foundation; IMP-010
 * email/password + mandatory TOTP MFA). Customer phone OTP stays disabled
 * here — the only enabled plugin is Better Auth's workforce-only
 * `twoFactor` plugin.
 */
import "server-only";

import type { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins/two-factor";

import {
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
} from "../shared/constants";
import type { WorkforceAuthConfig } from "../shared/types";
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
} from "../shared/workforce-session-policy";

type WorkforceBetterAuthDatabaseAdapter = ReturnType<typeof drizzleAdapter>;

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(["staging", "production"]);

export function buildWorkforceBetterAuthOptions(
  config: WorkforceAuthConfig,
  database: WorkforceBetterAuthDatabaseAdapter,
) {
  return {
    appName: "BOBA Bear Workforce",
    secret: config.secret,
    baseURL: config.baseURL.origin,
    basePath: WORKFORCE_AUTH_BASE_PATH,
    trustedOrigins: [config.baseURL.origin],

    database,

    session: WORKFORCE_AUTH_SESSION_POLICY,

    user: {
      additionalFields: WORKFORCE_USER_ADDITIONAL_FIELDS,
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: WORKFORCE_PASSWORD_MIN_LENGTH,
      maxPasswordLength: WORKFORCE_PASSWORD_MAX_LENGTH,
      disableSignUp: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
    socialProviders: {},
    plugins: [
      twoFactor({
        issuer: WORKFORCE_TOTP_ISSUER,
        skipVerificationOnEnable: false,
        // Trusted-device bypass is never offered by the public façade; keep
        // the cookie max age at zero so a client-supplied trustDevice cannot
        // establish a lasting bypass even if it somehow reaches Better Auth.
        trustDeviceMaxAge: 0,
        allowPasswordless: false,
        totpOptions: {
          digits: WORKFORCE_TOTP_DIGITS,
          period: WORKFORCE_TOTP_PERIOD_SECONDS,
        },
        backupCodeOptions: {
          amount: WORKFORCE_BACKUP_CODE_AMOUNT,
          length: WORKFORCE_BACKUP_CODE_LENGTH,
          // Better Auth 1.6.25 has no hashed backup-code mode — encrypted
          // (XChaCha20-Poly1305) is the supported non-plaintext option.
          storeBackupCodes: "encrypted",
        },
        accountLockout: {
          enabled: true,
          maxFailedAttempts: WORKFORCE_MFA_MAX_FAILED_ATTEMPTS,
          durationSeconds: WORKFORCE_MFA_LOCK_DURATION_SECONDS,
        },
      }),
    ],

    advanced: {
      cookiePrefix: WORKFORCE_AUTH_COOKIE_PREFIX,
      useSecureCookies: PRODUCTION_LIKE_ENVIRONMENTS.has(config.environmentType),
    },

    rateLimit: {
      enabled: false,
    },

    logger: {
      disabled: true,
    },

    telemetry: {
      enabled: false,
    },

    experimental: {
      joins: false,
    },
  };
}
