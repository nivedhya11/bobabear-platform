#!/usr/bin/env node
/**
 * Detect whether a PR touches Admin / Operations / Auth / security surfaces
 * that must run HTTP integration suites before autonomous merge (IMP-038).
 *
 * Usage:
 *   node scripts/ci-security-sensitive-paths.mjs [--base <sha>] [--head <sha>]
 *
 * Exit 0 always. Prints:
 *   security_sensitive=true|false
 * and sets GITHUB_OUTPUT when present.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const SECURITY_SENSITIVE_PREFIXES = [
  "src/server/security/",
  "src/server/operations/",
  "src/server/administration/",
  "src/server/workforce-auth/",
  "src/server/customer-auth/",
  "src/server/auth/",
  "src/server/refund/",
  "src/server/access-control/",
  "src/lib/administration/",
  "src/lib/operations/",
  "src/lib/workforce-auth/",
  "src/lib/customer-auth/",
  "src/shared/workforce-auth/",
  "src/shared/customer-auth/",
  "src/components/administration/",
  "src/components/operations/",
  "src/components/workforce/",
  "tests/administration/",
  "tests/operations/",
  "tests/workforce-auth/",
  "tests/customer-auth/",
  "tests/database/workforce-",
  "tests/database/access-control",
  "tests/database/customer-phone-auth",
  "tests/administration/support/workforce-step-up",
  "docker/nginx/",
  "drizzle/",
  ".github/workflows/ci.yml",
  ".github/workflows/nightly-verification.yml",
  "package.json",
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
    // Fall back: compare against merge-base with origin/main when available.
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

function isSecuritySensitive(pathRel) {
  return SECURITY_SENSITIVE_PREFIXES.some(
    (prefix) => pathRel === prefix || pathRel.startsWith(prefix),
  );
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2));
  const files = listChangedFiles(base, head);
  const matched = files.filter(isSecuritySensitive);
  const securitySensitive = matched.length > 0;
  const line = `security_sensitive=${securitySensitive ? "true" : "false"}`;
  process.stdout.write(`${line}\n`);
  if (matched.length > 0) {
    process.stdout.write(`matched_count=${matched.length}\n`);
  }
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(githubOutput, `${line}\n`);
  }
  process.exitCode = 0;
}

main();
