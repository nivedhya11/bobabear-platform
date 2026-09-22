#!/usr/bin/env node
/**
 * Detect whether a PR touches Dockerfile / docker runtime paths that should
 * trigger the Trivy container/filesystem scan (IMP-038 §15).
 *
 * Usage:
 *   node scripts/ci-container-scan-paths.mjs
 *
 * Exit 0 always. Prints container_scan=true|false and sets GITHUB_OUTPUT.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTAINER_PATH_PREFIXES = [
  "Dockerfile",
  "Containerfile",
  "docker/",
  "docker-compose",
  "compose.yaml",
  "compose.yml",
  ".dockerignore",
];

function parseArgs(argv) {
  let base = process.env.GITHUB_BASE_SHA || process.env.CI_BASE_SHA || "";
  let head = process.env.GITHUB_HEAD_SHA || process.env.CI_HEAD_SHA || "HEAD";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base") base = argv[++i] ?? base;
    else if (arg === "--head") head = argv[++i] ?? head;
  }
  return { base, head };
}

function listChangedFiles(base, head) {
  if (!base) {
    try {
      const mergeBase = execFileSync("git", ["merge-base", "origin/main", head], {
        encoding: "utf8",
      }).trim();
      base = mergeBase;
    } catch {
      base = "HEAD~1";
    }
  }
  const out = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * @param {string} filePath
 */
export function isContainerScanPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    normalized === "Dockerfile" ||
    normalized === "Containerfile" ||
    normalized === ".dockerignore" ||
    normalized === "compose.yaml" ||
    normalized === "compose.yml"
  ) {
    return true;
  }
  if (normalized.startsWith("docker/")) return true;
  if (normalized.startsWith("docker-compose")) return true;
  if (/(^|\/)Dockerfile$/.test(normalized)) return true;
  if (/(^|\/)Containerfile$/.test(normalized)) return true;
  if (/(^|\/)\.dockerignore$/.test(normalized)) return true;
  if (/(^|\/)compose\.ya?ml$/.test(normalized)) return true;
  if (/(^|\/)docker-compose[^/]*\.ya?ml$/.test(normalized)) return true;
  return false;
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2));
  const files = listChangedFiles(base, head);
  const hit = files.some(isContainerScanPath);
  const value = hit ? "true" : "false";
  console.log(`container_scan=${value}`);
  if (hit) {
    for (const f of files.filter(isContainerScanPath)) {
      console.log(`  matched: ${f}`);
    }
  }
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    appendFileSync(out, `container_scan=${value}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
