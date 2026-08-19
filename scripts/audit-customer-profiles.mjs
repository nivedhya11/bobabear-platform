#!/usr/bin/env node
/**
 * Customer Profiles audit (IMP-017).
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
];
const IMP017 = "drizzle/0011_customer_profiles.sql";
const TABLES = ["customer_profiles", "customer_profile_audit_events"];

const FORBIDDEN_DIRECTORY = [
  "listCustomers",
  "searchCustomers",
  "findCustomerByPhone",
  "findCustomerByEmail",
  "searchCustomerProfiles",
  "customerExistsByPhone",
  "searchByPhone",
  "searchByEmail",
  "searchByName",
  "findAll",
];

const FORBIDDEN_PROFILE_COLUMNS = [
  "phone",
  "phone_number",
  "mobile",
  "brand_id",
  "outlet_id",
  "territory_id",
  "organization_id",
  "status",
  "deleted_at",
  "retired_at",
  "is_deleted",
  "email_verified",
  "marketing",
  "loyalty",
  "address",
  "serviceable",
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
    "src/shared/customer-profiles/index.ts",
    "src/server/customer-profiles/index.ts",
    "src/platform/database/schema/customer-profiles.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/customer-profiles/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/customer-profiles/index.ts must import server-only");
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (!sealed[IMP017] || sealed[IMP017] !== sha256File(IMP017)) {
    findings.push(`${IMP017} must be sealed and match integrity`);
  }
  if (integrity.migrations.length < 12) {
    findings.push(`Expected at least 12 sealed migrations, found ${integrity.migrations.length}`);
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
  if (!trackedFiles().some((f) => f === "drizzle/0013_serviceability.sql")) {
    findings.push("Expected drizzle/0013_serviceability.sql");
  }

  const sql = read(IMP017);
  for (const table of TABLES) {
    if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP017} must create ${table}`);
  }
  if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 2) {
    findings.push(`${IMP017} must create exactly 2 tables`);
  }
  if (/Ashutosh|Demo Customer|Marketing Email|Test Profile/i.test(sql)) {
    findings.push("Migration must not seed business Profile data");
  }
  if (!sql.includes("REVOKE UPDATE ON") || !sql.includes("customer_profile_audit_events")) {
    findings.push("Audit table must revoke UPDATE");
  }
  if (!sql.includes("REVOKE DELETE ON") || !sql.includes("customer_profile_audit_events")) {
    findings.push("Audit table must revoke DELETE");
  }
  if (!sql.includes("ON DELETE restrict") && !sql.includes("ON DELETE RESTRICT")) {
    findings.push("Profile FK must use ON DELETE RESTRICT");
  }

  const schema = read("src/platform/database/schema/customer-profiles.ts");
  for (const col of FORBIDDEN_PROFILE_COLUMNS) {
    if (new RegExp(`["']${col}["']`).test(schema) || new RegExp(`\\(${col}\\)`).test(schema)) {
      // allow customer_auth_user_id which contains no forbidden token alone
      if (col === "phone" || col === "phone_number" || col === "mobile") {
        if (/phone_number|phoneNumber|"phone"|'phone'/.test(schema)) {
          findings.push(`Schema must not declare Profile phone column (${col})`);
        }
      } else if (new RegExp(`\\b${col}\\b`).test(schema)) {
        findings.push(`Schema must not declare forbidden column/field: ${col}`);
      }
    }
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55 && count !== 57) findings.push(`PERMISSION_KEYS must be 51, 55, or 57 (IMP-017 added no profile perms), found ${count}`);
  }
  if (/customer_profiles\.|customers\.(read|manage)|customers\.pii/i.test(catalog)) {
    findings.push("No new customer/profile workforce permissions");
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /profile|customer/.test(f))) {
    findings.push("No public Profile/customer API Route Handlers");
  }
  if (files.some((f) => /customer-profile-service|customer-service|PII-service|profile-worker/.test(f))) {
    findings.push("No new customer Profile docker service");
  }
  if (files.some((f) => f.includes("src/app/") && /CustomerProfile|customer-profile/.test(f))) {
    findings.push("No Customer Profile UI in IMP-017");
  }

  // Directory / search surfaces
  const serverShared = files.filter(
    (f) =>
      f.startsWith("src/server/customer-profiles/") ||
      f.startsWith("src/shared/customer-profiles/"),
  );
  for (const rel of serverShared) {
    const text = read(rel);
    for (const name of FORBIDDEN_DIRECTORY) {
      if (new RegExp(`\\b${name}\\b`).test(text)) {
        findings.push(`${rel}: forbidden customer directory surface ${name}`);
      }
    }
  }

  // Compose default services unchanged
  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/customer-profile-service|profile-worker/.test(compose)) {
      findings.push("compose.yaml must not add a Profile service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (drizzleFiles.filter((f) => f.startsWith("0011_")).length !== 1) {
    findings.push("Exactly one 0011 migration is required");
  }
  if (!drizzleFiles.includes("0011_customer_profiles.sql")) {
    findings.push("Expected drizzle/0011_customer_profiles.sql");
  }

  if (findings.length) {
    process.stderr.write(`audit:customer-profiles failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:customer-profiles passed\n");
}

main();
