import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildContainerDatabaseUrl,
  buildRuntimeEnvContent,
  buildMigrationEnvContent,
  buildCustomerAuthEnvContent,
  buildWorkforceAuthEnvContent,
  parseBootstrapPasswords,
  validateCustomerAuthEnvValues,
  validateWorkforceAuthEnvValues,
} from "./init-local-env.mjs";

const SENTINEL = "DO_NOT_LEAK_DOCKER_SECRET_58173";

test("buildContainerDatabaseUrl targets postgres:5432, never 127.0.0.1:5433 or host.docker.internal", () => {
  const url = buildContainerDatabaseUrl("boba_bear_app", "plainpassword");
  assert.equal(url, "postgresql://boba_bear_app:plainpassword@postgres:5432/boba_bear_local");
  assert.ok(!url.includes("127.0.0.1"));
  assert.ok(!url.includes("5433"));
  assert.ok(!url.includes("host.docker.internal"));
});

test("buildContainerDatabaseUrl URL-encodes a password containing reserved characters", () => {
  const url = buildContainerDatabaseUrl("boba_bear_app", "p@ss/word:1");
  assert.equal(url, "postgresql://boba_bear_app:p%40ss%2Fword%3A1@postgres:5432/boba_bear_local");
});

test("buildRuntimeEnvContent excludes migration and admin credential keys", () => {
  const content = buildRuntimeEnvContent(SENTINEL);
  assert.match(content, /BOBA_BEAR_DATABASE_URL=/);
  assert.doesNotMatch(content, /BOBA_BEAR_DATABASE_MIGRATION_URL/);
  assert.doesNotMatch(content, /POSTGRES_PASSWORD/);
  assert.doesNotMatch(content, /POSTGRES_MIGRATOR_PASSWORD/);
});

test("buildMigrationEnvContent excludes runtime and admin credential keys", () => {
  const content = buildMigrationEnvContent(SENTINEL);
  assert.match(content, /BOBA_BEAR_DATABASE_MIGRATION_URL=/);
  assert.doesNotMatch(content, /BOBA_BEAR_DATABASE_URL=/);
  assert.doesNotMatch(content, /POSTGRES_PASSWORD/);
  assert.doesNotMatch(content, /POSTGRES_APP_PASSWORD/);
});

test("buildRuntimeEnvContent respects an explicit public-origin override", () => {
  const content = buildRuntimeEnvContent("pw", { publicOrigin: "http://localhost:9999" });
  assert.match(content, /BOBA_BEAR_PUBLIC_ORIGIN=http:\/\/localhost:9999/);
});

test("parseBootstrapPasswords rejects content missing required keys, without leaking the sentinel", () => {
  const result = parseBootstrapPasswords(`POSTGRES_APP_PASSWORD=${SENTINEL}\n`);
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.reason, new RegExp(SENTINEL));
  assert.match(result.reason, /POSTGRES_MIGRATOR_PASSWORD/);
});

test("parseBootstrapPasswords rejects a key declared twice with conflicting values", () => {
  const result = parseBootstrapPasswords(
    `POSTGRES_APP_PASSWORD=${SENTINEL}_A\nPOSTGRES_MIGRATOR_PASSWORD=x\nPOSTGRES_APP_PASSWORD=different\n`,
  );
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.reason, new RegExp(SENTINEL));
});

