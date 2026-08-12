import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractComposeServiceBlock,
  isOperatorCredentialImplementationPath,
  isWorkforceAuthServiceProductionPath,
  operatorCredentialSourceUsesUnsupportedInternals,
  operatorWorkforceOptionsAllowSignUpWithoutAutoSignIn,
  packageJsonDeclaresForbiddenDependency,
  publicWorkforceOptionsDisableSignUp,
  rateLimitSchemaDeclaresForbiddenColumn,
} from "./audit-workforce-auth.mjs";

test("packageJsonDeclaresForbiddenDependency flags Express/Fastify and SMS SDKs", () => {
  assert.deepEqual(
    packageJsonDeclaresForbiddenDependency({
      dependencies: { express: "4.0.0", twilio: "1.0.0", "better-auth": "1.6.25" },
    }),
    ["express", "twilio"],
  );
  assert.deepEqual(
    packageJsonDeclaresForbiddenDependency({
      dependencies: { "better-auth": "1.6.25", next: "16.2.4" },
    }),
    [],
  );
});

test("isWorkforceAuthServiceProductionPath excludes test fixtures", () => {
  assert.equal(isWorkforceAuthServiceProductionPath("src/server/workforce-auth/service.ts"), true);
  assert.equal(
    isWorkforceAuthServiceProductionPath("src/server/workforce-auth/pii.test.ts"),
    false,
  );
});

test("extractComposeServiceBlock returns the workforce-auth block body", () => {
  const compose = `
services:
  customer-auth:
    expose: ["8081"]
  workforce-auth:
    expose: ["8082"]
    env_file:
      - .env.runtime.docker.local
  migrate:
    profiles: ["tools"]
volumes:
  postgres-data:
`;
  const block = extractComposeServiceBlock(compose, "workforce-auth");
  assert.match(block, /expose:\s*\["8082"\]/);
  assert.doesNotMatch(block, /profiles:/);
});

test("rateLimitSchemaDeclaresForbiddenColumn detects raw PII-shaped columns", () => {
  const bad = `
export const workforceAuthRateLimits = appSchema.table("workforce_auth_rate_limits", {
  scope: text("scope").notNull(),
  email: text("email"),
  keyHash: text("key_hash").notNull(),
}, () => []);
`;
  assert.equal(rateLimitSchemaDeclaresForbiddenColumn(bad), true);

  const good = `
export const workforceAuthRateLimits = appSchema.table("workforce_auth_rate_limits", {
  scope: text("scope").notNull(),
  keyHash: text("key_hash").notNull(),
  windowStartedAt: timestamp("window_started_at").notNull(),
}, () => []);
`;
  assert.equal(rateLimitSchemaDeclaresForbiddenColumn(good), false);
});

test("operator credential implementation paths cover create/reset modules", () => {
  assert.equal(
    isOperatorCredentialImplementationPath("scripts/workforce/create-user.ts"),
    true,
  );
  assert.equal(
    isOperatorCredentialImplementationPath("scripts/workforce/disable-user.ts"),
    false,
  );
  assert.equal(
    isOperatorCredentialImplementationPath("src/server/auth/workforce/operator/credentials.ts"),
    true,
  );
});

test("operatorCredentialSourceUsesUnsupportedInternals rejects internalAdapter and password.hash", () => {
  assert.equal(
    operatorCredentialSourceUsesUnsupportedInternals("await ctx.internalAdapter.createUser({})"),
    true,
  );
  assert.equal(
    operatorCredentialSourceUsesUnsupportedInternals("await ctx.password.hash(password)"),
    true,
  );
  assert.equal(
    operatorCredentialSourceUsesUnsupportedInternals("await auth.api.signUpEmail({ body })"),
    false,
  );
});

test("public vs operator signup flags are distinguished", () => {
  assert.equal(publicWorkforceOptionsDisableSignUp("disableSignUp: true,"), true);
  assert.equal(publicWorkforceOptionsDisableSignUp("disableSignUp: false,"), false);
  assert.equal(
    operatorWorkforceOptionsAllowSignUpWithoutAutoSignIn(
      "disableSignUp: false,\n      autoSignIn: false,",
    ),
    true,
  );
  assert.equal(
    operatorWorkforceOptionsAllowSignUpWithoutAutoSignIn(
      "disableSignUp: false,\n      autoSignIn: true,",
    ),
    false,
  );
});
