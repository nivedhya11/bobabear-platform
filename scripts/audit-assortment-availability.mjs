#!/usr/bin/env node
/**
 * Assortment and operational availability audit (IMP-014).
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
];

const IMP014_MIGRATION = "drizzle/0008_assortment_operational_availability.sql";

const REQUIRED_MODULES = [
  "src/shared/assortment/constants.ts",
  "src/shared/assortment/index.ts",
  "src/platform/database/schema/assortment.ts",
  "src/server/assortment/index.ts",
  "src/server/assortment/rules.ts",
  "src/server/assortment/assortment-reads.ts",
  "src/server/assortment/availability.ts",
  "src/server/assortment/operating.ts",
  "src/server/assortment/resolve-operating.ts",
  "src/server/assortment/resolve-eligibility.ts",
  "src/server/assortment/bootstrap.ts",
  "src/server/assortment/verify.ts",
  "scripts/assortment/bootstrap-existing-menu.ts",
  "scripts/assortment/verify-existing-menu.ts",
  IMP014_MIGRATION,
];

const ASSORTMENT_TABLES = [
  "assortment_rules",
  "outlet_variant_availability",
  "outlet_modifier_option_availability",
  "outlet_operating_profiles",
  "outlet_operating_intervals",
  "assortment_availability_audit_events",
];

const FORBIDDEN_COLUMNS = [
  "price",
  "amount",
  "currency",
  "gst",
  "tax",
  "discount",
  "stock_quantity",
  "inventory_quantity",
  "petpooja_id",
  "zomato_id",
  "swiggy_id",
  "is_orderable",
  "isOrderable",
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
  const entry = "src/server/assortment/index.ts";
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

  if (!existsSync(path.join(projectRoot, IMP014_MIGRATION))) {
    findings.push(`Missing IMP-014 migration: ${IMP014_MIGRATION}`);
  } else if (!sealed[IMP014_MIGRATION]) {
    findings.push(`${IMP014_MIGRATION} must be sealed in migration-integrity.json`);
  } else if (sealed[IMP014_MIGRATION] !== sha256File(IMP014_MIGRATION)) {
    findings.push(`${IMP014_MIGRATION} hash does not match sealed integrity`);
  }

  if (existsSync(path.join(projectRoot, "drizzle/0009_*.sql".replace("*", "")))) {
    // fall through — check via readdir
  }
  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  const tags = drizzleFiles.map((f) => f.slice(0, 4));
  if (tags.filter((t) => t === "0008").length !== 1) {
    findings.push("Exactly one 0008 migration SQL file is required");
  }
  // IMP-015 owns migration 0009 — do not forbid it here.

  const sql = read(IMP014_MIGRATION);
  for (const table of ASSORTMENT_TABLES) {
    if (!sql.includes(`"app"."${table}"`) && !sql.includes(`app.${table}`)) {
      findings.push(`${IMP014_MIGRATION} must create ${table}`);
    }
  }
  if (/INSERT INTO\s+"?app"?\."?assortment_rules"?/i.test(sql)) {
    findings.push("0008 must not seed business assortment_rules rows");
  }
  if (/INSERT INTO\s+"?app"?\."?outlet_/i.test(sql) && /VALUES/i.test(sql)) {
    // Permission/role inserts are fine; reject outlet_* business seed patterns
    if (/INSERT INTO\s+"?app"?\."?outlet_variant_availability"?/i.test(sql)) {
      findings.push("0008 must not seed outlet_variant_availability rows");
    }
  }
  for (const col of FORBIDDEN_COLUMNS) {
    if (new RegExp(`\\b${col}\\b`, "i").test(sql)) {
      findings.push(`${IMP014_MIGRATION} must not declare forbidden column/concept: ${col}`);
    }
  }
  // Intervals may keep DELETE for schedule replacement; other tables revoke DELETE.
  if (!/REVOKE DELETE ON[\s\S]*assortment_rules[\s\S]*FROM boba_bear_app/i.test(sql)) {
    findings.push("0008 must REVOKE DELETE on assortment_rules for boba_bear_app");
  }
  const deleteRevokeMatch = sql.match(
    /REVOKE DELETE ON\s+([\s\S]*?)\s+FROM boba_bear_app/i,
  );
  if (deleteRevokeMatch && /outlet_operating_intervals/.test(deleteRevokeMatch[1] ?? "")) {
    findings.push(
      "0008 must NOT revoke DELETE on outlet_operating_intervals (schedule replace needs DELETE)",
    );
  }
  if (!/REVOKE TRUNCATE ON[\s\S]*outlet_operating_intervals[\s\S]*FROM boba_bear_app/i.test(sql)) {
    findings.push("0008 must still REVOKE TRUNCATE on outlet_operating_intervals");
  }
}

function checkDomainGuards(files) {
  const schema = read("src/platform/database/schema/assortment.ts");
  if (!schema.includes("include_shape_check") && !schema.includes("include") ) {
    findings.push("schema must constrain include to brand+variant");
  }
  if (!/decision.*include.*scopeType.*=.*'brand'|include_shape_check/.test(schema)) {
    findings.push("schema must enforce include only at brand+variant");
  }

  for (const rel of files) {
    if (!rel.startsWith("src/") && !rel.startsWith("scripts/")) continue;
    if (rel.includes(".test.") || rel.includes("audit-assortment")) continue;
    let contents;
    try {
      contents = read(rel);
    } catch {
      continue;
    }
    if (/\bisOrderable\b/.test(contents)) {
      findings.push(`${rel}: isOrderable is forbidden`);
    }
    if (
      /createAuthClient|toNextJsHandler|src\/app\/api\/assortment/.test(contents) &&
      rel.startsWith("src/")
    ) {
      findings.push(`${rel}: public assortment HTTP surface is forbidden`);
    }
  }

  const compose = read("compose.yaml");
  if (/^\s*assortment-service\s*:/m.test(compose) || /^\s*availability-service\s*:/m.test(compose)) {
    findings.push("new assortment/availability Docker app service is forbidden");
  }

  const bootstrapCli = read("scripts/assortment/bootstrap-existing-menu.ts");
  if (/--file=|process\.stdin|https?:\/\//.test(bootstrapCli)) {
    findings.push("bootstrap CLI must not support arbitrary file/URL/stdin manifests");
  }
}

function checkPermissions() {
  const catalog = read("src/shared/access-control/catalog.ts");
  for (const key of [
    "assortment.read",
    "assortment.manage",
    "availability.read",
    "availability.manage",
    "outlet.operating_state.read",
    "outlet.operating_state.pause",
    "outlet.operating_state.suspend",
    "outlet.operating_schedule.read",
    "outlet.operating_schedule.manage",
    "assortment.audit.read",
  ]) {
    if (!catalog.includes(`"${key}"`)) {
      findings.push(`PERMISSION_KEYS must include ${key}`);
    }
  }
}

function main() {
  const files = listProjectFiles();
  checkRequiredModules();
  checkMigrations();
  checkDomainGuards(files);
  checkPermissions();

  if (findings.length > 0) {
    console.error("audit:assortment-availability: FAILED");
    for (const finding of findings) console.error(`  ✗  ${finding}`);
    process.exitCode = 1;
    return;
  }
  console.log("audit:assortment-availability: ok");
}

main();
