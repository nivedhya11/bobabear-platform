#!/usr/bin/env node
/**
 * Deterministic IMP-023 Order source fingerprint.
 *
 * Algorithm: for every manifest file in sorted relative-path order,
 * append `relative path`, NUL, file bytes, NUL; then SHA-256 the stream.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GLOBS = [
  // Migration + Drizzle integrity for 0017_order
  "drizzle/0017_order.sql",
  "drizzle/migration-integrity.json",
  "drizzle/meta/_journal.json",
  "drizzle/meta/0017_snapshot.json",
  // Schema + shared contracts + domain/application
  "src/platform/database/schema/order.ts",
  "src/shared/order",
  "src/server/order",
  // Cart / Payment Order integrations
  "src/server/cart/finalize-after-order.ts",
  "src/server/cart/index.ts",
  "src/server/payment/order-materialize-hook.ts",
  "src/server/payment/operations.ts",
  // RBAC permission/role catalog (55 permissions)
  "src/shared/access-control/catalog.ts",
  // Order audit + fingerprint tool
  "scripts/audit-order.mjs",
  "scripts/fingerprint-order.mjs",
  // Predecessor audits changed specifically to accept IMP-023 / migration 18
  "scripts/audit-access-control.mjs",
  "scripts/audit-auth-foundation.mjs",
  "scripts/audit-cart.mjs",
  "scripts/audit-catalog.mjs",
  "scripts/audit-checkout.mjs",
  "scripts/audit-customer-addresses.mjs",
  "scripts/audit-customer-phone-auth.mjs",
  "scripts/audit-payment.mjs",
  "scripts/audit-serviceability.mjs",
  "scripts/audit-workforce-auth.mjs",
  // Order tests (domain/security/auth/concurrency/crash/DB)
  "tests/order",
  "tests/order-security",
  "tests/order-auth-integration",
  "tests/order-concurrency",
  "tests/order-crash",
  "tests/database/order.integration.test.ts",
  "tests/database/support/order-fixtures.ts",
  "tests/access-control/catalog.test.ts",
  // Relevant Vitest database config (Order suite includes)
  "vitest.database.config.mts",
];

function trackedFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return new Set(out.split("\n").filter(Boolean));
}

function walk(rel) {
  const abs = path.join(projectRoot, rel);
  if (!existsSync(abs)) return [];
  const st = statSync(abs);
  if (st.isFile()) return [rel.replace(/\\/g, "/")];
  const out = [];
  for (const name of readdirSync(abs).sort()) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    out.push(...walk(path.join(rel, name)));
  }
  return out;
}

function main() {
  const tracked = trackedFiles();
  const files = new Set();
  for (const g of GLOBS) {
    for (const f of walk(g)) {
      if (tracked.has(f) || existsSync(path.join(projectRoot, f))) {
        files.add(f);
      }
    }
  }

  // Always include package.json scripts region via the whole file when order scripts present
  if (existsSync(path.join(projectRoot, "package.json"))) {
    files.add("package.json");
  }
  if (existsSync(path.join(projectRoot, "AGENTS.md"))) {
    files.add("AGENTS.md");
  }

  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const hash = createHash("sha256");
  const nul = Buffer.from([0]);
  for (const rel of sorted) {
    hash.update(rel, "utf8");
    hash.update(nul);
    hash.update(readFileSync(path.join(projectRoot, rel)));
    hash.update(nul);
  }
  const digest = hash.digest("hex");
  process.stdout.write(
    JSON.stringify({ algorithm: "sha256", fileCount: sorted.length, files: sorted, sha256: digest }, null, 2) +
      "\n",
  );
}

main();
