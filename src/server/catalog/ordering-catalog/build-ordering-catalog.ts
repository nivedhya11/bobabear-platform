/**
 * Deterministic static ordering-catalog projection (IMP-025).
 *
 * Joins canonical import identity with presentation inventory by source_key.
 * Does not invent modifiers, variants, or browser UUIDs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
} from "../../../shared/catalog/menu";
import type { ExistingMenuV1Manifest } from "../menu-import/manifest-types";
import { inventoryAuthoritativeMenuSource } from "../menu-import/source-inventory";
import { stableUuid } from "../menu-import/stable-ids";
import type { OrderingCatalog, OrderingCatalogItem } from "../../../shared/ordering-catalog/types";

export class OrderingCatalogError extends Error {
  readonly code: "PARITY_DRIFT" | "VALIDATION";

  constructor(code: "PARITY_DRIFT" | "VALIDATION", message: string) {
    super(message);
    this.name = "OrderingCatalogError";
    this.code = code;
  }
}

function loadManifest(projectRoot: string): ExistingMenuV1Manifest {
  const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  return JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
}

export function buildOrderingCatalog(projectRoot: string): OrderingCatalog {
  const manifest = loadManifest(projectRoot);
  const inventory = inventoryAuthoritativeMenuSource(projectRoot);

  if (manifest.expected_zeros.modifier_groups !== 0 || manifest.expected_zeros.modifier_options !== 0) {
    throw new OrderingCatalogError(
      "VALIDATION",
      "Ordering catalog refuses to invent modifiers; expected_zeros.modifier_* must be 0.",
    );
  }

  const provenBrandId = stableUuid("brand:boba-bear");
  if (manifest.brand.id !== provenBrandId) {
    throw new OrderingCatalogError(
      "PARITY_DRIFT",
      `Manifest brand.id ${manifest.brand.id} does not match proven brand identity ${provenBrandId}.`,
    );
  }

  const inventoryBySourceKey = new Map(inventory.cards.map((card) => [card.sourceKey, card]));
  const productBySourceKey = new Map(manifest.products.map((p) => [p.source_key, p]));
  const entryBySourceKey = new Map(manifest.entries.map((e) => [e.source_key, e]));

  const extraInventory = inventory.cards
    .filter((card) => !productBySourceKey.has(card.sourceKey))
    .map((card) => card.sourceKey);
  const extraManifest = manifest.products
    .filter((p) => !inventoryBySourceKey.has(p.source_key))
    .map((p) => p.source_key);
  if (extraInventory.length > 0 || extraManifest.length > 0) {
    throw new OrderingCatalogError(
      "PARITY_DRIFT",
      `source_key mismatch. extraInventory=[${extraInventory.join(", ")}] extraManifest=[${extraManifest.join(", ")}]`,
    );
  }

  const items: OrderingCatalogItem[] = inventory.cards.map((card) => {
    const product = productBySourceKey.get(card.sourceKey);
    const entry = entryBySourceKey.get(card.sourceKey);
    if (!product || !entry) {
      throw new OrderingCatalogError(
        "PARITY_DRIFT",
        `Missing product/entry identity for ${card.sourceKey}.`,
      );
    }
    const expectedVariantId = stableUuid(`variant:${card.sourceKey}:default`);
    if (product.variant.id !== expectedVariantId) {
      throw new OrderingCatalogError(
        "PARITY_DRIFT",
        `variant.id mismatch for ${card.sourceKey}: manifest=${product.variant.id} expected=${expectedVariantId}.`,
      );
    }
    if (product.id !== stableUuid(`product:${card.sourceKey}`)) {
      throw new OrderingCatalogError(
        "PARITY_DRIFT",
        `product.id mismatch for ${card.sourceKey}.`,
      );
    }
    if (!card.imagePath) {
      throw new OrderingCatalogError("VALIDATION", `Missing image path for ${card.sourceKey}.`);
    }
    return Object.freeze({
      sourceKey: card.sourceKey,
      productId: product.id,
      variantId: product.variant.id,
      sectionId: entry.section_id,
      name: card.name,
      description: card.description,
      imagePath: card.imagePath,
      presentationPriceRupees: card.price,
      tags: Object.freeze([...card.tags]),
      categorySlug: card.categorySlug,
      subcategoryName: card.subcategoryName,
      position: card.itemIndex,
    });
  });

  const sections = manifest.sections.map((section) =>
    Object.freeze({
      id: section.id,
      sourceKey: section.source_key,
      name: section.name,
      parentSectionId: section.parent_section_id,
      position: section.position,
    }),
  );

  return Object.freeze({
    brandId: manifest.brand.id,
    brandCode: manifest.brand.code,
    importId: manifest.import_id,
    importVersion: manifest.version,
    sourceInventorySha256: manifest.source_inventory_sha256,
    sections: Object.freeze(sections),
    items: Object.freeze(items),
  });
}

export function serializeOrderingCatalog(catalog: OrderingCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
