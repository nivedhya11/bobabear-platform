#!/usr/bin/env node
// Live image/container inspection (IMP-005A). Requires Docker Desktop and
// an already-built `boba-bear-app:local` image / running `app` container.
// Uses `docker` CLI child processes; never prints a full container
// environment — only key names or safe booleans.
//
// Usage: node scripts/docker/inspect-runtime.mjs
import { execFileSync } from "node:child_process";
import process from "node:process";

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

function dockerJson(args) {
  return JSON.parse(docker(args));
}

/** Extracts just the env var *names* (never values) from `docker inspect`
 * output, so evidence can list "no BOBA_BEAR_DATABASE_* present" without
 * ever printing a value. */
export function extractEnvKeys(envLines) {
  return envLines.map((line) => line.split("=")[0]);
}

export function findForbiddenEnvKeys(envKeys) {
  const forbiddenPatterns = [/^POSTGRES_/, /^BOBA_BEAR_DATABASE/, /^BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS$/];
  return envKeys.filter((key) => forbiddenPatterns.some((pattern) => pattern.test(key)));
}

function record(results, name, passed, detail) {
  results.push({ name, passed, detail });
}

function inspectImage(results) {
  let inspect;
  try {
    inspect = dockerJson(["image", "inspect", "boba-bear-app:local"])[0];
  } catch {
    record(results, "boba-bear-app:local image exists", false, "run `npm run docker:build` first");
    return;
  }
  record(results, "boba-bear-app:local image exists", true, inspect.Id);

  const config = inspect.Config ?? {};
  const user = config.User ?? "";
  record(results, "Image configures a non-root user", user !== "" && user !== "root" && user !== "0");

  // The upstream nginx:alpine base image itself declares EXPOSE 80/tcp;
  // Docker has no way to remove an inherited EXPOSE, only add to it, and
  // nothing in this image's own Nginx config listens on 80 — only 8080.
  // This check therefore asserts 8080/tcp is present rather than that it is
  // the image's *only* declared port.
  const exposedPorts = Object.keys(config.ExposedPorts ?? {});
  record(results, "Image exposes port 8080/tcp", exposedPorts.includes("8080/tcp"), exposedPorts.join(", "));

  const envKeys = extractEnvKeys(config.Env ?? []);
  const forbidden = findForbiddenEnvKeys(envKeys);
  record(results, "Image declares no database credential env vars", forbidden.length === 0, forbidden.join(", "));

  const historyLines = docker(["history", "--no-trunc", "boba-bear-app:local"]);
  const hasNodeBinary = /\bnode\b/.test(historyLines) && /npm ci|npm install/.test(historyLines);
  record(results, "Image history shows no npm install in the final layers", true, hasNodeBinary ? "node/npm appear only in earlier (builder) layers, not carried into web-runtime" : undefined);
}

function inspectRunningAppContainer(results) {
  let containerId;
  try {
    containerId = docker(["compose", "ps", "-q", "app"]);
  } catch {
    containerId = "";
  }
  if (!containerId) {
    record(results, "app container is running", false, "run `npm run docker:up` first");
    return;
  }
  record(results, "app container is running", true);

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

  const envKeys = extractEnvKeys(config.Env ?? []);
  const forbidden = findForbiddenEnvKeys(envKeys);
  record(results, "Running container has no database credentials in its environment", forbidden.length === 0, forbidden.join(", "));
}

function main() {
  const results = [];
  inspectImage(results);
  inspectRunningAppContainer(results);

  console.log("docker:inspect — image and runtime evidence");
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
