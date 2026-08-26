#!/usr/bin/env node
// Docker runtime environment initializer (IMP-005A, customer-auth keys
// IMP-009, workforce-auth keys IMP-010).
//
// Generates .env.runtime.docker.local and .env.migration.docker.local —
// the least-privilege, git-ignored env files passed to the `db-check`,
// `db-check-migration`, and `migrate` Compose services via `env_file`.
// Neither file is used by the `app` (Nginx) service, which never receives
// database credentials at all.
//
// Both files are derived deterministically from the already-generated
// .env.docker.local (IMP-004) — this script never generates a new secret
// and never rotates a password; re-running it with an unchanged
// .env.docker.local produces byte-identical output.
//
// Also generates .env.customer-auth.docker.local and
// .env.workforce-auth.docker.local — each auth service's *own* secrets
// (never derived from .env.docker.local, since they are not PostgreSQL
// credentials). Generated once and reused on every later run (never
// silently rotated), the same idempotency the sibling
// `scripts/database/init-local-env.mjs` already applies to
// .env.docker.local itself. Each auth service also needs
// .env.runtime.docker.local (for BOBA_BEAR_DATABASE_URL) — see the
// Compose services' two-file `env_file` lists. Customer and workforce
// secrets are always distinct and never cross-contaminated into the other
// realm's env file.
//
// Usage: node scripts/docker/init-local-env.mjs
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { extractValues, generatePassword, parseEnvFile, upsertEnvValues } from "../database/lib/env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

const DOCKER_BOOTSTRAP_ENV_FILE = path.join(projectRoot, ".env.docker.local");
const RUNTIME_ENV_FILE = path.join(projectRoot, ".env.runtime.docker.local");
const MIGRATION_ENV_FILE = path.join(projectRoot, ".env.migration.docker.local");
const CUSTOMER_AUTH_ENV_FILE = path.join(projectRoot, ".env.customer-auth.docker.local");
const WORKFORCE_AUTH_ENV_FILE = path.join(projectRoot, ".env.workforce-auth.docker.local");
const CUSTOMER_COMMERCE_ENV_FILE = path.join(projectRoot, ".env.customer-commerce.docker.local");
const OPERATIONS_ENV_FILE = path.join(projectRoot, ".env.operations.docker.local");

const DATABASE_HOST = "postgres";
const DATABASE_PORT = "5432";
const DATABASE_NAME = "boba_bear_local";
const DEFAULT_PUBLIC_ORIGIN = "http://localhost:8080";

const REQUIRED_BOOTSTRAP_KEYS = ["POSTGRES_APP_PASSWORD", "POSTGRES_MIGRATOR_PASSWORD"];

// Mirrors `MIN_AUTH_SECRET_LENGTH` (src/server/auth/shared/constants.ts) —
// duplicated here rather than imported so this plain Node script never
// depends on the TypeScript application source.
const MIN_AUTH_SECRET_LENGTH = 32;
const GENERATED_AUTH_SECRET_LENGTH = 48;

const REQUIRED_CUSTOMER_AUTH_KEYS = [
  "CUSTOMER_AUTH_SECRET",
  "CUSTOMER_AUTH_BASE_URL",
  "CUSTOMER_AUTH_PII_HASH_SECRET",
  "CUSTOMER_OTP_PROVIDER",
  "CUSTOMER_OTP_LOCAL_FIXED_CODE",
  "CUSTOMER_AUTH_TRUST_PROXY_HOPS",
  "CUSTOMER_AUTH_SERVICE_HOST",
  "CUSTOMER_AUTH_SERVICE_PORT",
];

const REQUIRED_WORKFORCE_AUTH_KEYS = [
  "WORKFORCE_AUTH_SECRET",
  "WORKFORCE_AUTH_BASE_URL",
  "WORKFORCE_AUTH_PII_HASH_SECRET",
  "WORKFORCE_AUTH_TRUST_PROXY_HOPS",
  "WORKFORCE_AUTH_SERVICE_HOST",
  "WORKFORCE_AUTH_SERVICE_PORT",
];

