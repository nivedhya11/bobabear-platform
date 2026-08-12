import { test } from "node:test";
import assert from "node:assert/strict";

import { extractEnvKeys, findForbiddenEnvKeys } from "./inspect-runtime.mjs";

test("extractEnvKeys returns only key names, never values", () => {
  const keys = extractEnvKeys(["PATH=/usr/bin", "BOBA_BEAR_DATABASE_URL=postgresql://secret@host/db"]);
  assert.deepEqual(keys, ["PATH", "BOBA_BEAR_DATABASE_URL"]);
});

test("findForbiddenEnvKeys flags PostgreSQL and database env vars", () => {
  const forbidden = findForbiddenEnvKeys(["PATH", "POSTGRES_PASSWORD", "BOBA_BEAR_DATABASE_URL", "NODE_ENV"]);
  assert.deepEqual(forbidden, ["POSTGRES_PASSWORD", "BOBA_BEAR_DATABASE_URL"]);
});

test("findForbiddenEnvKeys returns an empty list for a clean env var set", () => {
  assert.deepEqual(findForbiddenEnvKeys(["PATH", "NODE_ENV", "NGINX_VERSION"]), []);
});
