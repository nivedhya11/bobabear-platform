#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Bootstrap Brand pricing from existing-menu-v1 (IMP-015).
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
import { rejectArbitraryManifestPath } from "../../src/server/catalog/menu-import";
import {
  PricingBootstrapError,
  bootstrapExistingMenuPricing,
} from "../../src/server/pricing";
import { getApplicationPersistence } from "../../src/server/persistence";

function parseArgs(argv: readonly string[]): { apply: boolean } {
  rejectArbitraryManifestPath(argv);
  let apply = false;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg.startsWith("--")) {
      throw new PricingBootstrapError("validation", `Unsupported flag: ${arg}`);
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
    const result = await bootstrapExistingMenuPricing({
      projectRoot,
      persistence,
      apply,
    });
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        mode: result.mode,
        outcome: result.outcome,
        brandId: result.brandId,
        priceBookId: result.priceBookId,
        derivedVariantPriceCount: result.derivedVariantPriceCount,
        counts: result.counts,
      })}\n`,
    );
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
  const message = error instanceof Error ? error.message : "bootstrap failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
