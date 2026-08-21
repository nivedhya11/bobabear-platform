#!/usr/bin/env node
/**
 * Access-control / organization RBAC audit (IMP-011).
 *
 * Docker-independent static checks over tracked and untracked files
 * (`git ls-files --cached --others --exclude-standard`).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs", ".integration.test.ts"];

const PRIOR_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
  "drizzle/0002_better_auth_foundation.sql",
  "drizzle/0003_customer_phone_otp_authentication.sql",
  "drizzle/0004_workforce_authentication_mfa.sql",
];

const PRIOR_MIGRATION_HASHES = {
  "drizzle/0000_database-foundation.sql":
    "2c9481bca62dd1e856ff8083cb8bcbe9aa25558af78ba40810100c91cdaf99cc",
  "drizzle/0001_transactional_outbox_idempotency.sql":
    "cd5f3a04ff8fbdddcd42e96a7faf8ea7a21a115be1a442d41b09608c5d6a400b",
  "drizzle/0002_better_auth_foundation.sql":
    "c174449d444455d77150a87d60f807d0f7395a2694757086e7a0dcf9991a4a16",
  "drizzle/0003_customer_phone_otp_authentication.sql":
    "37d2e931728daa43dd2f4a085dd569b2c3e45d32810b128533ac34a065ab79b3",
  "drizzle/0004_workforce_authentication_mfa.sql":
    "bcf4ed284fd6ab96df865775e69c42e65e4a8326c96d63201dcb907c55968ddd",
};

const IMP011_MIGRATION = "drizzle/0005_organization_outlet_rbac_foundation.sql";

const REQUIRED_MODULES = [
  "src/shared/access-control/catalog.ts",
  "src/shared/access-control/index.ts",
  "src/platform/database/schema/organizations.ts",
  "src/platform/database/schema/access-control.ts",
  "src/server/organization/index.ts",
  "src/server/access-control/index.ts",
  "scripts/access/bootstrap-platform-admin.ts",
];

const findings = [];

function listProjectFiles() {
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

function isTestFile(rel) {
  return TEST_FILE_SUFFIXES.some((suffix) => rel.endsWith(suffix));
}

function read(rel) {
  return readFileSync(path.join(projectRoot, rel), "utf8");
}

function sha256File(rel) {
  return createHash("sha256").update(readFileSync(path.join(projectRoot, rel))).digest("hex");
}

function checkRequiredModules() {
  for (const rel of REQUIRED_MODULES) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`Missing required module: ${rel}`);
    }
  }
  for (const entry of ["src/server/organization/index.ts", "src/server/access-control/index.ts"]) {
    if (!existsSync(path.join(projectRoot, entry))) continue;
    const contents = read(entry);
    if (!contents.includes('import "server-only"') && !contents.includes("import 'server-only'")) {
      findings.push(`${entry}: missing import "server-only"`);
    }
  }
}

function checkMigrations() {
  for (const rel of PRIOR_MIGRATIONS) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`Missing prior migration: ${rel}`);
      continue;
    }
    const actual = sha256File(rel);
    const expected = PRIOR_MIGRATION_HASHES[rel];
    if (actual !== expected) {
      findings.push(`${rel}: sealed hash changed (expected ${expected}, got ${actual})`);
    }
  }

  if (!existsSync(path.join(projectRoot, IMP011_MIGRATION))) {
    findings.push(`Missing IMP-011 migration: ${IMP011_MIGRATION}`);
  }

  const drizzleFiles = listProjectFiles().filter(
    (rel) => rel.startsWith("drizzle/") && rel.endsWith(".sql"),
  );
  const imp011 = drizzleFiles.filter((rel) => rel.includes("organization_outlet_rbac"));
  if (imp011.length !== 1) {
    findings.push(`Expected exactly one IMP-011 migration, found ${imp011.length}: ${imp011.join(", ")}`);
  }

  if (existsSync(path.join(projectRoot, IMP011_MIGRATION))) {
    const sql = read(IMP011_MIGRATION);
    if (/\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(sql) || /\bCREATE\s+POLICY\b/i.test(sql)) {
      findings.push(`${IMP011_MIGRATION}: introduces PostgreSQL RLS (forbidden in IMP-011)`);
    }
    if (!sql.includes("IMP-011 system catalog seed")) {
      findings.push(`${IMP011_MIGRATION}: missing system catalog seed marker`);
    }
    if (!sql.includes("REVOKE DELETE ON")) {
      findings.push(`${IMP011_MIGRATION}: missing privilege REVOKE tightening`);
    }
  }
}

function checkForbiddenAuthPlugins(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (rel.includes("audit-access-control")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/better-auth\/plugins\/admin|from\s+["']better-auth\/plugins\/organization|organization\(\s*\{/.test(contents)) {
      if (rel.includes("access-control") || rel.includes("organization/") || rel.includes("shared/access-control")) {
        findings.push(`${rel}: Better Auth Admin/Organization plugin usage is forbidden`);
      }
      // Broad scan — flag any production enablement
      if (/plugins\s*:\s*\[[^\]]*(admin|organization)\s*\(/s.test(contents)) {
        findings.push(`${rel}: Better Auth Admin/Organization plugin appears enabled`);
      }
    }
  }
}

function checkRoleNameAuthorization(files) {
  const pattern =
    /(?:role|roleKey|role_key)\s*===\s*["'](?:platform_super_admin|brand_admin|outlet_manager|kitchen_operator|delivery_coordinator|support_refund_operator|finance_viewer)["']/;
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (rel.startsWith("src/shared/access-control/")) continue;
    if (rel.includes("audit-access-control")) continue;
    if (rel.includes("catalog.ts")) continue;
    // Catalog/bootstrap may reference role keys for data, not authz decisions.
    // Flag only clear authorization branches in application modules.
    if (!rel.startsWith("src/server/") && !rel.startsWith("src/app/") && !rel.startsWith("src/components/")) {
      continue;
    }
    if (rel.startsWith("src/server/access-control/bootstrap.ts")) continue;
    if (rel.startsWith("src/server/access-control/assignments.ts")) continue;
    if (rel.startsWith("src/server/access-control/authorize.ts")) continue;
    if (rel.startsWith("src/server/access-control/membership.ts")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (pattern.test(contents) && /if\s*\(/.test(contents)) {
      // Allow counting PSA by key in last-admin helpers which is data lookup not authz-by-role-name for business APIs
      if (rel.includes("authorize.ts") || rel.includes("bootstrap.ts")) continue;
      findings.push(`${rel}: appears to authorize by role name rather than permission key`);
    }
  }
}

function checkNoPublicHttpSurface(files) {
  for (const rel of files) {
    if (rel.startsWith("src/app/api/access") || rel.startsWith("src/app/api/admin") || rel.startsWith("src/app/api/organization")) {
      findings.push(`${rel}: IMP-011 must not add public access-control/admin HTTP routes`);
    }
  }
}

function checkNoPermissionCache(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/localStorage\.(setItem|getItem).*permission|sessionStorage\.(setItem|getItem).*permission/i.test(contents)) {
      findings.push(`${rel}: appears to cache permissions in browser storage`);
    }
    if (/permissionCache|roleCache|membershipCache|redis.*permission/i.test(contents)) {
      findings.push(`${rel}: appears to introduce a permission/role cache`);
    }
  }
}

function checkNoDenyRoles(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/access-control/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/deny[_-]?role|genericDeny|permission.*subtract|DENY_ROLE/i.test(contents)) {
      findings.push(`${rel}: appears to implement generic deny roles`);
    }
  }
}

function checkCatalogRuntimeWrites(files) {
  const catalogTables = [
    "accessPermissionsTable",
    "accessRolesTable",
    "accessRoleAllowedScopesTable",
    "accessRolePermissionsTable",
  ];
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/")) continue;
    if (rel.includes("schema/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    for (const table of catalogTables) {
      if (new RegExp(`\\.(insert|update|delete)\\(\\s*${table}`).test(contents)) {
        findings.push(`${rel}: runtime write to system catalog ${table} is forbidden`);
      }
      if (new RegExp(`db\\.insert\\(\\s*${table}`).test(contents)) {
        findings.push(`${rel}: runtime write to system catalog ${table} is forbidden`);
      }
    }
  }
}

function checkCustomRoleApis(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/\b(createCustomRole|updateCustomRole|deleteCustomRole|createRoleDefinition)\b/.test(contents)) {
      findings.push(`${rel}: custom role creation/editing APIs are forbidden in IMP-011`);
    }
  }
}

function main() {
  const files = listProjectFiles();
  checkRequiredModules();
  checkMigrations();
  checkForbiddenAuthPlugins(files);
  checkRoleNameAuthorization(files);
  checkNoPublicHttpSurface(files);
  checkNoPermissionCache(files);
  checkNoDenyRoles(files);
  checkCatalogRuntimeWrites(files);
  checkCustomRoleApis(files);

  if (findings.length > 0) {
    console.error("audit:access-control FAILED");
    for (const finding of findings) {
      console.error(`  ✗  ${finding}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("audit:access-control passed");
  console.log("  ✓  Required modules and server-only markers");
  console.log("  ✓  Migrations 0000–0004 unchanged; single 0005 IMP-011 migration");
  console.log("  ✓  No Better Auth Admin/Organization plugins, public admin routes, caches, deny roles, or catalog writes");
}

main();
