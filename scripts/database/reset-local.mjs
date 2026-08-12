#!/usr/bin/env node
// Destructive local-database reset (IMP-004).
//
// Requires an exact confirmation token so it can never be triggered by
// accident:
//
//   npm run db:reset -- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE
//
// Without the exact token, this script exits non-zero and does not touch
// Docker at all (no `down`, no volume removal). It also refuses to run
// against anything but a local BOBA_BEAR_ENV, and only ever targets the
// "boba-bear" Compose project's "postgres" service/volume.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { extractValues, parseEnvFile } from "./lib/env-file.mjs";

export const REQUIRED_CONFIRMATION = "RESET_BOBA_BEAR_LOCAL_DATABASE";
export const COMPOSE_PROJECT_NAME = "boba-bear";
export const COMPOSE_SERVICE = "postgres";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

export const REQUIRED_COMMAND = "npm run db:reset -- --confirm=RESET_BOBA_BEAR_LOCAL_DATABASE";

/** Parse `--confirm=<token>` (or `--confirm <token>`) from argv. Pure. */
export function parseConfirmation(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--confirm=")) {
      return arg.slice("--confirm=".length);
    }
    if (arg === "--confirm") {
      return argv[i + 1] ?? null;
    }
  }
  return null;
}

/** Is this confirmation token exactly the required one? Pure. */
export function isConfirmed(token) {
  return token === REQUIRED_CONFIRMATION;
}

/**
 * The ordered list of Compose/npm commands the reset procedure runs, once
 * confirmed. Pure and exported so unit tests can assert the *shape* of the
 * destructive command (project + service only) without ever invoking
 * Docker.
 */
export function buildResetPlan() {
  return [
    {
      description: "Stop postgres and remove its volume",
      command: "docker",
      args: [
        "compose",
        "--project-name",
        COMPOSE_PROJECT_NAME,
        "down",
        "--volumes",
        "--remove-orphans",
      ],
    },
    {
      description: "Start postgres and wait for health",
      command: "docker",
      args: [
        "compose",
        "--project-name",
        COMPOSE_PROJECT_NAME,
        "up",
        "-d",
        "--wait",
        COMPOSE_SERVICE,
      ],
    },
    { description: "Apply migrations", command: "npm", args: ["run", "db:migrate"] },
    {
      description: "Check application connection",
      command: "npm",
      args: ["run", "db:check"],
    },
    {
      description: "Check migration connection",
      command: "npm",
      args: ["run", "db:check:migration"],
    },
    { description: "Verify privileges", command: "npm", args: ["run", "db:verify"] },
  ];
}

function resolveEnvironment() {
  if (process.env.BOBA_BEAR_ENV) return process.env.BOBA_BEAR_ENV;
  const envLocalPath = path.join(projectRoot, ".env.local");
  if (existsSync(envLocalPath)) {
    const parsed = parseEnvFile(readFileSync(envLocalPath, "utf8"));
    const extracted = extractValues(parsed);
    if (extracted.ok && extracted.values.BOBA_BEAR_ENV) {
      return extracted.values.BOBA_BEAR_ENV;
    }
  }
  return "local";
}

function assertRepositoryRoot() {
  if (!existsSync(path.join(projectRoot, "compose.yaml"))) {
    console.error(
      `db:reset: expected compose.yaml at repository root ("${projectRoot}"). Refusing to run.`,
    );
    return false;
  }
  return true;
}

function printRequiredCommand() {
  console.error("db:reset: refusing to run without the exact confirmation token.");
  console.error(`Required command:\n  ${REQUIRED_COMMAND}`);
}

function main() {
  const token = parseConfirmation(process.argv.slice(2));

  if (!isConfirmed(token)) {
    printRequiredCommand();
    process.exitCode = 1;
    return;
  }

  if (!assertRepositoryRoot()) {
    process.exitCode = 1;
    return;
  }

  const environment = resolveEnvironment();
  if (environment !== "local") {
    console.error(
      `db:reset: BOBA_BEAR_ENV resolves to "${environment}", not "local". Refusing to reset ` +
        "a non-local database configuration.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `db:reset: confirmed. Resetting Compose project "${COMPOSE_PROJECT_NAME}" service "${COMPOSE_SERVICE}"...`,
  );

  for (const step of buildResetPlan()) {
    console.log(`db:reset: ${step.description}...`);
    execFileSync(step.command, step.args, { cwd: projectRoot, stdio: "inherit" });
  }

  console.log("db:reset: local database reset complete.");
  process.exitCode = 0;
}

// Only run when executed directly (not when imported by unit tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
