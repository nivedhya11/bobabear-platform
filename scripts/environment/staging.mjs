#!/usr/bin/env node
/** Founder staging provenance, status, and exact merged Git-tree deployment for `boba-staging`. */
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..", "..");
const STAGING_PROJECT = "boba-staging";
const STAGING_ENV_DIR = path.join(repositoryRoot, ".env.staging");
const STAGING_ENV_FILES = [
  ".env.docker.local",
  ".env.runtime.docker.local",
  ".env.migration.docker.local",
  ".env.customer-auth.docker.local",
  ".env.workforce-auth.docker.local",
  ".env.customer-commerce.docker.local",
  ".env.operations.docker.local",
];
const SOCKET = `unix:///run/user/${process.getuid?.() ?? 1000}/podman/podman.sock`;
const OCI_REVISION_LABEL = "org.opencontainers.image.revision";
const BOBA_BUILD_IMAGES = {
  app: "boba-bear-app:local",
  "customer-auth": "boba-bear-customer-auth:local",
  "workforce-auth": "boba-bear-workforce-auth:local",
  "customer-commerce": "boba-bear-customer-commerce:local",
  operations: "boba-bear-operations:local",
  tooling: "boba-bear-tooling:local",
};
const BOBA_RUNTIME_SERVICES = Object.keys(BOBA_BUILD_IMAGES).filter((service) => service !== "tooling");

const command = process.argv[2];
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli && !["status", "deploy-dry-run", "deploy"].includes(command)) {
  console.error("Usage: npm run env:staging:status | npm run env:staging:deploy:dry-run | npm run env:staging:deploy");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function fingerprint() {
  return execFileSync("npm", ["run", "working-tree:fingerprint"], { cwd: repositoryRoot, encoding: "utf8" })
    .match(/WORKING_TREE_FINGERPRINT\s+([a-f0-9]+)/)?.[1] ?? "UNAVAILABLE";
}

function readCandidate() {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const originMain = git(["rev-parse", "origin/main"]);
  const trackedDirty = git(["status", "--porcelain", "--untracked-files=no"]);
  return { branch, head, originMain, trackedDirty, fingerprint: fingerprint() };
}

function isFullGitSha(value) {
  return /^[0-9a-f]{40}$/.test(value);
}

function assertDeployPreconditions(candidate) {
  if (
    candidate.branch !== "main" ||
    candidate.head !== candidate.originMain ||
    candidate.trackedDirty.length !== 0 ||
    !isFullGitSha(candidate.head)
  ) {
    console.error("Staging deployment requires clean tracked source at exact origin/main.");
    console.error(`BRANCH ${candidate.branch}`);
    console.error(`HEAD ${candidate.head}`);
    console.error(`ORIGIN_MAIN ${candidate.originMain}`);
    console.error(`FULL_GIT_SHA ${isFullGitSha(candidate.head) ? "YES" : "NO"}`);
    console.error(`TRACKED_SOURCE_CLEAN ${candidate.trackedDirty.length === 0 ? "YES" : "NO"}`);
    process.exit(1);
  }
}

function podmanCompose(buildDir, args, extraEnv = {}) {
  const result = spawnSync("podman-compose", ["-f", "compose.yaml", "-p", STAGING_PROJECT, ...args], {
    cwd: buildDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DOCKER_HOST: SOCKET,
      COMPOSE_PROJECT_NAME: STAGING_PROJECT,
      COMPOSE_PROFILES: extraEnv.COMPOSE_PROFILES ?? process.env.COMPOSE_PROFILES ?? "",
      BOBA_BUILD_SHA: extraEnv.BOBA_BUILD_SHA ?? "",
      BOBA_BEAR_IMAGE_RELEASE: extraEnv.BOBA_BUILD_SHA ?? "staging-local",
    },
  });
  if (result.error) {
    console.error(`podman-compose failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function materializeExactGitTree(sha) {
  const buildDir = mkdtempSync(path.join(os.tmpdir(), "boba-staging-build-"));
  const result = spawnSync(
    "bash",
    ["-lc", `git -C "${repositoryRoot}" archive "${sha}" | tar -x -C "${buildDir}"`],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    rmSync(buildDir, { recursive: true, force: true });
    process.exit(result.status ?? 1);
  }
  return buildDir;
}

function ensureStagingEnvFiles(buildDir) {
  mkdirSync(STAGING_ENV_DIR, { recursive: true });
  const missing = STAGING_ENV_FILES.filter(
    (file) => !existsSync(path.join(STAGING_ENV_DIR, file)) && !existsSync(path.join(repositoryRoot, file)),
  );
  if (missing.length > 0) {
    for (const step of [
      { title: "db:env:init", args: ["run", "db:env:init"] },
      { title: "docker:env:init", args: ["run", "docker:env:init"] },
    ]) {
      const result = spawnSync("npm", step.args, { cwd: buildDir, stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  }
  for (const file of STAGING_ENV_FILES) {
    const persistent = path.join(STAGING_ENV_DIR, file);
    const live = path.join(repositoryRoot, file);
    const source = existsSync(persistent) ? persistent : live;
    if (!existsSync(source)) {
      console.error(`Missing required staging env file: ${file}`);
      process.exit(1);
    }
    if (!existsSync(persistent)) copyFileSync(source, persistent);
    copyFileSync(persistent, path.join(buildDir, file));
    const customerAuthPath = path.join(buildDir, ".env.customer-auth.docker.local");
    if (file === ".env.customer-auth.docker.local" && existsSync(customerAuthPath)) {
      const content = readFileSync(customerAuthPath, "utf8");
      const normalized = content.includes("CUSTOMER_AUTH_BASE_URL=")
        ? content.replace(/^CUSTOMER_AUTH_BASE_URL=.*$/m, "CUSTOMER_AUTH_BASE_URL=http://localhost:8080")
        : `${content.trimEnd()}\nCUSTOMER_AUTH_BASE_URL=http://localhost:8080\n`;
      writeFileSync(customerAuthPath, normalized, { mode: 0o600 });
      writeFileSync(persistent, normalized, { mode: 0o600 });
    }
  }
}

