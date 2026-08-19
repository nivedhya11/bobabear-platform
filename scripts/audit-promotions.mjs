#!/usr/bin/env node
/**
 * Promotions / coupons audit (IMP-016).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
];
const IMP016 = "drizzle/0010_promotions_coupons.sql";
const TABLES = [
  "brand_promotion_policies",
  "promotions",
  "promotion_benefits",
  "promotion_targets",
  "promotion_coupons",
  "promotion_audit_events",
];
const PERMS = [
  "promotions.read",
  "promotions.manage",
  "promotions.activate",
  "coupons.read",
  "coupons.manage",
  "promotions.audit.read",
];

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
    "src/shared/promotions/index.ts",
    "src/server/promotions/index.ts",
    "src/platform/database/schema/promotions.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/promotions/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/promotions/index.ts must import server-only");
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (!sealed[IMP016] || sealed[IMP016] !== sha256File(IMP016)) {
    findings.push(`${IMP016} must be sealed and match integrity`);
  }
  if (
    trackedFiles().some(
      (f) => /^drizzle\/0012_/.test(f) && f !== "drizzle/0012_customer_addresses.sql",
    )
  ) {
    findings.push("Unexpected 0012 migration; expected drizzle/0012_customer_addresses.sql only");
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
  if (
    trackedFiles().some(
      (f) => /^drizzle\/0013_/.test(f) && f !== "drizzle/0013_serviceability.sql",
    )
  ) {
    findings.push("Unexpected 0013 migration; expected drizzle/0013_serviceability.sql only");
  }
  if (
    trackedFiles().some(
      (f) => /^drizzle\/0011_/.test(f) && f !== "drizzle/0011_customer_profiles.sql",
    )
  ) {
    findings.push("Unexpected 0011 migration; expected drizzle/0011_customer_profiles.sql only");
  }

  const sql = read(IMP016);
  for (const table of TABLES) {
    if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP016} must create ${table}`);
  }
  for (const key of PERMS) {
    if (!sql.includes(`'${key}'`)) findings.push(`${IMP016} must seed ${key}`);
  }
  if (/UNBOTHERED20|bogo campaign|20% campaign/i.test(sql)) {
    findings.push("Migration must not seed business promotions");
  }
  if (!sql.includes("REVOKE UPDATE ON") || !sql.includes("promotion_audit_events")) {
    findings.push("Audit table must revoke UPDATE");
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  for (const key of PERMS) {
    if (!catalog.includes(`"${key}"`)) findings.push(`catalog missing ${key}`);
  }
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55 && count !== 57) findings.push(`PERMISSION_KEYS must be 51, 55, or 57, found ${count}`);
  }

  // No public HTTP / new docker service
  const files = trackedFiles();
  if (files.some((f) => f.includes("src/app/api/") && f.includes("promotion"))) {
    findings.push("No public promotion API routes");
  }
  if (files.some((f) => /promotion-service|coupon-service/.test(f))) {
    findings.push("No promotion/coupon docker service");
  }

  if (findings.length) {
    process.stderr.write(`audit:promotions failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:promotions passed\n");
}

main();
