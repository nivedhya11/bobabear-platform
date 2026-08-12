#!/usr/bin/env node
/**
 * Payment audit (IMP-022).
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
];
const IMP022 = "drizzle/0016_payment.sql";
const TABLES = [
  "payments",
  "payment_attempts",
  "payment_provider_references",
  "payment_initiation_idempotency",
  "payment_provider_observations",
  "promotion_redemption_claims",
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
    "src/shared/payment/index.ts",
    "src/server/payment/index.ts",
    "src/platform/database/schema/payment.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/payment/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/payment/index.ts must import server-only");
  }

  for (const forbidden of [
    "createPayment",
    "updatePayment",
    "patchPayment",
    "deletePayment",
    "savePayment",
    "setStatus",
    "setPaymentStatus",
    "PaymentCustomerActor",
    "createPaymentCustomerActor",
  ]) {
    if (new RegExp(`\\bexport\\s+(async\\s+)?function\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Generic CRUD/lifecycle escape hatch exported: ${forbidden}`);
    }
    if (new RegExp(`\\bexport\\s+(type|function|const)\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Forbidden export: ${forbidden}`);
    }
  }

  if (/PaymentCustomerActor|createPaymentActor|mintPayment/.test(index)) {
    findings.push("Payment must reuse Cart CustomerActor; no Payment actor mint");
  }
  if (!/from ["']\.\.\/cart\/actor["']/.test(index) && !/requireCustomerActor/.test(index)) {
    findings.push("src/server/payment/index.ts must re-export Cart CustomerActor guards");
  }

  for (const name of [
    "createCustomerActorFromTrustedAuthIdentity",
    "customerActorFromTrustedCustomerAuthIdentity",
    "resolveTrustedCustomerAuthIdentity",
  ]) {
    if (new RegExp(`\\b${name}\\b`).test(index)) {
      findings.push(
        `src/server/payment/index.ts must not export actor mint path: ${name}`,
      );
    }
  }
  if (
    /\bexport\s+\{[^}]*\bsealVerifiedProviderEvent\b/.test(index) ||
    /\bexport\s+(async\s+)?function\s+sealVerifiedProviderEvent\b/.test(index)
  ) {
    findings.push(
      "src/server/payment/index.ts must not export sealVerifiedProviderEvent",
    );
  }

  const serverFiles = trackedFiles().filter((f) => f.startsWith("src/server/payment/"));
  for (const rel of serverFiles) {
    const text = read(rel);
    if (
      /\bexport\s+function\s+createPayment(?:Actor|FromCustomerId|ForCustomer)\b/.test(text) ||
      /\bexport\s+function\s+paymentActorFrom(?:UserId|CustomerId)\b/.test(text)
    ) {
      findings.push(`${rel}: unsafe raw-ID Payment authority factory`);
    }
    if (/console\.(log|debug|info|warn|error)/.test(text) && /secret|webhook|password/i.test(text)) {
      findings.push(`${rel}: suspicious logging near sensitive fields`);
    }
    if (/\bparseFloat\s*\(/.test(text)) {
      findings.push(`${rel}: parseFloat is forbidden in payment server code (float money)`);
    }
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (
    integrity.migrations.length !== 16 &&
    integrity.migrations.length !== 17 &&
    integrity.migrations.length !== 18 &&
    integrity.migrations.length !== 18
  ) {
    findings.push(
      `Expected 16, 17, or 18 sealed migrations, found ${integrity.migrations.length}`,
    );
  }
  if (
    integrity.migrations.length >= 17 &&
    (!sealed[IMP022] || sealed[IMP022] !== sha256File(IMP022))
  ) {
    findings.push(`${IMP022} must be sealed and match integrity when count is 17+`);
  }

  if (!existsSync(path.join(projectRoot, IMP022))) {
    findings.push(`Missing ${IMP022}`);
  } else {
    const sql = read(IMP022);
    for (const table of TABLES) {
      if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP022} must create ${table}`);
    }
    if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 6) {
      findings.push(`${IMP022} must create exactly 6 tables`);
    }
    for (const bad of [
      "orders",
      "order_lines",
      "refunds",
      "refund_",
      "inventory_reservations",
      "inventory_",
      "JSONB",
      "jsonb",
    ]) {
      if (sql.includes(bad)) {
        findings.push(`Migration must not introduce forbidden construct: ${bad}`);
      }
    }
    if (/GRANT\s+.*boba_bear_app/i.test(sql)) {
      findings.push("Migration must not hardcode GRANT to boba_bear_app");
    }
  }

  const payment016 = trackedFiles().filter((f) => /^drizzle\/0016_/.test(f));
  if (payment016.some((f) => f !== IMP022)) {
    findings.push("Unexpected 0016 migration; expected drizzle/0016_payment.sql only");
  }
  const mig0017 = trackedFiles().filter((f) => /^drizzle\/0017_/.test(f));
  if (mig0017.length > 0 && mig0017.some((f) => f !== "drizzle/0017_order.sql")) {
    findings.push("Unexpected 0017 migration; expected drizzle/0017_order.sql only");
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55) findings.push(`PERMISSION_KEYS must be 51 or 55, found ${count}`);
  }
  if (/payment\./i.test(catalog)) {
    findings.push("No workforce payment.* permissions may be added");
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /payment/i.test(f))) {
    findings.push("No public Payment API Route Handlers");
  }
  if (files.some((f) => /payment-service|payment-worker/.test(f))) {
    findings.push("No new payment docker service");
  }

  const pkg = JSON.parse(read("package.json"));
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (/cashfree|razorpay|stripe/i.test(dep)) {
      findings.push(`Forbidden payment provider SDK in dependencies: ${dep}`);
    }
  }

  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/payment-service|payment-worker/.test(compose)) {
      findings.push("compose.yaml must not add a payment service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (!drizzleFiles.includes("0016_payment.sql")) {
    findings.push("Expected drizzle/0016_payment.sql");
  }
  if (drizzleFiles.some((f) => f.startsWith("0017_") && f !== "0017_order.sql")) {
    findings.push("Unexpected 0017 migration; expected 0017_order.sql only");
  }
  if (drizzleFiles.length !== 17 && drizzleFiles.length !== 18) {
    findings.push(`Expected 17 or 18 drizzle SQL migrations, found ${drizzleFiles.length}`);
  }

  const sharedConstants = read("src/shared/payment/constants.ts");
  for (const status of ["OPEN", "PROCESSING", "SUCCEEDED", "SUPERSEDED", "CANCELLED", "EXPIRED"]) {
    if (!sharedConstants.includes(`"${status}"`)) {
      findings.push(`Missing PAYMENT_STATUSES entry: ${status}`);
    }
  }

  if (findings.length) {
    process.stderr.write(`audit:payment failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:payment passed\n");
}

main();