function podmanInspect(name, format) {
  return execFileSync("podman", ["inspect", name, "--format", format], { encoding: "utf8" }).trim();
}

function imageRevision(image) {
  return podmanInspect(image, `{{ index .Config.Labels \"${OCI_REVISION_LABEL}\" }}`);
}

function assertImageRevisions(expectedSha, images = BOBA_BUILD_IMAGES, inspectRevision = imageRevision) {
  for (const [service, image] of Object.entries(images)) {
    const revision = inspectRevision(image);
    if (revision !== expectedSha) {
      throw new Error(`Image provenance mismatch for ${service}: expected ${expectedSha}, found ${revision || "MISSING"}.`);
    }
  }
}

function readRunningProvenance(service) {
  const container = `${STAGING_PROJECT}_${service}_1`;
  const containerId = podmanInspect(container, "{{.Id}}");
  const imageId = podmanInspect(container, "{{.Image}}");
  const imageName = podmanInspect(container, "{{.ImageName}}");
  const revision = imageRevision(imageId);
  const health = podmanInspect(container, "{{.State.Health.Status}}");
  return { service, containerId, imageId, imageName, revision, health };
}

function readToolingProvenance() {
  const imageName = BOBA_BUILD_IMAGES.tooling;
  return {
    imageName,
    imageId: podmanInspect(imageName, "{{.Id}}"),
    revision: imageRevision(imageName),
  };
}

function assertRunningProvenance(expectedSha, records) {
  for (const record of records) {
    if (record.revision !== expectedSha) {
      throw new Error(
        `Running image provenance mismatch for ${record.service}: expected ${expectedSha}, found ${record.revision || "MISSING"}.`,
      );
    }
  }
}

