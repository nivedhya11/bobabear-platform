import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hasUseClientDirective,
  isOutboxIdempotencyModulePath,
  isOutboxIdempotencyProductionPath,
  isOutboxIdempotencyTestFixture,
} from "./audit-outbox-idempotency.mjs";

test("isOutboxIdempotencyModulePath allows outbox and idempotency store paths", () => {
  assert.equal(isOutboxIdempotencyModulePath("src/server/persistence/outbox/store.ts"), true);
  assert.equal(isOutboxIdempotencyModulePath("src/server/persistence/idempotency/store.ts"), true);
});

test("isOutboxIdempotencyModulePath rejects unrelated paths", () => {
  assert.equal(isOutboxIdempotencyModulePath("src/server/persistence/application.ts"), false);
  assert.equal(isOutboxIdempotencyModulePath("src/app/page.tsx"), false);
});

test("isOutboxIdempotencyTestFixture exempts .test.ts and .integration.test.ts paths", () => {
  assert.equal(isOutboxIdempotencyTestFixture("src/server/persistence/outbox/store.test.ts"), true);
  assert.equal(isOutboxIdempotencyTestFixture("tests/database/outbox.integration.test.ts"), true);
});

test("isOutboxIdempotencyProductionPath excludes test fixtures", () => {
  assert.equal(isOutboxIdempotencyProductionPath("src/server/persistence/outbox/store.ts"), true);
  assert.equal(isOutboxIdempotencyProductionPath("src/server/persistence/outbox/store.test.ts"), false);
});

test("hasUseClientDirective recognizes a leading directive", () => {
  assert.equal(hasUseClientDirective('"use client";\nexport default function X() {}'), true);
});

test("hasUseClientDirective rejects a module with no directive", () => {
  assert.equal(hasUseClientDirective("export default function X() {}"), false);
});

test("hasUseClientDirective rejects a directive that is not the first statement", () => {
  assert.equal(
    hasUseClientDirective('const x = 1;\n"use client";\nexport default function X() {}'),
    false,
  );
});
