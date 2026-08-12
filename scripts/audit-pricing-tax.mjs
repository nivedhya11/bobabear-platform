#!/usr/bin/env node
/**
 * Pricing, charges and tax audit (IMP-015).
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
  "drizzle/0007_existing_menu_import.sql",
  "drizzle/0008_assortment_operational_availability.sql",
];

const IMP015_MIGRATION = "drizzle/0009_pricing_charges_tax.sql";

const REQUIRED_MODULES = [
  "src/shared/pricing/money.ts",
  "src/shared/pricing/constants.ts",
  "src/shared/pricing/index.ts",
  "src/platform/database/schema/pricing.ts",
  "src/server/pricing/index.ts",
  "src/server/pricing/resolve-price.ts",
  "src/server/pricing/tax.ts",
  "src/server/pricing/quote.ts",
  "src/server/pricing/bootstrap.ts",
  "src/server/pricing/verify.ts",
  "scripts/pricing/bootstrap-existing-menu.ts",
  "scripts/pricing/verify-existing-menu.ts",
  "data/platform/pricing/existing-menu-pricing-v1.json",
  IMP015_MIGRATION,
];

const PRICING_TABLES = [
  "price_books",
  "price_book_variant_prices",
  "price_book_modifier_prices",
  "price_book_bundle_option_prices",
  "charge_definitions",
  "price_book_charge_prices",
  "tax_categories",
  "tax_policies",
  "tax_policy_components",
  "legal_entity_tax_profiles",
  "outlet_tax_profiles",
  "pricing_tax_audit_events",
];

const NEW_PERMISSIONS = [
  "pricing.read",
  "pricing.manage",
  "charges.read",
  "charges.manage",
  "tax.read",
  "tax.manage",
  "pricing.audit.read",
];

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

function read(rel) {
  return readFileSync(path.join(projectRoot, rel), "utf8");
}

function sha256File(rel) {
  return createHash("sha256").update(readFileSync(path.join(projectRoot, rel))).digest("hex");
}

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

function checkRequiredModules() {
  for (const rel of REQUIRED_MODULES) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`Missing required module: ${rel}`);
    }
  }
  const entry = "src/server/pricing/index.ts";
  if (existsSync(path.join(projectRoot, entry))) {
    const contents = read(entry);
    if (!contents.includes('import "server-only"') && !contents.includes("import 'server-only'")) {
      findings.push(`${entry}: missing import "server-only"`);
    }
  }
}

function checkMigrations() {
  const sealed = loadSealedHashes();
  for (const rel of PRIOR_MIGRATIONS) {
    if (!existsSync(path.join(projectRoot, rel))) {
      findings.push(`Missing prior migration: ${rel}`);
      continue;
    }
    const actual = sha256File(rel);
    if (sealed[rel] && sealed[rel] !== actual) {
      findings.push(`Sealed migration mutated: ${rel}`);
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  const tags = drizzleFiles.map((f) => f.slice(0, 4));
  if (tags.filter((t) => t === "0009").length !== 1) {
    findings.push("Exactly one 0009 migration SQL file is required");
  }
  if (tags.filter((t) => t === "0012").length > 1 ||
    (tags.includes("0012") && !drizzleFiles.includes("0012_customer_addresses.sql"))) {
    findings.push("Unexpected 0012 migration; expected 0012_customer_addresses.sql only");
  }
  if (tags.some((t) => t === "0013") && !drizzleFiles.includes("0013_serviceability.sql")) {
    findings.push("Unexpected 0013 migration; expected 0013_serviceability.sql only");
  }
  if (tags.filter((t) => t === "0013").length > 1) {
    findings.push("Exactly one 0013 migration SQL file is required when present");
  }
  if (tags.some((t) => t === "0015") && !drizzleFiles.includes("0015_checkout.sql")) {
    findings.push("Unexpected 0015 migration; expected 0015_checkout.sql only");
  }
  if (
    drizzleFiles.some((f) => f.startsWith("0016_") && f !== "0016_payment.sql")
  ) {
    findings.push("Unexpected 0016 migration; expected 0016_payment.sql only");
  }
  if (
    tags.filter((t) => t === "0014").length > 1 ||
    (tags.includes("0014") && !drizzleFiles.includes("0014_cart.sql"))
  ) {
    findings.push("Unexpected 0014 migration; expected 0014_cart.sql only");
  }
  if (
    tags.filter((t) => t === "0011").length > 1 ||
    (tags.includes("0011") &&
      !drizzleFiles.includes("0011_customer_profiles.sql"))
  ) {
    findings.push("Unexpected 0011 migration; expected 0011_customer_profiles.sql only");
  }
  if (!existsSync(path.join(projectRoot, IMP015_MIGRATION))) {
    findings.push(`Missing IMP-015 migration: ${IMP015_MIGRATION}`);
  } else if (!sealed[IMP015_MIGRATION]) {
    findings.push(`${IMP015_MIGRATION} must be sealed in migration-integrity.json`);
  } else if (sealed[IMP015_MIGRATION] !== sha256File(IMP015_MIGRATION)) {
    findings.push(`${IMP015_MIGRATION} hash does not match sealed integrity`);
  }

  const sql = read(IMP015_MIGRATION);
  for (const table of PRICING_TABLES) {
    if (!sql.includes(`"app"."${table}"`)) {
      findings.push(`${IMP015_MIGRATION} must create ${table}`);
    }
  }
  if (/INSERT INTO\s+"?app"?\."?price_book_variant_prices"?/i.test(sql)) {
    findings.push("0009 must not seed business variant prices");
  }
  if (/INSERT INTO\s+"?app"?\."?legal_entity_tax_profiles"?/i.test(sql)) {
    findings.push("0009 must not seed business GSTIN / tax profiles");
  }
  if (/INSERT INTO\s+"?app"?\."?price_book_charge_prices"?/i.test(sql)) {
    findings.push("0009 must not seed charge amounts");
  }
  if (!sql.includes("restaurant_service")) {
    findings.push("0009 must seed restaurant_service tax category");
  }
  if (!/REVOKE DELETE ON[\s\S]*pricing_tax_audit_events[\s\S]*FROM boba_bear_app/i.test(sql)) {
    findings.push("0009 must REVOKE DELETE on pricing_tax_audit_events");
  }
  if (!/REVOKE UPDATE ON[\s\S]*pricing_tax_audit_events[\s\S]*FROM boba_bear_app/i.test(sql)) {
    findings.push("0009 must REVOKE UPDATE on pricing_tax_audit_events");
  }
}

function checkPermissions() {
  const catalog = read("src/shared/access-control/catalog.ts");
  for (const key of NEW_PERMISSIONS) {
    if (!catalog.includes(`"${key}"`)) {
      findings.push(`catalog.ts missing permission ${key}`);
    }
  }
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = (keysMatch[1].match(/"/g) || []).length / 2;
    if (count !== 51 && count !== 55) {
      findings.push(`PERMISSION_KEYS must contain 51 or 55 entries, found ${count}`);
    }
  }
}

function checkDomainGuards(files) {
  const money = read("src/shared/pricing/money.ts");
  if (/Number\([^)]*\)\s*\*\s*100/.test(money.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))) {
    findings.push("money.ts must not use Number(x)*100 authoritative conversion");
  }

  for (const rel of ["src/platform/database/schema/catalog.ts", "src/platform/database/schema/menu.ts"]) {
    const contents = read(rel);
    if (/\b(amount_paise|price_paise|gst_rate|tax_rate)\b/.test(contents)) {
      findings.push(`${rel}: must not gain pricing/tax columns`);
    }
  }

  for (const rel of files) {
    if (!rel.startsWith("src/") && !rel.startsWith("scripts/")) continue;
    if (rel.includes(".test.") || rel.includes("audit-pricing")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/toNextJsHandler|createAuthClient|src\/app\/api\/pricing|src\/app\/api\/tax/.test(contents) && rel.startsWith("src/")) {
      findings.push(`${rel}: public pricing/tax HTTP surface is forbidden`);
    }
    if (/convenience_fee|platform_fee|handling_fee/.test(contents) && rel.includes("pricing")) {
      findings.push(`${rel}: forbidden fee types`);
    }
    if (/zomato|swiggy|petpooja/i.test(contents) && rel.includes("pricing") && !rel.includes("audit")) {
      findings.push(`${rel}: aggregator pricing forbidden`);
    }
    if (
      /coupon|BOGO|percentage.?off/i.test(contents) &&
      rel.includes("server/pricing") &&
      !rel.endsWith("server/pricing/quote.ts")
    ) {
      findings.push(`${rel}: promotions belong to IMP-016`);
    }
    // quote.ts may orchestrate IMP-016 allocation via server/promotions imports only.
    if (
      rel.endsWith("server/pricing/quote.ts") &&
      /BOGO|percentage.?off|buy_x_get_y/i.test(contents)
    ) {
      findings.push(`${rel}: must not embed promotion benefit logic (use server/promotions)`);
    }
  }

  const bootstrap = read("scripts/pricing/bootstrap-existing-menu.ts");
  if (/--file|stdin|https?:\/\//.test(bootstrap) && !/rejectArbitraryManifestPath/.test(bootstrap)) {
    findings.push("bootstrap must reject arbitrary file/url/stdin inputs");
  }
}

function main() {
  checkRequiredModules();
  checkMigrations();
  checkPermissions();
  checkDomainGuards(listProjectFiles());

  if (findings.length > 0) {
    process.stderr.write(`audit:pricing-tax failed (${findings.length} finding(s)):\n`);
    for (const finding of findings) {
      process.stderr.write(`  - ${finding}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write("audit:pricing-tax passed\n");
}

main();
