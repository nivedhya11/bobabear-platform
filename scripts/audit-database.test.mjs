import { test } from "node:test";
import assert from "node:assert/strict";

import { isConnectionStringTestFixture } from "./audit-database.mjs";

test("isConnectionStringTestFixture exempts a .test.mjs fixture path", () => {
  assert.equal(
    isConnectionStringTestFixture("scripts/docker/init-local-env.test.mjs"),
    true,
  );
});

test("isConnectionStringTestFixture exempts .test.ts and .test.tsx paths", () => {
  assert.equal(isConnectionStringTestFixture("src/platform/database/client.test.ts"), true);
  assert.equal(isConnectionStringTestFixture("src/components/Thing.test.tsx"), true);
});

test("isConnectionStringTestFixture rejects an ordinary production .mjs path", () => {
  assert.equal(
    isConnectionStringTestFixture("scripts/docker/unsafe-example.mjs"),
    false,
  );
});

test("isConnectionStringTestFixture rejects a path that merely contains the word test", () => {
  assert.equal(isConnectionStringTestFixture("scripts/testing-utils.mjs"), false);
  assert.equal(isConnectionStringTestFixture("scripts/docker/test/helper.mjs"), false);
});
