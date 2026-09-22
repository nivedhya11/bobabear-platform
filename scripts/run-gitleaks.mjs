#!/usr/bin/env node
/**
 * IMP-038 §15 secret scan — download pinned gitleaks OSS release and detect.
 * Prefer free/OSS binary over licensed org GitHub Action.
 *
 * Usage:
 *   node scripts/run-gitleaks.mjs
 *   npm run audit:secrets
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

/** Pinned gitleaks release (linux amd64). Update pin map when bumping. */
export const GITLEAKS_VERSION = "8.30.1";
export const GITLEAKS_ARCHIVE = `gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`;
export const GITLEAKS_URL =
  `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${GITLEAKS_ARCHIVE}`;
export const GITLEAKS_SHA256 =
  "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb";

const cacheDir = path.join(projectRoot, ".cache", "gitleaks", GITLEAKS_VERSION);
const archivePath = path.join(cacheDir, GITLEAKS_ARCHIVE);
const binaryPath = path.join(cacheDir, "gitleaks");

/**
 * @param {string} filePath
 * @returns {string}
 */
function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

/**
 * @param {string} url
 * @param {string} dest
 */
async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`DOWNLOAD_FAILED status=${res.status} url=${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
}

async function ensureBinary() {
  mkdirSync(cacheDir, { recursive: true });
  if (existsSync(binaryPath)) {
    return binaryPath;
  }
  if (!existsSync(archivePath) || sha256File(archivePath) !== GITLEAKS_SHA256) {
    console.log(`Downloading gitleaks v${GITLEAKS_VERSION}…`);
    await download(GITLEAKS_URL, archivePath);
  }
  const digest = sha256File(archivePath);
  if (digest !== GITLEAKS_SHA256) {
    throw new Error(`GITLEAKS_SHA_MISMATCH expected=${GITLEAKS_SHA256} got=${digest}`);
  }
  const extracted = spawnSync("tar", ["-xzf", archivePath, "-C", cacheDir, "gitleaks"], {
    encoding: "utf8",
  });
  if (extracted.status !== 0) {
    throw new Error(`GITLEAKS_EXTRACT_FAILED: ${extracted.stderr || extracted.stdout}`);
  }
  chmodSync(binaryPath, 0o755);
  return binaryPath;
}

async function main() {
  const bin = await ensureBinary();
  const configPath = path.join(projectRoot, ".gitleaks.toml");
  const args = [
    "detect",
    "--source",
    projectRoot,
    "--redact",
    "--no-banner",
    "--exit-code",
    "1",
  ];
  if (existsSync(configPath)) {
    args.push("--config", configPath);
  }
  console.log(`Running ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status === 0) {
    console.log("PASS: gitleaks found no secrets");
    process.exit(0);
  }
  console.error(`FAIL: gitleaks exited ${result.status}`);
  process.exit(result.status === null ? 1 : result.status);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
