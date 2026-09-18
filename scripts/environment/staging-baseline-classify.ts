#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Read-only Founder staging baseline classifier CLI.
 *
 * Prints stable non-secret markers for staging deploy evidence.
 * Never writes business state.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  classifyStagingBaseline,
  stagingBaselineMarkerLines,
} from "../../src/server/staging/baseline-compatibility";

async function main(): Promise<void> {
  if (process.argv.slice(2).length > 0) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: "staging baseline classify accepts no arguments" })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  const config = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(config);

  try {
    const classification = await classifyStagingBaseline({ projectRoot, persistence });
    for (const line of stagingBaselineMarkerLines(classification)) {
      process.stdout.write(`${line}\n`);
    }
    if (classification.state === "PARTIAL_OR_INCOMPATIBLE" && classification.reasons.length > 0) {
      process.stdout.write(
        `STAGING_BASELINE_REASON_COUNT ${classification.reasons.length}\n`,
      );
    }
    process.stdout.write(`${JSON.stringify({ ok: true, ...classification })}\n`);
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: "configuration_error", issues: error.issues })}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const message = error instanceof Error ? error.message : "staging baseline classify failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
