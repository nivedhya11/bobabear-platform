#!/usr/bin/env node
/**
 * Serviceability audit (IMP-019).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

const PRIOR = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
  "drizzle/0002_better_auth_foundation.sql",
  "drizzle/0003_customer_phone_otp_authentication.sql",
  "drizzle/0004_workforce_authentication_mfa.sql",
  "drizzle/0005_organization_outlet_rbac_foundation.sql",
  "drizzle/0006_canonical_catalog_model.sql",
  "drizzle/0007_existing_menu_import.sql",
  "drizzle/0008_assortment_operational_availability.sql",
  "drizzle/0009_pricing_charges_tax.sql",
  "drizzle/0010_promotions_coupons.sql",
  "drizzle/0011_customer_profiles.sql",
  "drizzle/0012_customer_addresses.sql",
];
const IMP019 = "drizzle/0013_serviceability.sql";
const TABLES = [
  "outlet_serviceability_configs",
  "outlet_serviceability_pins",
  "outlet_serviceability_audit_events",
];
const PERMS = ["serviceability.read", "serviceability.manage"];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

function sha256File(rel) {
  return createHash("sha256")
    .update(readFileSync(path.join(projectRoot, rel)))
    .digest("hex");
}

function read(rel) {
  return readFileSync(path.join(projectRoot, rel), "utf8");
}

function main() {
  for (const mod of [
    "src/shared/serviceability/index.ts",
    "src/server/serviceability/index.ts",
    "src/platform/database/schema/serviceability.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/serviceability/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/serviceability/index.ts must import server-only");
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (!sealed[IMP019] || sealed[IMP019] !== sha256File(IMP019)) {
    findings.push(`${IMP019} must be sealed and match integrity`);
  }
  if (integrity.migrations.length !== 15 && integrity.migrations.length !== 16 && integrity.migrations.length !== 17 &&
    integrity.migrations.length !== 18 && integrity.migrations.length !== 18) {
    findings.push(`Expected 15, 16, 17, or 18 sealed migrations, found ${integrity.migrations.length}`);
  }
  if (
    integrity.migrations.length === 16 &&
    !integrity.migrations.some((m) => m.path === "drizzle/0015_checkout.sql")
  ) {
    findings.push("Sealed migration set of 16+ must include drizzle/0015_checkout.sql");
  }
  const checkout015 = trackedFiles().filter((f) => /^drizzle\/0015_/.test(f));
  if (checkout015.some((f) => f !== "drizzle/0015_checkout.sql")) {
    findings.push("Unexpected 0015 migration; expected drizzle/0015_checkout.sql only");
  }
  const mig0016 = trackedFiles().filter((f) => /^drizzle\/0016_/.test(f));
  if (mig0016.some((f) => f !== "drizzle/0016_payment.sql")) {
    findings.push("Unexpected 0016 migration; expected drizzle/0016_payment.sql only");
  }
  if (
    trackedFiles().some(
      (f) => /^drizzle\/0014_/.test(f) && f !== "drizzle/0014_cart.sql",
    )
  ) {
    findings.push("Unexpected 0014 migration; expected drizzle/0014_cart.sql only");
  }

  const sql = read(IMP019);
  for (const table of TABLES) {
    if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP019} must create ${table}`);
  }
  if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 3) {
    findings.push(`${IMP019} must create exactly 3 tables`);
  }
  for (const key of PERMS) {
    if (!sql.includes(`'${key}'`)) findings.push(`${IMP019} must seed ${key}`);
  }
  if (/248001|Dehradun|Demo PIN|Test Coverage/i.test(sql)) {
    findings.push("Migration must not seed business PIN / coverage data");
  }
  if (!sql.includes("REVOKE UPDATE ON") || !sql.includes("outlet_serviceability_audit_events")) {
    findings.push("Audit table must revoke UPDATE");
  }
  if (!sql.includes("REVOKE DELETE ON") || !sql.includes("outlet_serviceability_audit_events")) {
    findings.push("Audit table must revoke DELETE");
  }
  if (/postgis|geometry|geography|delivery_fee|amount_paise|customer_auth/i.test(sql)) {
    findings.push("Migration must not introduce PostGIS/money/customer PII columns");
  }

  const schema = read("src/platform/database/schema/serviceability.ts");
  for (const bad of [
    "is_serviceable",
    "delivery_fee",
    "latitude",
    "longitude",
    "polygon",
    "radius",
    "zone_id",
    "deleted_at",
    "geometry",
    "geography",
    "customer_auth",
  ]) {
    if (new RegExp(`\\b${bad}\\b`, "i").test(schema)) {
      findings.push(`Schema must not declare forbidden column/field: ${bad}`);
    }
  }
  // Comments may mention PostGIS as out-of-scope; forbid type usage only.
  if (/:\s*geography\b|\bgeometry\(|from\s+["']postgis/i.test(schema)) {
    findings.push("Schema must not declare PostGIS geography/geometry types");
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  for (const key of PERMS) {
    if (!catalog.includes(`"${key}"`)) findings.push(`catalog missing ${key}`);
  }
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55) findings.push(`PERMISSION_KEYS must be 51 or 55, found ${count}`);
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /serviceab/i.test(f))) {
    findings.push("No public Serviceability API Route Handlers");
  }
  if (files.some((f) => /serviceability-service|serviceability-worker/.test(f))) {
    findings.push("No new serviceability docker service");
  }

  const serverFiles = files.filter((f) => f.startsWith("src/server/serviceability/"));
  for (const rel of serverFiles) {
    const text = read(rel);
    // Strip block and line comments before role-name / bypass checks.
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (/\broleKey\s*===|\brole_key\s*===/.test(code)) {
      findings.push(`${rel}: must not authorize by role name`);
    }
    if (/\bisPlatformSuperAdmin\b|\bPSA_BYPASS\b|\bsuperAdminBypass\b/.test(code)) {
      findings.push(`${rel}: must not contain Super Admin bypass constructs`);
    }
  }

  const evaluate = read("src/server/serviceability/evaluate.ts");
  if (
    /insert\(|\.insert\(|update\(|\.update\(|delete\(|\.delete\(/.test(evaluate) &&
    /outlet_serviceability|serviceability_configs|serviceability_pins|serviceability_audit/i.test(
      evaluate,
    )
  ) {
    findings.push("evaluate.ts must not write serviceability tables");
  }
  if (
    /outletServiceabilityConfigsTable|outletServiceabilityPinsTable|outletServiceabilityAuditEventsTable/.test(
      evaluate,
    ) &&
    /\.insert\(|\.update\(|\.delete\(/.test(evaluate)
  ) {
    findings.push("evaluate.ts must not mutate serviceability table objects");
  }

  const pkg = JSON.parse(read("package.json"));
  const runtimeDeps = Object.keys(pkg.dependencies || {});
  for (const dep of ["postgis", "@turf/turf", "geolib", "node-geocoder", "twilio"]) {
    if (runtimeDeps.includes(dep)) {
      findings.push(`Unexpected runtime dependency from serviceability slice: ${dep}`);
    }
  }

  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/serviceability-service|serviceability-worker/.test(compose)) {
      findings.push("compose.yaml must not add a serviceability service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (!drizzleFiles.includes("0013_serviceability.sql")) {
    findings.push("Expected drizzle/0013_serviceability.sql");
  }
  if (drizzleFiles.some((f) => f.startsWith("0015_") && f !== "0015_checkout.sql")) {
    findings.push("Unexpected 0015 migration; expected 0015_checkout.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0016_") && f !== "0016_payment.sql")) {
    findings.push("Unexpected 0016 migration; expected 0016_payment.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0017_") && f !== "0017_order.sql")) {
    findings.push("Unexpected 0017 migration; expected 0017_order.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0014_") && f !== "0014_cart.sql")) {
    findings.push("Unexpected 0014 migration; expected 0014_cart.sql only");
  }
  if (drizzleFiles.length !== 16 && drizzleFiles.length !== 17 && drizzleFiles.length !== 18) {
    findings.push(`Expected 16, 17, or 18 drizzle SQL migrations, found ${drizzleFiles.length}`);
  }

  if (findings.length) {
    process.stderr.write(`audit:serviceability failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:serviceability passed\n");
}

main();
