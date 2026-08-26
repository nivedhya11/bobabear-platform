#!/usr/bin/env node
/**
 * Configuration-boundary audit.
 *
 * Conservative, Node.js-builtins-only checks that complement (but do not
 * replace) the `no-process-env` ESLint restriction. This is not a full
 * JavaScript/TypeScript parser: it uses line-oriented text scanning, so it
 * can be fooled by sufficiently unusual formatting (e.g. `process` and
 * `.env` split across a template literal, or access hidden behind
 * `globalThis["process"]`). It is a safety net, not a guarantee.
 *
 * Checks performed:
 *   1. No direct `process.env` access in disallowed application source.
 *   2. No `NEXT_PUBLIC_*` usage outside the public-config boundary
 *      (with a documented, narrow allowlist for pre-existing legacy usage
 *      that predates IMP-003 — see LEGACY_NEXT_PUBLIC_FILES below).
 *   3. No undeclared committed `.env*` files.
 *   4. `.env.example` / `.env.test` contain only approved keys.
 *   5. Those files contain no secret-shaped keys or obviously credential-
 *      like values.
 *   6/7. No source logs the full environment
 *        (e.g. a console call passed the entire process environment).
 *
 * Deliberately does not scan: node_modules, .git, .next, out, coverage,
 * playwright-report, test-results, blob-report.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// The application-source config boundary. process.env access is only
// approved inside these paths (relative to the project root).
const ALLOWED_PROCESS_ENV_PREFIXES = [
  "src/platform/config/",
  "src/instrumentation.ts",
  // The customer-auth HTTP service (IMP-009) is a standalone Node process;
  // its `main.ts` is its own narrow, documented executable boundary — see
  // the matching eslint.config.mjs exception and AGENTS.md-style rationale
  // in that file's header comment.
  "src/server/customer-auth/main.ts",
  // The workforce-auth HTTP service (IMP-010) is a standalone Node process;
  // its `main.ts` is its own narrow, documented executable boundary — see
  // the matching eslint.config.mjs exception.
  "src/server/workforce-auth/main.ts",
  // The customer-commerce HTTP service (IMP-024) is a standalone Node process;
  // its `main.ts` is its own narrow, documented executable boundary.
  "src/server/customer-commerce/main.ts",
  // E2E-only fake Payment entrypoint (IMP-025). Not production composition.
  "src/server/customer-commerce/e2e-fake-main.ts",
  // The Operations HTTP service (IMP-029) is a standalone Node process;
  // its main entry is the sole Operations environment-reading boundary.
  "src/server/operations/main.ts",
];

// Pre-existing NEXT_PUBLIC_* usage that predates IMP-003 (GA measurement ID
// and canonical site URL, both wired through the existing GitHub Pages
// deploy workflow). ADR-015 / IMP-003 establishes the *new* central
// boundary for *new* browser-public configuration; it does not retroactively
// migrate these two pre-existing, unrelated variables — see AGENTS.md
// section 29 ("report as a blocker" rather than making an unrelated
// application change). Any NEXT_PUBLIC_* usage outside this allowlist and
// outside the public-config boundary is a real finding.
const LEGACY_NEXT_PUBLIC_FILES = new Set([
  "src/lib/site.ts",
  "src/components/Analytics.tsx",
]);

// Same two files also predate the process.env restriction for the same
// reason: they read process.env.NEXT_PUBLIC_SITE_URL /
// process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID directly, not through the new
// config boundary. Reported as a known limitation rather than migrated —
// see AGENTS.md section 29.
const LEGACY_PROCESS_ENV_FILES = LEGACY_NEXT_PUBLIC_FILES;

// This audit script's own file, scanned for the log check below (it
// describes the same check in prose, which would otherwise self-match).
const SELF_PATH = "scripts/audit-config-boundary.mjs";

const APPROVED_ENV_FILE_KEYS = new Set([
  "BOBA_BEAR_ENV",
  "BOBA_BEAR_PUBLIC_ORIGIN",
  "BOBA_BEAR_LOG_LEVEL",
  "BOBA_BEAR_RELEASE",
  "BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS",
  "BOBA_BEAR_DATABASE_URL",
  "BOBA_BEAR_DATABASE_MIGRATION_URL",
  "BOBA_BEAR_DATABASE_SSL_MODE",
  "BOBA_BEAR_PAYMENT_PROVIDER",
  "BOBA_BEAR_RAZORPAY_KEY_ID",
  "BOBA_BEAR_RAZORPAY_KEY_SECRET",
  "BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET",
  "PORT",
  // Customer phone + OTP auth service (IMP-009) — a second, narrow config
  // boundary (src/server/auth/shared/config.ts), deliberately outside the
  // BOBA_BEAR_* schema above. Read only by the standalone customer-auth
  // Node process, never by the static site build — see AGENTS.md's IMP-008/
  // IMP-009 sections ("Static build isolation").
  "CUSTOMER_AUTH_SECRET",
  "CUSTOMER_AUTH_BASE_URL",
  "CUSTOMER_AUTH_PII_HASH_SECRET",
  "CUSTOMER_OTP_PROVIDER",
  "CUSTOMER_OTP_LOCAL_FIXED_CODE",
  "CUSTOMER_AUTH_TRUST_PROXY_HOPS",
  "CUSTOMER_AUTH_SERVICE_HOST",
  "CUSTOMER_AUTH_SERVICE_PORT",
  // Workforce email/password + MFA auth service (IMP-010) — same second,
  // narrow config boundary pattern as customer-auth. Read only by the
  // standalone workforce-auth Node process, never by the static site build.
  "WORKFORCE_AUTH_SECRET",
  "WORKFORCE_AUTH_BASE_URL",
  "WORKFORCE_AUTH_PII_HASH_SECRET",
  "WORKFORCE_AUTH_TRUST_PROXY_HOPS",
  "WORKFORCE_AUTH_SERVICE_HOST",
  "WORKFORCE_AUTH_SERVICE_PORT",
  // Customer-commerce HTTP service (IMP-024) — same narrow standalone-process
  // config boundary pattern as customer-auth / workforce-auth.
  "CUSTOMER_COMMERCE_SERVICE_HOST",
  "CUSTOMER_COMMERCE_SERVICE_PORT",
  "CUSTOMER_COMMERCE_TRUST_PROXY_HOPS",
  // Operations HTTP service (IMP-029).
  "OPERATIONS_SERVICE_HOST",
  "OPERATIONS_SERVICE_PORT",
]);

// .env.docker.example (IMP-004) uses a completely different key catalogue —
// it configures the local Docker Compose PostgreSQL bootstrap container,
// not the BOBA_BEAR_* application configuration boundary.
const APPROVED_DOCKER_ENV_FILE_KEYS = new Set([
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "POSTGRES_MIGRATOR_PASSWORD",
  "POSTGRES_APP_PASSWORD",
  "POSTGRES_HOST_PORT",
]);

const ALLOWED_COMMITTED_ENV_FILES = new Set([
  ".env.example",
  ".env.test",
  ".env.docker.example",
]);

// Keys that are secret-shaped by name (POSTGRES_*_PASSWORD, the BOBA_BEAR_*
// database URLs) but are approved for these specific committed template/
// fixture files *only* when their value is an unmistakable placeholder or a
// deterministic, credential-free fixture — never a real-looking value. This
// lets the templates document the required shape without the blanket
// secret-key heuristic rejecting the whole file.
const PLACEHOLDER_VALUE_PATTERN = /replace-with-generated-/;

const APPROVED_FIXTURE_DATABASE_URLS = new Set([
  "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
  "postgresql://boba_bear_migrator@127.0.0.1:5433/boba_bear_local",
]);

// The two real customer-auth secrets (IMP-009). Approved the same way the
// BOBA_BEAR_DATABASE_* keys above are: a "replace-with-generated-" template
// value in .env.example, one of these exact deterministic fixture strings
// in .env.test.
const CUSTOMER_AUTH_SECRET_KEYS = new Set([
  "CUSTOMER_AUTH_SECRET",
  "CUSTOMER_AUTH_PII_HASH_SECRET",
]);
const APPROVED_CUSTOMER_AUTH_TEST_FIXTURE_SECRETS = new Set([
  "test-fixture-customer-auth-secret-do-not-reuse-in-real-envs",
  "test-fixture-customer-auth-pii-hash-secret-do-not-reuse",
]);

const WORKFORCE_AUTH_SECRET_KEYS = new Set([
  "WORKFORCE_AUTH_SECRET",
  "WORKFORCE_AUTH_PII_HASH_SECRET",
]);
const APPROVED_WORKFORCE_AUTH_TEST_FIXTURE_SECRETS = new Set([
  "test-fixture-workforce-auth-secret-do-not-reuse-in-real-envs",
  "test-fixture-workforce-auth-pii-hash-secret-do-not-reuse",
]);

const RAZORPAY_SECRET_KEYS = new Set([
  "BOBA_BEAR_RAZORPAY_KEY_SECRET",
  "BOBA_BEAR_RAZORPAY_WEBHOOK_SECRET",
]);

// Customer-auth (IMP-009) configuration keys that are not secrets but
// happen to contain "AUTH" (one of SENSITIVE_KEY_PATTERNS below) purely as
// part of their realm-scoped naming — a base URL, proxy-hop count, bind
// host, and bind port, none of which need to be kept confidential.
const CUSTOMER_AUTH_NON_SECRET_CONFIG_KEYS = new Set([
  "CUSTOMER_AUTH_BASE_URL",
  "CUSTOMER_AUTH_TRUST_PROXY_HOPS",
  "CUSTOMER_AUTH_SERVICE_HOST",
  "CUSTOMER_AUTH_SERVICE_PORT",
]);

const WORKFORCE_AUTH_NON_SECRET_CONFIG_KEYS = new Set([
  "WORKFORCE_AUTH_BASE_URL",
  "WORKFORCE_AUTH_TRUST_PROXY_HOPS",
  "WORKFORCE_AUTH_SERVICE_HOST",
  "WORKFORCE_AUTH_SERVICE_PORT",
]);

const CUSTOMER_COMMERCE_NON_SECRET_CONFIG_KEYS = new Set([
  "CUSTOMER_COMMERCE_SERVICE_HOST",
  "CUSTOMER_COMMERCE_SERVICE_PORT",
  "CUSTOMER_COMMERCE_TRUST_PROXY_HOPS",
]);

const OPERATIONS_NON_SECRET_CONFIG_KEYS = new Set([
  "OPERATIONS_SERVICE_HOST",
  "OPERATIONS_SERVICE_PORT",
]);

function isApprovedSecretShapedPlaceholder(fileName, key, value) {
  if (
    fileName === ".env.docker.example" &&
    (key === "POSTGRES_PASSWORD" ||
      key === "POSTGRES_MIGRATOR_PASSWORD" ||
      key === "POSTGRES_APP_PASSWORD")
  ) {
    return PLACEHOLDER_VALUE_PATTERN.test(value);
  }
  if (
    (fileName === ".env.example" || fileName === ".env.test") &&
    (key === "BOBA_BEAR_DATABASE_URL" || key === "BOBA_BEAR_DATABASE_MIGRATION_URL")
  ) {
    if (fileName === ".env.example") {
      return PLACEHOLDER_VALUE_PATTERN.test(value);
    }
    // .env.test uses deterministic, password-free fixture URLs (schema
    // validation only — no real connection is ever attempted with them).
    return APPROVED_FIXTURE_DATABASE_URLS.has(value);
  }
  if (
    (fileName === ".env.example" || fileName === ".env.test") &&
    CUSTOMER_AUTH_SECRET_KEYS.has(key)
  ) {
    if (fileName === ".env.example") {
      return PLACEHOLDER_VALUE_PATTERN.test(value);
    }
    return APPROVED_CUSTOMER_AUTH_TEST_FIXTURE_SECRETS.has(value);
  }
  if (
    (fileName === ".env.example" || fileName === ".env.test") &&
    WORKFORCE_AUTH_SECRET_KEYS.has(key)
  ) {
    if (fileName === ".env.example") {
      return PLACEHOLDER_VALUE_PATTERN.test(value);
    }
    return APPROVED_WORKFORCE_AUTH_TEST_FIXTURE_SECRETS.has(value);
  }
  if (
    (fileName === ".env.example" || fileName === ".env.test") &&
    RAZORPAY_SECRET_KEYS.has(key)
  ) {
    if (fileName === ".env.example") {
      return PLACEHOLDER_VALUE_PATTERN.test(value);
    }
    return false;
  }
  if (
    (fileName === ".env.example" || fileName === ".env.test") &&
    (CUSTOMER_AUTH_NON_SECRET_CONFIG_KEYS.has(key) ||
      WORKFORCE_AUTH_NON_SECRET_CONFIG_KEYS.has(key) ||
      CUSTOMER_COMMERCE_NON_SECRET_CONFIG_KEYS.has(key) ||
      OPERATIONS_NON_SECRET_CONFIG_KEYS.has(key))
  ) {
    return true;
  }
  return false;
}

// .env.example pre-dates IMP-003 and already documented two legacy,
// actively-used NEXT_PUBLIC_* overrides (GA measurement ID and canonical
// site URL — see .github/workflows/deploy.yml). These are out of scope for
// this slice's approved BOBA_BEAR_* catalogue (see AGENTS.md section 29);
// this narrow, file-specific allowlist keeps the audit honest about new
// unapproved keys without flagging that pre-existing, legitimate content.
const LEGACY_ENV_EXAMPLE_KEYS = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
]);

const SENSITIVE_KEY_PATTERNS = [
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSCODE",
  "PRIVATE",
  "CREDENTIAL",
  "AUTH",
  "COOKIE",
  "SESSION",
  "DATABASE_URL",
  "CONNECTION_STRING",
  "API_KEY",
  "SIGNING_KEY",
];

const FULL_ENV_LOG_PATTERN =
  /console\.(?:log|error|warn|info|debug)\s*\(\s*(?:JSON\.stringify\s*\(\s*)?process\.env\s*[,)]/;

/** @type {string[]} */
const findings = [];

