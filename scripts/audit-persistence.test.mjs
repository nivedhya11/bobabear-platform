import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hasUseClientDirective,
  isAllowedMigrationFactoryImportPath,
  isAllowedPersistenceImportPath,
  isPersistenceTestFixture,
} from "./audit-persistence.mjs";

test("isPersistenceTestFixture exempts .test.ts/.test.tsx/.test.mjs paths", () => {
  assert.equal(isPersistenceTestFixture("src/server/persistence/handle.test.ts"), true);
  assert.equal(isPersistenceTestFixture("src/components/Thing.test.tsx"), true);
  assert.equal(isPersistenceTestFixture("scripts/audit-persistence.test.mjs"), true);
});

test("isPersistenceTestFixture rejects an ordinary production path", () => {
  assert.equal(isPersistenceTestFixture("src/server/persistence/handle.ts"), false);
});

test("isAllowedPersistenceImportPath allows the persistence boundary, db tooling, and db tests", () => {
  assert.equal(isAllowedPersistenceImportPath("src/server/persistence/application.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("scripts/database/check.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/database/persistence.integration.test.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("src/server/organization/brands.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("src/server/access-control/authorize.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("scripts/access/bootstrap-platform-admin.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/access-control/cli/bootstrap-platform-admin.test.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/catalog/support.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("src/server/catalog/products.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("scripts/menu/import-existing.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/menu-import/importer.integration.test.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("src/server/assortment/rules.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("scripts/assortment/bootstrap-existing-menu.ts"), true);
  assert.equal(
    isAllowedPersistenceImportPath("tests/assortment-availability/support.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath("tests/assortment-bootstrap/bootstrap.integration.test.ts"),
    true,
  );
  assert.equal(isAllowedPersistenceImportPath("src/server/promotions/promotions.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("src/server/customer-profiles/profiles.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/customer-profiles/domain.test.ts"), true);
  assert.equal(
    isAllowedPersistenceImportPath("tests/customer-profile-security/security.test.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath(
      "tests/customer-profile-auth-integration/auth-integration.test.ts",
    ),
    true,
  );
  assert.equal(isAllowedPersistenceImportPath("src/server/customer-addresses/addresses.ts"), true);
  assert.equal(isAllowedPersistenceImportPath("tests/customer-addresses/domain.test.ts"), true);
  assert.equal(
    isAllowedPersistenceImportPath("tests/customer-address-security/security.test.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath(
      "tests/customer-address-auth-integration/auth-integration.test.ts",
    ),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath("tests/customer-commerce/support/service-harness.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath("tests/customer-address-concurrency/concurrency.test.ts"),
    true,
  );
});

test("isAllowedPersistenceImportPath allows the exact additional script consumers", () => {
  const allowedScriptPaths = [
    "scripts/catalog/bootstrap-imp028c-modifiers.ts",
    "scripts/e2e/seed-customer-ordering.ts",
    "scripts/financial-document/recover-missing-receipt-vouchers.ts",
    "scripts/financial-document/recover-missing-tax-invoices.ts",
    "scripts/financial-document/signing.ts",
    "scripts/order/recover-missing-orders.ts",
    "scripts/refund/recover-missing-statutory-decisions.ts",
  ];

  for (const path of allowedScriptPaths) {
    assert.equal(isAllowedPersistenceImportPath(path), true, path);
  }
});

test("isAllowedPersistenceImportPath allows the exact modifier-bootstrap integration test", () => {
  assert.equal(
    isAllowedPersistenceImportPath(
      "tests/catalog-imp028c-modifiers/bootstrap.integration.test.tsx",
    ),
    true,
  );
});

test("isAllowedPersistenceImportPath rejects financial-document and E2E siblings", () => {
  assert.equal(
    isAllowedPersistenceImportPath("scripts/financial-document/not-authorized.ts"),
    false,
  );
  assert.equal(isAllowedPersistenceImportPath("scripts/e2e/not-authorized.ts"), false);
});

test("isAllowedPersistenceImportPath rejects other exact-allowlist siblings", () => {
  assert.equal(isAllowedPersistenceImportPath("scripts/catalog/not-authorized.ts"), false);
  assert.equal(isAllowedPersistenceImportPath("scripts/order/not-authorized.ts"), false);
  assert.equal(isAllowedPersistenceImportPath("scripts/refund/not-authorized.ts"), false);
  assert.equal(
    isAllowedPersistenceImportPath("tests/catalog-imp028c-modifiers/not-authorized.test.tsx"),
    false,
  );
});

test("isAllowedPersistenceImportPath rejects the public app tree and arbitrary server code", () => {
  assert.equal(isAllowedPersistenceImportPath("src/app/page.tsx"), false);
  assert.equal(isAllowedPersistenceImportPath("src/components/Nav.tsx"), false);
  assert.equal(isAllowedPersistenceImportPath("src/lib/site.ts"), false);
  assert.equal(isAllowedPersistenceImportPath("src/server/workforce-auth/service.ts"), false);
});

test("isAllowedMigrationFactoryImportPath allows the migration factory, boundary, and db tooling/tests", () => {
  assert.equal(isAllowedMigrationFactoryImportPath("src/server/persistence/migration.ts"), true);
  assert.equal(isAllowedMigrationFactoryImportPath("src/server/persistence/index.ts"), true);
  assert.equal(isAllowedMigrationFactoryImportPath("scripts/database/check.ts"), true);
  assert.equal(
    isAllowedMigrationFactoryImportPath("tests/database/persistence.integration.test.ts"),
    true,
  );
});

test("isAllowedMigrationFactoryImportPath rejects application code", () => {
  assert.equal(isAllowedMigrationFactoryImportPath("src/server/persistence/application.ts"), false);
  assert.equal(isAllowedMigrationFactoryImportPath("src/app/page.tsx"), false);
});

test("hasUseClientDirective recognizes a leading directive", () => {
  assert.equal(hasUseClientDirective('"use client";\nexport default function X() {}'), true);
  assert.equal(hasUseClientDirective("'use client'\nexport default function X() {}"), true);
});

test("hasUseClientDirective ignores leading blank lines and comments", () => {
  assert.equal(
    hasUseClientDirective('\n// a comment\n"use client";\nexport default function X() {}'),
    true,
  );
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
