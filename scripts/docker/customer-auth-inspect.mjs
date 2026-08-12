#!/usr/bin/env node
// Live image/container inspection for the `customer-auth` service (IMP-009).
// Requires Docker Desktop and an already-built `boba-bear-customer-auth:local`
// image / running `customer-auth` container. Uses `docker` CLI child
// processes; never prints a full container environment — only key names or
// safe booleans, matching scripts/docker/inspect-runtime.mjs (IMP-005A).
//
// Usage: node scripts/docker/customer-auth-inspect.mjs
import { execFileSync } from "node:child_process";
import process from "node:process";

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

function dockerJson(args) {
  return JSON.parse(docker(args));
}

/** Extracts just the env var *names* (never values) from `docker inspect`
 * output, so evidence can list "no forbidden keys present" without ever
 * printing a value. */
export function extractEnvKeys(envLines) {
  return envLines.map((line) => line.split("=")[0]);
}

/** The customer-auth service *does* need `BOBA_BEAR_DATABASE_URL` (the
 * application role) and the ordinary application-role platform config that
 * ships with `.env.runtime.docker.local` — unlike the static `app` service —
 * so this forbidden list is narrower than inspect-runtime.mjs's: migration
 * credentials, Postgres bootstrap/admin credentials, and the other realm's
 * auth secrets must never reach this container. */
export function findForbiddenEnvKeys(envKeys) {
  const forbiddenPatterns = [
    /^POSTGRES_/,
    /^BOBA_BEAR_DATABASE_MIGRATION/,
    /^WORKFORCE_AUTH_/,
  ];
  return envKeys.filter((key) => forbiddenPatterns.some((pattern) => pattern.test(key)));
}

function record(results, name, passed, detail) {
  results.push({ name, passed, detail });
}

function inspectImage(results) {
  let inspect;
  try {
    inspect = dockerJson(["image", "inspect", "boba-bear-customer-auth:local"])[0];
  } catch {
    record(
      results,
      "boba-bear-customer-auth:local image exists",
      false,
      "run `npm run docker:build` first",
    );
    return;
  }
  record(results, "boba-bear-customer-auth:local image exists", true, inspect.Id);

  const config = inspect.Config ?? {};
  const user = config.User ?? "";
  record(results, "Image configures a non-root user", user !== "" && user !== "root" && user !== "0", user);

  const exposedPorts = Object.keys(config.ExposedPorts ?? {});
  record(results, "Image exposes only port 8081/tcp", exposedPorts.length === 1 && exposedPorts[0] === "8081/tcp", exposedPorts.join(", "));

  const envKeys = extractEnvKeys(config.Env ?? []);
  const forbidden = findForbiddenEnvKeys(envKeys);
  record(results, "Image declares no forbidden credential env vars", forbidden.length === 0, forbidden.join(", "));

  let npmMissing = false;
  try {
    docker([
      "run",
      "--rm",
      "--entrypoint",
      "/bin/sh",
      "boba-bear-customer-auth:local",
      "-c",
      "command -v npm && exit 1 || command -v npx && exit 1 || exit 0",
    ]);
    npmMissing = true;
  } catch {
    npmMissing = false;
  }
  record(results, "Image has no npm/npx binary in the final layer", npmMissing);
}

function inspectRunningCustomerAuthContainer(results) {
  let containerId;
  try {
    containerId = docker(["compose", "ps", "-q", "customer-auth"]);
  } catch {
    containerId = "";
  }
  if (!containerId) {
    record(results, "customer-auth container is running", false, "run `npm run docker:up` first");
    return;
  }
  record(results, "customer-auth container is running", true);

  const inspect = dockerJson(["inspect", containerId])[0];
  const hostConfig = inspect.HostConfig ?? {};
  const config = inspect.Config ?? {};

  const user = config.User ?? "";
  record(results, "Container runs as a non-root user", user !== "" && user !== "root" && user !== "0", user);
  record(results, "Container root filesystem is read-only", hostConfig.ReadonlyRootfs === true);
  const capDrop = hostConfig.CapDrop ?? [];
  record(results, "Container has ALL capabilities dropped", capDrop.includes("ALL"), capDrop.join(", "));
  const securityOpt = hostConfig.SecurityOpt ?? [];
  record(results, "Container enables no-new-privileges", securityOpt.some((opt) => opt.includes("no-new-privileges:true")));
  record(results, "Container is healthy", inspect.State?.Health?.Status === "healthy", inspect.State?.Health?.Status);
  record(results, "Container is not privileged", hostConfig.Privileged !== true);
  record(results, "Container does not mount the Docker socket", !(hostConfig.Binds ?? []).some((bind) => bind.includes("docker.sock")));

  const portBindings = hostConfig.PortBindings ?? {};
  record(
    results,
    "Container publishes no host port",
    Object.keys(portBindings).length === 0,
    Object.keys(portBindings).join(", "),
  );

  const envKeys = extractEnvKeys(config.Env ?? []);
  const forbidden = findForbiddenEnvKeys(envKeys);
  record(results, "Running container has no forbidden credentials in its environment", forbidden.length === 0, forbidden.join(", "));
}

function main() {
  const results = [];
  inspectImage(results);
  inspectRunningCustomerAuthContainer(results);

  console.log("docker:customer-auth:inspect — image and runtime evidence");
  console.log("=".repeat(60));
  for (const result of results) {
    const marker = result.passed ? "PASS" : "FAIL";
    const detail = result.detail ? ` (${result.detail})` : "";
    console.log(`  [${marker}] ${result.name}${detail}`);
  }
  console.log("=".repeat(60));

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`${failed.length} of ${results.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log(`All ${results.length} checks passed.`);
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
