#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Verify existing-menu Brand pricing (IMP-015). Read-only.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import {
  PricingBootstrapError,
  verifyExistingMenuPricing,
} from "../../src/server/pricing";
import { getApplicationPersistence } from "../../src/server/persistence";

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);

  const config = loadConfig({ processKind: "worker", source: process.env });
  const persistence = getApplicationPersistence(config);

  try {
    const result = await verifyExistingMenuPricing({ projectRoot, persistence });
    process.stdout.write(`${JSON.stringify({ ...result })}\n`);
    if (!result.ok) process.exitCode = 1;
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof PricingBootstrapError) {
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
