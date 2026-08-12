#!/usr/bin/env node
/**
 * Workforce authentication and MFA audit (IMP-010).
 *
 * Docker-independent, Node.js-builtins-only static checks over every tracked
 * *and* untracked file (via `git ls-files --cached --others
 * --exclude-standard`, matching sibling audit scripts). Complements (never
 * duplicates) `audit-auth-foundation.mjs` — this script focuses on the
 * workforce-auth packaging and public-surface gates: the dedicated
 * `src/server/workforce-auth/**` service, Docker/Nginx/Compose packaging,
 * forbidden plugins/transports, and the single IMP-010 migration.
 *
 * Checks performed:
 *   1. better-auth / @better-auth/drizzle-adapter / auth stay pinned to
 *      1.6.25; no third-party HTTP framework dependency.
 *   2. No Better Auth catch-all / Next.js API route; workforce-auth never
 *      gets a published host port; Nginx proxies `/api/workforce-auth/`
 *      only (never `/health/*` or `/api/auth/workforce/*`).
 *   3. Workforce options never enable phone/SMS/magic-link/social/SSO/
 *      passkey/admin/organization plugins; trustDeviceMaxAge stays 0;
 *      public self-signup stays disabled.
 *   4. No raw `console.*` logging outside the two allowlisted call sites
 *      (`service.ts`, `main.ts`).
 *   5. Rate-limit schema declares only technical counter columns.
 *   6. No customer-auth secrets or migration credentials referenced in
 *      the workforce-auth Compose service `env_file` list.
 *   7. Dockerfile declares workforce-auth-builder / dependencies / runtime
 *      stages with non-root CMD on port 8082.
 *   8. Required modules and public entry points exist with `server-only`.
 *   9. Exactly one IMP-010 migration (`0004_*`) exists; migrations
 *      0000–0003 remain present (immutability of sealed hashes is enforced
 *      by `db:migrations:check`, not re-hashed here).
 *  10. No Next.js Route Handler under `src/app/api/**`.
 *  11. Operator credential create/reset never reference `internalAdapter`
 *      or `ctx.password.hash` / `password.hash`; Admin plugin absent;
 *      public runtime keeps `disableSignUp: true`; operator runtime uses
 *      `disableSignUp: false` + `autoSignIn: false` and is unreachable
 *      from workforce-auth HTTP / Nginx.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".test.mjs", ".integration.test.ts"];

const REQUIRED_BETTER_AUTH_VERSION = "1.6.25";

const WORKFORCE_AUTH_SERVICE_DIR = "src/server/workforce-auth/";
const SHARED_WORKFORCE_AUTH_DIR = "src/shared/workforce-auth/";
const BROWSER_WORKFORCE_AUTH_DIR = "src/lib/workforce-auth/";
const WORKFORCE_OPTIONS_FILE = "src/server/auth/workforce/options.ts";
const WORKFORCE_OPERATOR_OPTIONS_FILE =
  "src/server/auth/workforce/operator/options.ts";
const WORKFORCE_OPERATOR_DIR = "src/server/auth/workforce/operator/";
const OPERATOR_CREDENTIAL_IMPLEMENTATION_FILES = [
  "scripts/workforce/create-user.ts",
  "scripts/workforce/reset-password.ts",
  `${WORKFORCE_OPERATOR_DIR}credentials.ts`,
  `${WORKFORCE_OPERATOR_DIR}lifecycle.ts`,
  `${WORKFORCE_OPERATOR_DIR}options.ts`,
  `${WORKFORCE_OPERATOR_DIR}runtime.ts`,
  `${WORKFORCE_OPERATOR_DIR}reset-token-bridge.ts`,
  `${WORKFORCE_OPERATOR_DIR}index.ts`,
];
const SERVICE_LOG_FILE = `${WORKFORCE_AUTH_SERVICE_DIR}service.ts`;
const MAIN_ENTRY_FILE = `${WORKFORCE_AUTH_SERVICE_DIR}main.ts`;
const RATE_LIMIT_SCHEMA_FILE = "src/platform/database/schema/workforce-auth-rate-limits.ts";
const IMP010_MIGRATION_PREFIX = "drizzle/0004_";
const PRIOR_MIGRATIONS = [
  "drizzle/0000_database-foundation.sql",
  "drizzle/0001_transactional_outbox_idempotency.sql",
  "drizzle/0002_better_auth_foundation.sql",
  "drizzle/0003_customer_phone_otp_authentication.sql",
];

const REQUIRED_SERVER_ONLY_ENTRY_POINTS = [
  `${WORKFORCE_AUTH_SERVICE_DIR}index.ts`,
  `${WORKFORCE_AUTH_SERVICE_DIR}config.ts`,
  `${WORKFORCE_AUTH_SERVICE_DIR}service.ts`,
  `${WORKFORCE_AUTH_SERVICE_DIR}main.ts`,
  `${WORKFORCE_OPERATOR_DIR}index.ts`,
];

/** @type {string[]} */
const findings = [];

