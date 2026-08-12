#!/usr/bin/env node
/**
 * Canonical catalog audit (IMP-012).
 *
 * Docker-independent static checks over tracked and untracked files
 * (`git ls-files --cached --others --exclude-standard`).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
  "drizzle/0005_organization_outlet_rbac_foundation.sql",
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
  "drizzle/0005_organization_outlet_rbac_foundation.sql":
    "1dd73c239d1000e3c7b801d69f316474b315fec276e7728fdf1200ebac46b904",
};

const IMP012_MIGRATION = "drizzle/0006_canonical_catalog_model.sql";

const CATALOG_TABLE_NAMES = [
  "catalog_products",
  "catalog_variants",
  "catalog_modifier_groups",
  "catalog_modifier_options",
  "catalog_modifier_group_options",
  "catalog_variant_modifier_groups",
  "catalog_bundle_groups",
  "catalog_bundle_group_options",
  "catalog_dietary_tags",
  "catalog_variant_dietary_tags",
  "catalog_modifier_option_dietary_tags",
];

const REQUIRED_MODULES = [
  "src/shared/catalog/constants.ts",
  "src/shared/catalog/dietary-derivation.ts",
  "src/shared/catalog/index.ts",
  "src/platform/database/schema/catalog.ts",
  "src/server/catalog/index.ts",
  "src/server/catalog/products.ts",
  "src/server/catalog/variants.ts",
  "src/server/catalog/modifiers.ts",
  "src/server/catalog/bundles.ts",
  "src/server/catalog/dietary.ts",
  "src/server/catalog/reads.ts",
  "src/server/catalog/validation.ts",
  "src/server/catalog/authorize-catalog.ts",
  IMP012_MIGRATION,
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
  const entry = "src/server/catalog/index.ts";
  if (existsSync(path.join(projectRoot, entry))) {
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

  if (!existsSync(path.join(projectRoot, IMP012_MIGRATION))) {
    findings.push(`Missing IMP-012 migration: ${IMP012_MIGRATION}`);
  }

  const drizzleFiles = listProjectFiles().filter(
    (rel) => rel.startsWith("drizzle/") && rel.endsWith(".sql"),
  );
  const imp012 = drizzleFiles.filter((rel) => rel.includes("canonical_catalog"));
  if (imp012.length !== 1) {
    findings.push(
      `Expected exactly one IMP-012 migration, found ${imp012.length}: ${imp012.join(", ")}`,
    );
  }

  const allowedBases = new Set([
    ...PRIOR_MIGRATIONS.map((p) => path.basename(p)),
    "0006_canonical_catalog_model.sql",
    "0007_existing_menu_import.sql",
    "0008_assortment_operational_availability.sql",
    "0009_pricing_charges_tax.sql",
    "0010_promotions_coupons.sql",
    "0011_customer_profiles.sql",
    "0012_customer_addresses.sql",
    "0013_serviceability.sql",
    "0014_cart.sql",
    "0015_checkout.sql",
    "0016_payment.sql",
    "0017_order.sql",
  ]);
  const extra = drizzleFiles.filter((rel) => !allowedBases.has(path.basename(rel)));
  if (extra.length > 0) {
    findings.push(`Unexpected extra migration SQL files: ${extra.join(", ")}`);
  }

  if (!existsSync(path.join(projectRoot, IMP012_MIGRATION))) return;
  const sql = read(IMP012_MIGRATION);

  const createdTables = [...sql.matchAll(/CREATE TABLE\s+"app"\."(catalog_[a-z0-9_]+)"/gi)].map(
    (m) => m[1],
  );
  if (createdTables.length !== 11) {
    findings.push(
      `${IMP012_MIGRATION}: expected exactly 11 catalog tables, found ${createdTables.length}`,
    );
  }
  for (const name of CATALOG_TABLE_NAMES) {
    if (!createdTables.includes(name)) {
      findings.push(`${IMP012_MIGRATION}: missing table ${name}`);
    }
  }

  if (/ON\s+DELETE\s+CASCADE/i.test(sql)) {
    findings.push(`${IMP012_MIGRATION}: broad ON DELETE CASCADE is forbidden for catalog FKs`);
  }

  if (!sql.includes("catalog.read") || !sql.includes("catalog.manage")) {
    findings.push(`${IMP012_MIGRATION}: missing catalog.read / catalog.manage permission seeds`);
  }
  if (!/REVOKE\s+DELETE\s+ON/i.test(sql)) {
    findings.push(`${IMP012_MIGRATION}: missing REVOKE DELETE privilege tightening`);
  }

  // Business catalog seed rows (products/variants/…) — allow only access_* permission seeds.
  const businessInserts = [
    ...sql.matchAll(/INSERT\s+INTO\s+"app"\."(catalog_[a-z0-9_]+)"/gi),
  ].map((m) => m[1]);
  if (businessInserts.length > 0) {
    findings.push(
      `${IMP012_MIGRATION}: business catalog seed INSERT into ${businessInserts.join(", ")} is forbidden`,
    );
  }

  const forbiddenQuotedColumns = [
    "price",
    "amount",
    "currency",
    "tax",
    "tax_rate",
    "tax_code",
    "unit_price",
    "list_price",
    "organization_id",
    "territory_id",
    "outlet_id",
    "is_available",
    "sold_out",
    "temporarily_unavailable",
    "outlet_enabled",
    "category_id",
    "menu_category",
    "menu_section",
    "menu_sort_order",
    "featured",
    "collection",
  ];
  for (const col of forbiddenQuotedColumns) {
    if (new RegExp(`"${col}"`, "i").test(sql)) {
      findings.push(`${IMP012_MIGRATION}: forbidden column "${col}"`);
    }
  }
}

function checkSchemaFile() {
  const rel = "src/platform/database/schema/catalog.ts";
  if (!existsSync(path.join(projectRoot, rel))) return;
  const contents = read(rel);
  const tableDecls = [
    ...contents.matchAll(/export const (catalog\w+Table)\s*=\s*appSchema\.table\(/g),
  ];
  if (tableDecls.length !== 11) {
    findings.push(
      `${rel}: expected exactly 11 catalog table declarations, found ${tableDecls.length}`,
    );
  }

  const columnForbidden = [
    '"price"',
    '"amount"',
    '"currency"',
    '"tax"',
    '"tax_rate"',
    '"tax_code"',
    '"unit_price"',
    '"list_price"',
    '"organization_id"',
    '"territory_id"',
    '"outlet_id"',
    '"is_available"',
    '"sold_out"',
    '"temporarily_unavailable"',
    '"outlet_enabled"',
    '"category_id"',
    '"menu_category"',
    '"menu_section"',
    '"menu_sort_order"',
    '"featured"',
    '"collection"',
  ];
  for (const col of columnForbidden) {
    if (contents.includes(col)) {
      findings.push(`${rel}: forbidden column literal ${col}`);
    }
  }

  // CamelCase property names that would map to the same forbidden columns.
  for (const name of [
    "organizationId",
    "territoryId",
    "outletId",
    "isAvailable",
    "soldOut",
    "temporarilyUnavailable",
    "outletEnabled",
    "categoryId",
    "menuCategory",
    "menuSection",
    "menuSortOrder",
    "unitPrice",
    "listPrice",
    "taxRate",
    "taxCode",
  ]) {
    if (new RegExp(`\\b${name}\\b`).test(contents)) {
      findings.push(`${rel}: forbidden field ${name}`);
    }
  }
}

function checkHardDeleteRuntime(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/catalog/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/\.delete\s*\(/.test(contents)) {
      findings.push(`${rel}: hard-delete (.delete() on catalog entities) is forbidden`);
    }
    if (/\bdeleteFrom\b|\bDELETE\s+FROM\s+app\.catalog_/i.test(contents)) {
      findings.push(`${rel}: hard-delete SQL against catalog tables is forbidden`);
    }
  }
}

function checkBundleIntegrity(files) {
  const schema = "src/platform/database/schema/catalog.ts";
  if (existsSync(path.join(projectRoot, schema))) {
    const contents = read(schema);
    if (!/componentProductKind|component_product_kind/.test(contents)) {
      findings.push(`${schema}: bundle components must declare component_product_kind`);
    }
    if (!/component_kind_check[\s\S]{0,200}standard/.test(contents)) {
      findings.push(`${schema}: bundle component kind must be enforced as standard`);
    }
    if (/nestedBundle|nested_bundle|bundleOfBundles|parent_bundle_group/i.test(contents)) {
      findings.push(`${schema}: nested Bundle implementation is forbidden`);
    }
  }

  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/catalog/") && rel !== schema) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (
      /nestedBundle|allowNestedBundles|bundleComponentKind\s*[:=]\s*["']bundle["']/i.test(contents)
    ) {
      findings.push(`${rel}: nested Bundle support is forbidden`);
    }
  }
}

function checkRoleNameAuthorization(files) {
  const pattern =
    /(?:role|roleKey|role_key)\s*===\s*["'](?:platform_super_admin|brand_admin|outlet_manager|kitchen_operator|delivery_coordinator|support_refund_operator|finance_viewer)["']/;
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/server/catalog/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (pattern.test(contents) && /if\s*\(/.test(contents)) {
      findings.push(`${rel}: appears to authorize by role name rather than permission key`);
    }
  }
}

function checkForbiddenAuthPlugins(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (rel.includes("audit-catalog") || rel.includes("audit-access-control")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/plugins\s*:\s*\[[^\]]*(admin|organization)\s*\(/s.test(contents)) {
      findings.push(`${rel}: Better Auth Admin/Organization plugin appears enabled`);
    }
  }
}

function checkNoPublicHttpSurface(files) {
  for (const rel of files) {
    if (
      rel.startsWith("src/app/api/catalog") ||
      rel.startsWith("src/app/api/admin/catalog") ||
      rel.startsWith("src/app/catalog") ||
      rel.startsWith("src/app/(admin)/catalog") ||
      rel.startsWith("src/app/workforce/catalog")
    ) {
      findings.push(`${rel}: IMP-012 must not add public catalog HTTP/UI routes`);
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (!rel.startsWith("src/app/") && !rel.startsWith("src/server/catalog/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (rel.startsWith("src/app/") && /catalog\.(read|manage)|from\s+["']@\/server\/catalog/.test(contents)) {
      findings.push(`${rel}: catalog admin UI / app-layer catalog usage is forbidden in IMP-012`);
    }
    if (
      rel.startsWith("src/server/catalog/") &&
      (/toNextJsHandler|NextResponse|export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b|"use server"/.test(
        contents,
      ))
    ) {
      findings.push(`${rel}: Route Handler / Server Action surface is forbidden in catalog module`);
    }
  }
}

function checkNoDockerCatalogService(files) {
  for (const rel of files) {
    if (rel !== "compose.yaml" && rel !== "compose.yml" && !rel.startsWith("docker/")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/^\s*catalog\s*:/m.test(contents) || /image:\s*.*catalog/i.test(contents)) {
      findings.push(`${rel}: new Docker catalog service is forbidden in IMP-012`);
    }
  }
}

function checkNoMenuImport(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isTestFile(rel)) continue;
    if (
      rel.includes("audit-catalog") ||
      rel.includes("audit-menu-images") ||
      rel.includes("audit-menu-import")
    ) {
      continue;
    }
    // IMP-013 owns the fixed existing-menu import under these paths.
    if (
      rel.startsWith("src/server/catalog/menu-import/") ||
      rel.startsWith("src/server/catalog/menu/") ||
      rel.startsWith("scripts/menu/") ||
      rel.startsWith("data/platform/imports/")
    ) {
      continue;
    }
    // Existing static marketing menu modules are out of scope; only flag
    // code that imports menu content *into* the canonical catalog.
    if (
      rel.startsWith("src/components/") ||
      rel.startsWith("src/lib/menu") ||
      rel.startsWith("src/data/") ||
      rel === "src/lib/menuImages.ts"
    ) {
      continue;
    }
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (
      /importMenuIntoCatalog|seedCatalogFromMenu|catalogFromMenu|import.*menu\.json.*catalog|from\s+["'][^"']*menu\.json["']/.test(
        contents,
      ) ||
      (/menu\.json/.test(contents) &&
        /server\/catalog|createProduct|catalog_products/.test(contents) &&
        !rel.includes("menu-import") &&
        !rel.includes("menu/"))
    ) {
      findings.push(`${rel}: unexpected menu→catalog import outside IMP-013 owned paths`);
    }
  }
}

function main() {
  const files = listProjectFiles();
  checkRequiredModules();
  checkMigrations();
  checkSchemaFile();
  checkHardDeleteRuntime(files);
  checkBundleIntegrity(files);
  checkRoleNameAuthorization(files);
  checkForbiddenAuthPlugins(files);
  checkNoPublicHttpSurface(files);
  checkNoDockerCatalogService(files);
  checkNoMenuImport(files);

  if (findings.length > 0) {
    console.error("audit:catalog FAILED");
    for (const finding of findings) {
      console.error(`  ✗  ${finding}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("audit:catalog passed");
  console.log("  ✓  Required modules and server-only marker");
  console.log("  ✓  Migrations 0000–0005 unchanged; single 0006 IMP-012 migration");
  console.log("  ✓  Eleven catalog tables; no price/availability/menu/ownership columns");
  console.log("  ✓  No hard-delete, nested bundles, public HTTP/UI, Docker catalog service, or menu import");
}

main();