function assertRepositoryRoot() {
  const composePath = path.join(projectRoot, "compose.yaml");
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(composePath) || !existsSync(packageJsonPath)) {
    console.error(
      "docker/init-local-env: expected to find compose.yaml and package.json at the " +
        `repository root (resolved to "${projectRoot}"). Refusing to run.`,
    );
    return false;
  }
  return true;
}

/**
 * Parse and validate already-read .env.docker.local (IMP-004) content,
 * returning the two runtime passwords this script needs — never the full
 * file contents. Pure and file-system-free so it can be unit-tested
 * directly with in-memory fixtures instead of a real repository checkout.
 */
export function parseBootstrapPasswords(content) {
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      ok: false,
      reason:
        `.env.docker.local declares key "${extracted.key}" more than once with conflicting ` +
        "values. Fix or regenerate it, then re-run.",
    };
  }

  const missing = REQUIRED_BOOTSTRAP_KEYS.filter(
    (key) => !(key in extracted.values) || extracted.values[key].length === 0,
  );
  if (missing.length > 0) {
    return { ok: false, reason: `.env.docker.local is missing required key(s): ${missing.join(", ")}.` };
  }

  return {
    ok: true,
    appPassword: extracted.values.POSTGRES_APP_PASSWORD,
    migratorPassword: extracted.values.POSTGRES_MIGRATOR_PASSWORD,
  };
}

/** Read and validate .env.docker.local (IMP-004) from disk. Thin
 * file-system wrapper around {@link parseBootstrapPasswords}. */
function readBootstrapPasswords() {
  if (!existsSync(DOCKER_BOOTSTRAP_ENV_FILE)) {
    console.error(
      "docker/init-local-env: .env.docker.local does not exist. Run " +
        '"npm run db:env:init" first to generate local PostgreSQL bootstrap credentials.',
    );
    return null;
  }

  const content = readFileSync(DOCKER_BOOTSTRAP_ENV_FILE, "utf8");
  const result = parseBootstrapPasswords(content);
  if (!result.ok) {
    console.error(`docker/init-local-env: ${result.reason}`);
    return null;
  }
  return { appPassword: result.appPassword, migratorPassword: result.migratorPassword };
}

/** Build a `postgresql://` URL against the in-network Compose hostname,
 * never `127.0.0.1:5433` (the host-published port) and never
 * `host.docker.internal`. Percent-encodes the password defensively, even
 * though generated local passwords are already URL-safe. */
export function buildContainerDatabaseUrl(role, password) {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${role}:${encodedPassword}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;
}

function setRestrictivePermissions(filePath) {
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Not supported on this platform/filesystem — non-fatal, still git-ignored.
  }
}

export function buildRuntimeEnvContent(appPassword, { publicOrigin = DEFAULT_PUBLIC_ORIGIN } = {}) {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-005A). Least-privilege\n" +
    "# application-role environment for the `db-check` tooling container only\n" +
    "# — never the `app` (Nginx) service, which receives no database\n" +
    "# credentials. Never commit this file (it is git-ignored).\n";
  return upsertEnvValues(header, {
    NODE_ENV: "production",
    BOBA_BEAR_ENV: "local",
    BOBA_BEAR_PUBLIC_ORIGIN: publicOrigin,
    BOBA_BEAR_LOG_LEVEL: "debug",
    BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
    BOBA_BEAR_DATABASE_URL: buildContainerDatabaseUrl("boba_bear_app", appPassword),
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
    PORT: "8080",
  });
}

export function buildMigrationEnvContent(migratorPassword, { publicOrigin = DEFAULT_PUBLIC_ORIGIN } = {}) {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-005A). Least-privilege\n" +
    "# migration-role environment for the `migrate` and `db-check-migration`\n" +
    "# tooling containers only. Never commit this file (it is git-ignored).\n";
  return upsertEnvValues(header, {
    NODE_ENV: "production",
    BOBA_BEAR_ENV: "local",
    BOBA_BEAR_PUBLIC_ORIGIN: publicOrigin,
    BOBA_BEAR_LOG_LEVEL: "debug",
    BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
    BOBA_BEAR_DATABASE_MIGRATION_URL: buildContainerDatabaseUrl("boba_bear_migrator", migratorPassword),
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
  });
}

