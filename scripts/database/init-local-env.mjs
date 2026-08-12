#!/usr/bin/env node
// Local database environment initializer (IMP-004).
//
// Creates .env.docker.local (generated local Postgres bootstrap
// credentials, git-ignored) if it does not already exist, then
// synchronizes the derived BOBA_BEAR_DATABASE_* keys into .env.local
// (preserving every unrelated line already there). Never prints a
// generated password. Uses only Node.js built-ins.
//
// Usage: node scripts/database/init-local-env.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  extractValues,
  generatePassword,
  parseEnvFile,
  upsertEnvValues,
} from "./lib/env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

const DOCKER_ENV_FILE = path.join(projectRoot, ".env.docker.local");
const APP_ENV_FILE = path.join(projectRoot, ".env.local");

const REQUIRED_DOCKER_KEYS = [
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "POSTGRES_MIGRATOR_PASSWORD",
  "POSTGRES_APP_PASSWORD",
  "POSTGRES_HOST_PORT",
];

const DEFAULT_HOST_PORT = "5433";
const DATABASE_NAME = "boba_bear_local";

function assertRepositoryRoot() {
  const composePath = path.join(projectRoot, "compose.yaml");
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(composePath) || !existsSync(packageJsonPath)) {
    console.error(
      "init-local-env: expected to find compose.yaml and package.json at the " +
        `repository root (resolved to "${projectRoot}"). Refusing to run.`,
    );
    process.exitCode = 1;
    return false;
  }
  return true;
}

/**
 * Read and validate an existing .env.docker.local, if present.
 * Returns one of:
 *  - { state: "absent" }
 *  - { state: "complete", values }         -- every required key present, reuse as-is
 *  - { state: "malformed", reason }        -- ambiguous/incomplete, fail safely
 */
function readExistingDockerEnv() {
  if (!existsSync(DOCKER_ENV_FILE)) {
    return { state: "absent" };
  }
  const content = readFileSync(DOCKER_ENV_FILE, "utf8");
  const parsed = parseEnvFile(content);
  const extracted = extractValues(parsed);
  if (!extracted.ok) {
    return {
      state: "malformed",
      reason: `key "${extracted.key}" is declared more than once with conflicting values.`,
    };
  }

  const missing = REQUIRED_DOCKER_KEYS.filter(
    (key) => !(key in extracted.values) || extracted.values[key].length === 0,
  );
  if (missing.length > 0) {
    return {
      state: "malformed",
      reason: `missing or empty required key(s): ${missing.join(", ")}.`,
    };
  }

  return { state: "complete", values: extracted.values };
}

/** Best-effort, advisory-only check: warn (never fail) if a local Postgres
 * data volume for this Compose project already exists while we are about to
 * generate brand-new credentials — the volume's already-initialized roles
 * would not match a freshly generated .env.docker.local. Silently does
 * nothing if Docker is unavailable; this is a warning, not a hard gate. */
function warnIfVolumeExistsWithoutCredentials() {
  try {
    const output = execFileSync(
      "docker",
      ["volume", "ls", "--format", "{{.Name}}", "--filter", "name=boba-bear_postgres-data"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (output.trim().length > 0) {
      console.warn(
        "init-local-env: a local 'boba-bear_postgres-data' Docker volume already exists, " +
          "but no valid .env.docker.local was found. The volume's roles were initialized " +
          "with different (now-lost) credentials; the ones generated now will not match " +
          "until you run `npm run db:reset -- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE`.",
      );
    }
  } catch {
    // Docker not installed/running, or the command failed — advisory only.
  }
}

function setRestrictivePermissions(filePath) {
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Not supported on this platform/filesystem (e.g. some Windows mounts).
    // Non-fatal — the file is still git-ignored.
  }
}

function ensureDockerEnvFile() {
  const existing = readExistingDockerEnv();

  if (existing.state === "malformed") {
    console.error(
      `init-local-env: .env.docker.local exists but is ${existing.reason}\n` +
        "Refusing to overwrite ambiguous content. Fix or delete the file manually, then re-run.",
    );
    return null;
  }

  if (existing.state === "complete") {
    console.log("init-local-env: .env.docker.local already has complete generated credentials; reusing them (not rotated).");
    return existing.values;
  }

  warnIfVolumeExistsWithoutCredentials();

  const values = {
    POSTGRES_USER: "boba_bear_admin",
    POSTGRES_PASSWORD: generatePassword(),
    POSTGRES_DB: "postgres",
    POSTGRES_MIGRATOR_PASSWORD: generatePassword(),
    POSTGRES_APP_PASSWORD: generatePassword(),
    POSTGRES_HOST_PORT: DEFAULT_HOST_PORT,
  };

  const header =
    "# Generated by `npm run db:env:init` (IMP-004). Local-only PostgreSQL\n" +
    "# bootstrap credentials — never commit this file (it is git-ignored).\n" +
    "# See .env.docker.example for the documented key catalogue.\n";

  writeFileSync(DOCKER_ENV_FILE, upsertEnvValues(header, values), { encoding: "utf8" });
  setRestrictivePermissions(DOCKER_ENV_FILE);
  console.log("init-local-env: generated .env.docker.local with new local credentials.");
  return values;
}

function syncAppEnvFile(dockerValues) {
  const port = dockerValues.POSTGRES_HOST_PORT || DEFAULT_HOST_PORT;

  const databaseUrl = `postgresql://boba_bear_app:${dockerValues.POSTGRES_APP_PASSWORD}@127.0.0.1:${port}/${DATABASE_NAME}`;
  const databaseMigrationUrl = `postgresql://boba_bear_migrator:${dockerValues.POSTGRES_MIGRATOR_PASSWORD}@127.0.0.1:${port}/${DATABASE_NAME}`;

  const existingContent = existsSync(APP_ENV_FILE)
    ? readFileSync(APP_ENV_FILE, "utf8")
    : "";

  const updated = upsertEnvValues(existingContent, {
    BOBA_BEAR_DATABASE_URL: databaseUrl,
    BOBA_BEAR_DATABASE_MIGRATION_URL: databaseMigrationUrl,
    BOBA_BEAR_DATABASE_SSL_MODE: "disable",
  });

  writeFileSync(APP_ENV_FILE, updated, { encoding: "utf8" });
  setRestrictivePermissions(APP_ENV_FILE);
}

function main() {
  if (!assertRepositoryRoot()) return;

  const dockerValues = ensureDockerEnvFile();
  if (dockerValues === null) {
    process.exitCode = 1;
    return;
  }

  syncAppEnvFile(dockerValues);

  console.log(
    "init-local-env: .env.local database keys are synchronized (BOBA_BEAR_DATABASE_URL, " +
      "BOBA_BEAR_DATABASE_MIGRATION_URL, BOBA_BEAR_DATABASE_SSL_MODE). No secret was printed.",
  );
  process.exitCode = 0;
}

main();