function relPath(absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join("/");
}

function walk(dir, onFile) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), onFile);
    } else if (entry.isFile()) {
      onFile(path.join(dir, entry.name));
    }
  }
}

function isAllowedProcessEnvPath(rel) {
  return ALLOWED_PROCESS_ENV_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(prefix),
  );
}

function scanSourceTree() {
  const roots = ["src", "scripts"].map((name) => path.join(projectRoot, name));
  for (const root of roots) {
    walk(root, (filePath) => {
      const ext = path.extname(filePath);
      if (!SOURCE_EXTENSIONS.has(ext)) return;
      const rel = relPath(filePath);
      // Test files exercise the config module with explicit source objects
      // and are expected to reference process.env in narrow, controlled
      // ways (e.g. documenting what NOT to do); skip them here — Vitest
      // coverage of the boundary itself lives in the test suite, not this
      // audit.
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) return;

      const contents = readFileSync(filePath, "utf8");
      const lines = contents.split("\n");

      const scanProcessEnv =
        rel.startsWith("src/") &&
        !isAllowedProcessEnvPath(rel) &&
        !LEGACY_PROCESS_ENV_FILES.has(rel);
      const scanNextPublic =
        rel.startsWith("src/") &&
        !isAllowedProcessEnvPath(rel) &&
        !LEGACY_NEXT_PUBLIC_FILES.has(rel);

      lines.forEach((line, index) => {
        const lineNo = index + 1;

        if (scanProcessEnv && /process\.env\b/.test(line)) {
          findings.push(
            `${rel}:${lineNo}: direct process.env access outside the config boundary (src/platform/config/**, src/instrumentation.ts).`,
          );
        }

        if (scanNextPublic && /\bNEXT_PUBLIC_[A-Z0-9_]*/.test(line)) {
          findings.push(
            `${rel}:${lineNo}: NEXT_PUBLIC_* usage outside the public-config boundary (src/platform/config/public-config.ts).`,
          );
        }

        if (rel !== SELF_PATH && FULL_ENV_LOG_PATTERN.test(line)) {
          findings.push(
            `${rel}:${lineNo}: appears to log the full environment (console.*(process.env) / JSON.stringify(process.env)).`,
          );
        }
      });
    });
  }
}

