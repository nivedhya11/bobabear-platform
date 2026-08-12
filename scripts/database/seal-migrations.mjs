#!/usr/bin/env node
/**
 * Migration-integrity sealing (IMP-005).
 *
 * Default (no confirmation token): check-only — reports which committed
 * migrations are already sealed and which are pending, and fails if sealing
 * would be unsafe (hash mismatch, historical removal, etc.). Never writes
 * the manifest in this mode.
 *
 * To append newly-generated migrations to the sealed manifest:
 *   npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS
 *
 * Refuses to replace an existing hash, remove a historical migration,
 * reorder historical entries, or seal a migration absent from the journal.
 * Never connects to PostgreSQL.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { checkMigrationHistory, readJournal } from "./lib/migration-history.mjs";
import {
  SEAL_CONFIRMATION_TOKEN,
  buildSealedManifest,
  diffManifestAgainstJournal,
  readManifest,
} from "./lib/migration-integrity.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const drizzleDir = path.join(projectRoot, "drizzle");

/** Parse `--confirm=<token>` (or `--confirm <token>`) from argv. Pure. */
export function parseConfirmation(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--confirm=")) return arg.slice("--confirm=".length);
    if (arg === "--confirm") return argv[i + 1] ?? null;
  }
  return null;
}

function runDrizzleCheck() {
  try {
    execFileSync("npx", ["drizzle-kit", "check", "--config=drizzle.config.ts"], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `drizzle-kit check failed:\n${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`,
    };
  }
}

function main() {
  const token = parseConfirmation(process.argv.slice(2));
  const confirmed = token === SEAL_CONFIRMATION_TOKEN;

  const historyResult = checkMigrationHistory({ drizzleDir });
  if (!historyResult.ok) {
    console.error("db:migrations:seal: migration history is invalid; refusing to seal.");
    for (const finding of historyResult.findings) console.error(`  ✗  ${finding}`);
    process.exitCode = 1;
    return;
  }

  const journalResult = readJournal(drizzleDir);
  const manifestResult = readManifest(drizzleDir);
  if (!journalResult.ok || !manifestResult.ok) {
    console.error(
      `db:migrations:seal: ${(!journalResult.ok && journalResult.reason) || manifestResult.reason}`,
    );
    process.exitCode = 1;
    return;
  }

  const diff = diffManifestAgainstJournal({
    journal: journalResult.journal,
    manifest: manifestResult.manifest,
    drizzleDir,
  });

  if (diff.findings.length > 0) {
    console.error("db:migrations:seal: existing sealed manifest is inconsistent; refusing to seal.");
    for (const finding of diff.findings) console.error(`  ✗  ${finding}`);
    process.exitCode = 1;
    return;
  }

  if (diff.unsealed.length === 0) {
    console.log("db:migrations:seal: no new migrations to seal. Manifest is up to date.");
    process.exitCode = 0;
    return;
  }

  console.log(`db:migrations:seal: ${diff.unsealed.length} migration(s) pending sealing: ${diff.unsealed.join(", ")}`);

  if (!confirmed) {
    console.log(
      "db:migrations:seal: check-only mode (no manifest written). To seal these migrations, run:\n" +
        "  npm run db:migrations:seal -- --confirm=SEAL_NEW_BOBA_BEAR_MIGRATIONS",
    );
    process.exitCode = 0;
    return;
  }

  const drizzleCheck = runDrizzleCheck();
  if (!drizzleCheck.ok) {
    console.error(`db:migrations:seal: ${drizzleCheck.reason}`);
    console.error("db:migrations:seal: refusing to seal while Drizzle migration consistency fails.");
    process.exitCode = 1;
    return;
  }

  const sealResult = buildSealedManifest({
    journal: journalResult.journal,
    manifest: manifestResult.manifest,
    drizzleDir,
    tagsToSeal: diff.unsealed,
  });
  if (!sealResult.ok) {
    console.error(`db:migrations:seal: ${sealResult.reason}`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(
    path.join(drizzleDir, "migration-integrity.json"),
    `${JSON.stringify(sealResult.manifest, null, 2)}\n`,
  );
  console.log(`db:migrations:seal: sealed ${diff.unsealed.length} migration(s).`);
  process.exitCode = 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
