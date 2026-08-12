import { test } from "node:test";
import assert from "node:assert/strict";

import { extractEnvKeys, findForbiddenEnvKeys } from "./workforce-auth-inspect.mjs";

test("extractEnvKeys returns only key names, never values", () => {
  const keys = extractEnvKeys(["PATH=/usr/bin", "WORKFORCE_AUTH_SECRET=super-secret-value"]);
  assert.deepEqual(keys, ["PATH", "WORKFORCE_AUTH_SECRET"]);
});

test("findForbiddenEnvKeys flags migration, bootstrap, and customer keys", () => {
  const forbidden = findForbiddenEnvKeys([
    "PATH",
    "POSTGRES_PASSWORD",
    "BOBA_BEAR_DATABASE_MIGRATION_URL",
    "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
    "CUSTOMER_AUTH_SECRET",
    "CUSTOMER_OTP_PROVIDER",
    "NODE_ENV",
  ]);
  assert.deepEqual(forbidden, [
    "POSTGRES_PASSWORD",
    "BOBA_BEAR_DATABASE_MIGRATION_URL",
    "CUSTOMER_AUTH_SECRET",
    "CUSTOMER_OTP_PROVIDER",
  ]);
});

test("findForbiddenEnvKeys allows application-role platform config flags", () => {
  assert.deepEqual(
    findForbiddenEnvKeys([
      "BOBA_BEAR_DATABASE_URL",
      "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
      "BOBA_BEAR_ENV",
      "WORKFORCE_AUTH_SECRET",
    ]),
    [],
  );
});

test("findForbiddenEnvKeys allows the application-role database URL", () => {
  assert.deepEqual(
    findForbiddenEnvKeys(["BOBA_BEAR_DATABASE_URL", "WORKFORCE_AUTH_SECRET", "PATH"]),
    [],
  );
});

test("findForbiddenEnvKeys returns an empty list for a clean env var set", () => {
  assert.deepEqual(findForbiddenEnvKeys(["PATH", "NODE_ENV", "WORKFORCE_AUTH_SERVICE_PORT"]), []);
});