/**
 * Env files that are either already committed (tracked) or currently
 * untracked-but-not-git-ignored (i.e. would be picked up by `git add`).
 * This intentionally does not require a commit to already exist — IMP-003
 * itself must not commit anything — it just asks "would this file end up
 * in the repository if someone committed right now?".
 */
function listCommittableRootEnvFiles() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "--", ".env*"],
      { cwd: projectRoot, encoding: "utf8" },
    );
    return output.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    findings.push(
      `Could not enumerate committable .env* files via "git ls-files" (${error instanceof Error ? error.message : "unknown error"}).`,
    );
    return [];
  }
}

function checkCommittedEnvFiles() {
  const committable = listCommittableRootEnvFiles();
  for (const file of committable) {
    if (!ALLOWED_COMMITTED_ENV_FILES.has(file)) {
      findings.push(
        `Undeclared committable env file "${file}". Only ${[...ALLOWED_COMMITTED_ENV_FILES].join(", ")} may be committed.`,
      );
    }
  }
  for (const required of ALLOWED_COMMITTED_ENV_FILES) {
    if (!committable.includes(required)) {
      findings.push(`Expected env file "${required}" was not found (or is git-ignored).`);
    }
  }
  if (committable.includes(".env.docker.local")) {
    findings.push(
      `".env.docker.local" must never be committed (local Docker credentials).`,
    );
  }
}

