#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Generate the checked-in static ordering catalog (IMP-025).
 * Deterministic projection from existing-menu-v1 + presentation inventory.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { ORDERING_CATALOG_RELATIVE_PATH } from "../../src/shared/ordering-catalog";
import {
  buildOrderingCatalog,
  serializeOrderingCatalog,
} from "../../src/server/catalog/ordering-catalog/build-ordering-catalog";

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const catalog = buildOrderingCatalog(projectRoot);
  const absolute = path.join(projectRoot, ORDERING_CATALOG_RELATIVE_PATH);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, serializeOrderingCatalog(catalog), "utf8");
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      path: ORDERING_CATALOG_RELATIVE_PATH,
      brandId: catalog.brandId,
      items: catalog.items.length,
      sections: catalog.sections.length,
      sourceInventorySha256: catalog.sourceInventorySha256,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "generate failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
