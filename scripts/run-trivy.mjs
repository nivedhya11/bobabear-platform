#!/usr/bin/env node
/**
 * IMP-038 §15 container image scan — download pinned Trivy OSS binary and scan
 * actual built production runtime images (including base/OS layers).
 *
 * Avoids aquasecurity/trivy-action / setup-trivy GitHub Actions after the
 * 2026 supply-chain tag compromise. Prefer pinned binary + SHA256 verify.
 *
 * Usage:
 *   node scripts/run-trivy.mjs
 *   npm run audit:container
 *
 * Env:
 *   BOBA_TRIVY_SKIP_BUILD=1 — reuse already-tagged local images (still fails
 *     closed if any required image is missing; never silently skips scan).
 *   BOBA_TRIVY_CONTAINER_CLI — force docker|podman
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

/** Pinned safe Trivy release (linux-64bit). Update pin map when bumping. */
export const TRIVY_VERSION = "0.69.3";
export const TRIVY_ARCHIVE = `trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz`;
export const TRIVY_URL =
  `https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${TRIVY_ARCHIVE}`;
export const TRIVY_SHA256 =
  "1816b632dfe529869c740c0913e36bd1629cb7688bd5634f4a858c1d57c88b75";

/**
 * V1 deployable production runtime image targets.
 * Each is built then scanned with `trivy image` so base/OS layers are included.
 *
 * @typedef {{ id: string, image: string, dockerfile: string, context: string, target: string | null }} ImageTarget
 */

/** @type {readonly ImageTarget[]} */
export const PRODUCTION_IMAGE_TARGETS = Object.freeze([
  {
    id: "web-runtime",
    image: "boba-bear-app:trivy",
    dockerfile: "Dockerfile",
    context: ".",
    target: "web-runtime",
  },
  {
    id: "customer-auth-runtime",
    image: "boba-bear-customer-auth:trivy",
    dockerfile: "Dockerfile",
    context: ".",
    target: "customer-auth-runtime",
  },
  {
    id: "workforce-auth-runtime",
    image: "boba-bear-workforce-auth:trivy",
    dockerfile: "Dockerfile",
    context: ".",
    target: "workforce-auth-runtime",
  },
  {
    id: "customer-commerce-runtime",
    image: "boba-bear-customer-commerce:trivy",
    dockerfile: "Dockerfile",
    context: ".",
    target: "customer-commerce-runtime",
  },
  {
    id: "operations-runtime",
    image: "boba-bear-operations:trivy",
    dockerfile: "Dockerfile",
    context: ".",
    target: "operations-runtime",
  },
  {
    id: "postgres",
    image: "boba-bear-postgres:trivy",
    dockerfile: "docker/postgres/Dockerfile",
    context: ".",
    target: null,
  },
]);

const cacheDir = path.join(projectRoot, ".cache", "trivy", TRIVY_VERSION);
const archivePath = path.join(cacheDir, TRIVY_ARCHIVE);
const binaryPath = path.join(cacheDir, "trivy");

export function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`DOWNLOAD_FAILED status=${res.status} url=${url}`);
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

export async function ensureBinary() {
  mkdirSync(cacheDir, { recursive: true });
  if (existsSync(binaryPath)) return binaryPath;
  const expected = TRIVY_SHA256.toLowerCase();
  if (!existsSync(archivePath) || sha256File(archivePath) !== expected) {
    console.log(`Downloading trivy v${TRIVY_VERSION}…`);
    await download(TRIVY_URL, archivePath);
  }
  const digest = sha256File(archivePath);
  if (digest !== expected) {
    throw new Error(`TRIVY_SHA_MISMATCH expected=${expected} got=${digest}`);
  }
  writeFileSync(path.join(cacheDir, "SHA256"), `${expected}  ${TRIVY_ARCHIVE}\n`);
  const extracted = spawnSync("tar", ["-xzf", archivePath, "-C", cacheDir, "trivy"], {
    encoding: "utf8",
  });
  if (extracted.status !== 0) {
    throw new Error(`TRIVY_EXTRACT_FAILED: ${extracted.stderr || extracted.stdout}`);
  }
  chmodSync(binaryPath, 0o755);
  return binaryPath;
}

/**
 * Prefer podman (CI/WSL rootless) then docker. Fail closed when neither works.
 * @param {string} [forced]
 * @param {(cmd: string, args: string[], opts?: object) => { status: number | null }} [spawn]
 */
export function resolveContainerCli(forced = process.env.BOBA_TRIVY_CONTAINER_CLI, spawn = spawnSync) {
  const prefer = (forced || "").trim().toLowerCase();
  if (prefer === "podman" || prefer === "docker") {
    const probe = spawn(prefer, ["info"], { encoding: "utf8", timeout: 30_000 });
    if (probe.status === 0) return prefer;
    throw new Error(`CONTAINER_CLI_UNAVAILABLE forced=${prefer}`);
  }
  for (const cli of ["podman", "docker"]) {
    const probe = spawn(cli, ["info"], { encoding: "utf8", timeout: 30_000 });
    if (probe.status === 0) return cli;
  }
  throw new Error("CONTAINER_CLI_UNAVAILABLE need podman or docker for image build/scan");
}