function parseEnvFile(contents) {
  /** @type {Array<{ key: string, value: string, lineNo: number }>} */
  const pairs = [];
  const lines = contents.split("\n");
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) return;
    pairs.push({ key: match[1], value: match[2], lineNo: index + 1 });
  });
  return pairs;
}

function isSensitiveKey(key) {
  const upper = key.toUpperCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => upper.includes(pattern));
}

function checkEnvFileContents(fileName) {
  const filePath = path.join(projectRoot, fileName);
  let contents;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch {
    findings.push(`Expected env file "${fileName}" does not exist on disk.`);
    return;
  }

  const isDockerEnvFile = fileName === ".env.docker.example";
  const approvedKeys = isDockerEnvFile
    ? APPROVED_DOCKER_ENV_FILE_KEYS
    : APPROVED_ENV_FILE_KEYS;

  const pairs = parseEnvFile(contents);
  for (const { key, value, lineNo } of pairs) {
    if (
      fileName === ".env.example" &&
      LEGACY_ENV_EXAMPLE_KEYS.has(key)
    ) {
      continue;
    }
    if (!approvedKeys.has(key)) {
      findings.push(
        `${fileName}:${lineNo}: unapproved key "${key}". Approved keys: ${[...approvedKeys].join(", ")}.`,
      );
    }
    const isApprovedPlaceholder = isApprovedSecretShapedPlaceholder(fileName, key, value);
    if (isSensitiveKey(key) && !isApprovedPlaceholder) {
      findings.push(
        `${fileName}:${lineNo}: key "${key}" matches a secret-sensitive naming pattern and must not be committed.`,
      );
    }
    // Conservative credential-shape check on the value itself, independent
    // of the key name (e.g. an accidental real bearer token pasted into a
    // safe-looking key).
    if (/^(sk|pk|ghp|gho|xox[abp])-?[A-Za-z0-9]{10,}$/.test(value)) {
      findings.push(
        `${fileName}:${lineNo}: value for "${key}" looks like a real credential/token, not a safe example.`,
      );
    }
  }
}

scanSourceTree();
checkCommittedEnvFiles();
checkEnvFileContents(".env.example");
checkEnvFileContents(".env.test");
checkEnvFileContents(".env.docker.example");

console.log("Configuration-boundary audit");
console.log("=".repeat(60));

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`  ✗  ${finding}`);
  }
  console.log("=".repeat(60));
  console.log(`${findings.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log("  ✓  No direct process.env access outside the config boundary.");
  console.log("  ✓  No undeclared NEXT_PUBLIC_* usage outside the public-config boundary.");
  console.log("  ✓  Only .env.example and .env.test are committed.");
  console.log("  ✓  .env.example and .env.test contain only approved keys.");
  console.log("  ✓  No secret-shaped keys or credential-like values in committed env files.");
  console.log("  ✓  No source appears to log the full environment.");
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
}
