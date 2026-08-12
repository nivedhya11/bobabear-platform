#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Inventory the authoritative static menu source (IMP-013).
 * Read-only. No database writes.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  computeSourceInventorySha256,
  inventoryAuthoritativeMenuSource,
  summarizeInventory,
} from "../../src/server/catalog/menu-import";

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const inventory = inventoryAuthoritativeMenuSource(projectRoot);
  const summary = summarizeInventory(inventory);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        source_inventory_sha256: computeSourceInventorySha256(projectRoot),
        ...summary,
        position_convention: "zero-based within each parent",
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "inventory failed";
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