/**
 * @param {ImageTarget} target
 * @returns {string[]}
 */
export function buildArgsForTarget(target) {
  // --network=host: next/font Google fetch during web-runtime build fails
  // intermittently under the default podman CNI/slirp path (null font loader).
  const args = ["build", "--network=host", "-f", target.dockerfile, "-t", target.image];
  if (target.target) args.push("--target", target.target);
  args.push(target.context);
  return args;
}

/**
 * @param {string} image
 * @param {string} ignorefile
 * @returns {string[]}
 */
export function trivyImageArgs(image, ignorefile) {
  return [
    "image",
    image,
    "--severity",
    "CRITICAL,HIGH",
    "--exit-code",
    "1",
    "--format",
    "table",
    "--scanners",
    "vuln,misconfig",
    // Fail closed on remediable findings. Distro CVEs without an available
    // fixed package remain visible in full scans but do not block the gate;
    // Dockerfile apt/apk upgrades apply available patches first.
    "--ignore-unfixed",
    "--ignorefile",
    ignorefile,
  ];
}

/**
 * @param {string} cli
 * @param {string} image
 * @param {(cmd: string, args: string[], opts?: object) => { status: number | null }} [spawn]
 */
export function imageExists(cli, image, spawn = spawnSync) {
  const result = spawn(cli, ["image", "exists", image], { encoding: "utf8" });
  if (result.status === 0) return true;
  // docker uses `docker image inspect` (no `image exists`)
  const inspect = spawn(cli, ["image", "inspect", image], { encoding: "utf8" });
  return inspect.status === 0;
}

/**
 * @param {object} options
 * @param {string} options.cli
 * @param {ImageTarget} options.target
 * @param {string} options.cwd
 * @param {boolean} options.skipBuild
 * @param {(cmd: string, args: string[], opts?: object) => { status: number | null, stderr?: string, stdout?: string }} [options.spawn]
 */
export function ensureImageBuilt(options) {
  const spawn = options.spawn ?? spawnSync;
  const { cli, target, cwd, skipBuild } = options;
  if (skipBuild) {
    if (!imageExists(cli, target.image, spawn)) {
      throw new Error(
        `IMAGE_MISSING id=${target.id} image=${target.image} (BOBA_TRIVY_SKIP_BUILD set; build required images first)`,
      );
    }
    console.log(`Reusing existing image ${target.image} (skip build)`);
    return;
  }
  const args = buildArgsForTarget(target);
  console.log(`Building ${target.id}: ${cli} ${args.join(" ")}`);
  const result = spawn(cli, args, { cwd, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`IMAGE_BUILD_FAILED id=${target.id} status=${result.status}`);
  }
}

/**
 * @param {object} options
 * @param {string} options.bin
 * @param {string} options.image
 * @param {string} options.ignorefile
 * @param {string} options.cwd
 * @param {(cmd: string, args: string[], opts?: object) => { status: number | null }} [options.spawn]
 */
export function scanImage(options) {
  const spawn = options.spawn ?? spawnSync;
  const args = trivyImageArgs(options.image, options.ignorefile);
  console.log(`Scanning image ${options.image}: ${options.bin} ${args.join(" ")}`);
  const result = spawn(options.bin, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  return typeof result.status === "number" ? result.status : 1;
}

async function main() {
  const ignorefile = path.join(projectRoot, ".trivyignore");
  if (!existsSync(ignorefile)) {
    throw new Error("MISSING_TRIVYIGNORE expected .trivyignore at repository root");
  }

  const skipBuild = process.env.BOBA_TRIVY_SKIP_BUILD === "1";
  const cli = resolveContainerCli();
  const bin = await ensureBinary();
  const targets = PRODUCTION_IMAGE_TARGETS;

  console.log(
    `Trivy image gate v${TRIVY_VERSION} cli=${cli} targets=${targets.length} skip_build=${skipBuild}`,
  );

  /** @type {Array<{ id: string, image: string, status: number }>} */
  const results = [];
  for (const target of targets) {
    ensureImageBuilt({ cli, target, cwd: projectRoot, skipBuild });
    const status = scanImage({
      bin,
      image: target.image,
      ignorefile,
      cwd: projectRoot,
    });
    results.push({ id: target.id, image: target.image, status });
    if (status !== 0) {
      console.error(`FAIL: trivy image scan id=${target.id} image=${target.image} exit=${status}`);
    } else {
      console.log(`PASS: trivy image scan id=${target.id} image=${target.image}`);
    }
  }

  const failed = results.filter((r) => r.status !== 0);
  if (failed.length > 0) {
    console.error(
      `FAIL: ${failed.length}/${results.length} production image(s) have CRITICAL/HIGH findings (or scan error)`,
    );
    for (const f of failed) {
      console.error(`  - ${f.id} (${f.image}) exit=${f.status}`);
    }
    process.exit(1);
  }

  console.log(
    `PASS: trivy found no unexcepted CRITICAL/HIGH findings across ${results.length} production image(s)`,
  );
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
