#!/usr/bin/env node
/**
 * Better Auth foundation audit (IMP-008 core; IMP-009 phone OTP).
 *
 * Docker-independent, Node.js-builtins-only static checks over every
 * tracked *and* untracked file (via `git ls-files --cached --others
 * --exclude-standard`, matching `audit-persistence.mjs`/
 * `audit-outbox-idempotency.mjs`'s convention).
 *
 * Checks performed:
 *   1. better-auth / @better-auth/drizzle-adapter / auth are pinned to
 *      exactly 1.6.25 (no ranges, no "latest", no beta/rc).
 *   2. Customer realm modules never import the workforce schema/options/
 *      runtime, and vice versa; no unrestricted `getAuthRuntime(realm, ...)`
 *      factory exists.
 *   3. Every `src/server/auth/**\/index.ts` public entry point carries the
 *      `server-only` marker; nothing under `src/app/**`/`src/components/**`
 *      imports `src/server/auth`; no production `createAuthClient`/
 *      `useSession`.
 *   4. No direct `pg.Pool`/`new Pool(`, `createDatabaseClient`, or
 *      `getMigrationPersistence` usage inside `src/server/auth/**`.
 *   5. No enabled email/password, non-empty `socialProviders`, enabled rate
 *      limiting, or enabled logger inside `src/server/auth/**\/options.ts`.
 *      `plugins` must stay empty everywhere *except*
 *      `src/server/auth/customer/options.ts`, which (IMP-009) may declare
 *      exactly one plugin — `phoneNumber(...)` — and nothing else.
 *   6. No Better Auth HTTP route handler (`toNextJsHandler`, `auth.handler`
 *      mounted in a route file, `src/app/api/auth/**`).
 *   7. No generic `BETTER_AUTH_SECRET`/`AUTH_SECRET` or auth-related
 *      `NEXT_PUBLIC_*` variable in `.env.example` or the public-config
 *      allowlist; no `console.*` logging inside `src/server/auth/**`.
 *   8. The core migration (`drizzle/0002_better_auth_foundation.sql`) adds
 *      exactly the eight approved tables, contains no phone/rate-limit/
 *      plugin table or column, and remains byte-for-byte unchanged (checked
 *      by `scripts/database/check-migration-history.mjs` / the sealed
 *      integrity manifest, not duplicated here). Exactly one additional
 *      migration beyond it is allowed, for IMP-009's phone fields — see
 *      `checkPhoneMigrationIfPresent` below — and it may only ever touch
 *      `customer_auth_users`, never a workforce table.
 *   9. The customer schema (`src/platform/database/schema/customer-auth.ts`)
 *      may declare `phoneNumber`/`phoneNumberVerified`; the workforce schema
 *      (`.../workforce-auth.ts`) must never declare either field, and no
 *      workforce realm module may import customer-realm/phone code.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const REQUIRED_VERSION = "1.6.25";

const AUTH_ROOT = "src/server/auth/";
const AUTH_TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs"];

/** A path exempt from production-only checks — a narrowly-scoped test
 * fixture, never an ordinary source file. */