test("parseBootstrapPasswords extracts both passwords from valid content, and downstream files never cross-contaminate them", () => {
  const result = parseBootstrapPasswords(
    `POSTGRES_APP_PASSWORD=${SENTINEL}_APP\nPOSTGRES_MIGRATOR_PASSWORD=${SENTINEL}_MIGRATOR\n`,
  );
  assert.equal(result.ok, true);
  assert.equal(result.appPassword, `${SENTINEL}_APP`);
  assert.equal(result.migratorPassword, `${SENTINEL}_MIGRATOR`);

  const runtimeContent = buildRuntimeEnvContent(result.appPassword);
  const migrationContent = buildMigrationEnvContent(result.migratorPassword);

  assert.match(runtimeContent, new RegExp(`${SENTINEL}_APP`));
  assert.doesNotMatch(runtimeContent, new RegExp(`${SENTINEL}_MIGRATOR`));
  assert.match(migrationContent, new RegExp(`${SENTINEL}_MIGRATOR`));
  assert.doesNotMatch(migrationContent, new RegExp(`${SENTINEL}_APP`));
  assert.match(runtimeContent, /postgres:5432/);
  assert.doesNotMatch(runtimeContent, /127\.0\.0\.1:5433/);

  // Re-deriving from the same source content is byte-for-byte identical —
  // this script never rotates a password, only re-derives connection
  // strings from whatever is already in .env.docker.local.
  assert.equal(buildRuntimeEnvContent(result.appPassword), runtimeContent);
});

test("buildCustomerAuthEnvContent generates a complete, internally-consistent, valid env file", () => {
  const content = buildCustomerAuthEnvContent();
  const values = Object.fromEntries(
    content
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );

  assert.equal(validateCustomerAuthEnvValues(values).ok, true);
  assert.equal(values.CUSTOMER_AUTH_BASE_URL, "http://localhost:8080");
  assert.equal(values.CUSTOMER_OTP_PROVIDER, "local");
  assert.equal(values.CUSTOMER_AUTH_SERVICE_PORT, "8081");
  assert.notEqual(values.CUSTOMER_AUTH_SECRET, values.CUSTOMER_AUTH_PII_HASH_SECRET);
  assert.ok(!Object.keys(values).some((key) => key.startsWith("WORKFORCE_AUTH")));
});

test("buildCustomerAuthEnvContent respects an explicit public-origin override", () => {
  const content = buildCustomerAuthEnvContent({ publicOrigin: "http://localhost:9999" });
  assert.match(content, /CUSTOMER_AUTH_BASE_URL=http:\/\/localhost:9999/);
});

test("buildCustomerAuthEnvContent produces a fresh CUSTOMER_OTP_LOCAL_FIXED_CODE and secrets on each call", () => {
  const first = buildCustomerAuthEnvContent();
  const second = buildCustomerAuthEnvContent();
  assert.notEqual(first, second);
});

test("validateCustomerAuthEnvValues rejects a short or reused secret, without requiring WORKFORCE_AUTH_SECRET", () => {
  const base = {
    CUSTOMER_AUTH_SECRET: "a".repeat(40),
    CUSTOMER_AUTH_BASE_URL: "http://localhost:8080",
    CUSTOMER_AUTH_PII_HASH_SECRET: "b".repeat(40),
    CUSTOMER_OTP_PROVIDER: "local",
    CUSTOMER_OTP_LOCAL_FIXED_CODE: "123456",
    CUSTOMER_AUTH_TRUST_PROXY_HOPS: "1",
    CUSTOMER_AUTH_SERVICE_HOST: "0.0.0.0",
    CUSTOMER_AUTH_SERVICE_PORT: "8081",
  };

  assert.equal(validateCustomerAuthEnvValues(base).ok, true);
  assert.equal(validateCustomerAuthEnvValues({ ...base, CUSTOMER_AUTH_SECRET: "short" }).ok, false);
  assert.equal(
    validateCustomerAuthEnvValues({ ...base, CUSTOMER_AUTH_PII_HASH_SECRET: base.CUSTOMER_AUTH_SECRET }).ok,
    false,
  );
  assert.equal(validateCustomerAuthEnvValues({ ...base, CUSTOMER_OTP_LOCAL_FIXED_CODE: "12345" }).ok, false);
  const { CUSTOMER_AUTH_SERVICE_PORT: _customerAuthServicePort, ...missingPort } = base;
  void _customerAuthServicePort;
  assert.equal(validateCustomerAuthEnvValues(missingPort).ok, false);
});