/** Six crypto-random decimal digits — `generatePassword`'s alphanumeric
 * alphabet isn't digits-only, so this needs its own generator. */
function generateNumericCode(length) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += (bytes[i] % 10).toString();
  }
  return out;
}

/**
 * Validate an extracted `.env.customer-auth.docker.local` key/value map.
 * Mirrors (a subset of) the real runtime validation in
 * `src/server/auth/shared/config.ts` / `src/server/customer-auth/pii.ts`
 * closely enough to catch a stale/hand-edited file before it reaches a
 * container — not a full re-implementation of that validation.
 *
 * @param {Record<string, string>} values
 */
export function validateCustomerAuthEnvValues(values) {
  const missing = REQUIRED_CUSTOMER_AUTH_KEYS.filter(
    (key) => !(key in values) || values[key].length === 0,
  );
  if (missing.length > 0) {
    return { ok: false, reason: `missing or empty required key(s): ${missing.join(", ")}.` };
  }
  if (values.CUSTOMER_AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    return { ok: false, reason: `CUSTOMER_AUTH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters.` };
  }
  if (values.CUSTOMER_AUTH_PII_HASH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    return { ok: false, reason: `CUSTOMER_AUTH_PII_HASH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters.` };
  }
  if (values.CUSTOMER_AUTH_SECRET === values.CUSTOMER_AUTH_PII_HASH_SECRET) {
    return { ok: false, reason: "CUSTOMER_AUTH_SECRET and CUSTOMER_AUTH_PII_HASH_SECRET must differ." };
  }
  if (!/^\d{6}$/.test(values.CUSTOMER_OTP_LOCAL_FIXED_CODE)) {
    return { ok: false, reason: "CUSTOMER_OTP_LOCAL_FIXED_CODE must be exactly six decimal digits." };
  }
  return { ok: true };
}

/** Read and validate an existing `.env.customer-auth.docker.local`, if
 * present — same three-state shape as {@link readExistingDockerEnv} in
 * `scripts/database/init-local-env.mjs`. */
function readExistingCustomerAuthEnv() {
  if (!existsSync(CUSTOMER_AUTH_ENV_FILE)) {
    return { state: "absent" };
  }
  const content = readFileSync(CUSTOMER_AUTH_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      state: "malformed",
      reason: `key "${extracted.key}" is declared more than once with conflicting values.`,
    };
  }
  const validity = validateCustomerAuthEnvValues(extracted.values);
  if (!validity.ok) {
    return { state: "malformed", reason: validity.reason };
  }
  return { state: "complete" };
}

export function buildCustomerAuthEnvContent({ publicOrigin = DEFAULT_PUBLIC_ORIGIN } = {}) {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-009). The customer-auth\n" +
    "# service's own secrets — never derived from .env.docker.local, never\n" +
    "# shared with any WORKFORCE_AUTH_* variable, never committed (this file\n" +
    "# is git-ignored). Generated once and reused on later runs, not rotated.\n";
  return upsertEnvValues(header, {
    CUSTOMER_AUTH_SECRET: generatePassword(GENERATED_AUTH_SECRET_LENGTH),
    CUSTOMER_AUTH_BASE_URL: publicOrigin,
    CUSTOMER_AUTH_PII_HASH_SECRET: generatePassword(GENERATED_AUTH_SECRET_LENGTH),
    CUSTOMER_OTP_PROVIDER: "local",
    CUSTOMER_OTP_LOCAL_FIXED_CODE: generateNumericCode(6),
    CUSTOMER_AUTH_TRUST_PROXY_HOPS: "1",
    CUSTOMER_AUTH_SERVICE_HOST: "0.0.0.0",
    CUSTOMER_AUTH_SERVICE_PORT: "8081",
  });
}

