#!/usr/bin/env node
/**
 * Customer Addresses audit (IMP-018).
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
];
const IMP018 = "drizzle/0012_customer_addresses.sql";
const TABLES = ["customer_addresses", "customer_address_audit_events"];

const FORBIDDEN_DIRECTORY = [
  "listCustomers",
  "searchCustomers",
  "findCustomerByPhone",
  "findCustomerByEmail",
  "searchCustomerAddresses",
  "searchAddresses",
  "findAddressByPhone",
  "findAddressByPostalCode",
  "customerExistsByPhone",
  "searchByPhone",
  "searchByEmail",
  "searchByName",
  "findAll",
  "listAllAddresses",
];

const FORBIDDEN_ADDRESS_COLUMNS = [
  "brand_id",
  "outlet_id",
  "territory_id",
  "organization_id",
  "profile_id",
  "customer_profile_id",
  "status",
  "deleted_at",
  "retired_at",
  "is_deleted",
  "serviceable",
  "is_serviceable",
  "serviceability_status",
  "delivery_zone_id",
  "geocoder",
  "geocode",
  "country",
  "country_code",
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
    "src/shared/customer-addresses/index.ts",
    "src/server/customer-addresses/index.ts",
    "src/platform/database/schema/customer-addresses.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/customer-addresses/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/customer-addresses/index.ts must import server-only");
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (!sealed[IMP018] || sealed[IMP018] !== sha256File(IMP018)) {
    findings.push(`${IMP018} must be sealed and match integrity`);
  }
  if (integrity.migrations.length !== 15 && integrity.migrations.length !== 16 && integrity.migrations.length !== 17 &&
    integrity.migrations.length !== 18 && integrity.migrations.length !== 19 && integrity.migrations.length !== 20) {
    findings.push(`Expected 15–20 sealed migrations, found ${integrity.migrations.length}`);
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
  if (!trackedFiles().some((f) => f === "drizzle/0013_serviceability.sql")) {
    findings.push("Expected drizzle/0013_serviceability.sql");
  }

  const sql = read(IMP018);
  for (const table of TABLES) {
    if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP018} must create ${table}`);
  }
  if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 2) {
    findings.push(`${IMP018} must create exactly 2 tables`);
  }
  if (/Ashutosh|Demo Address|Marketing|Test Address/i.test(sql)) {
    findings.push("Migration must not seed business Address data");
  }
  if (!sql.includes("REVOKE UPDATE ON") || !sql.includes("customer_address_audit_events")) {
    findings.push("Audit table must revoke UPDATE");
  }
  if (!sql.includes("REVOKE DELETE ON") || !sql.includes("customer_address_audit_events")) {
    findings.push("Audit table must revoke DELETE");
  }
  if (!sql.includes("ON DELETE restrict") && !sql.includes("ON DELETE RESTRICT")) {
    findings.push("Address FK must use ON DELETE RESTRICT");
  }
  if (/customer_profiles|profile_id|customer_profile/i.test(sql)) {
    findings.push("Address migration must not reference Profile / Profile FK");
  }
  if (/serviceab|postgis|geocod|delivery_zone/i.test(sql)) {
    findings.push("Address migration must not introduce serviceability/PostGIS/geocoder");
  }

  const schema = read("src/platform/database/schema/customer-addresses.ts");
  for (const col of FORBIDDEN_ADDRESS_COLUMNS) {
    if (new RegExp(`\\b${col}\\b`).test(schema)) {
      findings.push(`Schema must not declare forbidden column/field: ${col}`);
    }
  }
  if (/customerProfiles|customer_profiles|profileId|customerProfileId/.test(schema)) {
    findings.push("Schema must not declare Profile FK");
  }
  // Column/type declarations only — denylist mention of geocoderProvider in parse-input is intentional.
  if (/\b(postgis)\b/i.test(schema) || /:\s*geography\b|\bgeometry\(/i.test(schema)) {
    findings.push("Schema must not declare PostGIS geography/geometry types");
  }
  if (
    /\b(serviceable|is_serviceable|serviceability_status|delivery_zone_id|geocode_confidence)\b/i.test(
      schema,
    )
  ) {
    findings.push("Schema must not declare serviceability/geocoder persistence columns");
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55 && count !== 57 && count !== 68) findings.push(`PERMISSION_KEYS must be 51, 55, 57, or 68 (IMP-018 added no address perms), found ${count}`);
  }
  if (/customer_addresses\.|customers\.(read|manage)|addresses\.(read|manage)/i.test(catalog)) {
    findings.push("No new customer/address workforce permissions");
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /address|customer/.test(f))) {
    findings.push("No public Address/customer API Route Handlers");
  }
  if (
    files.some((f) =>
      /customer-address-service|address-service|address-worker|customer-service/.test(f),
    )
  ) {
    findings.push("No new customer Address docker service");
  }
  if (files.some((f) => f.includes("src/app/") && /CustomerAddress|customer-address/.test(f))) {
    findings.push("No Customer Address UI in IMP-018");
  }

  const serverShared = files.filter(
    (f) =>
      f.startsWith("src/server/customer-addresses/") ||
      f.startsWith("src/shared/customer-addresses/"),
  );
  for (const rel of serverShared) {
    const text = read(rel);
    for (const name of FORBIDDEN_DIRECTORY) {
      if (new RegExp(`\\b${name}\\b`).test(text)) {
        findings.push(`${rel}: forbidden customer directory surface ${name}`);
      }
    }
    if (
      /from\s+["'][^"']*(postgis|opencage|@googlemaps|mapbox|node-geocoder)/i.test(text) ||
      /require\(["'][^"']*(postgis|opencage|mapbox|node-geocoder)/i.test(text)
    ) {
      findings.push(`${rel}: forbidden geocoder/PostGIS dependency`);
    }
  }

  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/customer-address-service|address-worker/.test(compose)) {
      findings.push("compose.yaml must not add an Address service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (drizzleFiles.filter((f) => f.startsWith("0012_")).length !== 1) {
    findings.push("Exactly one 0012 migration is required");
  }
  if (!drizzleFiles.includes("0012_customer_addresses.sql")) {
    findings.push("Expected drizzle/0012_customer_addresses.sql");
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
  if (!drizzleFiles.includes("0013_serviceability.sql")) {
    findings.push("Expected drizzle/0013_serviceability.sql");
  }
  if (
    drizzleFiles.length !== 16 &&
    drizzleFiles.length !== 17 &&
    drizzleFiles.length !== 18 &&
    drizzleFiles.length !== 19 &&
    drizzleFiles.length !== 20
  ) {
    findings.push(`Expected 16–20 drizzle SQL migrations, found ${drizzleFiles.length}`);
  }

  if (findings.length) {
    process.stderr.write(`audit:customer-addresses failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:customer-addresses passed\n");
}

main();