function reportRunningProvenance(expectedSha) {
  let records;
  let tooling;
  try {
    records = BOBA_RUNTIME_SERVICES.map(readRunningProvenance);
    tooling = readToolingProvenance();
  } catch (error) {
    console.log(`RUNNING_PROVENANCE_AVAILABLE NO`);
    console.log(`CANDIDATE_MATCH NO`);
    console.log(`RUNNING_PROVENANCE_ERROR ${error.message}`);
    return false;
  }
  for (const record of records) {
    const prefix = record.service.toUpperCase().replaceAll("-", "_");
    console.log(`${prefix}_CONTAINER_ID ${record.containerId}`);
    console.log(`${prefix}_IMAGE_ID ${record.imageId}`);
    console.log(`${prefix}_IMAGE_NAME ${record.imageName}`);
    console.log(`${prefix}_REVISION ${record.revision || "MISSING"}`);
    console.log(`${prefix}_HEALTH ${record.health}`);
  }
  console.log(`TOOLING_IMAGE_ID ${tooling.imageId}`);
  console.log(`TOOLING_IMAGE_NAME ${tooling.imageName}`);
  console.log(`TOOLING_REVISION ${tooling.revision || "MISSING"}`);
  try {
    assertRunningProvenance(expectedSha, records);
    if (tooling.revision !== expectedSha) {
      throw new Error(`Tooling image provenance mismatch: expected ${expectedSha}, found ${tooling.revision || "MISSING"}.`);
    }
    console.log("RUNNING_PROVENANCE_AVAILABLE YES");
    console.log(`RUNNING_GIT_SHA ${expectedSha}`);
    console.log("CANDIDATE_MATCH YES");
    return true;
  } catch (error) {
    console.log("RUNNING_PROVENANCE_AVAILABLE YES");
    console.log(`CANDIDATE_MATCH NO`);
    console.log(`RUNNING_PROVENANCE_ERROR ${error.message}`);
    return false;
  }
}

function waitForHealthy(containerName, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const status = podmanInspect(containerName, "{{.State.Health.Status}}");
      if (status === "healthy") {
        console.log(`HEALTHY ${containerName}`);
        return;
      }
    } catch {
      // Container may not exist yet.
    }
    spawnSync("sleep", ["2"]);
  }
  console.error(`Timed out waiting for healthy container: ${containerName}`);
  process.exit(1);
}

function stopLegacyRuntimeIfNeeded() {
  for (const name of [
    "boba-bear_app_1",
    "boba-bear_customer-commerce_1",
    "boba-bear_customer-auth_1",
    "boba-bear_workforce-auth_1",
    "boba-bear_operations_1",
    "boba-bear_postgres_1",
  ]) {
    spawnSync("podman", ["stop", name], { stdio: "inherit" });
  }
}

function upAndWait(buildDir, services) {
  podmanCompose(buildDir, ["up", "-d", "--force-recreate", ...services]);
  for (const service of services) {
    waitForHealthy(`${STAGING_PROJECT}_${service}_1`);
  }
}

function runBootstrapApply(buildDir, service, npmArgs) {
  podmanCompose(buildDir, [
    "run",
    "--rm",
    "--entrypoint",
    "",
    service,
    "npm",
    "run",
    ...npmArgs,
    "--",
    "--apply",
  ], { COMPOSE_PROFILES: "tools" });
}

