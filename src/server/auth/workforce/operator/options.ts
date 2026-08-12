/**
 * Better Auth options for the CLI-only workforce operator auth runtime
 * (IMP-010 supported credential flow).
 *
 * Distinct from the public workforce runtime in `../options.ts`:
 * - `disableSignUp: false` / `autoSignIn: false` so operator tooling can
 *   call `signUpEmail` without minting a session
 * - in-process `sendResetPassword` token bridge (no email)
 * - password-reset verification identifiers stored hashed
 *
 * Never bind an HTTP port; never import from workforce-auth HTTP routing.
 */
import "server-only";

import type { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins/two-factor";

import {
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
} from "../../shared/constants";
import type { WorkforceAuthConfig } from "../../shared/types";
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
} from "../../shared/workforce-session-policy";
import type { WorkforceOperatorResetPasswordCallbackInput } from "./reset-token-bridge";

type WorkforceBetterAuthDatabaseAdapter = ReturnType<typeof drizzleAdapter>;

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(["staging", "production"]);

/** Better Auth 1.6.25 stores reset tokens under this identifier prefix. */
export const WORKFORCE_PASSWORD_RESET_IDENTIFIER_PREFIX = "reset-password:";

export type WorkforceOperatorBetterAuthOptionsInput = Readonly<{
  config: WorkforceAuthConfig;
  database: WorkforceBetterAuthDatabaseAdapter;
  sendResetPassword: (
    data: WorkforceOperatorResetPasswordCallbackInput,
    request?: Request,
  ) => Promise<void>;
}>;

export function buildWorkforceOperatorBetterAuthOptions(
  input: WorkforceOperatorBetterAuthOptionsInput,
) {
  const { config, database, sendResetPassword } = input;

  return {
    appName: "BOBA Bear Workforce Operator",
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
      // Operator-only: public workforce runtime keeps disableSignUp: true.
      disableSignUp: false,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword,
    },

    // Prefer the narrow per-prefix strategy supported by Better Auth 1.6.25
    // so only password-reset identifiers are hashed (other verification rows
    // used by the twoFactor plugin stay on the default plain strategy).
    verification: {
      storeIdentifier: {
        default: "plain" as const,
        overrides: {
          [WORKFORCE_PASSWORD_RESET_IDENTIFIER_PREFIX]: "hashed" as const,
        },
      },
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