export function isWorkforceAuthTestFixture(relativePath) {
  return TEST_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

export function isWorkforceAuthServicePath(relativePath) {
  return relativePath.startsWith(WORKFORCE_AUTH_SERVICE_DIR);
}

export function isWorkforceAuthServiceProductionPath(relativePath) {
  return isWorkforceAuthServicePath(relativePath) && !isWorkforceAuthTestFixture(relativePath);
}

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

const FORBIDDEN_HTTP_FRAMEWORK_NAMES = [
  "express",
  "fastify",
  "koa",
  "hapi",
  "@hapi/hapi",
  "connect",
  "hono",
  "@nestjs/core",
];
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
];

export function packageJsonDeclaresForbiddenDependency(pkg) {
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Object.keys(allDeps).filter((name) =>
    [...FORBIDDEN_HTTP_FRAMEWORK_NAMES, ...FORBIDDEN_SMS_SDK_NAMES].includes(name),
  );
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
      `package.json: declares a forbidden dependency "${name}" (HTTP framework or SMS/OTP SDK).`,
    );
  }

  if (/@latest\b/.test(raw)) {
    findings.push('package.json: contains an "@latest" reference.');
  }

  const requiredScripts = [
    "workforce-auth:build",
    "workforce-auth:start",
    "audit:workforce-auth",
    "docker:workforce-auth:smoke",
    "docker:workforce-auth:inspect",
  ];
  for (const script of requiredScripts) {
    if (!pkg.scripts?.[script]) {
      findings.push(`package.json: missing required script "${script}".`);
    }
  }
}