/**
 * Validate an extracted `.env.workforce-auth.docker.local` key/value map.
 * Mirrors (a subset of) the real runtime validation in
 * `src/server/auth/shared/config.ts` / `src/server/workforce-auth/pii.ts`
 * closely enough to catch a stale/hand-edited file before it reaches a
 * container — not a full re-implementation of that validation.
 *
 * @param {Record<string, string>} values
 */
export function validateWorkforceAuthEnvValues(values) {
  const missing = REQUIRED_WORKFORCE_AUTH_KEYS.filter(
    (key) => !(key in values) || values[key].length === 0,
  );
  if (missing.length > 0) {
    return { ok: false, reason: `missing or empty required key(s): ${missing.join(", ")}.` };
  }
  if (values.WORKFORCE_AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    return { ok: false, reason: `WORKFORCE_AUTH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters.` };
  }
  if (values.WORKFORCE_AUTH_PII_HASH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    return { ok: false, reason: `WORKFORCE_AUTH_PII_HASH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters.` };
  }
  if (values.WORKFORCE_AUTH_SECRET === values.WORKFORCE_AUTH_PII_HASH_SECRET) {
    return { ok: false, reason: "WORKFORCE_AUTH_SECRET and WORKFORCE_AUTH_PII_HASH_SECRET must differ." };
  }
  if (Object.keys(values).some((key) => key.startsWith("CUSTOMER_AUTH_") || key.startsWith("CUSTOMER_OTP_"))) {
    return { ok: false, reason: "workforce-auth env file must not contain CUSTOMER_AUTH_* or CUSTOMER_OTP_* keys." };
  }
  if (Object.keys(values).some((key) => key.startsWith("BOBA_BEAR_DATABASE_MIGRATION") || key.startsWith("POSTGRES_"))) {
    return { ok: false, reason: "workforce-auth env file must not contain migration or bootstrap credentials." };
  }
  return { ok: true };
}

/** Read and validate an existing `.env.workforce-auth.docker.local`, if
 * present — same three-state shape as {@link readExistingCustomerAuthEnv}. */
function readExistingWorkforceAuthEnv() {
  if (!existsSync(WORKFORCE_AUTH_ENV_FILE)) {
    return { state: "absent" };
  }
  const content = readFileSync(WORKFORCE_AUTH_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      state: "malformed",
      reason: `key "${extracted.key}" is declared more than once with conflicting values.`,
    };
  }
  const validity = validateWorkforceAuthEnvValues(extracted.values);
  if (!validity.ok) {
    return { state: "malformed", reason: validity.reason };
  }
  return { state: "complete", values: extracted.values };
}

export function buildWorkforceAuthEnvContent({ publicOrigin = DEFAULT_PUBLIC_ORIGIN } = {}) {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-010). The workforce-auth\n" +
    "# service's own secrets — never derived from .env.docker.local, never\n" +
    "# shared with any CUSTOMER_AUTH_* variable, never committed (this file\n" +
    "# is git-ignored). Generated once and reused on later runs, not rotated.\n";
  return upsertEnvValues(header, {
    WORKFORCE_AUTH_SECRET: generatePassword(GENERATED_AUTH_SECRET_LENGTH),
    WORKFORCE_AUTH_BASE_URL: publicOrigin,
    WORKFORCE_AUTH_PII_HASH_SECRET: generatePassword(GENERATED_AUTH_SECRET_LENGTH),
    WORKFORCE_AUTH_TRUST_PROXY_HOPS: "1",
    WORKFORCE_AUTH_SERVICE_HOST: "0.0.0.0",
    WORKFORCE_AUTH_SERVICE_PORT: "8082",
  });
}

/** Idempotently ensure `.env.workforce-auth.docker.local` exists with
 * complete, valid-shaped values — generating it once, never rotating an
 * already-valid file's secrets on a later run. When generating fresh
 * secrets, optionally avoids colliding with already-known customer-auth
 * secret values. Returns `false` (after logging) only when an existing
 * file is present but malformed. */
