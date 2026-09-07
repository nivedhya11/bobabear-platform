#!/usr/bin/env node
/**
 * Shared-persistence-primitives audit (IMP-006).
 *
 * Docker-independent, Node.js-builtins-only static checks over every
 * tracked *and* untracked file (via `git ls-files --cached --others
 * --exclude-standard`, not a filesystem walk) — this repository
 * intentionally carries accepted uncommitted work, so a check that only
 * looked at committed files would miss it.
 *
 * Checks performed:
 *   1. No "use client" module imports or re-exports src/server/persistence.
 *   2. No "use client" module imports "pg" or a Drizzle database runtime
 *      module.
 *   3. No src/app/** or src/components/** module may depend on
 *      src/server/persistence at all — ordinary imports, type-only imports,
 *      and re-exports are all prohibited. Type-only does not bypass that
 *      architectural boundary; the public app must remain fully static
 *      (see AGENTS.md IMP-006). No browser/runtime persistence leakage.
 *   4. The persistence public entry point (src/server/persistence/index.ts)
 *      carries the `server-only` marker.
 *   5. No bootstrap/admin persistence factory exists.
 *   6. No generic, unrestricted role-selecting persistence factory exists.
 *   7. No hardcoded postgresql:// URL in persistence source outside an
 *      explicit test fixture.
 *   8. No new NEXT_PUBLIC_* database-shaped variable was introduced.
 *   9. Nothing outside the migration factory / persistence boundary /
 *      database tooling / tests imports the migration-role factory.
 *  10. health.ts retains its injected-Persistence design and may import only
 *      the Persistence type from the dedicated persistence types module
 *      (`import type … from "../../server/persistence/types"`). Runtime
 *      persistence imports/re-exports from health.ts remain prohibited.
 *      This is not a generic type-import exemption.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const PERSISTENCE_TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs"];

const HEALTH_OBSERVABILITY_PATH = "src/platform/observability/health.ts";

/** A path exempt from the "no hardcoded connection string" check — an
 * explicit, narrowly-scoped test fixture, never an ordinary source file. */
export function isPersistenceTestFixture(relativePath) {
  return PERSISTENCE_TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

const ALLOWED_PERSISTENCE_IMPORT_PREFIXES = [
  "src/server/persistence/",
  "src/server/organization/",
  "src/server/access-control/",
  "src/server/catalog/",
  "src/server/assortment/",
  "src/server/pricing/",
  "src/server/promotions/",
  "src/server/customer-profiles/",
  "src/server/customer-addresses/",
  "src/server/serviceability/",
  "scripts/database/",
  "scripts/access/",
  "scripts/menu/",
  "scripts/assortment/",
  "scripts/pricing/",
  "scripts/serviceability/",
  "tests/database/",
  "tests/access-control/",
  "tests/catalog/",
  "tests/menu-import/",
  "tests/assortment-availability/",
  "tests/assortment-bootstrap/",
  "tests/pricing-tax/",
  "tests/pricing-bootstrap/",
  "tests/pricing-parity/",
  "tests/customer-profiles/",
  "tests/customer-profile-security/",
  "tests/customer-profile-auth-integration/",
  "tests/customer-addresses/",
  "tests/customer-address-security/",
  "tests/customer-address-auth-integration/",
  "tests/customer-address-concurrency/",
  "tests/customer-commerce/",
  "tests/serviceability/",
  "tests/serviceability-security/",
  "tests/serviceability-auth-integration/",
  "tests/serviceability-concurrency/",
  "tests/administration/",
  "tests/operations/",
  "tests/workforce-auth/",
];

const ALLOWED_PERSISTENCE_IMPORT_PATHS = new Set([
  "scripts/catalog/bootstrap-imp028c-modifiers.ts",
  "scripts/catalog/bootstrap-imp036c-required-topping.ts",
  "scripts/e2e/seed-customer-ordering.ts",
  "scripts/e2e/seed-operations-lifecycle.ts",
  "scripts/financial-document/recover-missing-receipt-vouchers.ts",
  "scripts/financial-document/recover-missing-tax-invoices.ts",
  "scripts/financial-document/signing.ts",
  "scripts/order/recover-missing-orders.ts",
  "scripts/refund/recover-missing-statutory-decisions.ts",
  "tests/catalog-imp028c-modifiers/bootstrap.integration.test.tsx",
  "tests/catalog-imp036c-required-topping/bootstrap.integration.test.tsx",
]);

/** Paths allowed to import the persistence boundary at all (the boundary
 * itself, organization/access-control/catalog/assortment/pricing/promotions/
 * customer-profiles/customer-addresses/serviceability application modules, one-shot database/access/menu/
 * assortment/pricing tooling, and the integration-test trees).
 * health.ts is NOT on this list — it has only a narrow type-only exception. */
export function isAllowedPersistenceImportPath(relativePath) {
  return (
    ALLOWED_PERSISTENCE_IMPORT_PATHS.has(relativePath) ||
    ALLOWED_PERSISTENCE_IMPORT_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  );
}

const ALLOWED_MIGRATION_FACTORY_IMPORT_PREFIXES = [
  "src/server/persistence/migration.ts",
  "src/server/persistence/index.ts",
  "src/server/persistence/migration.test.ts",
  "scripts/database/",
  "tests/database/",
];

/** Paths allowed to reference `getMigrationPersistence` — everyone else is
 * application code and must use the application factory instead. */
export function isAllowedMigrationFactoryImportPath(relativePath) {
  return ALLOWED_MIGRATION_FACTORY_IMPORT_PREFIXES.some((prefix) =>
    relativePath.startsWith(prefix),
  );
}

/** A rough, deliberately permissive check for a leading "use client"
 * directive — same shape Next.js itself requires (a bare string-literal
 * expression statement before any other code). */
export function hasUseClientDirective(contents) {
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith("//")) continue;
    return /^["']use client["'];?$/.test(line);
  }
  return false;
}

