import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deriveTempEmailLeaksRawPhone,
  isCustomerAuthServicePath,
  isCustomerAuthServiceProductionPath,
  isCustomerPhoneAuthTestFixture,
  packageJsonDeclaresForbiddenDependency,
  providerFactoryFailsClosedInStagingProduction,
  rateLimitSchemaDeclaresForbiddenColumn,
  routerEchoesOtpCode,
} from "./audit-customer-phone-auth.mjs";

test("isCustomerPhoneAuthTestFixture exempts .test.ts/.test.mjs/.integration.test.ts paths", () => {
  assert.equal(isCustomerPhoneAuthTestFixture("src/server/customer-auth/pii.test.ts"), true);
  assert.equal(
    isCustomerPhoneAuthTestFixture("tests/database/customer-phone-auth.integration.test.ts"),
    true,
  );
  assert.equal(isCustomerPhoneAuthTestFixture("scripts/audit-customer-phone-auth.test.mjs"), true);
});

test("isCustomerPhoneAuthTestFixture rejects an ordinary production path", () => {
  assert.equal(isCustomerPhoneAuthTestFixture("src/server/customer-auth/pii.ts"), false);
});

test("isCustomerAuthServicePath matches only the customer-auth service tree", () => {
  assert.equal(isCustomerAuthServicePath("src/server/customer-auth/pii.ts"), true);
  assert.equal(isCustomerAuthServicePath("src/server/auth/customer/runtime.ts"), false);
});

test("isCustomerAuthServiceProductionPath excludes test fixtures", () => {
  assert.equal(isCustomerAuthServiceProductionPath("src/server/customer-auth/pii.ts"), true);
  assert.equal(isCustomerAuthServiceProductionPath("src/server/customer-auth/pii.test.ts"), false);
});

test("packageJsonDeclaresForbiddenDependency flags an alternate phone-parsing library", () => {
  const pkg = { dependencies: { "google-libphonenumber": "^1.0.0" } };
  assert.deepEqual(packageJsonDeclaresForbiddenDependency(pkg), ["google-libphonenumber"]);
});

test("packageJsonDeclaresForbiddenDependency flags an SMS/OTP provider SDK", () => {
  const pkg = { dependencies: { twilio: "^5.0.0" } };
  assert.deepEqual(packageJsonDeclaresForbiddenDependency(pkg), ["twilio"]);
});

test("packageJsonDeclaresForbiddenDependency flags a third-party HTTP framework", () => {
  const pkg = { devDependencies: { express: "^4.0.0" } };
  assert.deepEqual(packageJsonDeclaresForbiddenDependency(pkg), ["express"]);
});

test("packageJsonDeclaresForbiddenDependency passes for the approved dependency set", () => {
  const pkg = {
    dependencies: {
      "libphonenumber-js": "1.13.10",
      "better-auth": "1.6.25",
      "@better-auth/drizzle-adapter": "1.6.25",
    },
    devDependencies: { auth: "1.6.25" },
  };
  assert.deepEqual(packageJsonDeclaresForbiddenDependency(pkg), []);
});

test("deriveTempEmailLeaksRawPhone fails when the returned template literal interpolates the raw phone", () => {
  const contents = `
    deriveTempEmail(phoneNumber: E164IndianMobileNumber): string {
      const digest = createHmac("sha256", secret)
        .update(\`customer-temp-email:v1:\${phoneNumber}\`, "utf8")
        .digest("hex");
      return \`u_\${phoneNumber}@phone.invalid\`;
    },
  `;
  assert.equal(deriveTempEmailLeaksRawPhone(contents), true);
});

test("deriveTempEmailLeaksRawPhone fails when no HMAC digest is used at all", () => {
  const contents = `
    deriveTempEmail(phoneNumber: E164IndianMobileNumber): string {
      return \`u_\${phoneNumber}@phone.invalid\`;
    },
  `;
  assert.equal(deriveTempEmailLeaksRawPhone(contents), true);
});

test("deriveTempEmailLeaksRawPhone passes when the raw phone only feeds the HMAC input and the return uses only the digest", () => {
  const contents = `
    deriveTempEmail(phoneNumber: E164IndianMobileNumber): string {
      const digest = createHmac("sha256", secret)
        .update(\`customer-temp-email:v1:\${phoneNumber}\`, "utf8")
        .digest("hex");
      return \`u_\${digest}@phone.invalid\`;
    },
  `;
  assert.equal(deriveTempEmailLeaksRawPhone(contents), false);
});

test("deriveTempEmailLeaksRawPhone passes when deriveTempEmail cannot be found (checked elsewhere)", () => {
  assert.equal(deriveTempEmailLeaksRawPhone("export function unrelated() {}"), false);
});

test("rateLimitSchemaDeclaresForbiddenColumn fails on a raw phone number column", () => {
  const contents = `
    export const customerOtpRateLimits = appSchema.table("customer_otp_rate_limits", {
      id: text("id").primaryKey(),
      phoneNumber: text("phone_number").notNull(),
    },
    (table) => []);
  `;
  assert.equal(rateLimitSchemaDeclaresForbiddenColumn(contents), true);
});

test("rateLimitSchemaDeclaresForbiddenColumn fails on a raw IP address column", () => {
  const contents = `
    export const customerOtpRateLimits = appSchema.table("customer_otp_rate_limits", {
      id: text("id").primaryKey(),
      ipAddress: text("ip_address"),
    },
    (table) => []);
  `;
  assert.equal(rateLimitSchemaDeclaresForbiddenColumn(contents), true);
});

test("rateLimitSchemaDeclaresForbiddenColumn passes for hashed-key/counter-only columns", () => {
  const contents = `
    export const customerOtpRateLimits = appSchema.table("customer_otp_rate_limits", {
      id: text("id").primaryKey(),
      scope: text("scope").notNull(),
      keyHash: text("key_hash").notNull(),
      windowStartAt: timestamp("window_start_at").notNull(),
      attemptCount: integer("attempt_count").notNull(),
    },
    (table) => []);
  `;
  assert.equal(rateLimitSchemaDeclaresForbiddenColumn(contents), false);
});

test("providerFactoryFailsClosedInStagingProduction fails when only one environment is handled", () => {
  assert.equal(providerFactoryFailsClosedInStagingProduction('if (environmentType === "staging") throw x;'), false);
});

test("providerFactoryFailsClosedInStagingProduction passes when both environments are referenced", () => {
  const contents = `
    if (environmentType === "staging" || environmentType === "production") {
      throw new Error("Local OTP provider is prohibited in staging and production.");
    }
  `;
  assert.equal(providerFactoryFailsClosedInStagingProduction(contents), true);
});

test("routerEchoesOtpCode fails when the server-generated code is placed into a response body key", () => {
  assert.equal(routerEchoesOtpCode('const body = { ok: true, code: generatedCode };'), true);
});

test("routerEchoesOtpCode passes when only the client-submitted code is forwarded internally", () => {
  const contents = `
    const rawCode = bodyResult.value.code;
    const { headers } = await api.verifyPhoneNumber({
      body: { phoneNumber, code: rawCode, disableSession: false, updatePhoneNumber: false },
    });
  `;
  assert.equal(routerEchoesOtpCode(contents), false);
});

test("routerEchoesOtpCode passes when generatedCode is only ever passed to the provider, never a response body", () => {
  const contents = `
    const generatedCode = generateNumericOtp(CUSTOMER_OTP_LENGTH);
    await deps.otpProvider.startVerification({ phoneNumber, generatedCode, now, expiresAt });
  `;
  assert.equal(routerEchoesOtpCode(contents), false);
});
