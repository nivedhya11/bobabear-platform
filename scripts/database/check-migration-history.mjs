#!/usr/bin/env node
/**
 * Migration-history and integrity-manifest validation (IMP-005).
 *
 * Node.js-builtins-only static checks: journal shape/monotonicity, every
 * migration SQL file matches a journal entry (and vice versa), snapshot
 * ancestry, and the sealed migration-integrity manifest
 * (drizzle/migration-integrity.json). Never connects to PostgreSQL — safe
 * to run in `npm run check` / `npm run db:migrations:check`.
 *
 * Usage: node scripts/database/check-migration-history.mjs
 * Exits 0 only if every check passes.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { checkMigrationHistory, readJournal } from "./lib/migration-history.mjs";
import { diffManifestAgainstJournal, readManifest } from "./lib/migration-integrity.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const drizzleDir = path.join(projectRoot, "drizzle");

function main() {
  const historyResult = checkMigrationHistory({ drizzleDir });
  const findings = [...historyResult.findings];
  let unsealed = [];

  const journalResult = readJournal(drizzleDir);
  const manifestResult = readManifest(drizzleDir);
  if (!manifestResult.ok) {
    findings.push(manifestResult.reason);
  } else if (journalResult.ok) {
    const diff = diffManifestAgainstJournal({
      journal: journalResult.journal,
      manifest: manifestResult.manifest,
      drizzleDir,
    });
    findings.push(...diff.findings);
    unsealed = diff.unsealed;
  }

  console.log("Migration-history validation");
  console.log("=".repeat(60));

  if (findings.length > 0) {
    for (const finding of findings) console.log(`  ✗  ${finding}`);
    console.log("=".repeat(60));
    console.log(`${findings.length} problem(s) found.`);
    process.exitCode = 1;
    return;
  }

  console.log("  ✓  Journal is well-formed and monotonic.");
  console.log("  ✓  Every migration SQL file matches a journal entry.");
  console.log("  ✓  Snapshot ancestry is internally consistent.");
  console.log("  ✓  Migration-integrity manifest matches sealed migration SQL.");
  if (unsealed.length > 0) {
    console.log(
      `  !  ${unsealed.length} migration(s) awaiting sealing: ${unsealed.join(", ")} ` +
        '(run "npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS")',
    );
  }
  console.log("=".repeat(60));
  console.log("All checks passed. ✓");
  process.exitCode = 0;
}

main();
