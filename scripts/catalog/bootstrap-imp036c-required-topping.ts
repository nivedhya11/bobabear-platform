#!/usr/bin/env -S node --conditions=react-server --import tsx
/** Bootstrap the fixed IMP-036C Founder-UAT required Topping artifact. */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { loadConfig } from "../../src/platform/config/load-config";
import { bootstrapImp028cModifiers, Imp028cModifiersBootstrapError, validateImp028cModifiersArtifactStructure } from "../../src/server/catalog/imp028c-modifiers";
import { getApplicationPersistence } from "../../src/server/persistence";

const artifactPath = "data/platform/catalog/imp036c-hong-kong-required-topping-v1.json";

function parseArgs(argv: readonly string[]): boolean {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--dry-run")) return false;
  if (argv.length === 1 && argv[0] === "--apply") return true;
  throw new Imp028cModifiersBootstrapError("validation", { message: "Only --apply or --dry-run is supported." });
}

function loadArtifact(projectRoot: string) {
  const raw = JSON.parse(readFileSync(path.join(projectRoot, artifactPath), "utf8")) as Record<string, unknown>;
  if (raw.import_id !== "imp036c-hong-kong-required-topping-v1" || raw.version !== 1) {
    throw new Imp028cModifiersBootstrapError("validation", { message: "Unexpected IMP-036C required Topping artifact identity." });
  }
  const artifact = validateImp028cModifiersArtifactStructure({ ...raw, import_id: "imp028c-hong-kong-modifiers-v1", version: 1 });
  if (
    artifact.modifier_group.name !== "Topping" ||
    artifact.variant_modifier_group.min_total_quantity !== 1 ||
    artifact.variant_modifier_group.max_total_quantity !== 1 ||
    artifact.modifier_options.some((entry) => entry.price.price_delta_paise > 0 && entry.binding.default_quantity !== 0)
  ) {
    throw new Imp028cModifiersBootstrapError("validation", { message: "IMP-036C required Topping semantics violate Founder configuration or D-369." });
  }
  return artifact;
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  loadEnvConfig(projectRoot, true);
  const apply = parseArgs(process.argv.slice(2));
  const persistence = getApplicationPersistence(loadConfig({ processKind: "worker", source: process.env }));
  try {
    const result = await bootstrapImp028cModifiers({ projectRoot, persistence, apply, artifact: loadArtifact(projectRoot) });
    process.stdout.write(`${JSON.stringify({ ok: true, artifact: artifactPath, ...result })}\n`);
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  const payload = error instanceof Imp028cModifiersBootstrapError
    ? { ok: false, ...error.toSafeJSON() }
    : error instanceof ConfigurationError
      ? { ok: false, error: "configuration_error", issues: error.issues }
      : { ok: false, error: error instanceof Error ? error.message : "bootstrap failed" };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = 1;
});