function ensureWorkforceAuthEnvFile(publicOrigin, customerAuthValues) {
  const existing = readExistingWorkforceAuthEnv();

  if (existing.state === "malformed") {
    console.error(
      `docker/init-local-env: .env.workforce-auth.docker.local exists but is ${existing.reason}\n` +
        "Refusing to overwrite ambiguous content. Fix or delete the file manually, then re-run.",
    );
    return false;
  }

  if (existing.state === "complete") {
    if (customerAuthValues) {
      const collisions = [];
      if (
        existing.values.WORKFORCE_AUTH_SECRET === customerAuthValues.CUSTOMER_AUTH_SECRET ||
        existing.values.WORKFORCE_AUTH_SECRET === customerAuthValues.CUSTOMER_AUTH_PII_HASH_SECRET
      ) {
        collisions.push("WORKFORCE_AUTH_SECRET");
      }
      if (
        existing.values.WORKFORCE_AUTH_PII_HASH_SECRET === customerAuthValues.CUSTOMER_AUTH_SECRET ||
        existing.values.WORKFORCE_AUTH_PII_HASH_SECRET === customerAuthValues.CUSTOMER_AUTH_PII_HASH_SECRET
      ) {
        collisions.push("WORKFORCE_AUTH_PII_HASH_SECRET");
      }
      if (collisions.length > 0) {
        console.error(
          "docker/init-local-env: .env.workforce-auth.docker.local reuses a CUSTOMER_AUTH_* secret " +
            `(${collisions.join(", ")}). Refusing to proceed; fix or delete the file manually.`,
        );
        return false;
      }
    }
    console.log(
      "docker/init-local-env: .env.workforce-auth.docker.local already has complete generated " +
        "secrets; reusing them (not rotated).",
    );
    return true;
  }

  let content = buildWorkforceAuthEnvContent({ publicOrigin });
  // Extremely unlikely collision with an already-generated customer secret —
  // regenerate once if it happens so the two realm files stay distinct.
  if (customerAuthValues) {
    const values = Object.fromEntries(
      content
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
    const customerSecrets = new Set([
      customerAuthValues.CUSTOMER_AUTH_SECRET,
      customerAuthValues.CUSTOMER_AUTH_PII_HASH_SECRET,
    ]);
    if (
      customerSecrets.has(values.WORKFORCE_AUTH_SECRET) ||
      customerSecrets.has(values.WORKFORCE_AUTH_PII_HASH_SECRET)
    ) {
      content = buildWorkforceAuthEnvContent({ publicOrigin });
    }
  }

  writeFileSync(WORKFORCE_AUTH_ENV_FILE, content, { encoding: "utf8" });
  setRestrictivePermissions(WORKFORCE_AUTH_ENV_FILE);
  console.log("docker/init-local-env: generated .env.workforce-auth.docker.local with new local secrets.");
  return true;
}

/** Read the customer-auth env file's secret values when present and valid —
 * used only to keep workforce secrets distinct. Never logs values. */
function readCustomerAuthValuesIfComplete() {
  const existing = readExistingCustomerAuthEnv();
  if (existing.state !== "complete") return null;
  const content = readFileSync(CUSTOMER_AUTH_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) return null;
  return extracted.values;
}


/** Idempotently ensure `.env.customer-auth.docker.local` exists with
 * complete, valid-shaped values — generating it once, never rotating an
 * already-valid file's secrets on a later run. Returns `false` (after
 * logging) only when an existing file is present but malformed. */
function ensureCustomerAuthEnvFile(publicOrigin) {
  const existing = readExistingCustomerAuthEnv();

  if (existing.state === "malformed") {
    console.error(
      `docker/init-local-env: .env.customer-auth.docker.local exists but is ${existing.reason}\n` +
        "Refusing to overwrite ambiguous content. Fix or delete the file manually, then re-run.",
    );
    return false;
  }

  if (existing.state === "complete") {
    console.log(
      "docker/init-local-env: .env.customer-auth.docker.local already has complete generated " +
        "secrets; reusing them (not rotated).",
    );
    return true;
  }

  writeFileSync(CUSTOMER_AUTH_ENV_FILE, buildCustomerAuthEnvContent({ publicOrigin }), {
    encoding: "utf8",
  });
  setRestrictivePermissions(CUSTOMER_AUTH_ENV_FILE);
  console.log("docker/init-local-env: generated .env.customer-auth.docker.local with new local secrets.");
  return true;
}

export function buildCustomerCommerceEnvContent() {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-024). Customer-commerce\n" +
    "# listen / trust-proxy config only — CUSTOMER_AUTH_* secrets live in\n" +
    "# .env.customer-auth.docker.local. Never commit this file (git-ignored).\n";
  return upsertEnvValues(header, {
    CUSTOMER_COMMERCE_SERVICE_HOST: "0.0.0.0",
    CUSTOMER_COMMERCE_SERVICE_PORT: "8083",
    CUSTOMER_COMMERCE_TRUST_PROXY_HOPS: "1",
  });
}

