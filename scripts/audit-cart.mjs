#!/usr/bin/env node
/**
 * Cart audit (IMP-020).
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
];
const IMP020 = "drizzle/0014_cart.sql";
const TABLES = [
  "carts",
  "cart_lines",
  "cart_line_modifier_selections",
  "cart_line_bundle_selections",
  "cart_line_bundle_modifier_selections",
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
    "src/shared/cart/index.ts",
    "src/server/cart/index.ts",
    "src/platform/database/schema/cart.ts",
  ]) {
    if (!existsSync(path.join(projectRoot, mod))) findings.push(`Missing ${mod}`);
  }

  const index = read("src/server/cart/index.ts");
  if (!index.includes('import "server-only"')) {
    findings.push("src/server/cart/index.ts must import server-only");
  }

  for (const forbidden of [
    "createCart",
    "updateCart",
    "patchCart",
    "deleteCart",
    "saveCart",
  ]) {
    if (new RegExp(`\\bexport\\s+(async\\s+)?function\\s+${forbidden}\\b`).test(index)) {
      findings.push(`Generic CRUD escape hatch exported: ${forbidden}`);
    }
  }

  // CustomerActor trust boundary: public Cart API must not expose any
  // arbitrary identity→actor mint path (userId / session-shaped adapters).
  // Branding must not use Symbol.for. Actor mint requires branded
  // TrustedCustomerAuthIdentity from customer-auth session validation.
  const publicMintNames = [
    "createCustomerActorFromTrustedAuthIdentity",
    "customerActorFromTrustedCustomerAuthIdentity",
    "customerActorFromTrustedCustomerAuthSession",
    "createCustomerActor",
    "resolveTrustedCustomerAuthIdentity",
  ];
  for (const name of publicMintNames) {
    if (new RegExp(`\\b${name}\\b`).test(index)) {
      findings.push(
        `src/server/cart/index.ts must not export arbitrary actor mint path: ${name}`,
      );
    }
  }
  if (!existsSync(path.join(projectRoot, "src/server/cart/auth-adapter.ts"))) {
    findings.push("Missing src/server/cart/auth-adapter.ts");
  } else {
    const adapterSource = read("src/server/cart/auth-adapter.ts");
    if (
      !/\bexport\s+function\s+customerActorFromTrustedCustomerAuthIdentity\b/.test(
        adapterSource,
      )
    ) {
      findings.push(
        "src/server/cart/auth-adapter.ts must define customerActorFromTrustedCustomerAuthIdentity for the trusted auth boundary",
      );
    }
    if (
      /\bexport\s+function\s+customerActorFromTrustedCustomerAuthSession\b/.test(
        adapterSource,
      )
    ) {
      findings.push(
        "src/server/cart/auth-adapter.ts must not keep the raw session-shaped customerActorFromTrustedCustomerAuthSession mint",
      );
    }
    if (!/\bisTrustedCustomerAuthIdentity\b/.test(adapterSource)) {
      findings.push(
        "src/server/cart/auth-adapter.ts must runtime-check TrustedCustomerAuthIdentity",
      );
    }
  }
  if (
    !existsSync(
      path.join(projectRoot, "src/server/auth/customer/trusted-identity.ts"),
    )
  ) {
    findings.push("Missing src/server/auth/customer/trusted-identity.ts");
  } else {
    const trustedSource = read("src/server/auth/customer/trusted-identity.ts");
    if (/Symbol\.for\s*\(/.test(trustedSource)) {
      findings.push(
        "trusted-identity.ts must not use Symbol.for for TrustedCustomerAuthIdentity branding",
      );
    }
    if (
      !/Symbol\s*\(\s*["']boba-bear\.TrustedCustomerAuthIdentity["']\s*\)/.test(
        trustedSource,
      )
    ) {
      findings.push(
        "trusted-identity.ts must brand TrustedCustomerAuthIdentity with a module-private Symbol",
      );
    }
    if (
      !/\bexport\s+async\s+function\s+resolveTrustedCustomerAuthIdentity\b/.test(
        trustedSource,
      )
    ) {
      findings.push(
        "trusted-identity.ts must export resolveTrustedCustomerAuthIdentity as the only mint path",
      );
    }
    if (
      /\bexport\s+function\s+mintTrustedCustomerAuthIdentity\b/.test(trustedSource)
    ) {
      findings.push(
        "trusted-identity.ts must not export a raw mintTrustedCustomerAuthIdentity factory",
      );
    }
  }
  const actorSource = read("src/server/cart/actor.ts");
  if (/Symbol\.for\s*\(/.test(actorSource)) {
    findings.push(
      "src/server/cart/actor.ts must not use Symbol.for for CustomerActor branding",
    );
  }
  if (!/Symbol\s*\(\s*["']boba-bear\.cart\.CustomerActor["']\s*\)/.test(actorSource)) {
    findings.push(
      "src/server/cart/actor.ts must brand CustomerActor with a module-private Symbol",
    );
  }
  if (!/\bisTrustedCustomerAuthIdentity\b/.test(actorSource)) {
    findings.push(
      "src/server/cart/actor.ts must require TrustedCustomerAuthIdentity at runtime",
    );
  }
  if (
    /\bauthUserId\s*:\s*string\b/.test(actorSource) &&
    /\bexport\s+type\s+CustomerActorIdentity\b/.test(actorSource)
  ) {
    findings.push(
      "src/server/cart/actor.ts must not expose a raw CustomerActorIdentity string-id mint contract",
    );
  }

  const integrity = JSON.parse(read("drizzle/migration-integrity.json"));
  const sealed = Object.fromEntries(integrity.migrations.map((m) => [m.path, m.sha256]));
  for (const prior of PRIOR) {
    if (sealed[prior] !== sha256File(prior)) {
      findings.push(`Prior migration hash changed: ${prior}`);
    }
  }
  if (!sealed[IMP020] || sealed[IMP020] !== sha256File(IMP020)) {
    findings.push(`${IMP020} must be sealed and match integrity`);
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

  const sql = read(IMP020);
  for (const table of TABLES) {
    if (!sql.includes(`"app"."${table}"`)) findings.push(`${IMP020} must create ${table}`);
  }
  if ((sql.match(/CREATE TABLE "app"/g) || []).length !== 5) {
    findings.push(`${IMP020} must create exactly 5 tables`);
  }
  for (const bad of [
    "outlet_id",
    "address_id",
    "postal_code",
    "amount_paise",
    "grand_total",
    "serviceability",
    "configuration_json",
    "cart_quotes",
    "cart_audit",
  ]) {
    if (new RegExp(bad, "i").test(sql)) {
      findings.push(`Migration must not introduce forbidden column/table: ${bad}`);
    }
  }
  if (/GRANT\s+.*boba_bear_app/i.test(sql)) {
    findings.push("Migration must not hardcode GRANT to boba_bear_app");
  }
  if (!sql.includes("carts_owner_xor_check")) {
    findings.push("Migration must enforce owner XOR CHECK");
  }
  if (!sql.includes("carts_customer_brand_uidx")) {
    findings.push("Migration must include customer+brand unique index");
  }

  const schema = read("src/platform/database/schema/cart.ts");
  for (const bad of [
    "outletId",
    "addressId",
    "amountPaise",
    "configurationJson",
    "serviceability",
  ]) {
    if (new RegExp(`\\b${bad}\\b`).test(schema)) {
      findings.push(`Schema must not declare forbidden field: ${bad}`);
    }
  }

  const catalog = read("src/shared/access-control/catalog.ts");
  const keysMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\] as const/);
  if (keysMatch) {
    const count = [...keysMatch[1].matchAll(/"/g)].length / 2;
    if (count !== 51 && count !== 55 && count !== 57) findings.push(`PERMISSION_KEYS must be 51, 55, or 57, found ${count}`);
  }
  if (/cart\./i.test(catalog)) {
    findings.push("No workforce cart.* permissions may be added");
  }

  const files = trackedFiles();
  if (files.some((f) => f.startsWith("src/app/api/") && /cart/i.test(f))) {
    findings.push("No public Cart API Route Handlers");
  }
  if (files.some((f) => /cart-service|cart-worker/.test(f))) {
    findings.push("No new cart docker service");
  }

  const serverFiles = files.filter((f) => f.startsWith("src/server/cart/"));
  for (const rel of serverFiles) {
    const text = read(rel);
    if (/guest_credential_verifier|guestCredentialVerifier/.test(text) && /console\./.test(text)) {
      findings.push(`${rel}: must not log guest verifier`);
    }
    if (/Math\.random/.test(text)) {
      findings.push(`${rel}: must not use Math.random for guest credentials`);
    }
  }

  const guestCred = read("src/server/cart/guest-credential.ts");
  if (!guestCred.includes("timingSafeEqual")) {
    findings.push("guest-credential.ts must use timingSafeEqual");
  }
  if (!guestCred.includes("randomBytes")) {
    findings.push("guest-credential.ts must use crypto.randomBytes");
  }

  const repo = read("src/server/cart/repository.ts");
  if (!repo.includes('.for("update")')) {
    findings.push("repository.ts must use FOR UPDATE locks");
  }
  if (!repo.includes("lockCustomerAuthUserForUpdate")) {
    findings.push("Ownership ops require customer-auth lock helper");
  }
  if (!repo.includes("asc(cartsTable.id)")) {
    findings.push("Two-cart lock must order carts by id ascending");
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
    if (/cart-service|cart-worker/.test(compose)) {
      findings.push("compose.yaml must not add a cart service");
    }
  }

  const drizzleFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) =>
    /^\d{4}_.*\.sql$/.test(f),
  );
  if (!drizzleFiles.includes("0014_cart.sql")) {
    findings.push("Expected drizzle/0014_cart.sql");
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
    process.stderr.write(`audit:cart failed (${findings.length}):\n`);
    for (const f of findings) process.stderr.write(`  - ${f}\n`);
    process.exit(1);
  }
  process.stdout.write("audit:cart passed\n");
}

main();
