/**
 * Reviewed v1 manifest ↔ authoritative static menu source (IMP-013).
 *
 * NO database. Uses default vitest config — imports modules that do not carry
 * `import "server-only"` (never the menu-import package index).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildExistingMenuV1Manifest } from "../../src/server/catalog/menu-import/build-manifest";
import type { ExistingMenuV1Manifest } from "../../src/server/catalog/menu-import/manifest-types";
import { computeSourceInventorySha256 } from "../../src/server/catalog/menu-import/source-digest";
import { inventoryAuthoritativeMenuSource } from "../../src/server/catalog/menu-import/source-inventory";
import {
  BOBA_BEAR_BRAND_CODE,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
} from "../../src/shared/catalog/menu";

const projectRoot = process.cwd();

function loadCheckedInManifest(): ExistingMenuV1Manifest {
  const absolute = path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  return JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
}

describe("existing-menu-v1 parity (static source ↔ checked-in manifest)", () => {
  it("accounts for every source card with matching digest, text, order, images, and hierarchy", () => {
    const inventory = inventoryAuthoritativeMenuSource(projectRoot);
    const digest = computeSourceInventorySha256(projectRoot);
    const built = buildExistingMenuV1Manifest(projectRoot);
    const manifest = loadCheckedInManifest();

    // Reviewed v1 snapshot evidence — 74 is historical reviewed count, not a domain rule.
    expect(inventory.cards.length).toBe(74);
    expect(inventory.cards.length).toBe(manifest.products.length);
    expect(inventory.cards.length).toBe(manifest.entries.length);
    expect(built.products.length).toBe(manifest.products.length);

    expect(digest).toBe(manifest.source_inventory_sha256);
    expect(built.source_inventory_sha256).toBe(manifest.source_inventory_sha256);
    expect(built).toEqual(manifest);

    expect(manifest.import_id).toBe(EXISTING_MENU_IMPORT_ID);
    expect(manifest.brand.code).toBe(BOBA_BEAR_BRAND_CODE);

    // Hierarchy: root + child sections match inventory; positions are zero-based.
    expect(manifest.sections.filter((s) => s.parent_section_id === null).length).toBe(
      inventory.rootSections.length,
    );
    expect(manifest.sections.filter((s) => s.parent_section_id !== null).length).toBe(
      inventory.childSections.length,
    );
    for (const root of inventory.rootSections) {
      const section = manifest.sections.find((s) => s.source_key === root.sourceKey);
      expect(section).toBeDefined();
      expect(section!.name).toBe(root.name);
      expect(section!.position).toBe(root.position);
      expect(section!.parent_section_id).toBeNull();
      expect(section!.position).toBeGreaterThanOrEqual(0);
    }
    for (const child of inventory.childSections) {
      const section = manifest.sections.find((s) => s.source_key === child.sourceKey);
      expect(section).toBeDefined();
      expect(section!.name).toBe(child.name);
      expect(section!.position).toBe(child.position);
      const parent = manifest.sections.find((s) => s.source_key === child.parentSourceKey);
      expect(parent).toBeDefined();
      expect(section!.parent_section_id).toBe(parent!.id);
    }

    // One product + entry per card; names/descriptions/images/order preserved.
    for (const card of inventory.cards) {
      const product = manifest.products.find((p) => p.source_key === card.sourceKey);
      expect(product, `missing product for ${card.sourceKey}`).toBeDefined();
      expect(product!.name).toBe(card.name);
      expect(product!.description).toBe(card.description);
      expect(product!.product_kind).toBe("standard");
      expect(product!.variant.code).toBe(DEFAULT_VARIANT_CODE);
      expect(product!.variant.is_default).toBe(true);
      expect(product!.variant.is_selector_visible).toBe(false);

      const entry = manifest.entries.find((e) => e.source_key === card.sourceKey);
      expect(entry, `missing entry for ${card.sourceKey}`).toBeDefined();
      expect(entry!.product_id).toBe(product!.id);
      expect(entry!.image_path).toBe(card.imagePath);
      expect(entry!.position).toBe(card.itemIndex);
      expect(entry!.display_name).toBeNull();
      expect(entry!.display_description).toBeNull();

      const childKey = `subcategory:${card.categorySlug}/${card.subcategoryName}`;
      const section = manifest.sections.find((s) => s.source_key === childKey);
      expect(section).toBeDefined();
      expect(entry!.section_id).toBe(section!.id);
    }

    // No unexpected products/entries beyond inventoried cards.
    const cardKeys = new Set(inventory.cards.map((c) => c.sourceKey));
    for (const product of manifest.products) {
      expect(cardKeys.has(product.source_key)).toBe(true);
    }
    for (const entry of manifest.entries) {
      expect(cardKeys.has(entry.source_key)).toBe(true);
    }
  });

  it("proves v1 zeros, meals-as-standard, tags-not-dietary, and no price fields", () => {
    const inventory = inventoryAuthoritativeMenuSource(projectRoot);
    const manifest = loadCheckedInManifest();

    expect(inventory.structuredVariationFields).toBe(0);
    expect(inventory.structuredModifierDefinitions).toBe(0);
    expect(inventory.missingImages).toEqual([]);
    expect(inventory.duplicateNames).toEqual([]);

    expect(manifest.expected_zeros).toEqual({
      multi_variant_products: 0,
      modifier_groups: 0,
      modifier_options: 0,
      bundle_products: 0,
      bundle_groups: 0,
      bundle_options: 0,
      dietary_assignments: 0,
    });

    // Source tags exist on some cards but are never dietary catalog assignments.
    expect(inventory.cards.some((c) => c.tags.length > 0)).toBe(true);
    expect(manifest.expected_zeros.dietary_assignments).toBe(0);
    for (const product of manifest.products) {
      expect(product).not.toHaveProperty("dietary_tags");
      expect(product).not.toHaveProperty("dietary_tag_ids");
    }

    for (const name of inventory.mealComboCards) {
      const product = manifest.products.find((p) => p.name === name);
      expect(product?.product_kind).toBe("standard");
    }

    for (const product of manifest.products) {
      expect("price" in product).toBe(false);
      expect("amount" in product).toBe(false);
      expect("currency" in product).toBe(false);
    }
    for (const entry of manifest.entries) {
      expect("price" in entry).toBe(false);
      expect("amount" in entry).toBe(false);
      expect("currency" in entry).toBe(false);
    }
  });
});
