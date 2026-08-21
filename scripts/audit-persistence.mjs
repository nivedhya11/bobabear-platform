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
 *   1. No "use client" module imports src/server/persistence.
 *   2. No "use client" module imports "pg" or a Drizzle database runtime
 *      module.
 *   3. No src/app/** or src/components/** module imports
 *      src/server/persistence at all (client or server — this slice keeps
 *      the public app fully static; see AGENTS.md IMP-006).
 *   4. The persistence public entry point (src/server/persistence/index.ts)
 *      carries the `server-only` marker.
 *   5. No bootstrap/admin persistence factory exists.
 *   6. No generic, unrestricted role-selecting persistence factory exists.
 *   7. No hardcoded postgresql:// URL in persistence source outside an
 *      explicit test fixture.
 *   8. No new NEXT_PUBLIC_* database-shaped variable was introduced.
 *   9. Nothing outside the migration factory / persistence boundary /
 *      database tooling / tests imports the migration-role factory.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const PERSISTENCE_TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs"];

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
];

const ALLOWED_PERSISTENCE_IMPORT_PATHS = new Set([
  "scripts/catalog/bootstrap-imp028c-modifiers.ts",
  "scripts/e2e/seed-customer-ordering.ts",
  "scripts/financial-document/recover-missing-receipt-vouchers.ts",
  "scripts/financial-document/recover-missing-tax-invoices.ts",
  "scripts/financial-document/signing.ts",
  "scripts/order/recover-missing-orders.ts",
  "scripts/refund/recover-missing-statutory-decisions.ts",
  "tests/catalog-imp028c-modifiers/bootstrap.integration.test.tsx",
]);

/** Paths allowed to import the persistence boundary at all (the boundary
 * itself, organization/access-control/catalog/assortment/pricing/promotions/
 * customer-profiles/customer-addresses/serviceability application modules, one-shot database/access/menu/
 * assortment/pricing tooling, and the integration-test trees). */
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

const PERSISTENCE_IMPORT_PATTERN = /from\s+["']([^"']*\bserver\/persistence[^"']*)["']/;
const PG_IMPORT_PATTERN = /from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const DRIZZLE_RUNTIME_IMPORT_PATTERN =
  /from\s+["']drizzle-orm\/node-postgres[^"']*["']|require\(\s*["']drizzle-orm\/node-postgres[^"']*["']\s*\)/;
const CONNECTION_STRING_LITERAL_PATTERN = /postgresql:\/\/[^\s"'`]*:[^\s"'`]*@/;
const ADMIN_FACTORY_PATTERN =
  /\b(getAdminPersistence|getBootstrapPersistence|AdminPersistenceConfig|BootstrapPersistenceConfig)\b/;
const GENERIC_ROLE_FACTORY_PATTERN =
  /export\s+(?:async\s+)?function\s+getPersistence\s*\(|export\s+const\s+getPersistence\s*=/;
const MIGRATION_FACTORY_USAGE_PATTERN = /getMigrationPersistence\s*\(/;
const NEXT_PUBLIC_DATABASE_PATTERN = /NEXT_PUBLIC_[A-Z0-9_]*DATABASE[A-Z0-9_]*/;

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

function scanSourceTree(files) {
  for (const rel of files) {
    const ext = path.extname(rel);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;

    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    const isClientModule = hasUseClientDirective(contents);
    const isPublicAppTree = rel.startsWith("src/app/") || rel.startsWith("src/components/");

    lines.forEach((line, index) => {
      const lineNo = index + 1;

      const persistenceImportMatch = PERSISTENCE_IMPORT_PATTERN.exec(line);
      if (persistenceImportMatch) {
        if (isPublicAppTree) {
          findings.push(
            `${rel}:${lineNo}: imports the persistence boundary from the public application tree (src/app/**, src/components/**), which must remain fully static in this slice.`,
          );
        } else if (isClientModule) {
          findings.push(
            `${rel}:${lineNo}: a "use client" module imports the persistence boundary — persistence must never reach a browser bundle.`,
          );
        } else if (!isAllowedPersistenceImportPath(rel)) {
          findings.push(
            `${rel}:${lineNo}: imports the persistence boundary from outside the approved boundary (src/server/persistence/**, src/server/organization/**, src/server/access-control/**, src/server/catalog/**, src/server/assortment/**, src/server/pricing/**, src/server/promotions/**, src/server/customer-profiles/**, src/server/customer-addresses/**, src/server/serviceability/**, scripts/database/**, scripts/access/**, scripts/menu/**, scripts/assortment/**, scripts/pricing/**, tests/database/**, tests/access-control/**, tests/catalog/**, tests/menu-import/**, tests/assortment-availability/**, tests/assortment-bootstrap/**, tests/pricing-tax/**, tests/pricing-bootstrap/**, tests/pricing-parity/**, tests/customer-profiles/**, tests/customer-profile-security/**, tests/customer-profile-auth-integration/**, tests/customer-addresses/**, tests/customer-address-security/**, tests/customer-address-auth-integration/**, tests/customer-address-concurrency/**, tests/customer-commerce/**, tests/serviceability/**, tests/serviceability-security/**, tests/serviceability-auth-integration/**, tests/serviceability-concurrency/**).`,
          );
        }
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
  console.log("  ✓  No client-component or public-app-tree persistence import.");
  console.log("  ✓  No bootstrap/admin or generic role-selecting factory.");
  console.log("  ✓  No hardcoded connection string in persistence source.");
  console.log("  ✓  No new NEXT_PUBLIC_* database variable.");
  console.log("  ✓  No application-code use of the migration factory.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
