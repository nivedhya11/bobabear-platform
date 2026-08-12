#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * One-shot generator for the checked-in existing-menu-v1 manifest.
 * Not a production apply path — runtime import loads the fixed file only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../src/shared/catalog/menu";
import { buildExistingMenuV1Manifest } from "../../src/server/catalog/menu-import";

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const manifest = buildExistingMenuV1Manifest(projectRoot);
  const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      path: EXISTING_MENU_MANIFEST_RELATIVE_PATH,
      products: manifest.products.length,
      sections: manifest.sections.length,
      entries: manifest.entries.length,
      source_inventory_sha256: manifest.source_inventory_sha256,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "generate failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
