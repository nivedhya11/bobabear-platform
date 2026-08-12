#!/usr/bin/env node
/**
 * Workforce-auth E2E runner (IMP-010).
 *
 * Resolves disposable E2E credentials (never committed):
 *   1. Use existing process env when already set.
 *   2. Else generate ephemeral email + passwords for this process tree —
 *      never printed, never written.
 *
 * Then runs Playwright with `playwright.workforce-auth.config.ts`. The same
 * env is inherited by the config's `webServer` child so both sides agree on
 * the provisioned user without exposing credentials over HTTP.
 */
import { spawnSync } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function resolveCredentials() {
  const email =
    process.env.WORKFORCE_E2E_EMAIL && process.env.WORKFORCE_E2E_EMAIL.includes("@")
      ? process.env.WORKFORCE_E2E_EMAIL
      : `ops-e2e-${randomInt(1000, 9999)}@example.test`;

  const temporaryPassword =
    process.env.WORKFORCE_E2E_TEMP_PASSWORD && process.env.WORKFORCE_E2E_TEMP_PASSWORD.length >= 15
      ? process.env.WORKFORCE_E2E_TEMP_PASSWORD
      : `temp-${randomBytes(12).toString("hex")}`;

  const permanentPassword =
    process.env.WORKFORCE_E2E_PERMANENT_PASSWORD &&
    process.env.WORKFORCE_E2E_PERMANENT_PASSWORD.length >= 15
      ? process.env.WORKFORCE_E2E_PERMANENT_PASSWORD
      : `perm-${randomBytes(12).toString("hex")}`;

  if (temporaryPassword === permanentPassword) {
    throw new Error("WORKFORCE_E2E temporary and permanent passwords must differ.");
  }

  return { email, temporaryPassword, permanentPassword };
}

const credentials = resolveCredentials();
const env = {
  ...process.env,
  WORKFORCE_E2E_EMAIL: credentials.email,
  WORKFORCE_E2E_TEMP_PASSWORD: credentials.temporaryPassword,
  WORKFORCE_E2E_PERMANENT_PASSWORD: credentials.permanentPassword,
};

const result = spawnSync(
  "npx",
  ["playwright", "test", "--config=playwright.workforce-auth.config.ts"],
  {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  },
);

process.exit(result.status === null ? 1 : result.status);
