#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Import the fixed existing-menu-v1 manifest (IMP-013).
 *
 * Default: dry-run (no business writes).
 * Writes require explicit --apply.
 *
 * Arbitrary --file/--url/stdin manifests are rejected.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import {
  MenuImportError,
  rejectArbitraryManifestPath,
  runExistingMenuImport,
} from "../../src/server/catalog/menu-import";
import { getApplicationPersistence } from "../../src/server/persistence";

function parseArgs(argv: readonly string[]): { apply: boolean } {
  rejectArbitraryManifestPath(argv);
  let apply = false;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg.startsWith("--")) {
      throw new MenuImportError("validation", `Unsupported flag: ${arg}`);
    }
  }
  return { apply };
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);

  const { apply } = parseArgs(process.argv.slice(2));
  const config = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(config);

  try {
    const result = await runExistingMenuImport({ projectRoot, persistence, apply });
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        mode: result.mode,
        import_id: result.import_id,
        version: result.version,
        outcome: result.outcome,
        brandId: result.brandId,
        counts: result.counts,
      })}\n`,
    );
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof MenuImportError) {
    process.stderr.write(`${JSON.stringify({ ok: false, ...error.toSafeJSON() })}\n`);
    process.exitCode = 1;
    return;
  }
  if (error instanceof ConfigurationError) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: "configuration_error", issues: error.issues })}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const message = error instanceof Error ? error.message : "import failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