const PERSISTENCE_SPECIFIER_PATTERN = /["']([^"']*\bserver\/persistence[^"']*)["']/;

/**
 * True when a source line is a static ES-module import or re-export whose
 * module specifier refers to server/persistence or server/persistence/**.
 *
 * Covered forms (at minimum):
 *   import { X } from "..."
 *   import type { X } from "..."
 *   import X from "..."
 *   import * as X from "..."
 *   export { X } from "..."
 *   export type { X } from "..."
 *   export * from "..."
 */
export function isPersistenceDependencyLine(line) {
  if (!PERSISTENCE_SPECIFIER_PATTERN.test(line)) {
    return false;
  }
  const trimmed = line.trimStart();
  if (trimmed.startsWith("import ") && /\bfrom\s+["'][^"']*\bserver\/persistence/.test(line)) {
    return true;
  }
  if (trimmed.startsWith("export ") && /\bfrom\s+["'][^"']*\bserver\/persistence/.test(line)) {
    return true;
  }
  return false;
}

/**
 * Narrow health.ts exception: may consume the Persistence type only via
 * `import type` from the dedicated types module. Not a public persistence
 * boundary, not a runtime factory consumer, and not a re-export surface.
 */
export function isAllowedHealthPersistenceTypeImport(relativePath, line) {
  if (relativePath !== HEALTH_OBSERVABILITY_PATH) {
    return false;
  }
  return /^\s*import\s+type\s+\{[^}]*\}\s+from\s+["']\.\.\/\.\.\/server\/persistence\/types["']\s*;?\s*$/.test(
    line,
  );
}

/**
 * Shared enforcement classifier for a single source line that may import or
 * re-export src/server/persistence.
 *
 * Architectural boundary: type-only imports are NOT exempt for public trees.
 * Re-exporting persistence also counts as a prohibited dependency.
 *
 * Enforcement order:
 *   1. src/app/** or src/components/** → always reject
 *   2. "use client" modules → reject
 *   3. approved allowlist paths → allow
 *   4. health.ts → only the exact narrow type-only import exception
 *
 * @param {{ relativePath: string, line: string, isClientModule: boolean }} args
 * @returns {"PUBLIC_APP_TREE" | "CLIENT_MODULE" | "OUTSIDE_ALLOWLIST" | null}
 */
export function classifyPersistenceImportLine({ relativePath, line, isClientModule }) {
  if (!isPersistenceDependencyLine(line)) {
    return null;
  }

  const isPublicAppTree =
    relativePath.startsWith("src/app/") || relativePath.startsWith("src/components/");

  if (isPublicAppTree) {
    return "PUBLIC_APP_TREE";
  }
  if (isClientModule) {
    return "CLIENT_MODULE";
  }
  if (isAllowedPersistenceImportPath(relativePath)) {
    return null;
  }
  if (isAllowedHealthPersistenceTypeImport(relativePath, line)) {
    return null;
  }
  return "OUTSIDE_ALLOWLIST";
}

function persistenceImportFindingMessage(kind, relativePath, lineNo) {
  switch (kind) {
    case "PUBLIC_APP_TREE":
      return `${relativePath}:${lineNo}: depends on / re-exports the persistence boundary from the public application tree (src/app/**, src/components/**), which must remain fully static in this slice.`;
    case "CLIENT_MODULE":
      return `${relativePath}:${lineNo}: a "use client" module depends on / re-exports the persistence boundary — persistence must never reach a browser bundle.`;
    case "OUTSIDE_ALLOWLIST":
      return `${relativePath}:${lineNo}: depends on / re-exports the persistence boundary from outside the approved boundary (${ALLOWED_PERSISTENCE_IMPORT_PREFIXES.join(", ")}).`;
    default:
      return `${relativePath}:${lineNo}: persistence dependency boundary violation.`;
  }
}

/** @type {string[]} */
const findings = [];

function listAllFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function readTextFile(relativePath) {
  try {
    return readFileSync(path.join(projectRoot, relativePath), "utf8");
  } catch {
    return null;
  }
}

function checkPersistenceEntryPointIsServerOnly() {
  const rel = "src/server/persistence/index.ts";
  const contents = readTextFile(rel);
  if (contents === null) {
    findings.push(`${rel} does not exist — the persistence public entry point is missing.`);
    return;
  }
  if (!/^\s*import\s+["']server-only["'];?\s*$/m.test(contents)) {
    findings.push(`${rel} must start with \`import "server-only";\`.`);
  }
}

function checkNoAdminOrGenericFactory(files) {
  for (const rel of files) {
    if (!rel.startsWith("src/server/persistence/")) continue;
    const ext = path.extname(rel);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;

    if (ADMIN_FACTORY_PATTERN.test(contents)) {
      findings.push(`${rel}: declares a bootstrap/admin persistence factory, which is prohibited.`);
    }
    if (GENERIC_ROLE_FACTORY_PATTERN.test(contents)) {
      findings.push(
        `${rel}: declares a generic, unrestricted role-selecting \`getPersistence\` factory, which is prohibited.`,
      );
    }
  }
}

function checkNewPublicDatabaseEnvVar(files) {
  for (const rel of [".env.example", "src/platform/config/public-config.ts"]) {
    if (!files.includes(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const match = NEXT_PUBLIC_DATABASE_PATTERN.exec(contents);
    if (match) {
      findings.push(`${rel}: introduces a new browser-visible database variable "${match[0]}".`);
    }
  }
}

const ADMIN_FACTORY_PATTERN =
  /\b(getAdminPersistence|getBootstrapPersistence|AdminPersistenceConfig|BootstrapPersistenceConfig)\b/;
const GENERIC_ROLE_FACTORY_PATTERN =
  /export\s+(?:async\s+)?function\s+getPersistence\s*\(|export\s+const\s+getPersistence\s*=/;
const MIGRATION_FACTORY_USAGE_PATTERN = /getMigrationPersistence\s*\(/;
const CONNECTION_STRING_LITERAL_PATTERN = /postgresql:\/\/[^\s"'`]*:[^\s"'`]*@/;
const PG_IMPORT_PATTERN = /from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const DRIZZLE_RUNTIME_IMPORT_PATTERN =
  /from\s+["']drizzle-orm\/node-postgres[^"']*["']|require\(\s*["']drizzle-orm\/node-postgres[^"']*["']\s*\)/;
const NEXT_PUBLIC_DATABASE_PATTERN = /NEXT_PUBLIC_[A-Z0-9_]*DATABASE[A-Z0-9_]*/;

function scanSourceTree(files) {
  for (const rel of files) {
    const ext = path.extname(rel);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;

    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    const isClientModule = hasUseClientDirective(contents);

    lines.forEach((line, index) => {
      const lineNo = index + 1;

      const persistenceKind = classifyPersistenceImportLine({
        relativePath: rel,
        line,
        isClientModule,
      });
      if (persistenceKind !== null) {
        findings.push(persistenceImportFindingMessage(persistenceKind, rel, lineNo));
      }

      if (isClientModule && (PG_IMPORT_PATTERN.test(line) || DRIZZLE_RUNTIME_IMPORT_PATTERN.test(line))) {
        findings.push(
          `${rel}:${lineNo}: a "use client" module imports "pg" or a Drizzle database runtime module directly.`,
        );
      }

      if (
        rel.startsWith("src/server/persistence/") &&
        !isPersistenceTestFixture(rel) &&
        CONNECTION_STRING_LITERAL_PATTERN.test(line)
      ) {
        findings.push(`${rel}:${lineNo}: contains a hardcoded postgresql:// connection string.`);
      }

      if (
        MIGRATION_FACTORY_USAGE_PATTERN.test(line) &&
        !isAllowedMigrationFactoryImportPath(rel) &&
        !rel.startsWith("src/server/persistence/migration.ts")
      ) {
        findings.push(
          `${rel}:${lineNo}: references \`getMigrationPersistence\` outside the migration factory / database tooling / database tests.`,
        );
      }
    });
  }
}

function main() {
  const files = listAllFiles();

  checkPersistenceEntryPointIsServerOnly();
  checkNoAdminOrGenericFactory(files);
  checkNewPublicDatabaseEnvVar(files);
  scanSourceTree(files);

  console.log("Persistence-boundary audit");
  console.log("=".repeat(60));

  if (findings.length > 0) {
    for (const finding of findings) {
      console.log(`  ✗  ${finding}`);
    }
    console.log("=".repeat(60));
    console.log(`${findings.length} problem(s) found.`);
    process.exitCode = 1;
  } else {
    console.log("  ✓  Persistence entry point carries the server-only marker.");
    console.log("  ✓  No client-component or public-app-tree persistence dependency/re-export.");
    console.log("  ✓  No bootstrap/admin or generic role-selecting factory.");
    console.log("  ✓  No hardcoded connection string in persistence source.");
    console.log("  ✓  No new NEXT_PUBLIC_* database variable.");
    console.log("  ✓  No application-code use of the migration factory.");
    console.log("=".repeat(60));
    console.log("All checks passed. ✓");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
