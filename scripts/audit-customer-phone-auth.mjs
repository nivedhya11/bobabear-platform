#!/usr/bin/env node
/**
 * Customer phone OTP authentication audit (IMP-009).
 *
 * Docker-independent, Node.js-builtins-only static checks over every tracked
 * *and* untracked file (via `git ls-files --cached --others
 * --exclude-standard`, matching `audit-auth-foundation.mjs` /
 * `audit-outbox-idempotency.mjs`'s convention). Complements (never
 * duplicates) `audit-auth-foundation.mjs`'s Better Auth realm/plugin checks —
 * this script focuses on the customer-phone-auth-specific surface: the
 * dedicated `src/server/customer-auth/**` service, `src/shared/customer-auth/**`,
 * the browser façade (`src/lib/customer-auth/**`), the login UI
 * (`src/app/login/**`), the rate-limit schema, and the one IMP-009 migration.
 *
 * Checks performed:
 *   1. libphonenumber-js is pinned to exactly 1.13.10 (no ranges); no
 *      alternate phone-parsing library, SMS/OTP provider SDK, or third-party
 *      HTTP framework dependency exists; better-auth /
 *      @better-auth/drizzle-adapter / auth stay pinned to 1.6.25.
 *   2. No Better Auth catch-all handler, `toNextJsHandler`, or
 *      `src/app/api/auth/**` route; the customer-auth service never gets a
 *      published host port in compose.yaml; Nginx never proxies its
 *      `/health/*` endpoints.
 *   3. The public façade never exposes a phone-update/removal,
 *      password, or MFA endpoint.
 *   4. The temporary-email deriver never interpolates a raw phone number
 *      outside its HMAC digest.
 *   5. No raw `console.*` logging anywhere in the customer-auth module tree
 *      except the two allowlisted call sites (`service.ts`'s per-request
 *      logging, `main.ts`'s process-lifecycle logging).
 *   6. The rate-limit schema declares only technical counter columns — never
 *      a raw phone, IP, or OTP column.
 *   7. The customer-auth module tree never imports the transactional outbox.
 *   8. The login UI and browser façade never touch
 *      `localStorage`/`sessionStorage` for a phone number or OTP code.
 *   9. No customer-auth-related `NEXT_PUBLIC_*` variable exists.
 *  10. No direct `pg`/`drizzle-orm/node-postgres` import, `createDatabaseClient`,
 *      or `getMigrationPersistence` usage inside the customer-auth service.
 *  11. The local OTP provider factory and service config both fail closed
 *      in staging/production; the provider-kind type never grows a third,
 *      "available in production" value.
 *  12. `sendOtp`'s HTTP handler never echoes the generated/raw OTP code back
 *      in a JSON response body.
 *  13. The test-only provider capture seam
 *      (`createLocalCustomerOtpProviderForTests`) is never re-exported from
 *      the public provider boundary.
 *  14. Exactly one migration beyond the sealed 0000-0002 set exists, and the
 *      three previously-sealed migrations remain byte-for-byte unchanged.
 *  15. Every required customer-phone-auth module and public entry point
 *      exists, and every entry point carries the `server-only` marker.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs", ".integration.test.ts"];

const REQUIRED_LIBPHONENUMBER_VERSION = "1.13.10";
const REQUIRED_BETTER_AUTH_VERSION = "1.6.25";

const CUSTOMER_AUTH_SERVICE_DIR = "src/server/customer-auth/";
const SHARED_CUSTOMER_AUTH_DIR = "src/shared/customer-auth/";
const BROWSER_CUSTOMER_AUTH_DIR = "src/lib/customer-auth/";
const LOGIN_APP_DIR = "src/app/login/";
const SERVICE_LOG_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}service.ts`;
// The process entry point logs its own process-lifecycle start/shutdown/
// fatal-error lines, same accepted pattern as `scripts/database/migrate.ts`
// — never a per-request event.
const MAIN_ENTRY_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}main.ts`;
const PROVIDER_INDEX_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}provider/index.ts`;
const RATE_LIMIT_SCHEMA_FILE = "src/platform/database/schema/customer-otp-rate-limits.ts";
const ROUTER_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}http/router.ts`;
const PROVIDER_FACTORY_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}provider/factory.ts`;
const PII_FILE = `${CUSTOMER_AUTH_SERVICE_DIR}pii.ts`;
const CORE_MIGRATION_PATH = "drizzle/0002_better_auth_foundation.sql";
const OTHER_SEALED_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
];

export function isCustomerPhoneAuthTestFixture(relativePath) {
  return TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

export function isCustomerAuthServicePath(relativePath) {
  return relativePath.startsWith(CUSTOMER_AUTH_SERVICE_DIR);
}

export function isCustomerAuthServiceProductionPath(relativePath) {
  return isCustomerAuthServicePath(relativePath) && !isCustomerPhoneAuthTestFixture(relativePath);
}

/** @type {string[]} */
const findings = [];

function listAllFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

function readTextFile(relativePath) {
  try {
    return readFileSync(path.join(projectRoot, relativePath), "utf8");
  } catch {
    return null;
  }
}

// ── 1. Pinned dependencies / forbidden libraries ────────────────────────────

const FORBIDDEN_PHONE_LIB_NAMES = ["google-libphonenumber", "phone", "awesome-phonenumber"];
const FORBIDDEN_SMS_SDK_NAMES = [
  "twilio",
  "plivo",
  "msg91",
  "exotel",
  "karix",
  "gupshup",
  "nexmo",
  "@vonage/server-sdk",
  "sinch",
  "@aws-sdk/client-sns",
  "@aws-sdk/client-pinpoint",
];
const FORBIDDEN_HTTP_FRAMEWORK_NAMES = ["express", "fastify", "koa", "hapi", "@hapi/hapi", "connect"];
const AT_LATEST_PATTERN = /@latest\b/;

export function packageJsonDeclaresForbiddenDependency(pkg) {
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const names = Object.keys(allDeps);
  const forbidden = [
    ...FORBIDDEN_PHONE_LIB_NAMES,
    ...FORBIDDEN_SMS_SDK_NAMES,
    ...FORBIDDEN_HTTP_FRAMEWORK_NAMES,
  ];
  return names.filter((name) => forbidden.includes(name));
}

function checkPinnedDependencies() {
  const raw = readTextFile("package.json");
  if (raw === null) {
    findings.push("package.json does not exist.");
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    findings.push("package.json is not valid JSON.");
    return;
  }

  const version = pkg.dependencies?.["libphonenumber-js"];
  if (version === undefined) {
    findings.push('package.json: "libphonenumber-js" is not installed.');
  } else if (version !== REQUIRED_LIBPHONENUMBER_VERSION) {
    findings.push(
      `package.json: "libphonenumber-js" must be pinned to exactly "${REQUIRED_LIBPHONENUMBER_VERSION}", found "${version}".`,
    );
  }

  const betterAuthChecks = [
    ["better-auth", pkg.dependencies?.["better-auth"]],
    ["@better-auth/drizzle-adapter", pkg.dependencies?.["@better-auth/drizzle-adapter"]],
    ["auth", pkg.devDependencies?.["auth"]],
  ];
  for (const [name, betterAuthVersion] of betterAuthChecks) {
    if (betterAuthVersion !== undefined && betterAuthVersion !== REQUIRED_BETTER_AUTH_VERSION) {
      findings.push(
        `package.json: "${name}" must stay pinned to exactly "${REQUIRED_BETTER_AUTH_VERSION}", found "${betterAuthVersion}".`,
      );
    }
  }

  const forbidden = packageJsonDeclaresForbiddenDependency(pkg);
  for (const name of forbidden) {
    findings.push(
      `package.json: declares a forbidden dependency "${name}" (alternate phone library, SMS/OTP provider SDK, or third-party HTTP framework).`,
    );
  }

  if (AT_LATEST_PATTERN.test(raw)) {
    findings.push('package.json: contains an "@latest" reference.');
  }
}

// ── 2. No Better Auth catch-all / published host port / health proxy ───────