test("buildWorkforceAuthEnvContent generates a complete, internally-consistent, valid env file", () => {
  const content = buildWorkforceAuthEnvContent();
  const values = Object.fromEntries(
    content
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );

  assert.equal(validateWorkforceAuthEnvValues(values).ok, true);
  assert.equal(values.WORKFORCE_AUTH_BASE_URL, "http://localhost:8080");
  assert.equal(values.WORKFORCE_AUTH_SERVICE_PORT, "8082");
  assert.equal(values.WORKFORCE_AUTH_TRUST_PROXY_HOPS, "1");
  assert.notEqual(values.WORKFORCE_AUTH_SECRET, values.WORKFORCE_AUTH_PII_HASH_SECRET);
  assert.ok(!Object.keys(values).some((key) => key.startsWith("CUSTOMER_AUTH")));
  assert.ok(!Object.keys(values).some((key) => key.startsWith("CUSTOMER_OTP")));
  assert.ok(!Object.keys(values).some((key) => key.startsWith("POSTGRES_")));
  assert.ok(!Object.keys(values).some((key) => key.startsWith("BOBA_BEAR_DATABASE")));
});

test("buildWorkforceAuthEnvContent respects an explicit public-origin override", () => {
  const content = buildWorkforceAuthEnvContent({ publicOrigin: "http://localhost:9999" });
  assert.match(content, /WORKFORCE_AUTH_BASE_URL=http:\/\/localhost:9999/);
});

test("buildWorkforceAuthEnvContent produces fresh secrets on each call", () => {
  const first = buildWorkforceAuthEnvContent();
  const second = buildWorkforceAuthEnvContent();
  assert.notEqual(first, second);
});

test("validateWorkforceAuthEnvValues rejects short/reused secrets and customer/migration contamination", () => {
  const base = {
    WORKFORCE_AUTH_SECRET: "a".repeat(40),
    WORKFORCE_AUTH_BASE_URL: "http://localhost:8080",
    WORKFORCE_AUTH_PII_HASH_SECRET: "b".repeat(40),
    WORKFORCE_AUTH_TRUST_PROXY_HOPS: "1",
    WORKFORCE_AUTH_SERVICE_HOST: "0.0.0.0",
    WORKFORCE_AUTH_SERVICE_PORT: "8082",
  };

  assert.equal(validateWorkforceAuthEnvValues(base).ok, true);
  assert.equal(validateWorkforceAuthEnvValues({ ...base, WORKFORCE_AUTH_SECRET: "short" }).ok, false);
  assert.equal(
    validateWorkforceAuthEnvValues({
      ...base,
      WORKFORCE_AUTH_PII_HASH_SECRET: base.WORKFORCE_AUTH_SECRET,
    }).ok,
    false,
  );
  assert.equal(
    validateWorkforceAuthEnvValues({ ...base, CUSTOMER_AUTH_SECRET: "c".repeat(40) }).ok,
    false,
  );
  assert.equal(
    validateWorkforceAuthEnvValues({ ...base, POSTGRES_PASSWORD: "nope" }).ok,
    false,
  );
  const { WORKFORCE_AUTH_SERVICE_PORT: _workforceAuthServicePort, ...missingPort } = base;
  void _workforceAuthServicePort;
  assert.equal(validateWorkforceAuthEnvValues(missingPort).ok, false);
});

test("customer and workforce env builders never emit each other's keys", () => {
  const customerValues = Object.fromEntries(
    buildCustomerAuthEnvContent()
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  const workforceValues = Object.fromEntries(
    buildWorkforceAuthEnvContent()
      .split("\n")
      .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  assert.ok(!Object.keys(customerValues).some((key) => key.startsWith("WORKFORCE_AUTH_")));
  assert.ok(!Object.keys(workforceValues).some((key) => key.startsWith("CUSTOMER_AUTH_")));
  assert.ok(!Object.keys(workforceValues).some((key) => key.startsWith("CUSTOMER_OTP_")));
});
