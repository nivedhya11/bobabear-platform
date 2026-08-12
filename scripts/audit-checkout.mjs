#!/usr/bin/env node
/**
 * Checkout audit (IMP-021).
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
];
const IMP021 = "drizzle/0015_checkout.sql";
const TABLES = [
  "checkouts",
  "checkout_delivery_destinations",
  "checkout_snapshots",
  "checkout_snapshot_lines",
  "checkout_snapshot_line_modifier_selections",
  "checkout_snapshot_line_bundle_selections",
  "checkout_snapshot_line_bundle_modifier_selections",
  "checkout_snapshot_charges",
  "checkout_snapshot_promotion_effects",
  "checkout_snapshot_tax_components",
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
    "src/shared/checkout/index.ts",
    "src/server/checkout/index.ts",
    "src/platform/database/schema/checkout.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/checkout/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/checkout/index.ts must import server-only");
  }

  for (const forbidden of [
    "createCheckout",
    "updateCheckout",
    "patchCheckout",
    "deleteCheckout",
    "saveCheckout",
    "setStatus",
    "setCheckoutStatus",
    "setActiveSnapshot",
    "CheckoutCustomerActor",
    "createCheckoutCustomerActor",
  ]) {
    if (new RegExp(`\\bexport\\s+(async\\s+)?function\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Generic CRUD/lifecycle escape hatch exported: ${forbidden}`);
    }
    if (new RegExp(`\\bexport\\s+(type|function|const)\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Forbidden export: ${forbidden}`);
    }
  }

  // Must reuse Cart CustomerActor — no Checkout-specific actor mint.
  if (/CheckoutCustomerActor|createCheckoutActor|mintCheckout/.test(index)) {
    findings.push("Checkout must reuse Cart CustomerActor; no Checkout actor mint");
  }
  if (!/from ["']\.\.\/cart\/actor["']/.test(index) && !/requireCustomerActor/.test(index)) {
    findings.push("src/server/checkout/index.ts must re-export Cart CustomerActor guards");
  }

  for (const name of [
    "createCustomerActorFromTrustedAuthIdentity",
    "customerActorFromTrustedCustomerAuthIdentity",
    "resolveTrustedCustomerAuthIdentity",
  ]) {
    if (new RegExp(`\\b${name}\\b`).test(index)) {
      findings.push(
        `src/server/checkout/index.ts must not export actor mint path: ${name}`,
      );
    }
  }

  // Deep-import safety: no raw customer-id → Checkout authority factory.
  const serverFiles = trackedFiles().filter((f) => f.startsWith("src/server/checkout/"));
  for (const rel of serverFiles) {
    const text = read(rel);
    if (
      /\bexport\s+function\s+createCheckout(?:Actor|FromCustomerId|ForCustomer)\b/.test(text) ||
      /\bexport\s+function\s+checkoutActorFrom(?:UserId|CustomerId)\b/.test(text)
    ) {
      findings.push(`${rel}: unsafe raw-ID Checkout authority factory`);
    }
    if (/console\.(log|debug|info|warn|error)/.test(text) && /phone|otp|password|secret/i.test(text)) {
      findings.push(`${rel}: suspicious logging near sensitive fields`);
    }
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (integrity.migrations.length !== 15 && integrity.migrations.length !== 16 && integrity.migrations.length !== 17 &&
    integrity.migrations.length !== 18 && integrity.migrations.length !== 18) {
    findings.push(
      `Expected 15, 16, 17, or 18 sealed migrations, found ${integrity.migrations.length}`,
    );
  }
  if (
     (integrity.migrations.length === 16 || integrity.migrations.length === 17) &&
    (!sealed[IMP021] || sealed[IMP021] !== sha256File(IMP021))
  ) {
    findings.push(`${IMP021} must be sealed and match integrity when count is 16`);
  }

  if (!existsSync(path.join(projectRoot, IMP021))) {
    findings.push(`Missing ${IMP021}`);
  } else {
    const sql = read(IMP021);
    for (const table of TABLES) {
      if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP021} must create ${table}`);
    }
    if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 10) {
      findings.push(`${IMP021} must create exactly 10 tables`);
    }
    for (const bad of [
      "checkout_payload",
      "delivery_snapshot",
      "cart_snapshot",
      "pricing_quote",
      "promotion_result",
      "tax_result",
      "checkout_history",
      "checkout_audit",
      "checkout_events",
      "payments",
      "payment_attempts",
      "orders",
      "order_lines",
      "checkout_idempotency",
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
    if (!sql.includes("checkouts_one_non_terminal_per_cart_uidx")) {
      findings.push("Migration must include one non-terminal Checkout per Cart unique index");
    }
    if (!sql.includes("checkouts_status_snapshot_null_check")) {
      findings.push("Migration must enforce status ↔ active_snapshot invariant");
    }
    if (!sql.includes("checkouts_active_snapshot_ownership_fk")) {
      findings.push(
        "Migration must enforce checkouts_active_snapshot_ownership_fk composite ownership",
      );
    }
    if (!sql.includes("checkout_snapshots_id_checkout_id_uidx")) {
      findings.push(
        "Migration must include checkout_snapshots_id_checkout_id_uidx for ownership FK",
      );
    }
    if (sql.includes("checkouts_active_snapshot_id_checkout_snapshots_id_fk")) {
      findings.push(
        "Migration must not use unscoped active_snapshot_id → snapshots.id FK",
      );
    }
  }

  const checkout015 = trackedFiles().filter((f) => /^drizzle\/0015_/.test(f));
  if (checkout015.some((f) => f !== IMP021)) {
    findings.push("Unexpected 0015 migration; expected drizzle/0015_checkout.sql only");
  }
  const mig0016 = trackedFiles().filter((f) => /^drizzle\/0016_/.test(f));
  if (mig0016.some((f) => f !== "drizzle/0016_payment.sql")) {
    findings.push("Unexpected 0016 migration; expected drizzle/0016_payment.sql only");
  }

  const schema = read("src/platform/database/schema/checkout.ts");
  for (const bad of [
    "checkoutPayload",
    "pricingQuoteJson",
    "configurationJson",
    "deliverySnapshotJson",
  ]) {
    if (new RegExp(`\\b${bad}\\b`).test(schema)) {
      findings.push(`Schema must not declare forbidden field: ${bad}`);
    }
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55) findings.push(`PERMISSION_KEYS must be 51 or 55, found ${count}`);
  }
  if (/checkout\./i.test(catalog)) {
    findings.push("No workforce checkout.* permissions may be added");
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /checkout/i.test(f))) {
    findings.push("No public Checkout API Route Handlers");
  }
  if (files.some((f) => /checkout-service|checkout-worker/.test(f))) {
    findings.push("No new checkout docker service");
  }

  const repo = read("src/server/checkout/repository.ts");
  if (!repo.includes('.for("update")')) {
    findings.push("repository.ts must use FOR UPDATE locks");
  }

  const ops = read("src/server/checkout/operations.ts");
  if (!ops.includes("lockAndVerifyCustomerCart") && !ops.includes("lockCartForUpdate")) {
    findings.push("startCheckout must lock Cart before creating Checkout");
  }

  const pkg = JSON.parse(read("package.json"));
  const runtimeDepsBefore = [
    "@better-auth/drizzle-adapter",
    "@next/env",
    "@radix-ui/react-slot",
    "better-auth",
    "clsx",
    "drizzle-orm",
    "framer-motion",
    "libphonenumber-js",
    "lucide-react",
    "next",
    "pg",
    "qrcode",
    "react",
    "react-dom",
    "server-only",
    "tailwind-merge",
    "zod",
  ];
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (!runtimeDepsBefore.includes(dep)) {
      findings.push(`Unexpected new runtime dependency: ${dep}`);
    }
  }

  if (existsSync(path.join(projectRoot, "compose.yaml"))) {
    const compose = read("compose.yaml");
    if (/checkout-service|checkout-worker/.test(compose)) {
      findings.push("compose.yaml must not add a checkout service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (!drizzleFiles.includes("0015_checkout.sql")) {
    findings.push("Expected drizzle/0015_checkout.sql");
  }
  if (drizzleFiles.some((f) => f.startsWith("0016_") && f !== "0016_payment.sql")) {
    findings.push("Unexpected 0016 migration; expected 0016_payment.sql only");
  }
  if (drizzleFiles.some((f) => f.startsWith("0017_") && f !== "0017_order.sql")) {
    findings.push("Unexpected 0017 migration; expected 0017_order.sql only");
  }
  if (drizzleFiles.length !== 16 && drizzleFiles.length !== 17 && drizzleFiles.length !== 18) {
    findings.push(`Expected 16, 17, or 18 drizzle SQL migrations, found ${drizzleFiles.length}`);
  }

  const sharedConstants = read("src/shared/checkout/constants.ts");
  for (const code of [
    "CUSTOMER_AUTH_REQUIRED",
    "CHECKOUT_NOT_FOUND",
    "CHECKOUT_CONFLICT",
    "CHECKOUT_EXPIRED",
    "CHECKOUT_STATE_CONFLICT",
    "CHECKOUT_CART_CHANGED",
    "CHECKOUT_INVALID_INPUT",
    "CHECKOUT_DESTINATION_REQUIRED",
    "CHECKOUT_EMPTY_CART",
    "CHECKOUT_VARIANT_INVALID",
    "CHECKOUT_MODIFIER_INVALID",
    "CHECKOUT_BUNDLE_INVALID",
    "CHECKOUT_NOT_ASSORTED",
    "CHECKOUT_TEMPORARILY_UNAVAILABLE",
    "CHECKOUT_SOLD_OUT",
    "CHECKOUT_NOT_SERVICEABLE",
    "CHECKOUT_SERVICEABILITY_TEMPORARILY_UNAVAILABLE",
    "CHECKOUT_SERVICEABILITY_INDETERMINATE",
    "CHECKOUT_PRICE_UNRESOLVED",
    "CHECKOUT_COUPON_INELIGIBLE",
    "CHECKOUT_PROMOTION_INDETERMINATE",
    "CHECKOUT_TAX_INDETERMINATE",
    "CHECKOUT_REPRICED",
    "CHECKOUT_DEPENDENCY_INDETERMINATE",
  ]) {
    if (!sharedConstants.includes(`"${code}"`)) {
      findings.push(`Missing CHECKOUT_ERROR_CODES entry: ${code}`);
    }
  }

  if (findings.length) {
    process.stderr.write(`audit:checkout failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:checkout passed\n");
}

main();
