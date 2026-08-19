/**
 * Menu HTTP integration seed helper (IMP-028B).
 */
import { bootstrapExistingMenuPricing } from "../../../src/server/pricing";
import { runExistingMenuImport } from "../../../src/server/catalog/menu-import";
import type { Persistence } from "../../../src/server/persistence/types";

export async function seedDirectMenuCatalog(persistence: Persistence): Promise<string> {
  const imported = await runExistingMenuImport({
    projectRoot: process.cwd(),
    persistence,
    apply: true,
  });
  await bootstrapExistingMenuPricing({
    projectRoot: process.cwd(),
    persistence,
    apply: true,
  });
  return imported.brandId;
}