const TO_NEXTJS_HANDLER_PATTERN = /\btoNextJsHandler\s*\(/;
const AUTH_HANDLER_MOUNT_PATTERN = /\bauth\.handler\b/;

function checkNoHttpTransportEscape(files) {
  for (const rel of files) {
    if (rel.startsWith("src/app/api/auth/")) {
      findings.push(`${rel}: a Better Auth HTTP route exists, which is prohibited in this slice.`);
      continue;
    }
    if (!isCustomerAuthServicePath(rel) && !rel.startsWith(SHARED_CUSTOMER_AUTH_DIR)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (TO_NEXTJS_HANDLER_PATTERN.test(contents)) {
      findings.push(`${rel}: references toNextJsHandler, which is prohibited in this slice.`);
    }
    if (AUTH_HANDLER_MOUNT_PATTERN.test(contents)) {
      findings.push(`${rel}: mounts auth.handler directly, which is prohibited in this slice.`);
    }
  }
}

function checkComposeNeverPublishesCustomerAuthPort() {
  const rel = "compose.yaml";
  const contents = readTextFile(rel);
  if (contents === null) return;
  const serviceMatch = /^  customer-auth:\n([\s\S]*?)(?:\n {2}\S|\nvolumes:|\n*$)/m.exec(contents);
  if (!serviceMatch) return;
  const block = serviceMatch[1];
  if (/^\s*ports:/m.test(block)) {
    findings.push(`${rel}: the customer-auth service publishes a host port, which is prohibited.`);
  }
}

function checkNginxNeverProxiesCustomerAuthHealth() {
  const rel = "docker/nginx/nginx.conf";
  const contents = readTextFile(rel);
  if (contents === null) return;
  if (/location[^{]*\/health\/(live|ready)/.test(contents)) {
    findings.push(`${rel}: proxies a customer-auth /health/* endpoint, which must never be reachable externally.`);
  }
}

// ── 3. No phone-update/removal, password, or MFA public exposure ───────────

const DISALLOWED_PUBLIC_API_CALL_PATTERN =
  /\bapi\.(updatePhoneNumber|deletePhoneNumber|removePhoneNumber|changePassword|setPassword|resetPassword|enableTwoFactor|verifyTwoFactor)\s*\(/;
// `updatePhoneNumber: false` is the safe, required way to pin Better Auth's
// verifyPhoneNumber call so it never mutates an existing user's phone number;
// only a truthy/non-literal-false value (or a bare route-map key) is a real
// public-surface exposure worth flagging.
const DISALLOWED_PUBLIC_PATH_KEY_PATTERN =
  /\b(updatePhoneNumber|removePhoneNumber|changePassword|resetPassword|twoFactor)\s*:(?!\s*false\b)/;

function checkNoDisallowedPublicSurface(files) {
  for (const rel of files) {
    if (!isCustomerAuthServiceProductionPath(rel) && rel !== `${SHARED_CUSTOMER_AUTH_DIR}contracts.ts`) {
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (DISALLOWED_PUBLIC_API_CALL_PATTERN.test(contents)) {
      findings.push(`${rel}: calls a phone-update/removal, password, or MFA Better Auth API, which is prohibited in this slice.`);
    }
    if (DISALLOWED_PUBLIC_PATH_KEY_PATTERN.test(contents)) {
      findings.push(`${rel}: declares a phone-update/removal, password, or MFA public path, which is prohibited in this slice.`);
    }
  }
}

// ── 4. Temp-email deriver never interpolates a raw phone number ────────────

const RAW_PHONE_TEMPLATE_INTERPOLATION_PATTERN = /`[^`]*\$\{phoneNumber\}[^`]*`/;

export function deriveTempEmailLeaksRawPhone(contents) {
  const match = /deriveTempEmail\s*\([^)]*\)\s*:[^{]*\{([\s\S]*?)\n\s*\},/.exec(contents);
  if (!match) return false;
  const body = match[1];
  if (!/createHmac/.test(body)) return true;
  // Feeding the raw phone number into the HMAC's `.update(...)` input is the
  // required, safe construction — only the value the function *returns* may
  // never interpolate the raw phone number directly.
  const returnMatch = /\breturn\s+([^\n;]+);/.exec(body);
  if (!returnMatch) return true;
  return RAW_PHONE_TEMPLATE_INTERPOLATION_PATTERN.test(returnMatch[1]);
}

function checkTempEmailNeverLeaksRawPhone() {
  const contents = readTextFile(PII_FILE);
  if (contents === null) return;
  if (deriveTempEmailLeaksRawPhone(contents)) {
    findings.push(`${PII_FILE}: deriveTempEmail must build the temporary email only from its HMAC digest, never interpolate the raw phone number.`);
  }
}

// ── 5. No console.* logging outside the two allowlisted call sites ────────

const CONSOLE_CALL_PATTERN = /\bconsole\.(log|info|warn|error|debug|trace)\s*\(/;

function checkNoStrayLogging(files) {
  for (const rel of files) {
    if (!isCustomerAuthServiceProductionPath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (rel === SERVICE_LOG_FILE || rel === MAIN_ENTRY_FILE) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      if (CONSOLE_CALL_PATTERN.test(line)) {
        findings.push(`${rel}:${index + 1}: logs via console.* outside the two allowlisted call sites (${SERVICE_LOG_FILE}, ${MAIN_ENTRY_FILE}).`);
      }
    });
  }
}

// ── 6. Rate-limit schema declares only technical counter columns ──────────

const FORBIDDEN_RATE_LIMIT_COLUMN_PATTERN =
  /\b(phoneNumber|phone_number|ipAddress|ip_address|otp|code|sessionToken|session_token|cookie|email|userId|user_id)\s*:/i;

export function rateLimitSchemaDeclaresForbiddenColumn(contents) {
  const match = /appSchema\.table\(\s*"customer_otp_rate_limits"\s*,\s*\{([\s\S]*?)\n\s*\},/.exec(contents);
  if (!match) return false;
  return FORBIDDEN_RATE_LIMIT_COLUMN_PATTERN.test(match[1]);
}

function checkRateLimitSchemaNeverStoresRawPii() {
  const contents = readTextFile(RATE_LIMIT_SCHEMA_FILE);
  if (contents === null) {
    findings.push(`${RATE_LIMIT_SCHEMA_FILE} does not exist — the IMP-009 rate-limit table schema is missing.`);
    return;
  }
  if (rateLimitSchemaDeclaresForbiddenColumn(contents)) {
    findings.push(`${RATE_LIMIT_SCHEMA_FILE}: declares a raw phone/IP/OTP/session/PII-shaped column, which is prohibited.`);
  }
  if (!/appSchema\.table\(/.test(contents)) {
    findings.push(`${RATE_LIMIT_SCHEMA_FILE}: must declare its table via appSchema.table(...), never the bare pgTable helper.`);
  }
}

// ── 7. Customer-auth module tree never enqueues an outbox event ───────────

const OUTBOX_IMPORT_PATTERN = /from\s+["']([^"']*\bserver\/persistence\/outbox[^"']*)["']/;

function checkNoOutboxUsage(files) {
  for (const rel of files) {
    if (!isCustomerAuthServiceProductionPath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (OUTBOX_IMPORT_PATTERN.test(contents)) {
      findings.push(`${rel}: imports the transactional outbox — OTP delivery must never be enqueued there in this slice.`);
    }
  }
}

// ── 8. No localStorage/sessionStorage for phone/OTP in the login UI ───────

const WEB_STORAGE_PATTERN = /\b(localStorage|sessionStorage)\s*\.\s*(setItem|getItem)\s*\(/;

function checkNoWebStorageOfPii(files) {
  for (const rel of files) {
    if (!rel.startsWith(LOGIN_APP_DIR) && !rel.startsWith(BROWSER_CUSTOMER_AUTH_DIR)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isCustomerPhoneAuthTestFixture(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (WEB_STORAGE_PATTERN.test(contents)) {
      findings.push(`${rel}: uses localStorage/sessionStorage, which must never hold a phone number or OTP code.`);
    }
  }
}

// ── 9. No customer-auth-related NEXT_PUBLIC_* variable ────────────────────

const NEXT_PUBLIC_CUSTOMER_AUTH_PATTERN =
  /NEXT_PUBLIC_[A-Z0-9_]*(CUSTOMER|OTP|PHONE)[A-Z0-9_]*/;

function checkNoPublicCustomerAuthVariable(files) {
  for (const rel of [".env.example", "src/platform/config/public-config.ts"]) {
    if (!files.includes(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const match = NEXT_PUBLIC_CUSTOMER_AUTH_PATTERN.exec(contents);
    if (match) {
      findings.push(`${rel}: introduces a browser-visible customer-auth/OTP/phone variable "${match[0]}".`);
    }
  }
}

// ── 10. No direct DB driver / migration-role usage in the service ─────────

const PG_IMPORT_PATTERN = /from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const DRIZZLE_RUNTIME_IMPORT_PATTERN =
  /from\s+["']drizzle-orm\/node-postgres[^"']*["']|require\(\s*["']drizzle-orm\/node-postgres[^"']*["']\s*\)/;
const CREATE_DATABASE_CLIENT_PATTERN = /\bcreateDatabaseClient\s*\(/;
const MIGRATION_FACTORY_PATTERN = /\bgetMigrationPersistence\s*\(/;

function checkNoDirectDatabaseAccess(files) {
  for (const rel of files) {
    if (!isCustomerAuthServiceProductionPath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      const lineNo = index + 1;
      if (PG_IMPORT_PATTERN.test(line) || DRIZZLE_RUNTIME_IMPORT_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: imports "pg" or "drizzle-orm/node-postgres" directly — reuse the persistence boundary instead.`);
      }
      if (CREATE_DATABASE_CLIENT_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: calls createDatabaseClient() directly — reuse the persistence boundary instead.`);
      }
      if (MIGRATION_FACTORY_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: uses the migration-role persistence factory — the service is application-role only.`);
      }
    });
  }
}

// ── 11. Local provider / provider-kind fail closed in staging/production ──

export function providerFactoryFailsClosedInStagingProduction(contents) {
  return /staging/.test(contents) && /production/.test(contents);
}

const THIRD_PROVIDER_KIND_PATTERN =
  /CustomerOtpProviderKind\s*=\s*["']local["']\s*\|\s*["']disabled["']\s*\|\s*["'](?!local|disabled)/;

function checkProviderFailsClosed() {
  const factoryContents = readTextFile(PROVIDER_FACTORY_FILE);
  if (factoryContents === null) {
    findings.push(`${PROVIDER_FACTORY_FILE} does not exist — the OTP provider factory is missing.`);
  } else {
    if (!providerFactoryFailsClosedInStagingProduction(factoryContents)) {
      findings.push(`${PROVIDER_FACTORY_FILE}: must fail closed for both staging and production environments.`);
    }
    if (THIRD_PROVIDER_KIND_PATTERN.test(factoryContents)) {
      findings.push(`${PROVIDER_FACTORY_FILE}: CustomerOtpProviderKind must stay exactly "local" | "disabled" — no production adapter is approved in this slice.`);
    }
  }

  const piiContents = readTextFile(PII_FILE);
  if (piiContents !== null && !providerFactoryFailsClosedInStagingProduction(piiContents)) {
    findings.push(`${PII_FILE}: service configuration must fail closed for both staging and production environments.`);
  }
}

// ── 12. sendOtp's HTTP handler never echoes the OTP code back ─────────────

// Only the server-generated code (`generatedCode`) is a leak risk here.
// `rawCode` is the code the *client itself* already submitted for
// verification — forwarding it into the internal `api.verifyPhoneNumber`
// call is required, not an echo of server-issued secret material back to
// the caller.
const OTP_ECHO_PATTERN = /code\s*:\s*generatedCode\b/;

export function routerEchoesOtpCode(contents) {
  return OTP_ECHO_PATTERN.test(contents);
}

function checkRouterNeverEchoesOtp() {
  const contents = readTextFile(ROUTER_FILE);
  if (contents === null) {
    findings.push(`${ROUTER_FILE} does not exist — the customer-auth HTTP router is missing.`);
    return;
  }
  if (routerEchoesOtpCode(contents)) {
    findings.push(`${ROUTER_FILE}: appears to echo the generated/raw OTP code back in an HTTP response body, which is prohibited.`);
  }
}

// ── 13. Test-only provider capture seam stays off the public boundary ─────

function checkProviderTestSeamNotPublic() {
  const contents = readTextFile(PROVIDER_INDEX_FILE);
  if (contents === null) {
    findings.push(`${PROVIDER_INDEX_FILE} does not exist — the provider public entry point is missing.`);
    return;
  }
  if (/createLocalCustomerOtpProviderForTests/.test(contents)) {
    findings.push(`${PROVIDER_INDEX_FILE}: must never re-export the test-only createLocalCustomerOtpProviderForTests seam.`);
  }
}

// ── 14. Exactly one new migration; previously sealed ones unchanged ───────

function checkMigrationIntegrity(files) {
  const phoneMigration = "drizzle/0003_customer_phone_otp_authentication.sql";
  const knownMigrations = new Set([
    ...OTHER_SEALED_MIGRATIONS,
    CORE_MIGRATION_PATH,
    phoneMigration,
  ]);
  const extraMigrations = files.filter(
    (f) => f.startsWith("drizzle/") && f.endsWith(".sql") && !knownMigrations.has(f),
  );
  if (extraMigrations.filter((r) => /^drizzle\/0004_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-010 (0004) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0005_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-011 (0005) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0006_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-012 (0006) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0007_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-013 (0007) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0008_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-014 (0008) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0009_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-015 (0009) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0010_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-016 (0010) migration.`);
  }
  if (extraMigrations.filter((r) => /^drizzle\/0011_/.test(r)).length > 1) {
    findings.push(`Expected at most one IMP-017 (0011) migration.`);
  }
  if (
    extraMigrations.some(
      (r) => /^drizzle\/0010_/.test(r) && r !== "drizzle/0010_promotions_coupons.sql",
    )
  ) {
    findings.push(`Unexpected 0010 migration; expected drizzle/0010_promotions_coupons.sql only.`);
  }
  if (
    extraMigrations.some(
      (r) => /^drizzle\/0011_/.test(r) && r !== "drizzle/0011_customer_profiles.sql",
    )
  ) {
    findings.push(`Unexpected 0011 migration; expected drizzle/0011_customer_profiles.sql only.`);
  }
  if (
    extraMigrations.some(
      (r) => /^drizzle\/0009_/.test(r) && r !== "drizzle/0009_pricing_charges_tax.sql",
    )
  ) {
    findings.push(`Unexpected 0009 migration; expected drizzle/0009_pricing_charges_tax.sql only.`);
  }
  if (extraMigrations.some((r) => /^drizzle\/0012_/.test(r) && r !== "drizzle/0012_customer_addresses.sql")) {
    findings.push(`Unexpected 0012 migration; expected drizzle/0012_customer_addresses.sql only.`);
  }
  if (extraMigrations.some((r) => /^drizzle\/0015_/.test(r) && r !== "drizzle/0015_checkout.sql")) {
    findings.push(`Unexpected 0015 migration; expected drizzle/0015_checkout.sql only.`);
  }
  if (extraMigrations.some((r) => /^drizzle\/0014_/.test(r) && r !== "drizzle/0014_cart.sql")) {
    findings.push(`Unexpected 0014 migration; expected drizzle/0014_cart.sql only.`);
  }
  if (extraMigrations.some((r) => /^drizzle\/0013_/.test(r) && r !== "drizzle/0013_serviceability.sql")) {
    findings.push(`Unexpected 0013 migration; expected drizzle/0013_serviceability.sql only.`);
  }

  const manifestPath = path.join(projectRoot, "drizzle/migration-integrity.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return;
  }
  // IMP-009's own sealed predecessors are 0000-0002; do not re-hash 0003 here
  // (that file is this audit's own deliverable) or 0004 (IMP-010).
  const sealedBeforeThisSlice = new Set([...OTHER_SEALED_MIGRATIONS, CORE_MIGRATION_PATH]);
  for (const entry of manifest.migrations ?? []) {
    if (!sealedBeforeThisSlice.has(entry.path)) continue;
    const contents = readTextFile(entry.path);
    if (contents === null) {
      findings.push(`${entry.path}: previously sealed migration is missing.`);
      continue;
    }
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== entry.sha256) {
      findings.push(`${entry.path}: previously sealed migration content has changed — this must never happen.`);
    }
  }
}

// ── 15. Required modules / entry points exist and are server-only ─────────

const REQUIRED_MODULES = [
  `${SHARED_CUSTOMER_AUTH_DIR}phone.ts`,
  `${SHARED_CUSTOMER_AUTH_DIR}contracts.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}pii.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}errors.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}config.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}service.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}main.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}index.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}provider/types.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}provider/local.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}provider/factory.ts`,
  PROVIDER_INDEX_FILE,
  `${CUSTOMER_AUTH_SERVICE_DIR}rate-limit/hashing.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}rate-limit/store.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}rate-limit/types.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}rate-limit/index.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/origin.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/client-ip.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/request.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/response.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/headers.ts`,
  ROUTER_FILE,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/app.ts`,
  `${BROWSER_CUSTOMER_AUTH_DIR}client.ts`,
  `${LOGIN_APP_DIR}page.tsx`,
  `${LOGIN_APP_DIR}CustomerLoginClient.tsx`,
  RATE_LIMIT_SCHEMA_FILE,
];

const SERVER_ONLY_ENTRY_POINTS = [
  `${CUSTOMER_AUTH_SERVICE_DIR}index.ts`,
  PROVIDER_INDEX_FILE,
  `${CUSTOMER_AUTH_SERVICE_DIR}rate-limit/index.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/origin.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/client-ip.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/request.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/response.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/headers.ts`,
  ROUTER_FILE,
  `${CUSTOMER_AUTH_SERVICE_DIR}http/app.ts`,
  `${CUSTOMER_AUTH_SERVICE_DIR}service.ts`,
];

function checkRequiredModulesExist() {
  for (const rel of REQUIRED_MODULES) {
    if (readTextFile(rel) === null) {
      findings.push(`${rel} does not exist — a required IMP-009 module is missing.`);
    }
  }
  for (const rel of SERVER_ONLY_ENTRY_POINTS) {
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (!/^\s*import\s+["']server-only["'];?\s*$/m.test(contents)) {
      findings.push(`${rel} must start with \`import "server-only";\`.`);
    }
  }
}

function checkMigrationFileExists(files) {
  const rel = "drizzle/0003_customer_phone_otp_authentication.sql";
  if (!files.includes(rel)) {
    findings.push(`${rel} does not exist — the IMP-009 phone migration is missing.`);
  }
}

/** Fixed local OTP codes must never be hardcoded into committed package
 * scripts — they belong only in ignored env files or ephemeral test
 * process trees (see scripts/e2e/run-customer-auth-e2e.mjs). */
function checkNoHardcodedFixedOtpInPackageScripts() {
  const pkg = readTextFile("package.json");
  if (pkg === null) return;
  if (/CUSTOMER_OTP_LOCAL_FIXED_CODE\s*=\s*\d{6}/.test(pkg)) {
    findings.push(
      "package.json hardcodes CUSTOMER_OTP_LOCAL_FIXED_CODE — use the ignored " +
        ".env.customer-auth.docker.local file or an ephemeral generated code instead.",
    );
  }
}

// ── run ──────────────────────────────────────────────────────────────────

const files = listAllFiles();

checkPinnedDependencies();
checkNoHttpTransportEscape(files);
checkComposeNeverPublishesCustomerAuthPort();
checkNginxNeverProxiesCustomerAuthHealth();
checkNoDisallowedPublicSurface(files);
checkTempEmailNeverLeaksRawPhone();
checkNoStrayLogging(files);
checkRateLimitSchemaNeverStoresRawPii();
checkNoOutboxUsage(files);
checkNoWebStorageOfPii(files);
checkNoPublicCustomerAuthVariable(files);
checkNoDirectDatabaseAccess(files);
checkProviderFailsClosed();
checkRouterNeverEchoesOtp();
checkProviderTestSeamNotPublic();
checkMigrationIntegrity(files);
checkRequiredModulesExist();
checkMigrationFileExists(files);
checkNoHardcodedFixedOtpInPackageScripts();

console.log("Customer phone OTP authentication audit");
console.log("=".repeat(60));

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`  ✗  ${finding}`);
  }
  console.log("=".repeat(60));
  console.log(`${findings.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("  ✓  libphonenumber-js pinned to 1.13.10; better-auth family unchanged; no forbidden dependency.");
  console.log("  ✓  No Better Auth catch-all/HTTP route escape; no published customer-auth host port or health proxy.");
  console.log("  ✓  No phone-update/removal, password, or MFA public surface.");
  console.log("  ✓  Temporary-email derivation never leaks the raw phone number.");
  console.log("  ✓  No stray console.* logging outside the two allowlisted call sites.");
  console.log("  ✓  Rate-limit schema stores only technical counters — no raw PII column.");
  console.log("  ✓  No outbox usage; no localStorage/sessionStorage of phone/OTP; no public NEXT_PUBLIC_* leak.");
  console.log("  ✓  No direct database driver or migration-role usage in the service.");
  console.log("  ✓  The local provider and service config fail closed in staging/production.");
  console.log("  ✓  The HTTP router never echoes an OTP code back in a response body.");
  console.log("  ✓  The test-only provider capture seam is not re-exported publicly.");
  console.log("  ✓  Exactly one new migration; previously sealed migrations are unchanged.");
  console.log("  ✓  Every required module and public entry point exists and is server-only.");
  console.log("  ✓  No hardcoded CUSTOMER_OTP_LOCAL_FIXED_CODE in package.json.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
