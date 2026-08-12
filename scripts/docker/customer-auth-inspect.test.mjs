import { test } from "node:test";
import assert from "node:assert/strict";

import { extractEnvKeys, findForbiddenEnvKeys } from "./customer-auth-inspect.mjs";

test("extractEnvKeys returns only key names, never values", () => {
  const keys = extractEnvKeys(["PATH=/usr/bin", "CUSTOMER_AUTH_SECRET=super-secret-value"]);
  assert.deepEqual(keys, ["PATH", "CUSTOMER_AUTH_SECRET"]);
});

test("findForbiddenEnvKeys flags migration, bootstrap, and workforce keys", () => {
  const forbidden = findForbiddenEnvKeys([
    "PATH",
    "POSTGRES_PASSWORD",
    "BOBA_BEAR_DATABASE_MIGRATION_URL",
    "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
    "WORKFORCE_AUTH_SECRET",
    "NODE_ENV",
  ]);
  assert.deepEqual(forbidden, [
    "POSTGRES_PASSWORD",
    "BOBA_BEAR_DATABASE_MIGRATION_URL",
    "WORKFORCE_AUTH_SECRET",
  ]);
});

test("findForbiddenEnvKeys allows application-role platform config flags", () => {
  assert.deepEqual(
    findForbiddenEnvKeys([
      "BOBA_BEAR_DATABASE_URL",
      "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
      "BOBA_BEAR_ENV",
      "CUSTOMER_AUTH_SECRET",
    ]),
    [],
  );
});

test("findForbiddenEnvKeys allows the application-role database URL", () => {
  assert.deepEqual(
    findForbiddenEnvKeys(["BOBA_BEAR_DATABASE_URL", "CUSTOMER_AUTH_SECRET", "PATH"]),
    [],
  );
});

test("findForbiddenEnvKeys returns an empty list for a clean env var set", () => {
  assert.deepEqual(findForbiddenEnvKeys(["PATH", "NODE_ENV", "CUSTOMER_AUTH_SERVICE_PORT"]), []);
});
