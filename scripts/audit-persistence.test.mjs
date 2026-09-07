import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyPersistenceImportLine,
  hasUseClientDirective,
  isAllowedHealthPersistenceTypeImport,
  isAllowedMigrationFactoryImportPath,
  isAllowedPersistenceImportPath,
  isPersistenceDependencyLine,
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
    "scripts/catalog/bootstrap-imp036c-required-topping.ts",
    "scripts/e2e/seed-customer-ordering.ts",
    "scripts/e2e/seed-operations-lifecycle.ts",
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

test("isAllowedPersistenceImportPath does not generally allowlist health.ts", () => {
  assert.equal(isAllowedPersistenceImportPath("src/platform/observability/health.ts"), false);
});

test("isAllowedPersistenceImportPath allows the exact modifier-bootstrap integration test", () => {
  assert.equal(
    isAllowedPersistenceImportPath(
      "tests/catalog-imp028c-modifiers/bootstrap.integration.test.tsx",
    ),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath(
      "tests/catalog-imp036c-required-topping/bootstrap.integration.test.tsx",
    ),
    true,
  );
});

test("isAllowedPersistenceImportPath allows administration/operations/workforce-auth test trees", () => {
  assert.equal(
    isAllowedPersistenceImportPath("tests/administration/admin-http.integration.test.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath("tests/operations/store-http.integration.test.ts"),
    true,
  );
  assert.equal(
    isAllowedPersistenceImportPath("tests/workforce-auth/trusted-identity.integration.test.ts"),
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
  assert.equal(
    isAllowedPersistenceImportPath("tests/catalog-imp036c-required-topping/not-authorized.test.tsx"),
    false,
  );
});

test("isAllowedPersistenceImportPath rejects the public app tree and arbitrary server code", () => {
  assert.equal(isAllowedPersistenceImportPath("src/app/page.tsx"), false);
  assert.equal(isAllowedPersistenceImportPath("src/components/Nav.tsx"), false);
  assert.equal(isAllowedPersistenceImportPath("src/lib/site.ts"), false);
  assert.equal(isAllowedPersistenceImportPath("src/server/workforce-auth/service.ts"), false);
  assert.equal(isAllowedPersistenceImportPath("src/platform/observability/other.ts"), false);
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

test("isPersistenceDependencyLine recognizes import and re-export forms", () => {
  assert.equal(
    isPersistenceDependencyLine('import { getApplicationPersistence } from "@/server/persistence";'),
    true,
  );
  assert.equal(
    isPersistenceDependencyLine('import type { Persistence } from "@/server/persistence/types";'),
    true,
  );
  assert.equal(
    isPersistenceDependencyLine('import Persistence from "../../server/persistence/types";'),
    true,
  );
  assert.equal(
    isPersistenceDependencyLine('import * as persistence from "@/server/persistence";'),
    true,
  );
  assert.equal(
    isPersistenceDependencyLine('export { getApplicationPersistence } from "@/server/persistence";'),
    true,
  );
  assert.equal(
    isPersistenceDependencyLine('export type { Persistence } from "@/server/persistence/types";'),
    true,
  );
  assert.equal(isPersistenceDependencyLine('export * from "@/server/persistence";'), true);
  assert.equal(isPersistenceDependencyLine('import { something } from "@/server/other";'), false);
  assert.equal(isPersistenceDependencyLine("// server/persistence mentioned"), false);
});

test("isAllowedHealthPersistenceTypeImport allows only the exact type import", () => {
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import type { Persistence } from "../../server/persistence/types";',
    ),
    true,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import type { PersistenceRole } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import type { PersistenceQueryContext } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import type { Persistence, PersistenceRole } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import type { Persistence as HealthPersistence } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import { getApplicationPersistence } from "../../server/persistence";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'import { Persistence } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/health.ts",
      'export type { Persistence } from "../../server/persistence/types";',
    ),
    false,
  );
  assert.equal(
    isAllowedHealthPersistenceTypeImport(
      "src/platform/observability/other.ts",
      'import type { Persistence } from "../../server/persistence/types";',
    ),
    false,
  );
});

// A. Public application imports
test("A: classifyPersistenceImportLine rejects ordinary src/app persistence import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/app/order/page.tsx",
      line: 'import { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

test("A: classifyPersistenceImportLine rejects TYPE-ONLY src/app persistence import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/app/order/page.tsx",
      line: 'import type { Persistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

// B. Public component imports
test("B: classifyPersistenceImportLine rejects ordinary src/components persistence import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/components/CartBadge.tsx",
      line: 'import { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

test("B: classifyPersistenceImportLine rejects TYPE-ONLY src/components persistence import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/components/CartBadge.tsx",
      line: 'import type { Persistence } from "@/server/persistence";',
      isClientModule: true,
    }),
    "PUBLIC_APP_TREE",
  );
});

// C. Public application re-exports
test("C: classifyPersistenceImportLine rejects src/app runtime re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/app/order/page.tsx",
      line: 'export { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

test("C: classifyPersistenceImportLine rejects src/app type re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/app/order/page.tsx",
      line: 'export type { Persistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

test("C: classifyPersistenceImportLine rejects src/app export * re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/app/order/page.tsx",
      line: 'export * from "@/server/persistence";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

// D. Public component re-export
test("D: classifyPersistenceImportLine rejects src/components type re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/components/CartBadge.tsx",
      line: 'export type { Persistence } from "@/server/persistence/types";',
      isClientModule: false,
    }),
    "PUBLIC_APP_TREE",
  );
});

// E. Health allowed case
test("E: classifyPersistenceImportLine allows health.ts narrow type-only import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import type { Persistence } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    null,
  );
});

// E. Health forbidden other / multi / aliased type imports (classifier uses same rule)
test("E: classifyPersistenceImportLine rejects health.ts OTHER type import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import type { PersistenceQueryContext } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

test("E: classifyPersistenceImportLine rejects health.ts MULTIPLE type import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import type { Persistence, PersistenceRole } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

test("E: classifyPersistenceImportLine rejects health.ts ALIASED Persistence type import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import type { Persistence as HealthPersistence } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

// F. Health forbidden runtime import
test("F: classifyPersistenceImportLine rejects health.ts runtime persistence import", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import { getApplicationPersistence } from "../../server/persistence";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

// G. Health forbidden runtime import from types module
test("G: classifyPersistenceImportLine rejects health.ts value import from types", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import { Persistence } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

test("G: classifyPersistenceImportLine rejects health.ts default import from types", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'import Persistence from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

// H. Health forbidden re-export
test("H: classifyPersistenceImportLine rejects health.ts type re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'export type { Persistence } from "../../server/persistence/types";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

test("H: classifyPersistenceImportLine rejects health.ts runtime re-export", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/platform/observability/health.ts",
      line: 'export { getApplicationPersistence } from "../../server/persistence";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

// I. Normal approved server consumer
test("I: classifyPersistenceImportLine allows approved non-public server persistence consumer", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/server/catalog/products.ts",
      line: 'import { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    null,
  );
});

// J. Arbitrary server/lib consumer outside allowlist
test("J: classifyPersistenceImportLine rejects arbitrary server/lib consumer outside allowlist", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/lib/site.ts",
      line: 'import { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: false,
    }),
    "OUTSIDE_ALLOWLIST",
  );
});

test("classifyPersistenceImportLine rejects client-module persistence imports outside public tree", () => {
  assert.equal(
    classifyPersistenceImportLine({
      relativePath: "src/lib/client-helper.ts",
      line: 'import { getApplicationPersistence } from "@/server/persistence";',
      isClientModule: true,
    }),
    "CLIENT_MODULE",
  );
});
