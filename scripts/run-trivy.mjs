#!/usr/bin/env node
/**
 * IMP-038 §15 container/FS scan — download pinned Trivy OSS binary and scan.
 *
 * Avoids aquasecurity/trivy-action / setup-trivy GitHub Actions after the
 * 2026 supply-chain tag compromise. Prefer pinned binary + SHA256 verify.
 *
 * Usage:
 *   node scripts/run-trivy.mjs
 *   npm run audit:container
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

const cacheDir = path.join(projectRoot, ".cache", "trivy", TRIVY_VERSION);
const archivePath = path.join(cacheDir, TRIVY_ARCHIVE);
const binaryPath = path.join(cacheDir, "trivy");

function sha256File(filePath) {
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

async function ensureBinary() {
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

async function main() {
  const bin = await ensureBinary();
  const args = [
    "fs",
    projectRoot,
    "--severity",
    "CRITICAL,HIGH",
    "--exit-code",
    "1",
    "--format",
    "table",
    "--scanners",
    "vuln,misconfig",
    "--skip-dirs",
    "node_modules,.git,.next,out,coverage,.cache,dist-customer-auth,dist-workforce-auth,dist-customer-commerce,dist-operations",
  ];
  console.log(`Running ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status === 0) {
    console.log("PASS: trivy found no CRITICAL/HIGH findings in scanned scope");
    process.exit(0);
  }
  console.error(`FAIL: trivy exited ${result.status}`);
  process.exit(result.status === null ? 1 : result.status);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
