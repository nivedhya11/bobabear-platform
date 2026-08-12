#!/usr/bin/env node
/**
 * Order audit (IMP-023).
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
  "drizzle/0013_serviceability.sql",
  "drizzle/0014_cart.sql",
  "drizzle/0015_checkout.sql",
  "drizzle/0016_payment.sql",
];
const IMP023 = "drizzle/0017_order.sql";

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
    "src/shared/order/index.ts",
    "src/server/order/index.ts",
    "src/platform/database/schema/order.ts",
    "src/server/cart/finalize-after-order.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/order/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push('src/server/order/index.ts must import server-only');
  }

  for (const forbidden of [
    "createOrder",
    "updateOrder",
    "patchOrder",
    "deleteOrder",
    "saveOrder",
    "setOrderStatus",
    "setStatus",
    "forceCreateOrder",
  ]) {
    if (new RegExp(`\\bexport\\s+(async\\s+)?function\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Generic CRUD/lifecycle escape hatch exported: ${forbidden}`);
    }
  }

  if (!/requireCustomerActor/.test(index)) {
    findings.push("src/server/order/index.ts must re-export Cart CustomerActor guards");
  }
  if (!/requireWorkforcePrincipal|requireOrderWorkforceActor/.test(index)) {
    findings.push("src/server/order/index.ts must expose workforce actor guards");
  }
  for (const name of [
    "createCustomerActorFromTrustedAuthIdentity",
    "createWorkforcePrincipalFromTrustedIdentity",
  ]) {
    if (new RegExp(`\\bexport\\s+.*\\b${name}\\b`).test(index)) {
      findings.push(`src/server/order/index.ts must not export actor mint path: ${name}`);
    }
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (integrity.migrations.length !== 18) {
    findings.push(`Expected 18 sealed migrations, found ${integrity.migrations.length}`);
  }
  if (!sealed[IMP023] || sealed[IMP023] !== sha256File(IMP023)) {
    findings.push(`${IMP023} must be sealed and match integrity`);
  }

  if (!existsSync(path.join(projectRoot, IMP023))) {
    findings.push(`Missing ${IMP023}`);
  } else {
    const sql = read(IMP023);
    if (!sql.includes('"app"."orders"')) findings.push(`${IMP023} must create orders`);
    if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 1) {
      findings.push(`${IMP023} must create exactly 1 table`);
    }
    for (const bad of [
      '"app"."order_lines"',
      '"app"."order_snapshots"',
      '"app"."order_events"',
      '"app"."refunds"',
      'CREATE TABLE "app"."refund',
      'CREATE TABLE "app"."inventory',
    ]) {
      if (sql.includes(bad)) {
        findings.push(`Migration must not introduce forbidden construct: ${bad}`);
      }
    }
    if (!sql.includes("order.read") || !sql.includes("order.accept") ||
        !sql.includes("order.fulfil") || !sql.includes("order.cancel")) {
      findings.push(`${IMP023} must seed order.* permissions`);
    }
    if (/GRANT\s+.*boba_bear_app/i.test(sql)) {
      findings.push("Migration must not hardcode GRANT to boba_bear_app");
    }
  }

  const order017 = trackedFiles().filter((f) => /^drizzle\/0017_/.test(f));
  if (order017.some((f) => f !== IMP023)) {
    findings.push("Unexpected 0017 migration; expected drizzle/0017_order.sql only");
  }
  const mig0018 = trackedFiles().filter((f) => /^drizzle\/0018_/.test(f));
  if (mig0018.length > 0) {
    findings.push("Unexpected 0018 migration; IMP-023 ends at 0017_order.sql");
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 55) findings.push(`PERMISSION_KEYS must be 55, found ${count}`);
  }
  for (const key of ["order.read", "order.accept", "order.fulfil", "order.cancel"]) {
    if (!catalog.includes(`"${key}"`)) findings.push(`Missing permission key ${key}`);
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /order/i.test(f))) {
    findings.push("No public Order API Route Handlers");
  }
  if (files.some((f) => /order-service|order-worker/.test(f))) {
    findings.push("No new order docker service");
  }

  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/order-service|order-worker/.test(compose)) {
      findings.push("compose.yaml must not add an order service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (!drizzleFiles.includes("0017_order.sql")) {
    findings.push("Expected drizzle/0017_order.sql");
  }
  if (drizzleFiles.length !== 18) {
    findings.push(`Expected 18 drizzle SQL migrations, found ${drizzleFiles.length}`);
  }

  const sharedConstants = read("src/shared/order/constants.ts");
  for (const status of ["PLACED", "ACCEPTED", "FULFILLED", "CANCELLED"]) {
    if (!sharedConstants.includes(`"${status}"`)) {
      findings.push(`Missing ORDER_STATUSES entry: ${status}`);
    }
  }

  if (findings.length) {
    process.stderr.write(`audit:order failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:order passed\n");
}

main();