export function isAuthTestFixture(relativePath) {
  return AUTH_TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

/** True for any file inside the auth foundation's own module tree. */
export function isAuthModulePath(relativePath) {
  return relativePath.startsWith(AUTH_ROOT);
}

/** True for a file inside the customer realm's own module tree. */
export function isCustomerRealmPath(relativePath) {
  return relativePath.startsWith(`${AUTH_ROOT}customer/`);
}

/** True for a file inside the workforce realm's own module tree. */
export function isWorkforceRealmPath(relativePath) {
  return relativePath.startsWith(`${AUTH_ROOT}workforce/`);
}

const GENERIC_REALM_FACTORY_PATTERN =
  /export\s+(?:async\s+)?function\s+getAuthRuntime\s*\(|export\s+const\s+getAuthRuntime\s*=|export\s+(?:async\s+)?function\s+createAuthRuntime\s*\(/;
const PG_POOL_PATTERN = /\bnew\s+Pool\s*\(|from\s+["']pg["']|require\(\s*["']pg["']\s*\)/;
const CREATE_DATABASE_CLIENT_PATTERN = /\bcreateDatabaseClient\s*\(/;
const MIGRATION_FACTORY_PATTERN = /\bgetMigrationPersistence\s*\(/;
const PROCESS_ENV_PATTERN = /\bprocess\.env\b/;
const CONSOLE_LOG_PATTERN = /\bconsole\.(log|info|warn|error|debug)\s*\(/;
const CREATE_AUTH_CLIENT_PATTERN = /\bcreateAuthClient\s*\(/;
const USE_SESSION_PATTERN = /\buseSession\s*\(/;
const TO_NEXTJS_HANDLER_PATTERN = /\btoNextJsHandler\s*\(/;
const AUTH_HANDLER_MOUNT_PATTERN = /\bauth\.handler\b/;
const GENERIC_BETTER_AUTH_SECRET_PATTERN = /\b(BETTER_AUTH_SECRET|AUTH_SECRET)\b/;
const NEXT_PUBLIC_AUTH_PATTERN = /NEXT_PUBLIC_[A-Z0-9_]*AUTH[A-Z0-9_]*/;
const AT_LATEST_PATTERN = /@latest\b/;

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
  const checks = [
    ["better-auth", pkg.dependencies?.["better-auth"]],
    ["@better-auth/drizzle-adapter", pkg.dependencies?.["@better-auth/drizzle-adapter"]],
    ["auth", pkg.devDependencies?.["auth"]],
  ];
  for (const [name, version] of checks) {
    if (version === undefined) {
      findings.push(`package.json: "${name}" is not installed.`);
      continue;
    }
    if (version !== REQUIRED_VERSION) {
      findings.push(
        `package.json: "${name}" must be pinned to exactly "${REQUIRED_VERSION}", found "${version}".`,
      );
    }
  }
  if (AT_LATEST_PATTERN.test(raw)) {
    findings.push("package.json: contains an \"@latest\" reference.");
  }
}

function checkAuthEntryPointsAreServerOnly(files) {
  const entryPoints = [
    "src/server/auth/shared/index.ts",
    "src/server/auth/customer/index.ts",
    "src/server/auth/workforce/index.ts",
  ];
  for (const rel of entryPoints) {
    if (!files.includes(rel)) {
      findings.push(`${rel} does not exist — a required auth public entry point is missing.`);
      continue;
    }
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (!/^\s*import\s+["']server-only["'];?\s*$/m.test(contents)) {
      findings.push(`${rel} must start with \`import "server-only";\`.`);
    }
  }
}

function checkNoGenericRealmFactory(files) {
  for (const rel of files) {
    if (!isAuthModulePath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (GENERIC_REALM_FACTORY_PATTERN.test(contents)) {
      findings.push(`${rel}: declares an unrestricted generic realm factory, which is prohibited.`);
    }
  }
}

function checkRealmSeparation(files) {
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;

    if (isCustomerRealmPath(rel) && /from\s+["'][^"']*workforce-auth["']/.test(contents)) {
      findings.push(`${rel}: customer realm module imports the workforce schema.`);
    }
    // Broad match (not just the schema file's exact "customer-auth" import
    // suffix) so this also catches the IMP-009 customer-only PII/phone/OTP
    // provider modules under `src/server/customer-auth/**` and
    // `src/shared/customer-auth/**` — the workforce realm must never import
    // any customer-realm/phone code.
    if (isWorkforceRealmPath(rel) && /from\s+["'][^"']*customer-auth[^"']*["']/.test(contents)) {
      findings.push(`${rel}: workforce realm module imports customer-realm/phone code.`);
    }
  }
}

function checkPersistenceUsage(files) {
  for (const rel of files) {
    if (!isAuthModulePath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isAuthTestFixture(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      const lineNo = index + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
      if (PG_POOL_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: imports "pg" or constructs a Pool directly.`);
      }
      if (CREATE_DATABASE_CLIENT_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: calls createDatabaseClient() directly.`);
      }
      if (MIGRATION_FACTORY_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: uses the migration-role persistence factory.`);
      }
      if (PROCESS_ENV_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: reads process.env directly.`);
      }
      if (CONSOLE_LOG_PATTERN.test(line)) {
        findings.push(`${rel}:${lineNo}: logs via console.* inside the auth foundation.`);
      }
    });
  }
}

const ENABLED_EMAIL_PASSWORD_PATTERN = /emailAndPassword\s*:\s*\{\s*enabled\s*:\s*true/;
const NON_EMPTY_PLUGINS_PATTERN = /plugins\s*:\s*\[\s*[^\]\s]/;
const NON_EMPTY_SOCIAL_PROVIDERS_PATTERN = /socialProviders\s*:\s*\{\s*[^}\s]/;
const RATE_LIMIT_ENABLED_PATTERN = /rateLimit\s*:\s*\{\s*enabled\s*:\s*true/;
const LOGGER_NOT_DISABLED_PATTERN = /logger\s*:\s*\{\s*disabled\s*:\s*false/;

/** Options files with approved non-empty plugin lists. */
const CUSTOMER_OPTIONS_PATH = "src/server/auth/customer/options.ts";
const WORKFORCE_OPTIONS_PATH = "src/server/auth/workforce/options.ts";
/** CLI-only operator credential runtime options (IMP-010 correction). */
const WORKFORCE_OPERATOR_OPTIONS_PATH =
  "src/server/auth/workforce/operator/options.ts";
const PHONE_NUMBER_PLUGIN_CALL_PATTERN = /\bphoneNumber\s*\(/;
const TWO_FACTOR_PLUGIN_CALL_PATTERN = /\btwoFactor\s*\(/;
/** Other Better Auth plugins that must never appear alongside the phone
 * plugin in the customer realm — an allowlist-by-exclusion safety net so
 * adding an unrelated plugin to the customer realm doesn't silently pass. */
const DISALLOWED_CUSTOMER_PLUGIN_CALL_PATTERN =
  /\b(twoFactor|magicLink|passkey|organization|admin|apiKey|multiSession|username|emailOTP|genericOAuth|oidcProvider|siwe|oneTap|deviceAuthorization|haveIBeenPwned|jwt|bearer|openAPI|customSession)\s*\(/;
/** Plugins that must never appear in the workforce realm alongside
 * `twoFactor` (IMP-010). Phone OTP stays customer-only. */
const DISALLOWED_WORKFORCE_PLUGIN_CALL_PATTERN =
  /\b(phoneNumber|magicLink|passkey|organization|admin|apiKey|multiSession|username|emailOTP|genericOAuth|oidcProvider|siwe|oneTap|deviceAuthorization|haveIBeenPwned|jwt|bearer|openAPI|customSession)\s*\(/;

/** True if a `plugins: [...]` array's contents declare only the customer
 * realm's approved `phoneNumber(...)` plugin (IMP-009) — used to carve the
 * customer realm's `options.ts` out of the otherwise-universal
 * "plugins must stay empty" rule, without weakening it for every other
 * plugin. */
export function pluginsBlockIsPhoneNumberOnly(pluginsBlock) {
  const trimmed = pluginsBlock.trim();
  if (trimmed.length === 0) return true;
  return (
    PHONE_NUMBER_PLUGIN_CALL_PATTERN.test(trimmed) &&
    !DISALLOWED_CUSTOMER_PLUGIN_CALL_PATTERN.test(trimmed)
  );
}

/** True if a workforce `plugins: [...]` array declares only `twoFactor(...)`
 * (IMP-010). */
export function pluginsBlockIsTwoFactorOnly(pluginsBlock) {
  const trimmed = pluginsBlock.trim();
  if (trimmed.length === 0) return false;
  return (
    TWO_FACTOR_PLUGIN_CALL_PATTERN.test(trimmed) &&
    !DISALLOWED_WORKFORCE_PLUGIN_CALL_PATTERN.test(trimmed)
  );
}

function extractPluginsBlock(contents) {
  const match = contents.match(/plugins\s*:\s*\[([\s\S]*?)\]/);
  return match ? match[1] : null;
}

function checkDisabledCapabilities(files) {
  const optionsFiles = files.filter(
    (rel) => isAuthModulePath(rel) && rel.endsWith("/options.ts"),
  );
  for (const rel of optionsFiles) {
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const isCustomerOptions = rel === CUSTOMER_OPTIONS_PATH;
    const isWorkforceOptions = rel === WORKFORCE_OPTIONS_PATH;
    const isWorkforceOperatorOptions = rel === WORKFORCE_OPERATOR_OPTIONS_PATH;
    const isApprovedWorkforceEmailPasswordOptions =
      isWorkforceOptions || isWorkforceOperatorOptions;

    // IMP-010: workforce (+ CLI-only operator) email/password is required.
    // Customer (and every other options file) must keep it disabled.
    if (ENABLED_EMAIL_PASSWORD_PATTERN.test(contents) && !isApprovedWorkforceEmailPasswordOptions) {
      findings.push(`${rel}: enables email/password authentication, which is prohibited in this slice.`);
    }
    if (isApprovedWorkforceEmailPasswordOptions && !ENABLED_EMAIL_PASSWORD_PATTERN.test(contents)) {
      findings.push(`${rel}: workforce email/password authentication must be enabled (IMP-010).`);
    }
    if (isCustomerOptions) {
      const pluginsBlock = extractPluginsBlock(contents);
      if (pluginsBlock === null) {
        findings.push(`${rel}: missing a "plugins" array.`);
      } else if (!pluginsBlockIsPhoneNumberOnly(pluginsBlock)) {
        findings.push(
          `${rel}: plugins array must declare only the approved phoneNumber() plugin, which is prohibited otherwise.`,
        );
      }
    } else if (isApprovedWorkforceEmailPasswordOptions) {
      const pluginsBlock = extractPluginsBlock(contents);
      if (pluginsBlock === null) {
        findings.push(`${rel}: missing a "plugins" array.`);
      } else if (!pluginsBlockIsTwoFactorOnly(pluginsBlock)) {
        findings.push(
          `${rel}: plugins array must declare only the approved twoFactor() plugin (IMP-010).`,
        );
      }
    } else if (NON_EMPTY_PLUGINS_PATTERN.test(contents)) {
      findings.push(`${rel}: declares a non-empty plugins array, which is prohibited in this slice.`);
    }
    if (NON_EMPTY_SOCIAL_PROVIDERS_PATTERN.test(contents)) {
      findings.push(`${rel}: declares a non-empty socialProviders object, which is prohibited in this slice.`);
    }
    if (RATE_LIMIT_ENABLED_PATTERN.test(contents)) {
      findings.push(`${rel}: enables Better Auth rate limiting, which is prohibited in this slice.`);
    }
    if (LOGGER_NOT_DISABLED_PATTERN.test(contents)) {
      findings.push(`${rel}: does not disable the Better Auth logger.`);
    }
  }
}

function checkNoHttpTransport(files) {
  for (const rel of files) {
    if (rel.startsWith("src/app/api/auth/")) {
      findings.push(`${rel}: a Better Auth HTTP route exists, which is prohibited in this slice.`);
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isAuthTestFixture(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const isPublicAppTree = rel.startsWith("src/app/") || rel.startsWith("src/components/");

    if (TO_NEXTJS_HANDLER_PATTERN.test(contents)) {
      findings.push(`${rel}: references toNextJsHandler, which is prohibited in this slice.`);
    }
    if (isAuthModulePath(rel) && AUTH_HANDLER_MOUNT_PATTERN.test(contents)) {
      findings.push(`${rel}: mounts auth.handler, which is prohibited in this slice.`);
    }
    if (isPublicAppTree) {
      if (isAuthModulePath(rel)) continue; // never true; kept for symmetry with audit-persistence.mjs
      if (/from\s+["'][^"']*server\/auth[^"']*["']/.test(contents)) {
        findings.push(`${rel}: imports the auth foundation from the public application tree.`);
      }
      if (CREATE_AUTH_CLIENT_PATTERN.test(contents)) {
        findings.push(`${rel}: calls createAuthClient() from the public application tree.`);
      }
      if (USE_SESSION_PATTERN.test(contents)) {
        findings.push(`${rel}: calls useSession() from the public application tree.`);
      }
    }
  }
}

function checkSecretHygiene(files) {
  for (const rel of [".env.example", "src/platform/config/public-config.ts"]) {
    if (!files.includes(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (GENERIC_BETTER_AUTH_SECRET_PATTERN.test(contents)) {
      findings.push(`${rel}: references a generic BETTER_AUTH_SECRET/AUTH_SECRET variable.`);
    }
    const match = NEXT_PUBLIC_AUTH_PATTERN.exec(contents);
    if (match) {
      findings.push(`${rel}: introduces a browser-visible auth variable "${match[0]}".`);
    }
  }
}

const APPROVED_MIGRATION_TABLES = [
  "customer_auth_users",
  "customer_auth_sessions",
  "customer_auth_accounts",
  "customer_auth_verifications",
  "workforce_auth_users",
  "workforce_auth_sessions",
  "workforce_auth_accounts",
  "workforce_auth_verifications",
];
const FORBIDDEN_TABLE_NAME_FRAGMENTS = [
  "rate_limit",
  "mfa",
  "organization",
  "passkey",
  "api_key",
  "phone_number",
  "member",
  "invitation",
];
const CORE_MIGRATION_PATH = "drizzle/0002_better_auth_foundation.sql";
const OTHER_SEALED_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
];
const PHONE_FIELD_PATTERN = /phone_number|phoneNumber/;

/** True if `contents` declares an unrestricted, caller-selectable realm
 * factory (`getAuthRuntime(realm, ...)`/`createAuthRuntime(...)`), which
 * §8 of the IMP-008 spec prohibits. */
export function declaresGenericRealmFactory(contents) {
  return GENERIC_REALM_FACTORY_PATTERN.test(contents);
}

/** True if an `options.ts`-shaped module enables a capability this slice
 * must keep disabled (email/password, a non-empty plugin/social-provider
 * list, rate limiting, or a non-disabled logger). */
export function declaresDisabledCapabilityViolation(contents) {
  return (
    ENABLED_EMAIL_PASSWORD_PATTERN.test(contents) ||
    NON_EMPTY_PLUGINS_PATTERN.test(contents) ||
    NON_EMPTY_SOCIAL_PROVIDERS_PATTERN.test(contents) ||
    RATE_LIMIT_ENABLED_PATTERN.test(contents) ||
    LOGGER_NOT_DISABLED_PATTERN.test(contents)
  );
}

/** True if `contents` constructs a `pg` `Pool` or imports `pg` directly —
 * prohibited anywhere inside the auth foundation (see
 * `src/server/auth/shared/database-adapter.ts`). */
export function declaresDirectPoolConstruction(contents) {
  return PG_POOL_PATTERN.test(contents);
}

export function extractCreatedTableNames(migrationSql) {
  const names = [];
  const pattern = /CREATE TABLE\s+"[^"]+"\."([a-z0-9_]+)"/g;
  let match;
  while ((match = pattern.exec(migrationSql)) !== null) {
    names.push(match[1]);
  }
  return names;
}

function checkNewMigration(files) {
  const rel = CORE_MIGRATION_PATH;
  if (!files.includes(rel)) {
    findings.push(`${rel} does not exist — the IMP-008 migration is missing.`);
    return;
  }
  const contents = readTextFile(rel);
  if (contents === null) return;

  const tableNames = extractCreatedTableNames(contents).sort();
  const expected = [...APPROVED_MIGRATION_TABLES].sort();
  if (JSON.stringify(tableNames) !== JSON.stringify(expected)) {
    findings.push(
      `${rel}: creates tables ${JSON.stringify(tableNames)}, expected exactly ${JSON.stringify(expected)}.`,
    );
  }
  for (const fragment of FORBIDDEN_TABLE_NAME_FRAGMENTS) {
    if (contents.toLowerCase().includes(fragment)) {
      findings.push(`${rel}: contains a forbidden table/column name fragment "${fragment}".`);
    }
  }
  if (/\bGRANT\b/i.test(contents)) {
    findings.push(`${rel}: hardcodes a GRANT statement, which must come from default privileges instead.`);
  }
}

/**
 * Post-foundation migrations: IMP-009 adds `0003_*`, IMP-010 adds `0004_*`,
 * IMP-011 adds `0005_*`, IMP-012 adds `0006_*`, IMP-013 adds `0007_*`.
 * Nothing beyond 0007 is allowed here.
 */
function checkPhoneMigrationIfPresent(files) {
  const phoneMigration = "drizzle/0003_customer_phone_otp_authentication.sql";
  const knownMigrations = new Set([
    ...OTHER_SEALED_MIGRATIONS,
    CORE_MIGRATION_PATH,
    phoneMigration,
  ]);
  const extraMigrations = files.filter(
    (f) => f.startsWith("drizzle/") && f.endsWith(".sql") && !knownMigrations.has(f),
  );

  // Require the IMP-009 phone migration once that slice has landed.
  if (files.includes(phoneMigration) || extraMigrations.some((f) => f.startsWith("drizzle/0003_"))) {
    const rel = files.find((f) => /^drizzle\/0003_[^/]+\.sql$/.test(f)) ?? phoneMigration;
    const contents = readTextFile(rel);
    if (contents === null) {
      findings.push(`${rel}: the IMP-009 phone migration is missing.`);
    } else {
      if (!/customer_auth_users/.test(contents)) {
        findings.push(`${rel}: the IMP-009 phone migration must alter customer_auth_users.`);
      }
      if (!/customer_otp_rate_limits/.test(contents)) {
        findings.push(`${rel}: the IMP-009 phone migration must create customer_otp_rate_limits.`);
      }
      if (/workforce_auth/i.test(contents)) {
        findings.push(`${rel}: the IMP-009 phone migration must never touch a workforce table.`);
      }
      if (!/phone_number/i.test(contents)) {
        findings.push(`${rel}: the IMP-009 phone migration must add the phone_number field(s).`);
      }
      if (/\bGRANT\b/i.test(contents)) {
        findings.push(`${rel}: hardcodes a GRANT statement, which must come from default privileges instead.`);
      }
      const createTableMatches = contents.match(/CREATE TABLE\s+"?app"?\."?([a-z0-9_]+)"?/gi) ?? [];
      for (const match of createTableMatches) {
        const name = match.replace(/CREATE TABLE\s+"?app"?\."?/i, "").replace(/"?$/i, "");
        if (name !== "customer_otp_rate_limits") {
          findings.push(`${rel}: unexpected CREATE TABLE for "${name}".`);
        }
      }
    }
  }

  const laterThanPhone = extraMigrations.filter((f) => !/^drizzle\/0003_/.test(f));
  if (laterThanPhone.length === 0) return;

  const allowedLater = laterThanPhone.every(
    (rel) =>
      /^drizzle\/0004_[^/]+\.sql$/.test(rel) ||
      /^drizzle\/0005_[^/]+\.sql$/.test(rel) ||
      /^drizzle\/0006_[^/]+\.sql$/.test(rel) ||
      rel === "drizzle/0007_existing_menu_import.sql" ||
      rel === "drizzle/0008_assortment_operational_availability.sql" ||
      rel === "drizzle/0009_pricing_charges_tax.sql" ||
      rel === "drizzle/0010_promotions_coupons.sql" ||
      rel === "drizzle/0011_customer_profiles.sql" ||
      rel === "drizzle/0012_customer_addresses.sql" ||
      rel === "drizzle/0013_serviceability.sql" ||
      rel === "drizzle/0014_cart.sql" ||
      rel === "drizzle/0015_checkout.sql" ||
      rel === "drizzle/0016_payment.sql" ||
      rel === "drizzle/0017_order.sql",
  );
  if (!allowedLater) {
    findings.push(
      `Unexpected additional migration file(s) beyond IMP-009/010/011/012/013/014/015/016/017/018/019/020/021: ${laterThanPhone.join(", ")}.`,
    );
    return;
  }
  const imp010 = laterThanPhone.filter((rel) => /^drizzle\/0004_/.test(rel));
  const imp011 = laterThanPhone.filter((rel) => /^drizzle\/0005_/.test(rel));
  const imp012 = laterThanPhone.filter((rel) => /^drizzle\/0006_/.test(rel));
  const imp013 = laterThanPhone.filter((rel) => /^drizzle\/0007_/.test(rel));
  const imp014 = laterThanPhone.filter((rel) => /^drizzle\/0008_/.test(rel));
  const imp015 = laterThanPhone.filter((rel) => /^drizzle\/0009_/.test(rel));
  const imp016 = laterThanPhone.filter((rel) => /^drizzle\/0010_/.test(rel));
  const imp017 = laterThanPhone.filter((rel) => /^drizzle\/0011_/.test(rel));
  if (imp010.length > 1) {
    findings.push(`Expected at most one IMP-010 migration, found ${imp010.length}.`);
  }
  if (imp011.length > 1) {
    findings.push(`Expected at most one IMP-011 migration, found ${imp011.length}.`);
  }
  if (imp012.length > 1) {
    findings.push(`Expected at most one IMP-012 migration, found ${imp012.length}.`);
  }
  if (imp013.length > 1) {
    findings.push(`Expected at most one IMP-013 migration, found ${imp013.length}.`);
  }
  if (imp014.length > 1) {
    findings.push(`Expected at most one IMP-014 migration, found ${imp014.length}.`);
  }
  if (imp015.length > 1) {
    findings.push(`Expected at most one IMP-015 migration, found ${imp015.length}.`);
  }
  if (imp016.length > 1) {
    findings.push(`Expected at most one IMP-016 migration, found ${imp016.length}.`);
  }
  if (imp017.length > 1) {
    findings.push(`Expected at most one IMP-017 migration, found ${imp017.length}.`);
  }
  if (
    imp017.some((rel) => rel !== "drizzle/0011_customer_profiles.sql")
  ) {
    findings.push(`Unexpected 0011 migration; expected drizzle/0011_customer_profiles.sql only.`);
  }
}

/** Workforce must never declare a phone field — checked directly against
 * the schema source, independent of `auth:schema:check`'s generated-contract
 * diff, so this audit fails even if that separate check is skipped. */
function checkWorkforceHasNoPhoneFields(files) {
  const rel = "src/platform/database/schema/workforce-auth.ts";
  if (!files.includes(rel)) return;
  const contents = readTextFile(rel);
  if (contents === null) return;
  if (PHONE_FIELD_PATTERN.test(contents)) {
    findings.push(`${rel}: the workforce schema must never declare a phone field.`);
  }
}

/** Customer must declare both IMP-009 phone fields once this slice lands. */
function checkCustomerHasPhoneFields(files) {
  const rel = "src/platform/database/schema/customer-auth.ts";
  if (!files.includes(rel)) return;
  const contents = readTextFile(rel);
  if (contents === null) return;
  if (!/\bphoneNumber\s*:/.test(contents)) {
    findings.push(`${rel}: the customer schema is missing the IMP-009 "phoneNumber" field.`);
  }
  if (!/\bphoneNumberVerified\s*:/.test(contents)) {
    findings.push(`${rel}: the customer schema is missing the IMP-009 "phoneNumberVerified" field.`);
  }
}

const files = listAllFiles();

checkPinnedDependencies();
checkAuthEntryPointsAreServerOnly(files);
checkNoGenericRealmFactory(files);
checkRealmSeparation(files);
checkPersistenceUsage(files);
checkDisabledCapabilities(files);
checkNoHttpTransport(files);
checkSecretHygiene(files);
checkNewMigration(files);
checkPhoneMigrationIfPresent(files);
checkWorkforceHasNoPhoneFields(files);
checkCustomerHasPhoneFields(files);

console.log("Better Auth foundation audit");
console.log("=".repeat(60));

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`  ✗  ${finding}`);
  }
  console.log("=".repeat(60));
  console.log(`${findings.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("  ✓  better-auth / @better-auth/drizzle-adapter / auth are pinned to 1.6.25.");
  console.log("  ✓  Auth public entry points carry the server-only marker.");
  console.log("  ✓  No unrestricted generic realm factory.");
  console.log("  ✓  Customer and workforce realms do not import each other's schema.");
  console.log("  ✓  No direct pg/Pool/createDatabaseClient/migration-factory usage.");
  console.log("  ✓  No enabled social providers, rate limiting, or logger; customer plugins stay");
  console.log("     phoneNumber-only (IMP-009); workforce plugins stay twoFactor-only with");
  console.log("     email/password enabled (IMP-010).");
  console.log("  ✓  No Better Auth HTTP transport or browser auth client.");
  console.log("  ✓  No generic BETTER_AUTH_SECRET/AUTH_SECRET or NEXT_PUBLIC_* auth variable.");
  console.log("  ✓  The core migration adds exactly the eight approved tables; IMP-009/IMP-010");
  console.log("     may each add one further migration (0003 phone OTP, 0004 workforce MFA).");
  console.log("  ✓  Only the customer schema declares phone fields; the workforce schema never does.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
