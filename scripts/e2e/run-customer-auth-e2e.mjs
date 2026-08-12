#!/usr/bin/env node
/**
 * Customer-auth E2E runner (IMP-009).
 *
 * Resolves `CUSTOMER_OTP_LOCAL_FIXED_CODE` without committing it:
 *   1. Use the existing process env value when already set (exactly 6 digits).
 *   2. Else load it from the git-ignored `.env.customer-auth.docker.local`
 *      (produced by `npm run docker:env:init`).
 *   3. Else, for the local (non-Docker) harness only, generate an ephemeral
 *      six-digit code for this process tree — never printed, never written.
 *
 * Then runs Playwright with `playwright.customer-auth.config.ts`. The same
 * env is inherited by the config's `webServer` child, so both sides agree
 * on the code without exposing it over HTTP.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const IGNORED_ENV_FILE = path.join(projectRoot, ".env.customer-auth.docker.local");

function readIgnoredFixedCode() {
  if (!existsSync(IGNORED_ENV_FILE)) return null;
  const content = readFileSync(IGNORED_ENV_FILE, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "CUSTOMER_OTP_LOCAL_FIXED_CODE") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return null;
}

function resolveFixedCode() {
  const fromEnv = process.env.CUSTOMER_OTP_LOCAL_FIXED_CODE;
  if (fromEnv && /^\d{6}$/.test(fromEnv)) return fromEnv;

  const fromFile = readIgnoredFixedCode();
  if (fromFile && /^\d{6}$/.test(fromFile)) return fromFile;

  if (process.env.PLAYWRIGHT_TARGET === "docker") {
    console.error(
      "customer-auth E2E (docker): CUSTOMER_OTP_LOCAL_FIXED_CODE must be set or present in " +
        ".env.customer-auth.docker.local (run npm run docker:env:init).",
    );
    process.exit(1);
  }

  // Ephemeral local-harness code: never printed, never written to disk.
  return String(randomInt(100000, 1000000));
}

const fixedCode = resolveFixedCode();
const env = {
  ...process.env,
  CUSTOMER_OTP_LOCAL_FIXED_CODE: fixedCode,
};

const result = spawnSync(
  "npx",
  ["playwright", "test", "--config=playwright.customer-auth.config.ts"],
  {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  },
);

process.exit(result.status === null ? 1 : result.status);
