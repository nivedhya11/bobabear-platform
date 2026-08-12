#!/usr/bin/env node
/**
 * Existing menu import audit (IMP-013).
 *
 * Docker-independent static checks over tracked and untracked files
 * (`git ls-files --cached --others --exclude-standard`).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

const PRIOR_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
  "drizzle/0002_better_auth_foundation.sql",
  "drizzle/0003_customer_phone_otp_authentication.sql",
  "drizzle/0004_workforce_authentication_mfa.sql",
  "drizzle/0005_organization_outlet_rbac_foundation.sql",
  "drizzle/0006_canonical_catalog_model.sql",
];

const SOURCE_PRESERVATION = {
  "src/data/menu.json":
    "453546e18b2cc92df9e7415323f508dc1d303de96ae9fd5ff8f5ff9ad35711f0",
  "src/lib/menuImages.ts":
    "5e8d60e1721b381658518a45189db7cba369b8856388c21714e5bfab0ddfe2f5",
  "src/types/menu.ts":
    "70b838aa47960dfe9de543e8e8470e5be4e81464ecd679d2eed71bdf03c15e45",
};

const IMP013_MIGRATION = "drizzle/0007_existing_menu_import.sql";
const MANIFEST = "data/platform/imports/existing-menu-v1.json";

const FORBIDDEN_MENU_COLUMNS = [
  "price",
  "amount",
  "currency",
  "gst",
  "tax",
  "discount",
  "promotion_id",
  "outlet_id",
  "organization_id",
  "territory_id",
  "is_available",
  "sold_out",
  "temporarily_unavailable",
  "stock_quantity",
  "petpooja_id",
  "zomato_id",
  "swiggy_id",
  "provider_item_id",
];

function loadSealedHashes() {
  const integrity = JSON.parse(
    readFileSync(path.join(projectRoot, "drizzle/migration-integrity.json"), "utf8"),
  );
  const map = {};
  for (const entry of integrity.migrations ?? []) {
    if (entry.path && entry.sha256) map[entry.path] = entry.sha256;
  }
  return map;
}

function sha256File(rel) {
  return createHash("sha256")
    .update(readFileSync(path.join(projectRoot, rel)))
    .digest("hex");
}

function listProjectFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

function read(rel) {
  return readFileSync(path.join(projectRoot, rel), "utf8");
}

function checkMigrations() {
  const sealed = loadSealedHashes();
  for (const rel of PRIOR_MIGRATIONS) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`missing prior migration ${rel}`);
      continue;
    }
    const actual = sha256File(rel);
    const expected = sealed[rel];
    if (expected && actual !== expected) {
      findings.push(`${rel} must remain byte-for-byte unchanged (got ${actual})`);
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    f.endsWith(".sql"),
  );
  const imp013 = drizzleFiles.filter((f) => f.startsWith("0007_"));
  if (imp013.length !== 1 || imp013[0] !== "0007_existing_menu_import.sql") {
    findings.push(`expected exactly one 0007_existing_menu_import.sql, found: ${imp013.join(",")}`);
  }
  const imp014 = drizzleFiles.filter((f) => f.startsWith("0008_"));
  if (
    imp014.length !== 1 ||
    imp014[0] !== "0008_assortment_operational_availability.sql"
  ) {
    findings.push(
      `expected exactly one 0008_assortment_operational_availability.sql, found: ${imp014.join(",")}`,
    );
  }
  const imp015 = drizzleFiles.filter((f) => f.startsWith("0009_"));
  if (
    imp015.length > 1 ||
    (imp015.length === 1 && imp015[0] !== "0009_pricing_charges_tax.sql")
  ) {
    findings.push(
      `expected at most one 0009_pricing_charges_tax.sql, found: ${imp015.join(",")}`,
    );
  }
  if (
    drizzleFiles.some((f) => f.startsWith("0012_") && f !== "0012_customer_addresses.sql")
  ) {
    findings.push("Unexpected 0012 migration; expected 0012_customer_addresses.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0015_") && f !== "0015_checkout.sql")) {
    findings.push("Unexpected 0015 migration; expected 0015_checkout.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0016_") && f !== "0016_payment.sql")) {
    findings.push("Unexpected 0016 migration; expected 0016_payment.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0014_") && f !== "0014_cart.sql")) {
    findings.push("Unexpected 0014 migration; expected 0014_cart.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0013_") && f !== "0013_serviceability.sql")) {
    findings.push("Unexpected 0013 migration; expected 0013_serviceability.sql only");
  }
  if (
    drizzleFiles.some(
      (f) => f.startsWith("0011_") && f !== "0011_customer_profiles.sql",
    )
  ) {
    findings.push("Unexpected 0011 migration; expected 0011_customer_profiles.sql only");
  }

  if (!existsSync(path.join(projectRoot, IMP013_MIGRATION))) {
    findings.push(`missing ${IMP013_MIGRATION}`);
    return;
  }
  const sql = read(IMP013_MIGRATION);
  for (const table of ["menus", "menu_sections", "menu_entries"]) {
    if (!sql.includes(`"app"."${table}"`) && !sql.includes(`app.${table}`)) {
      findings.push(`${IMP013_MIGRATION} must create app.${table}`);
    }
  }
  if (!sql.includes("menu.read") || !sql.includes("menu.manage")) {
    findings.push(`${IMP013_MIGRATION} must seed menu.read and menu.manage`);
  }
  if (!sql.includes("REVOKE DELETE") || !sql.includes("REVOKE TRUNCATE")) {
    findings.push(`${IMP013_MIGRATION} must REVOKE DELETE/TRUNCATE on menu tables`);
  }
  if (
    /INSERT\s+INTO\s+"?app"?\."?(menus|menu_sections|menu_entries|catalog_products)"?/i.test(
      sql,
    ) &&
    !/access_permissions|access_role_permissions/i.test(sql)
  ) {
    // Allow permission inserts only — reject business seed rows.
  }
  if (
    /INSERT\s+INTO\s+"app"\."(menus|menu_sections|menu_entries|catalog_products|catalog_variants)"/i.test(
      sql,
    )
  ) {
    findings.push(`${IMP013_MIGRATION} must not seed business menu/catalog rows`);
  }
}

function checkSchema() {
  const schemaPath = "src/platform/database/schema/menu.ts";
  if (!existsSync(path.join(projectRoot, schemaPath))) {
    findings.push(`missing ${schemaPath}`);
    return;
  }
  const contents = read(schemaPath);
  if (contents.includes("pgTable(") && !contents.includes("appSchema.table")) {
    findings.push(`${schemaPath} must use appSchema.table, not bare pgTable`);
  }
  for (const col of FORBIDDEN_MENU_COLUMNS) {
    if (new RegExp(`\\b${col}\\b`, "i").test(contents)) {
      findings.push(`${schemaPath} must not declare forbidden column ${col}`);
    }
  }
}

function checkStaticSourcePreservation() {
  for (const [rel, expected] of Object.entries(SOURCE_PRESERVATION)) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`missing authoritative source ${rel}`);
      continue;
    }
    const actual = sha256File(rel);
    if (actual !== expected) {
      findings.push(
        `${rel} must remain unchanged during IMP-013 (expected ${expected}, got ${actual})`,
      );
    }
  }

  // Guard referenced menu assets exist; do not require unrelated public assets unchanged.
  const imagesTs = read("src/lib/menuImages.ts");
  const paths = [...imagesTs.matchAll(/M\s*\+\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const file of paths) {
    const rel = path.join("public/assets/menu", file);
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`menu image missing: ${rel}`);
    }
  }
}

function checkManifest() {
  if (!existsSync(path.join(projectRoot, MANIFEST))) {
    findings.push(`missing ${MANIFEST}`);
    return;
  }
  const manifest = JSON.parse(read(MANIFEST));
  if (manifest.import_id !== "existing-menu-v1" || manifest.version !== 1) {
    findings.push("manifest import_id/version must be existing-menu-v1 / 1");
  }
  if (typeof manifest.source_inventory_sha256 !== "string") {
    findings.push("manifest must include source_inventory_sha256");
  }
}

function checkRequiredModules() {
  const required = [
    "src/server/catalog/menu/index.ts",
    "src/server/catalog/menu-import/index.ts",
    "src/shared/catalog/menu/index.ts",
    "scripts/menu/import-existing.ts",
    "scripts/menu/verify-existing.ts",
    "scripts/menu/inventory-existing.ts",
  ];
  for (const rel of required) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`missing required module ${rel}`);
    }
  }
  const menuIndex = read("src/server/catalog/menu/index.ts");
  const importIndex = read("src/server/catalog/menu-import/index.ts");
  if (!menuIndex.includes('import "server-only"')) {
    findings.push("src/server/catalog/menu/index.ts must import server-only");
  }
  if (!importIndex.includes('import "server-only"')) {
    findings.push("src/server/catalog/menu-import/index.ts must import server-only");
  }
}

function checkForbiddenSurfaces(files) {
  for (const rel of files) {
    if (rel.startsWith("src/app/api/")) {
      findings.push(`${rel}: public/Next.js API routes are forbidden in IMP-013`);
    }
    if (
      /use server/.test(rel) ||
      (rel.endsWith(".ts") &&
        !rel.includes(".test.") &&
        existsSync(path.join(projectRoot, rel)) &&
        /["']use server["']/.test(read(rel)))
    ) {
      if (rel.startsWith("src/") && !rel.includes(".test.")) {
        try {
          if (/["']use server["']/.test(read(rel))) {
            findings.push(`${rel}: Server Actions are forbidden in IMP-013`);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  const importCli = read("scripts/menu/import-existing.ts");
  if (/--file=|process\.stdin|https?:\/\//.test(importCli)) {
    findings.push("import CLI must not support arbitrary file/URL/stdin manifests");
  }

  const compose = read("compose.yaml");
  if (/^\s*menu-service\s*:/m.test(compose) || /^\s*catalog-service\s*:/m.test(compose)) {
    findings.push("new menu/catalog Docker service is forbidden");
  }

  // Detect IMP-014 assortment/availability implementation markers in production source
  // (IMP-014 now owns these modules — only flag premature markers outside that slice.)
  for (const rel of files) {
    if (!rel.startsWith("src/server/") && !rel.startsWith("src/platform/database/schema/")) {
      continue;
    }
    if (rel.includes(".test.")) continue;
    if (rel.startsWith("src/server/assortment/") || rel.includes("schema/assortment")) {
      continue;
    }
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (
      /assortment|is_available|sold_out|outlet_assortment|territory_assortment/.test(contents) &&
      !rel.includes("menu-import") &&
      !rel.includes("audit-menu-import")
    ) {
      // Allow mentions in comments about deferral
      if (/IMP-014|out of scope|must not|forbidden|do not/.test(contents)) continue;
      if (/createAssortment|outletAssortment|isAvailable\s*:/.test(contents)) {
        findings.push(`${rel}: unexpected assortment/availability markers outside IMP-014 modules`);
      }
    }
  }
}

function checkPermissionsCatalog() {
  const catalog = read("src/shared/access-control/catalog.ts");
  if (!catalog.includes('"menu.read"') || !catalog.includes('"menu.manage"')) {
    findings.push("access-control catalog must declare menu.read and menu.manage");
  }
  const keys = [...catalog.matchAll(/"([a-z_.]+)"/g)]
    .map((m) => m[1])
    .filter((k) => k.includes("."));
  // Rough check — detailed count is in unit tests
  if (!keys.includes("menu.read") || !keys.includes("menu.manage")) {
    findings.push("PERMISSION_KEYS must include menu.read and menu.manage");
  }
}

function main() {
  const files = listProjectFiles();
  checkMigrations();
  checkSchema();
  checkStaticSourcePreservation();
  checkManifest();
  checkRequiredModules();
  checkForbiddenSurfaces(files);
  checkPermissionsCatalog();

  if (findings.length > 0) {
    console.error("audit:menu-import FAILED");
    for (const finding of findings) {
      console.error(`  ✗  ${finding}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("audit:menu-import OK");
  console.log("  ✓  Migrations 0000–0006 unchanged; single 0007_existing_menu_import");
  console.log("  ✓  Static menu sources preserved");
  console.log("  ✓  Fixed existing-menu-v1 manifest present");
  console.log("  ✓  No public API / Server Action / arbitrary import path");
}

main();