function deploy(candidate) {
  assertDeployPreconditions(candidate);
  stopLegacyRuntimeIfNeeded();
  const buildDir = materializeExactGitTree(candidate.head);
  console.log(`STAGING_BUILD_DIR ${buildDir}`);
  console.log(`MERGED_GIT_SHA ${candidate.head}`);
  try {
    ensureStagingEnvFiles(buildDir);
    podmanCompose(
      buildDir,
      ["build", "app", "migrate", "customer-auth", "workforce-auth", "customer-commerce", "operations"],
      { BOBA_BUILD_SHA: candidate.head, COMPOSE_PROFILES: "tools" },
    );
    assertImageRevisions(candidate.head);
    console.log("BUILT_IMAGE_CANDIDATE_MATCH YES");
    upAndWait(buildDir, ["postgres"]);
    podmanCompose(buildDir, ["run", "--rm", "migrate"], { COMPOSE_PROFILES: "tools" });
    runBootstrapApply(buildDir, "menu-import-existing", ["menu:import-existing"]);
    runBootstrapApply(buildDir, "assortment-bootstrap-existing-menu", ["assortment:bootstrap-existing-menu"]);
    runBootstrapApply(buildDir, "pricing-bootstrap-existing-menu", ["pricing:bootstrap-existing-menu"]);
    runBootstrapApply(buildDir, "catalog-bootstrap-imp028c-modifiers", ["catalog:bootstrap-imp028c-modifiers"]);
    runBootstrapApply(buildDir, "catalog-bootstrap-imp036c-required-topping", ["catalog:bootstrap-imp036c-required-topping"]);
    upAndWait(buildDir, ["app", "customer-auth", "workforce-auth", "customer-commerce", "operations"]);
    for (const step of [
      { title: "app smoke", command: "node", args: ["scripts/docker/smoke.mjs"] },
      {
        title: "customer-auth smoke",
        command: "node",
        args: [
          "scripts/docker/customer-auth-smoke.mjs",
          "--compose-provider",
          "podman-compose",
          "--compose-project",
          STAGING_PROJECT,
          "--compose-file",
          "compose.yaml",
        ],
      },
    ]) {
      const result = spawnSync(step.command, step.args, {
        cwd: buildDir,
        stdio: "inherit",
        env: { ...process.env, DOCKER_HOST: SOCKET, COMPOSE_PROJECT_NAME: STAGING_PROJECT },
      });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
    if (!reportRunningProvenance(candidate.head)) {
      throw new Error("Running staging images do not match the merged Git candidate.");
    }
    console.log(`STAGING_PROJECT ${STAGING_PROJECT}`);
    console.log(`EXPECTED_GIT_SHA ${candidate.head}`);
    console.log(`UAT_URL http://localhost:8080/order/`);
    console.log(`PERSISTENT_DB_VOLUME ${STAGING_PROJECT}_postgres-data`);
    console.log(`CUSTOMER_AUTH_BASE_URL http://localhost:8080`);
  } finally {
    rmSync(buildDir, { recursive: true, force: true });
    console.log("STAGING_BUILD_DIR_REMOVED YES");
  }
}

if (isCli) {
  const candidate = readCandidate();
  console.log(`STAGING_PROJECT ${STAGING_PROJECT}`);
  console.log(`BRANCH ${candidate.branch}`);
  console.log(`MERGED_GIT_SHA ${candidate.head}`);
  console.log(`CURRENT_MAIN_SHA ${candidate.originMain}`);
  console.log(`ORIGIN_MAIN ${candidate.originMain}`);
  console.log(`WORKING_TREE_FINGERPRINT ${candidate.fingerprint}`);
  console.log(`TRACKED_SOURCE_CLEAN ${candidate.trackedDirty.length === 0 ? "YES" : "NO"}`);
  console.log("STAGING_ARTIFACT_SOURCE EXACT_MERGED_GIT_TREE");
  console.log("EXACT_GIT_TREE_MECHANISM git archive HEAD to isolated temporary build context");
  console.log("LIVE_UNTRACKED_CONTENT_CAN_AFFECT_STAGING_ARTIFACT NO");
  console.log(`PERSISTENT_DB_VOLUME ${STAGING_PROJECT}_postgres-data`);

  if (command === "deploy-dry-run") {
    assertDeployPreconditions(candidate);
    console.log("DEPLOYMENT DRY RUN ONLY — no image, container, network, volume, or migration was created.");
    console.log(`Future deployment provenance uses MERGED_GIT_SHA ${candidate.head}.`);
  }

  if (command === "deploy") deploy(candidate);
  if (command === "status") reportRunningProvenance(candidate.originMain);
}

export { BOBA_BUILD_IMAGES, BOBA_RUNTIME_SERVICES, assertImageRevisions, assertRunningProvenance, isFullGitSha };
