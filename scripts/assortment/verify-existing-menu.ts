#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Verify Brand assortment includes against existing-menu-v1 (IMP-014).
 * Read-only. No writes.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import { rejectArbitraryManifestPath } from "../../src/server/catalog/menu-import";
import { AssortmentBootstrapError } from "../../src/server/assortment";
import { verifyExistingMenuAssortment } from "../../src/server/assortment/verify";
import { getApplicationPersistence } from "../../src/server/persistence";

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  rejectArbitraryManifestPath(process.argv.slice(2));

  const config = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(config);

  try {
    const result = await verifyExistingMenuAssortment({ projectRoot, persistence });
    process.stdout.write(`${JSON.stringify({ ok: true, verify: result })}\n`);
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof AssortmentBootstrapError) {
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
  const message = error instanceof Error ? error.message : "verify failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
