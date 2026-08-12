/**
 * Better Auth CLI schema-generation fixture (IMP-008 core; IMP-009 phone
 * OTP, customer realm only).
 *
 * Used only by `./node_modules/.bin/auth generate` (via
 * `npm run auth:schema:generate` / `auth:schema:check`) to introspect Better
 * Auth 1.6.25's core model contract for the customer realm. This file must
 * never open a network or database connection: it intentionally omits the
 * `database` option and relies on the CLI's `--adapter drizzle --dialect
 * postgresql` flags to select the Drizzle/Postgres schema shape instead.
 * The secret below is a synthetic, non-secret placeholder used only so the
 * CLI's config loader is satisfied — it is never printed and never used to
 * start a real Better Auth instance.
 *
 * The `phoneNumber` plugin is enabled here (customer realm only — see
 * `workforce-auth.cli.ts`, which stays plugin-free) purely so the CLI emits
 * the `phoneNumber`/`phoneNumberVerified` core fields it adds to the `user`
 * model. Its callbacks are deterministic no-ops: no network, no database,
 * no real OTP provider — they exist only to satisfy the plugin's required
 * option shape during schema introspection.
 */
import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins/phone-number";

import {
  AUTH_SESSION_POLICY,
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_AUTH_COOKIE_PREFIX,
} from "../../../src/server/auth/shared/constants";

export const auth = betterAuth({
  appName: "BOBA Bear Customer (schema generation)",
  secret: "schema-generation-fixture-secret-not-a-real-secret-value",
  baseURL: "http://localhost:3100",
  basePath: CUSTOMER_AUTH_BASE_PATH,
  session: AUTH_SESSION_POLICY,
  emailAndPassword: { enabled: false },
  socialProviders: {},
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      sendOTP: async () => {},
      verifyOTP: async () => false,
      phoneNumberValidator: async () => true,
      signUpOnVerification: {
        getTempEmail: (phone) => `schema-generation-fixture-${phone}@phone.invalid`,
        getTempName: () => "Schema Generation Fixture",
      },
    }),
  ],
  advanced: { cookiePrefix: CUSTOMER_AUTH_COOKIE_PREFIX },
  rateLimit: { enabled: false },
  logger: { disabled: true },
  telemetry: { enabled: false },
});
