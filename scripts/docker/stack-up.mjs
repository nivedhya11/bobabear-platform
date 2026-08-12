#!/usr/bin/env node
// One-command local Docker stack startup (IMP-005A).
//
// Validates the repo location, generates the ignored local env files,
// brings PostgreSQL up healthy, runs migrations once, brings the app up
// healthy, proves database connectivity from dedicated tooling containers,
// and runs the HTTP smoke check — in that order, failing fast and loud on
// the first problem. Leaves a healthy app + PostgreSQL stack running on
// success. Never logs a secret.
//
// Usage: node scripts/docker/stack-up.mjs
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

function assertRepositoryRoot() {
  const composePath = path.join(projectRoot, "compose.yaml");
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(composePath) || !existsSync(packageJsonPath)) {
    console.error(
      "docker/stack-up: expected to find compose.yaml and package.json at the " +
        `repository root (resolved to "${projectRoot}"). Refusing to run.`,
    );
    return false;
  }
  return true;
}

/** Runs a step to completion, streaming its own stdout/stderr (never
 * captured/parsed here, so nothing this script does can accidentally
 * re-print a secret a child process legitimately needed to see). Returns
 * true on a zero exit code. */
function step(title, command, args) {
  console.log(`\n▸ ${title}`);
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit" });
  if (result.error) {
    console.error(`docker/stack-up: failed to start "${command}": ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`docker/stack-up: step failed — "${title}" (exit code ${result.status}).`);
    return false;
  }
  return true;
}

const STEPS = [
  { title: "Generate local PostgreSQL bootstrap env (npm run db:env:init)", command: "npm", args: ["run", "db:env:init"] },
  { title: "Generate Docker runtime/migration/customer-auth/workforce-auth/customer-commerce env (npm run docker:env:init)", command: "npm", args: ["run", "docker:env:init"] },
  { title: "Validate Compose configuration", command: "docker", args: ["compose", "config", "--quiet"] },
  { title: "Start PostgreSQL and wait for healthy", command: "docker", args: ["compose", "up", "-d", "--wait", "postgres"] },
  { title: "Build the app, customer-auth, workforce-auth, customer-commerce, and tooling images", command: "docker", args: ["compose", "--profile", "tools", "build", "app", "migrate", "customer-auth", "workforce-auth", "customer-commerce"] },
  { title: "Run database migrations (one-off)", command: "docker", args: ["compose", "run", "--rm", "migrate"] },
  { title: "Start the app container and wait for healthy", command: "docker", args: ["compose", "up", "-d", "--wait", "app"] },
  { title: "Start the customer-auth container and wait for healthy", command: "docker", args: ["compose", "up", "-d", "--wait", "customer-auth"] },
  { title: "Start the workforce-auth container and wait for healthy", command: "docker", args: ["compose", "up", "-d", "--wait", "workforce-auth"] },
  { title: "Start the customer-commerce container and wait for healthy", command: "docker", args: ["compose", "up", "-d", "--wait", "customer-commerce"] },
  { title: "Check application-role database connectivity (one-off)", command: "docker", args: ["compose", "run", "--rm", "db-check"] },
  { title: "Check migration-role database connectivity (one-off)", command: "docker", args: ["compose", "run", "--rm", "db-check-migration"] },
  { title: "Run HTTP smoke validation against the app container", command: "node", args: ["scripts/docker/smoke.mjs"] },
  { title: "Run HTTP smoke validation against the customer-auth container", command: "node", args: ["scripts/docker/customer-auth-smoke.mjs"] },
  { title: "Run HTTP smoke validation against the workforce-auth container", command: "node", args: ["scripts/docker/workforce-auth-smoke.mjs"] },
];

function main() {
  if (!assertRepositoryRoot()) {
    process.exitCode = 1;
    return;
  }

  for (const { title, command, args } of STEPS) {
    if (!step(title, command, args)) {
      process.exitCode = 1;
      return;
    }
  }

  console.log("\ndocker/stack-up: stack is healthy — app on the configured host port, PostgreSQL on 5433.");
  process.exitCode = 0;
}

main();
