#!/usr/bin/env node
/**
 * Deterministic governance fingerprint (path + bytes SHA-256).
 * Usage: node scripts/governance-fingerprint.mjs
 *
 * Manifest paths are exact strings hashed as written. The Decision Register
 * entry must exist as the exact directory entry
 * `docs/platform/decision-register.md` (no case-insensitive aliasing).
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DECISION_REGISTER_REL = "docs/platform/decision-register.md";

const EXPLICIT = [
  "AGENTS.md",
  "package.json",
  "docs/platform/VISION.md",
  "docs/platform/ARCHITECTURE.md",
  DECISION_REGISTER_REL,
  "docs/platform/ROADMAP.md",
  "docs/platform/STATE.md",
  "docs/platform/PRODUCT-DELIVERY.md",
  "docs/platform/TESTING.md",
  "docs/platform/README.md",
  "docs/platform/implementation-roadmap.md",
  "docs/platform/decision-register-historical.md",
  "docs/platform/accepted-foundation-operating-rules.md",
  "docs/platform/product-vision.md",
  "docs/platform/v1-product-scope.md",
  "docs/platform/roadmap-and-open-decisions.md",
  "docs/platform/architecture-foundation.md",
  "docs/platform/architecture-readiness-review.md",
  "docs/platform/operating-model.md",
  "docs/platform/order-payment-delivery-model.md",
  "docs/platform/organization-outlet-access-model.md",
  "docs/platform/decisions/ADR-005-organization-outlet-authorization.md",
  "docs/platform/decisions/ADR-007-pricing-tax-charges-promotions.md",
  "docs/platform/decisions/ADR-010-order-lifecycle-operations-console.md",
  "docs/platform/decisions/ADR-014-http-api-route-handlers-contracts.md",
  "scripts/project-consistency.mjs",
  "scripts/project-consistency.test.mjs",
  "scripts/governance-fingerprint.mjs",
  "README.md",
];

const PRODUCT_DIR_REL = "docs/platform/product";
const HISTORY_DIR_REL = "docs/platform/history";

const REQUIRED_PRODUCT_MARKDOWN = [
  "docs/platform/product/README.md",
  "docs/platform/product/personas.md",
  "docs/platform/product/golden-journeys.md",
  "docs/platform/product/templates/product-definition-template.md",
];

const REQUIRED_HISTORY_MARKDOWN = [
  "docs/platform/history/README.md",
  "docs/platform/history/ROADMAP-GTM-R113-pre-compression.md",
  "docs/platform/history/STATE-STATE-R111-pre-compression.md",
];

/**
 * Recursively collect tracked Markdown under a docs/platform subtree.
 * Prefer git ls-files so future files are included automatically without editing
 * this manifest list; fall back to filesystem walk when git is unavailable
 * (ephemeral mirrors).
 * @param {string} dirRel
 * @param {string[]} requiredRels
 * @returns {string[]} normalized relative paths, sorted, unique
 */
function collectTrackedMarkdownRels(dirRel, requiredRels) {
  const head = spawnSync("git", ["-C", projectRoot, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
  });
  /** @type {string[]} */
  let rels = [];
  if (head.status === 0) {
    const listed = spawnSync(
      "git",
      ["-C", projectRoot, "ls-files", "--full-name", "--", dirRel],
      { encoding: "utf8" },
    );
    if (listed.status !== 0) {
      console.error(`GIT_LS_FILES_FAILED ${dirRel}`);
      process.exit(2);
    }
    rels = listed.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((p) => p.replace(/\\/g, "/"))
      .filter((p) => p.startsWith(`${dirRel}/`) && p.toLowerCase().endsWith(".md"));
  } else {
    const absRoot = path.join(projectRoot, dirRel);
    if (!existsSync(absRoot)) {
      console.error(`MISSING ${dirRel}/`);
      process.exit(2);
    }
    /** @param {string} dir */
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const abs = path.join(dir, name);
        const st = statSync(abs);
        if (st.isDirectory()) walk(abs);
        else if (st.isFile() && name.toLowerCase().endsWith(".md")) {
          rels.push(path.relative(projectRoot, abs).replace(/\\/g, "/"));
        }
      }
    };
    walk(absRoot);
  }

  const unique = [...new Set(rels)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const required of requiredRels) {
    if (!unique.includes(required)) {
      console.error(`MISSING ${required}`);
      process.exit(2);
    }
  }
  return unique;
}

/**
 * Recursively collect tracked Markdown under docs/platform/product/.
 * @returns {string[]} normalized relative paths, sorted, unique
 */
function collectProductMarkdownRels() {
  return collectTrackedMarkdownRels(PRODUCT_DIR_REL, REQUIRED_PRODUCT_MARKDOWN);
}

/**
 * Recursively collect tracked Markdown under docs/platform/history/.
 * @returns {string[]} normalized relative paths, sorted, unique
 */
function collectHistoryMarkdownRels() {
  return collectTrackedMarkdownRels(HISTORY_DIR_REL, REQUIRED_HISTORY_MARKDOWN);
}

/**
 * Exact directory-entry check for a relative file (basename must match).
 * @param {string} rel
 */
function assertExactDirEntry(rel) {
  const abs = path.join(projectRoot, rel);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  let names;
  try {
    names = readdirSync(dir);
  } catch (err) {
    console.error(`READDIR_FAILED ${rel}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
  if (!names.includes(base)) {
    const ci = names.find((n) => n.toLowerCase() === base.toLowerCase());
    if (ci) {
      console.error(`WRONG_CASE ${rel} (directory entry is ${ci})`);
    } else {
      console.error(`MISSING_EXACT ${rel}`);
    }
    process.exit(2);
  }
}

/**
 * Prefer git's tracked pathname list for exact path proof when available.
 * Skips when git is unavailable or the work tree has no HEAD (e.g. ephemeral
 * validation mirrors that only need directory-entry exactness).
 * @param {string} rel
 */
function assertTrackedExactPath(rel) {
  const head = spawnSync("git", ["-C", projectRoot, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
  });
  if (head.status !== 0) return;

  const result = spawnSync(
    "git",
    ["-C", projectRoot, "ls-files", "--full-name", "--", rel],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(`GIT_LS_FILES_FAILED ${rel}`);
    process.exit(2);
  }
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  if (!lines.includes(rel)) {
    console.error(`NOT_TRACKED_EXACT ${rel} (git ls-files did not return exact path)`);
    process.exit(2);
  }
}

// Portability gate: Decision Register must be the exact lowercase tracked path.
assertExactDirEntry(DECISION_REGISTER_REL);
assertTrackedExactPath(DECISION_REGISTER_REL);

const productRels = collectProductMarkdownRels();
const historyRels = collectHistoryMarkdownRels();
const manifestRels = [
  ...new Set([...EXPLICIT.map((r) => r.replace(/\\/g, "/")), ...productRels, ...historyRels]),
].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const resolved = [];
for (const rel of manifestRels) {
  const abs = path.join(projectRoot, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    console.error(`MISSING ${rel}`);
    process.exit(2);
  }
  resolved.push({ rel, abs });
}

const hash = createHash("sha256");
for (const { rel, abs } of resolved) {
  hash.update(rel);
  hash.update("\0");
  hash.update(readFileSync(abs));
  hash.update("\0");
}

const digest = hash.digest("hex");
console.log(`GOVERNANCE_FINGERPRINT ${digest}`);
console.log("MANIFEST_BEGIN");
for (const { rel } of resolved) console.log(rel);
console.log("MANIFEST_END");
console.log(`FILE_COUNT ${resolved.length}`);