const REQUIRED_CUSTOMER_COMMERCE_KEYS = [
  "CUSTOMER_COMMERCE_SERVICE_HOST",
  "CUSTOMER_COMMERCE_SERVICE_PORT",
  "CUSTOMER_COMMERCE_TRUST_PROXY_HOPS",
];

export function validateCustomerCommerceEnvValues(values) {
  const missing = REQUIRED_CUSTOMER_COMMERCE_KEYS.filter(
    (key) => !(key in values) || values[key].length === 0,
  );
  if (missing.length > 0) {
    return { ok: false, reason: `missing or empty required key(s): ${missing.join(", ")}.` };
  }
  if (!/^\d+$/.test(values.CUSTOMER_COMMERCE_SERVICE_PORT)) {
    return { ok: false, reason: "CUSTOMER_COMMERCE_SERVICE_PORT must be an integer." };
  }
  if (!/^\d+$/.test(values.CUSTOMER_COMMERCE_TRUST_PROXY_HOPS)) {
    return { ok: false, reason: "CUSTOMER_COMMERCE_TRUST_PROXY_HOPS must be an integer." };
  }
  return { ok: true };
}

function readExistingCustomerCommerceEnv() {
  if (!existsSync(CUSTOMER_COMMERCE_ENV_FILE)) {
    return { state: "absent" };
  }
  const content = readFileSync(CUSTOMER_COMMERCE_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      state: "malformed",
      reason: `key "${extracted.key}" is declared more than once with conflicting values.`,
    };
  }
  const validity = validateCustomerCommerceEnvValues(extracted.values);
  if (!validity.ok) {
    return { state: "malformed", reason: validity.reason };
  }
  return { state: "complete" };
}

function ensureCustomerCommerceEnvFile() {
  const existing = readExistingCustomerCommerceEnv();

  if (existing.state === "malformed") {
    console.error(
      `docker/init-local-env: .env.customer-commerce.docker.local exists but is ${existing.reason}\n` +
        "Refusing to overwrite ambiguous content. Fix or delete the file manually, then re-run.",
    );
    return false;
  }

  if (existing.state === "complete") {
    console.log(
      "docker/init-local-env: .env.customer-commerce.docker.local already has complete " +
        "listen config; reusing it (not rotated).",
    );
    return true;
  }

  writeFileSync(CUSTOMER_COMMERCE_ENV_FILE, buildCustomerCommerceEnvContent(), {
    encoding: "utf8",
  });
  setRestrictivePermissions(CUSTOMER_COMMERCE_ENV_FILE);
  console.log(
    "docker/init-local-env: generated .env.customer-commerce.docker.local with listen config.",
  );
  return true;
}

export function buildOperationsEnvContent() {
  const header =
    "# Generated by `npm run docker:env:init` (IMP-029). Operations listen\n" +
    "# config only — WORKFORCE_AUTH_* secrets and database credentials live in\n" +
    "# .env.workforce-auth.docker.local / .env.runtime.docker.local. Never\n" +
    "# commit this file (git-ignored).\n";
  return upsertEnvValues(header, {
    OPERATIONS_SERVICE_HOST: "0.0.0.0",
    OPERATIONS_SERVICE_PORT: "8084",
  });
}

