/**
 * Static ordering catalog ↔ import manifest identity parity (IMP-025).
 *
 * NO database. Uses default vitest config.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../src/shared/catalog/menu";
import type { ExistingMenuV1Manifest } from "../../src/server/catalog/menu-import/manifest-types";
import { inventoryAuthoritativeMenuSource } from "../../src/server/catalog/menu-import/source-inventory";
import { stableUuid } from "../../src/server/catalog/menu-import/stable-ids";
import {
  buildOrderingCatalog,
  serializeOrderingCatalog,
} from "../../src/server/catalog/ordering-catalog/build-ordering-catalog";
import { ORDERING_CATALOG_RELATIVE_PATH } from "../../src/shared/ordering-catalog";
import type { OrderingCatalog } from "../../src/shared/ordering-catalog";

const projectRoot = process.cwd();

function loadCheckedInCatalog(): OrderingCatalog {
  return JSON.parse(
    readFileSync(path.join(projectRoot, ORDERING_CATALOG_RELATIVE_PATH), "utf8"),
  ) as OrderingCatalog;
}

function loadManifest(): ExistingMenuV1Manifest {
  return JSON.parse(
    readFileSync(path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH), "utf8"),
  ) as ExistingMenuV1Manifest;
}

describe("IMP-025 ordering catalog parity", () => {
  it("is deterministic and matches the checked-in artifact", () => {
    const first = buildOrderingCatalog(projectRoot);
    const second = buildOrderingCatalog(projectRoot);
    expect(first).toEqual(second);
    expect(serializeOrderingCatalog(first)).toBe(serializeOrderingCatalog(second));

    const checkedIn = loadCheckedInCatalog();
    expect(checkedIn).toEqual(first);
  });

  it("projects canonical brandId and per-item variantId from the import manifest", () => {
    const catalog = buildOrderingCatalog(projectRoot);
    const manifest = loadManifest();
    const inventory = inventoryAuthoritativeMenuSource(projectRoot);

    expect(catalog.brandId).toBe(manifest.brand.id);
    expect(catalog.brandId).toBe(stableUuid("brand:boba-bear"));
    expect(catalog.brandId).toBe("56ff7724-d511-5ef4-b5d5-d629cbfb2388");
    expect(catalog.items.length).toBe(manifest.products.length);
    expect(catalog.items.length).toBe(inventory.cards.length);

    for (const product of manifest.products) {
      const item = catalog.items.find((i) => i.sourceKey === product.source_key);
      expect(item, `missing catalog item for ${product.source_key}`).toBeDefined();
      expect(item!.productId).toBe(product.id);
      expect(item!.variantId).toBe(product.variant.id);
      expect(item!.variantId).toBe(stableUuid(`variant:${product.source_key}:default`));
    }
  });

  it("fails closed on source_key or identity drift", () => {
    const catalog = buildOrderingCatalog(projectRoot);
    const manifest = loadManifest();
    const catalogKeys = new Set(catalog.items.map((i) => i.sourceKey));
    const manifestKeys = new Set(manifest.products.map((p) => p.source_key));
    expect([...catalogKeys].sort()).toEqual([...manifestKeys].sort());

    for (const item of catalog.items) {
      const product = manifest.products.find((p) => p.source_key === item.sourceKey);
      expect(product).toBeDefined();
      expect(item.variantId).toBe(product!.variant.id);
      expect(item.productId).toBe(product!.id);
    }
  });
});
