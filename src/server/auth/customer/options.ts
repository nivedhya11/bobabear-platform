/**
 * Customer realm Better Auth options (IMP-008 core session/adapter shape;
 * IMP-009 phone OTP). See AGENTS.md's "Configuration and startup foundation"
 * / IMP-008 section for the locked session policy and disabled-capability
 * rules this must satisfy — email/password, social providers, rate
 * limiting, and the logger stay disabled; the only enabled plugin is the
 * customer-only `phoneNumber` plugin.
 */
import "server-only";

import type { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { phoneNumber } from "better-auth/plugins/phone-number";

import type { E164IndianMobileNumber } from "../../../shared/customer-auth/phone";
import {
  isValidIndianMobileNumber,
  normalizeIndianMobileNumber,
} from "../../../shared/customer-auth/phone";
import type { CustomerTemporaryIdentityDeriver } from "../../customer-auth/pii";
import {
  CUSTOMER_OTP_ALLOWED_ATTEMPTS,
  CUSTOMER_OTP_EXPIRES_IN_SECONDS,
  CUSTOMER_OTP_LENGTH,
  type CustomerOtpProvider,
} from "../../customer-auth/provider";
import {
  AUTH_SESSION_POLICY,
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_AUTH_COOKIE_PREFIX,
} from "../shared/constants";
import type { CustomerAuthConfig } from "../shared/types";

type CustomerBetterAuthDatabaseAdapter = ReturnType<typeof drizzleAdapter>;

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(["staging", "production"]);

/**
 * Phone-OTP dependencies the customer realm's Better Auth options are built
 * with (IMP-009). The runtime that constructs these (see
 * `src/server/auth/customer/runtime.ts`) never owns or closes
 * `otpProvider` — the calling service owns its lifecycle.
 */
export type CustomerPhoneAuthRuntimeDependencies = Readonly<{
  otpProvider: CustomerOtpProvider;
  identityDeriver: CustomerTemporaryIdentityDeriver;
}>;

function normalizeOrThrow(phone: string): E164IndianMobileNumber {
  const normalized = normalizeIndianMobileNumber(phone);
  if (!normalized.ok) {
    throw new Error("Invalid phone number for temporary identity derivation.");
  }
  return normalized.phoneNumber;
}

export function buildCustomerBetterAuthOptions(
  config: CustomerAuthConfig,
  database: CustomerBetterAuthDatabaseAdapter,
  phoneDependencies: CustomerPhoneAuthRuntimeDependencies,
) {
  return {
    appName: "BOBA Bear Customer",
    secret: config.secret,
    baseURL: config.baseURL.origin,
    basePath: CUSTOMER_AUTH_BASE_PATH,
    trustedOrigins: [config.baseURL.origin],

    database,

    session: AUTH_SESSION_POLICY,

    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {},
    plugins: [
      phoneNumber({
        otpLength: CUSTOMER_OTP_LENGTH,
        expiresIn: CUSTOMER_OTP_EXPIRES_IN_SECONDS,
        allowedAttempts: CUSTOMER_OTP_ALLOWED_ATTEMPTS,

        // Better Auth's own `sendPhoneNumberOTP` endpoint requires a
        // `sendOTP` callback, but this realm's own HTTP façade sends OTPs by
        // calling `otpProvider.startVerification` directly and never hits
        // that endpoint. This callback only runs if something does call it
        // anyway — bridging to the same provider keeps behaviour consistent
        // either way.
        sendOTP: async ({ phoneNumber: phone, code }) => {
          const normalized = normalizeIndianMobileNumber(phone);
          if (!normalized.ok) return;
          const now = new Date();
          await phoneDependencies.otpProvider.startVerification({
            phoneNumber: normalized.phoneNumber,
            generatedCode: code,
            now,
            expiresAt: new Date(now.getTime() + CUSTOMER_OTP_EXPIRES_IN_SECONDS * 1000),
          });
        },

        // Delegate verification entirely to the provider rather than Better
        // Auth's own internal OTP storage/comparison.
        verifyOTP: async ({ phoneNumber: phone, code }) => {
          const normalized = normalizeIndianMobileNumber(phone);
          if (!normalized.ok) return false;
          const result = await phoneDependencies.otpProvider.checkVerification({
            phoneNumber: normalized.phoneNumber,
            code,
            now: new Date(),
          });
          return result.outcome === "approved";
        },

        phoneNumberValidator: async (phone) => isValidIndianMobileNumber(phone),

        signUpOnVerification: {
          getTempEmail: (phone) =>
            phoneDependencies.identityDeriver.deriveTempEmail(normalizeOrThrow(phone)),
          getTempName: (phone) =>
            phoneDependencies.identityDeriver.deriveTempName(normalizeOrThrow(phone)),
        },
      }),
    ],

    advanced: {
      cookiePrefix: CUSTOMER_AUTH_COOKIE_PREFIX,
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