const REQUIRED_OPERATIONS_KEYS = [
  "OPERATIONS_SERVICE_HOST",
  "OPERATIONS_SERVICE_PORT",
];

export function validateOperationsEnvValues(values) {
  const missing = REQUIRED_OPERATIONS_KEYS.filter(
    (key) => !(key in values) || values[key].length === 0,
  );
  if (missing.length > 0) {
    return { ok: false, reason: `missing or empty required key(s): ${missing.join(", ")}.` };
  }
  if (!/^\d+$/.test(values.OPERATIONS_SERVICE_PORT)) {
    return { ok: false, reason: "OPERATIONS_SERVICE_PORT must be an integer." };
  }
  if (Object.keys(values).some((key) => key.startsWith("WORKFORCE_AUTH_") || key.startsWith("BOBA_BEAR_DATABASE") || key.startsWith("POSTGRES_"))) {
    return {
      ok: false,
      reason: "operations env file must not contain workforce-auth secrets or database credentials.",
    };
  }
  return { ok: true };
}

function readExistingOperationsEnv() {
  if (!existsSync(OPERATIONS_ENV_FILE)) {
    return { state: "absent" };
  }
  const content = readFileSync(OPERATIONS_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      state: "malformed",
      reason: `key "${extracted.key}" is declared more than once with conflicting values.`,
    };
  }
  const validity = validateOperationsEnvValues(extracted.values);
  if (!validity.ok) {
    return { state: "malformed", reason: validity.reason };
  }
  return { state: "complete" };
}

function ensureOperationsEnvFile() {
  const existing = readExistingOperationsEnv();

  if (existing.state === "malformed") {
    console.error(
      `docker/init-local-env: .env.operations.docker.local exists but is ${existing.reason}\n` +
        "Refusing to overwrite ambiguous content. Fix or delete the file manually, then re-run.",
    );
    return false;
  }

  if (existing.state === "complete") {
    console.log(
      "docker/init-local-env: .env.operations.docker.local already has complete " +
        "listen config; reusing it (not rotated).",
    );
    return true;
  }

  writeFileSync(OPERATIONS_ENV_FILE, buildOperationsEnvContent(), {
    encoding: "utf8",
  });
  setRestrictivePermissions(OPERATIONS_ENV_FILE);
  console.log(
    "docker/init-local-env: generated .env.operations.docker.local with listen config.",
  );
  return true;
}

function main() {
  if (!assertRepositoryRoot()) {
    process.exitCode = 1;
    return;
  }

  const passwords = readBootstrapPasswords();
  if (passwords === null) {
    process.exitCode = 1;
    return;
  }

  const publicOrigin = process.env.BOBA_BEAR_DOCKER_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN;

  writeFileSync(RUNTIME_ENV_FILE, buildRuntimeEnvContent(passwords.appPassword, { publicOrigin }), {
    encoding: "utf8",
  });
  setRestrictivePermissions(RUNTIME_ENV_FILE);

  writeFileSync(
    MIGRATION_ENV_FILE,
    buildMigrationEnvContent(passwords.migratorPassword, { publicOrigin }),
    { encoding: "utf8" },
  );
  setRestrictivePermissions(MIGRATION_ENV_FILE);

  if (!ensureCustomerAuthEnvFile(publicOrigin)) {
    process.exitCode = 1;
    return;
  }

  const customerAuthValues = readCustomerAuthValuesIfComplete();
  if (!ensureWorkforceAuthEnvFile(publicOrigin, customerAuthValues)) {
    process.exitCode = 1;
    return;
  }

  if (!ensureCustomerCommerceEnvFile()) {
    process.exitCode = 1;
    return;
  }

  if (!ensureOperationsEnvFile()) {
    process.exitCode = 1;
    return;
  }

  console.log(
    "docker/init-local-env: .env.runtime.docker.local, .env.migration.docker.local, " +
      ".env.customer-auth.docker.local, .env.workforce-auth.docker.local, " +
      ".env.customer-commerce.docker.local, and .env.operations.docker.local are up to date " +
      "(postgres:5432, database=boba_bear_local). No secret was printed.",
  );
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
