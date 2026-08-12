import { test } from "node:test";
import assert from "node:assert/strict";

import {
  declaresDirectPoolConstruction,
  declaresDisabledCapabilityViolation,
  declaresGenericRealmFactory,
  extractCreatedTableNames,
  isAuthModulePath,
  isAuthTestFixture,
  isCustomerRealmPath,
  isWorkforceRealmPath,
  pluginsBlockIsPhoneNumberOnly,
} from "./audit-auth-foundation.mjs";

test("isAuthTestFixture exempts .test.ts/.test.tsx/.test.mjs paths", () => {
  assert.equal(isAuthTestFixture("src/server/auth/customer/runtime.test.ts"), true);
  assert.equal(isAuthTestFixture("src/server/auth/shared/config.test.ts"), true);
});

test("isAuthTestFixture rejects an ordinary production path", () => {
  assert.equal(isAuthTestFixture("src/server/auth/customer/runtime.ts"), false);
});

test("isAuthModulePath matches only the auth foundation tree", () => {
  assert.equal(isAuthModulePath("src/server/auth/shared/config.ts"), true);
  assert.equal(isAuthModulePath("src/server/persistence/application.ts"), false);
});

test("isCustomerRealmPath / isWorkforceRealmPath are mutually exclusive", () => {
  assert.equal(isCustomerRealmPath("src/server/auth/customer/runtime.ts"), true);
  assert.equal(isCustomerRealmPath("src/server/auth/workforce/runtime.ts"), false);
  assert.equal(isWorkforceRealmPath("src/server/auth/workforce/runtime.ts"), true);
  assert.equal(isWorkforceRealmPath("src/server/auth/customer/runtime.ts"), false);
});

test("extractCreatedTableNames finds every CREATE TABLE name in a migration", () => {
  const sql = [
    'CREATE TABLE "app"."customer_auth_users" (',
    '\t"id" text PRIMARY KEY NOT NULL',
    ");",
    "--> statement-breakpoint",
    'CREATE TABLE "app"."workforce_auth_users" (',
    '\t"id" text PRIMARY KEY NOT NULL',
    ");",
  ].join("\n");
  assert.deepEqual(extractCreatedTableNames(sql), ["customer_auth_users", "workforce_auth_users"]);
});

test("extractCreatedTableNames returns an empty array for SQL with no CREATE TABLE", () => {
  assert.deepEqual(extractCreatedTableNames("ALTER TABLE \"app\".\"x\" ADD COLUMN y text;"), []);
});

test("declaresGenericRealmFactory fails on an unrestricted realm factory", () => {
  assert.equal(
    declaresGenericRealmFactory("export function getAuthRuntime(realm, config) { return realm; }"),
    true,
  );
  assert.equal(declaresGenericRealmFactory("export const getAuthRuntime = (realm) => realm;"), true);
});

test("declaresGenericRealmFactory passes for the approved narrow factories", () => {
  assert.equal(declaresGenericRealmFactory("export function getCustomerAuthRuntime(config) {}"), false);
  assert.equal(declaresGenericRealmFactory("export function getWorkforceAuthRuntime(config) {}"), false);
});

test("declaresDisabledCapabilityViolation fails when email/password is enabled", () => {
  assert.equal(
    declaresDisabledCapabilityViolation('emailAndPassword: { enabled: true },'),
    true,
  );
});

test("declaresDisabledCapabilityViolation fails on a non-empty plugins array", () => {
  assert.equal(declaresDisabledCapabilityViolation("plugins: [somePlugin()],"), true);
});

test("declaresDisabledCapabilityViolation fails when rate limiting is enabled", () => {
  assert.equal(declaresDisabledCapabilityViolation("rateLimit: { enabled: true },"), true);
});

test("declaresDisabledCapabilityViolation fails when the logger is not disabled", () => {
  assert.equal(declaresDisabledCapabilityViolation("logger: { disabled: false },"), true);
});

test("declaresDisabledCapabilityViolation passes for the approved locked-down shape", () => {
  const contents = [
    "emailAndPassword: { enabled: false },",
    "socialProviders: {},",
    "plugins: [],",
    "rateLimit: { enabled: false },",
    "logger: { disabled: true },",
  ].join("\n");
  assert.equal(declaresDisabledCapabilityViolation(contents), false);
});

test("declaresDirectPoolConstruction fails on a raw pg import or Pool construction", () => {
  assert.equal(declaresDirectPoolConstruction('import { Pool } from "pg";'), true);
  assert.equal(declaresDirectPoolConstruction("const pool = new Pool({ connectionString });"), true);
});

test("declaresDirectPoolConstruction passes for the approved persistence-boundary usage", () => {
  assert.equal(
    declaresDirectPoolConstruction('import { getApplicationPersistence } from "../../persistence";'),
    false,
  );
});

test("pluginsBlockIsPhoneNumberOnly passes for an empty plugins array", () => {
  assert.equal(pluginsBlockIsPhoneNumberOnly(""), true);
  assert.equal(pluginsBlockIsPhoneNumberOnly("\n  \n"), true);
});

test("pluginsBlockIsPhoneNumberOnly passes for exactly the phoneNumber() plugin (IMP-009)", () => {
  assert.equal(
    pluginsBlockIsPhoneNumberOnly(`
      phoneNumber({
        otpLength: 6,
        sendOTP: async () => {},
      }),
    `),
    true,
  );
});

test("pluginsBlockIsPhoneNumberOnly fails when phoneNumber() is missing", () => {
  assert.equal(pluginsBlockIsPhoneNumberOnly("somePlugin(),"), false);
});

test("pluginsBlockIsPhoneNumberOnly fails when another plugin accompanies phoneNumber()", () => {
  assert.equal(pluginsBlockIsPhoneNumberOnly("phoneNumber({}), twoFactor(),"), false);
  assert.equal(pluginsBlockIsPhoneNumberOnly("admin(), phoneNumber({}),"), false);
});