const TO_NEXTJS_HANDLER_PATTERN = /\btoNextJsHandler\s*\(/;
const AUTH_HANDLER_MOUNT_PATTERN = /\bauth\.handler\b/;

function checkNoHttpTransportEscape(files) {
  for (const rel of files) {
    if (rel.startsWith("src/app/api/")) {
      findings.push(`${rel}: a Next.js API / auth route exists, which is prohibited in this slice.`);
      continue;
    }
    if (!isWorkforceAuthServicePath(rel) && !rel.startsWith(SHARED_WORKFORCE_AUTH_DIR)) continue;
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

export function extractComposeServiceBlock(composeText, serviceName) {
  const pattern = new RegExp(`\\n  ${serviceName}:\\n([\\s\\S]*?)(?=\\n  \\S|\\nvolumes:|$)`);
  const match = composeText.match(pattern);
  return match ? match[1] : "";
}

function checkComposeWorkforceAuthPackaging() {
  const rel = "compose.yaml";
  const contents = readTextFile(rel);
  if (contents === null) {
    findings.push(`${rel} does not exist.`);
    return;
  }
  const block = extractComposeServiceBlock(contents, "workforce-auth");
  if (!block) {
    findings.push(`${rel}: missing workforce-auth service.`);
    return;
  }
  if (/^\s*ports:/m.test(block)) {
    findings.push(`${rel}: the workforce-auth service publishes a host port, which is prohibited.`);
  }
  if (!/expose:\s*\[\s*"?8082"?\s*\]/.test(block)) {
    findings.push(`${rel}: workforce-auth must expose container-only port 8082.`);
  }
  if (!/\.env\.runtime\.docker\.local/.test(block) || !/\.env\.workforce-auth\.docker\.local/.test(block)) {
    findings.push(`${rel}: workforce-auth must use runtime + workforce-auth env files.`);
  }
  if (/\.env\.customer-auth\.docker\.local|\.env\.migration\.docker\.local/.test(block)) {
    findings.push(
      `${rel}: workforce-auth must not receive customer-auth or migration env files.`,
    );
  }
  if (/CUSTOMER_AUTH_|CUSTOMER_OTP_/.test(block)) {
    findings.push(`${rel}: workforce-auth service block references a customer auth secret.`);
  }
}

function checkNginxWorkforceAuthProxy() {
  const rel = "docker/nginx/nginx.conf";
  const contents = readTextFile(rel);
  if (contents === null) {
    findings.push(`${rel} does not exist.`);
    return;
  }
  if (!/location\s+\^~\s+\/api\/workforce-auth\//.test(contents)) {
    findings.push(`${rel}: missing ^~ /api/workforce-auth/ proxy location.`);
  }
  if (!/workforce-auth:8082/.test(contents)) {
    findings.push(`${rel}: /api/workforce-auth/ must proxy to workforce-auth:8082.`);
  }
  if (/location[^{]*\/health\/(live|ready)/.test(contents)) {
    findings.push(`${rel}: proxies a /health/* endpoint, which must never be reachable externally.`);
  }
  // Only flag an actual proxy location / upstream — comments documenting the
  // deliberate non-proxy of Better Auth's internal surface are expected.
  if (
    /location\s+[^{\n]*\/api\/auth\/workforce/.test(contents) ||
    /proxy_pass\s+[^;\n]*\/api\/auth\/workforce/.test(contents) ||
    /set\s+\$\w+\s+http:\/\/[^;\n]*\/api\/auth\/workforce/.test(contents)
  ) {
    findings.push(`${rel}: must never proxy /api/auth/workforce/*.`);
  }
  if (!/location\s+\^~\s+\/api\/customer-auth\//.test(contents)) {
    findings.push(`${rel}: customer-auth proxy must remain intact.`);
  }
}

function checkDockerfileWorkforceAuthStages() {
  const rel = "Dockerfile";
  const contents = readTextFile(rel);
  if (contents === null) {
    findings.push(`${rel} does not exist.`);
    return;
  }
  for (const stage of [
    "workforce-auth-builder",
    "workforce-auth-dependencies",
    "workforce-auth-runtime",
  ]) {
    if (!new RegExp(`AS\\s+${stage}\\b`).test(contents)) {
      findings.push(`${rel}: missing stage ${stage}.`);
    }
  }
  if (!/EXPOSE\s+8082/.test(contents)) {
    findings.push(`${rel}: workforce-auth-runtime must EXPOSE 8082.`);
  }
  if (
    !/CMD\s*\[\s*"node",\s*"--conditions=react-server",\s*"dist-workforce-auth\/server\/workforce-auth\/main\.js"\s*\]/.test(
      contents,
    )
  ) {
    findings.push(
      `${rel}: workforce-auth-runtime CMD must launch compiled main.js with --conditions=react-server.`,
    );
  }
  const stages = [...contents.matchAll(/FROM\s+\S+\s+AS\s+(\S+)/gi)].map((m) => m[1]);
  if (stages[stages.length - 1] !== "web-runtime") {
    findings.push(`${rel}: final stage must remain web-runtime (found ${stages[stages.length - 1]}).`);
  }
}

function checkWorkforceOptionsSurface() {
  const contents = readTextFile(WORKFORCE_OPTIONS_FILE);
  if (contents === null) {
    findings.push(`${WORKFORCE_OPTIONS_FILE} does not exist.`);
    return;
  }
  if (/phoneNumber|phone-number/.test(contents)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: must not enable a phone/OTP plugin on the workforce realm.`);
  }
  if (/from\s+["']better-auth\/plugins\/(admin|organization|magic-link|passkey|sso)/.test(contents)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: declares a forbidden Better Auth plugin.`);
  }
  if (!/trustDeviceMaxAge:\s*0/.test(contents)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: trustDeviceMaxAge must be forced to 0.`);
  }
  if (!/disableSignUp:\s*true/.test(contents)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: public self-signup must remain disabled.`);
  }
  if (/trustDevice:\s*true/.test(contents)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: trustDevice:true is prohibited.`);
  }
}

const CONSOLE_CALL_PATTERN = /\bconsole\.(log|info|warn|error|debug|trace)\s*\(/;

function checkNoStrayLogging(files) {
  for (const rel of files) {
    if (!isWorkforceAuthServiceProductionPath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (rel === SERVICE_LOG_FILE || rel === MAIN_ENTRY_FILE) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      if (CONSOLE_CALL_PATTERN.test(line)) {
        findings.push(
          `${rel}:${index + 1}: logs via console.* outside the two allowlisted call sites (${SERVICE_LOG_FILE}, ${MAIN_ENTRY_FILE}).`,
        );
      }
    });
  }
}

const FORBIDDEN_RATE_LIMIT_COLUMN_PATTERN =
  /\b(email|ipAddress|ip_address|password|totp|otp|backupCode|backup_code|sessionToken|session_token|cookie|userId|user_id)\s*:/i;

export function rateLimitSchemaDeclaresForbiddenColumn(contents) {
  const match = /appSchema\.table\(\s*"workforce_auth_rate_limits"\s*,\s*\{([\s\S]*?)\n\s*\},/.exec(
    contents,
  );
  if (!match) return false;
  return FORBIDDEN_RATE_LIMIT_COLUMN_PATTERN.test(match[1]);
}

function checkRateLimitSchemaNeverStoresRawPii() {
  const contents = readTextFile(RATE_LIMIT_SCHEMA_FILE);
  if (contents === null) {
    findings.push(
      `${RATE_LIMIT_SCHEMA_FILE} does not exist — the IMP-010 rate-limit table schema is missing.`,
    );
    return;
  }
  if (rateLimitSchemaDeclaresForbiddenColumn(contents)) {
    findings.push(
      `${RATE_LIMIT_SCHEMA_FILE}: declares a raw email/IP/TOTP/session/PII-shaped column, which is prohibited.`,
    );
  }
  if (!/appSchema\.table\(/.test(contents)) {
    findings.push(
      `${RATE_LIMIT_SCHEMA_FILE}: must declare its table via appSchema.table(...), never the bare pgTable helper.`,
    );
  }
}

function checkRequiredModulesExist(files) {
  const fileSet = new Set(files);
  for (const rel of REQUIRED_SERVER_ONLY_ENTRY_POINTS) {
    if (!fileSet.has(rel) && readTextFile(rel) === null) {
      findings.push(`${rel} does not exist.`);
      continue;
    }
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (rel !== MAIN_ENTRY_FILE && !/import\s+["']server-only["']/.test(contents)) {
      findings.push(`${rel}: must carry import "server-only".`);
    }
  }
  for (const rel of [
    `${SHARED_WORKFORCE_AUTH_DIR}contracts.ts`,
    `${BROWSER_WORKFORCE_AUTH_DIR}client.ts`,
    "scripts/workforce-auth/build.mjs",
    "tsconfig.workforce-auth.json",
    "scripts/docker/workforce-auth-smoke.mjs",
    "scripts/docker/workforce-auth-inspect.mjs",
  ]) {
    if (readTextFile(rel) === null) {
      findings.push(`${rel} does not exist.`);
    }
  }
}

function checkMigrationSurface(files) {
  for (const rel of PRIOR_MIGRATIONS) {
    if (readTextFile(rel) === null) {
      findings.push(`${rel}: previously-sealed migration is missing.`);
    }
  }
  const imp010 = files.filter(
    (rel) => rel.startsWith(IMP010_MIGRATION_PREFIX) && rel.endsWith(".sql"),
  );
  if (imp010.length !== 1) {
    findings.push(
      `Expected exactly one IMP-010 migration under ${IMP010_MIGRATION_PREFIX}*.sql, found ${imp010.length}.`,
    );
  }
  // Later slices may add exactly one migration each through 0016_payment.
  const later = files.filter(
    (rel) =>
      (/^drizzle\/0016_.*\.sql$/.test(rel) && rel !== "drizzle/0016_payment.sql") ||
      (/^drizzle\/0015_.*\.sql$/.test(rel) && rel !== "drizzle/0015_checkout.sql") ||
      (/^drizzle\/0014_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0014_cart.sql") ||
      (/^drizzle\/0013_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0013_serviceability.sql") ||
      (/^drizzle\/0012_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0012_customer_addresses.sql") ||
      (/^drizzle\/0011_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0011_customer_profiles.sql") ||
      (/^drizzle\/0010_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0010_promotions_coupons.sql") ||
      (/^drizzle\/0009_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0009_pricing_charges_tax.sql") ||
      (/^drizzle\/0008_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0008_assortment_operational_availability.sql") ||
      (/^drizzle\/0007_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0007_existing_menu_import.sql") ||
      (/^drizzle\/0017_.*\.sql$/.test(rel) &&
        rel !== "drizzle/0017_order.sql") ||
      /^drizzle\/0018_.*\.sql$/.test(rel),
  );
  if (later.length > 0) {
    findings.push(
      `Unexpected migration(s) beyond allowed 0017_order tip: ${later.join(", ")}.`,
    );
  }
  const imp011 = files.filter((rel) => /^drizzle\/0005_[^/]+\.sql$/.test(rel));
  if (imp011.length > 1) {
    findings.push(
      `Expected at most one IMP-011 migration under drizzle/0005_*.sql, found ${imp011.length}.`,
    );
  }
  const imp012 = files.filter((rel) => /^drizzle\/0006_[^/]+\.sql$/.test(rel));
  if (imp012.length > 1) {
    findings.push(
      `Expected at most one IMP-012 migration under drizzle/0006_*.sql, found ${imp012.length}.`,
    );
  }
  const imp013 = files.filter((rel) => /^drizzle\/0007_[^/]+\.sql$/.test(rel));
  if (imp013.length > 1) {
    findings.push(
      `Expected at most one IMP-013 migration under drizzle/0007_*.sql, found ${imp013.length}.`,
    );
  }
  const imp014 = files.filter((rel) => /^drizzle\/0008_[^/]+\.sql$/.test(rel));
  if (imp014.length > 1) {
    findings.push(
      `Expected at most one IMP-014 migration under drizzle/0008_*.sql, found ${imp014.length}.`,
    );
  }
  const imp015 = files.filter((rel) => /^drizzle\/0009_[^/]+\.sql$/.test(rel));
  if (imp015.length > 1) {
    findings.push(
      `Expected at most one IMP-015 migration under drizzle/0009_*.sql, found ${imp015.length}.`,
    );
  }
}

function checkNoRoleOrgOutletFields(files) {
  const forbiddenFieldPattern =
    /\b(role|organizationId|organization_id|outletId|outlet_id|permission|rbac)\b/;
  for (const rel of files) {
    if (!rel.startsWith("src/platform/database/schema/workforce")) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isWorkforceAuthTestFixture(rel)) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    // Allow comments mentioning future IMP-011 work, but flag column-like
    // declarations that look like authorization fields.
    if (/\b(role|organizationId|outletId|permission)\s*:/.test(contents) ||
        /\b(role|organization_id|outlet_id)\s*\(/.test(contents)) {
      findings.push(
        `${rel}: appears to declare role/org/outlet authorization fields, which belong to IMP-011.`,
      );
      continue;
    }
    void forbiddenFieldPattern;
  }
}

const INTERNAL_ADAPTER_PATTERN = /\binternalAdapter\b/;
const PASSWORD_HASH_PATTERN = /\b(?:ctx\.)?password\.hash\b/;
const ADMIN_PLUGIN_PATTERN =
  /from\s+["']better-auth\/plugins\/admin["']|\badmin\s*\(/;
const SIGN_UP_EMAIL_PATTERN = /\b(?:api\.)?signUpEmail\b/;
const REQUEST_PASSWORD_RESET_PATTERN = /\b(?:api\.)?requestPasswordReset\b/;
const RESET_PASSWORD_API_PATTERN = /\b(?:api\.)?resetPassword\b/;

/**
 * True when a source file is part of the real operator credential
 * implementation (create/reset), as opposed to test fixtures or
 * non-credential lifecycle CLIs.
 */
export function isOperatorCredentialImplementationPath(relativePath) {
  return OPERATOR_CREDENTIAL_IMPLEMENTATION_FILES.includes(relativePath);
}

/**
 * Detect unsupported Better Auth credential internals in operator create/reset.
 */
export function operatorCredentialSourceUsesUnsupportedInternals(contents) {
  return INTERNAL_ADAPTER_PATTERN.test(contents) || PASSWORD_HASH_PATTERN.test(contents);
}

export function publicWorkforceOptionsDisableSignUp(contents) {
  return /disableSignUp:\s*true/.test(contents);
}

export function operatorWorkforceOptionsAllowSignUpWithoutAutoSignIn(contents) {
  return /disableSignUp:\s*false/.test(contents) && /autoSignIn:\s*false/.test(contents);
}

function checkOperatorCredentialFlow(files) {
  const fileSet = new Set(files);

  for (const rel of OPERATOR_CREDENTIAL_IMPLEMENTATION_FILES) {
    if (!fileSet.has(rel) && readTextFile(rel) === null) {
      findings.push(`${rel}: required operator credential module is missing.`);
      continue;
    }
    const contents = readTextFile(rel);
    if (contents === null) continue;
    const codeWithoutBlockComments = contents.replace(/\/\*[\s\S]*?\*\//g, "");
    const codeLines = codeWithoutBlockComments
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    if (operatorCredentialSourceUsesUnsupportedInternals(codeLines)) {
      findings.push(
        `${rel}: operator credential implementation must not use internalAdapter or password.hash.`,
      );
    }
    if (ADMIN_PLUGIN_PATTERN.test(codeLines)) {
      findings.push(`${rel}: Better Auth Admin plugin is prohibited.`);
    }
  }

  const createContents = readTextFile("scripts/workforce/create-user.ts") ?? "";
  const credentialsContents = readTextFile(`${WORKFORCE_OPERATOR_DIR}credentials.ts`) ?? "";
  if (!SIGN_UP_EMAIL_PATTERN.test(createContents) && !SIGN_UP_EMAIL_PATTERN.test(credentialsContents)) {
    findings.push(
      "operator create must call Better Auth signUpEmail (scripts/workforce/create-user.ts or operator/credentials.ts).",
    );
  }

  const resetContents = readTextFile("scripts/workforce/reset-password.ts") ?? "";
  if (
    (!REQUEST_PASSWORD_RESET_PATTERN.test(resetContents) &&
      !REQUEST_PASSWORD_RESET_PATTERN.test(credentialsContents)) ||
    (!RESET_PASSWORD_API_PATTERN.test(resetContents) &&
      !RESET_PASSWORD_API_PATTERN.test(credentialsContents))
  ) {
    findings.push(
      "operator reset must call requestPasswordReset and resetPassword via the operator credential modules.",
    );
  }

  const publicOptions = readTextFile(WORKFORCE_OPTIONS_FILE);
  if (publicOptions === null) {
    findings.push(`${WORKFORCE_OPTIONS_FILE} does not exist.`);
  } else if (!publicWorkforceOptionsDisableSignUp(publicOptions)) {
    findings.push(`${WORKFORCE_OPTIONS_FILE}: public workforce runtime must keep disableSignUp: true.`);
  }

  const operatorOptions = readTextFile(WORKFORCE_OPERATOR_OPTIONS_FILE);
  if (operatorOptions === null) {
    findings.push(`${WORKFORCE_OPERATOR_OPTIONS_FILE} does not exist.`);
  } else if (!operatorWorkforceOptionsAllowSignUpWithoutAutoSignIn(operatorOptions)) {
    findings.push(
      `${WORKFORCE_OPERATOR_OPTIONS_FILE}: operator runtime must set disableSignUp: false and autoSignIn: false.`,
    );
  } else if (!/revokeSessionsOnPasswordReset:\s*true/.test(operatorOptions)) {
    findings.push(
      `${WORKFORCE_OPERATOR_OPTIONS_FILE}: revokeSessionsOnPasswordReset must be true.`,
    );
  } else if (!/storeIdentifier:/.test(operatorOptions) || !/hashed/.test(operatorOptions)) {
    findings.push(
      `${WORKFORCE_OPERATOR_OPTIONS_FILE}: password-reset verification identifiers must be configured hashed.`,
    );
  }

  // Operator runtime must never be reachable from the HTTP service tree or Nginx.
  for (const rel of files) {
    if (!isWorkforceAuthServiceProductionPath(rel)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (
      /workforce\/operator/.test(contents) ||
      /createWorkforceOperatorAuthRuntime/.test(contents) ||
      /buildWorkforceOperatorBetterAuthOptions/.test(contents)
    ) {
      findings.push(
        `${rel}: workforce-auth HTTP service must not import the operator auth runtime.`,
      );
    }
  }

  const nginx = readTextFile("docker/nginx/nginx.conf") ?? "";
  if (/operator/.test(nginx) && /workforce/.test(nginx) && /location[^{]*operator/.test(nginx)) {
    findings.push("docker/nginx/nginx.conf: must not proxy an operator-auth location.");
  }

  // Scan wider tree for Admin plugin on workforce surfaces.
  for (const rel of files) {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) continue;
    if (isWorkforceAuthTestFixture(rel)) continue;
    if (
      !rel.startsWith("src/server/auth/workforce/") &&
      !rel.startsWith("src/server/workforce-auth/") &&
      !rel.startsWith("scripts/workforce/")
    ) {
      continue;
    }
    const contents = readTextFile(rel);
    if (contents === null) continue;
    if (/from\s+["']better-auth\/plugins\/admin["']/.test(contents)) {
      findings.push(`${rel}: Better Auth Admin plugin is prohibited.`);
    }
  }
}

function main() {
  const files = listAllFiles();

  checkPinnedDependencies();
  checkNoHttpTransportEscape(files);
  checkComposeWorkforceAuthPackaging();
  checkNginxWorkforceAuthProxy();
  checkDockerfileWorkforceAuthStages();
  checkWorkforceOptionsSurface();
  checkNoStrayLogging(files);
  checkRateLimitSchemaNeverStoresRawPii();
  checkRequiredModulesExist(files);
  checkMigrationSurface(files);
  checkNoRoleOrgOutletFields(files);
  checkOperatorCredentialFlow(files);

  if (findings.length > 0) {
    console.error("audit:workforce-auth — FAILED");
    console.error("=".repeat(60));
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    console.error("=".repeat(60));
    console.error(`${findings.length} finding(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("audit:workforce-auth — all checks passed.");
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
