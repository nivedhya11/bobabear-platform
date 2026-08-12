/**
 * Source inventory, digest, and fixed-manifest validation (IMP-013).
 * Runs under vitest.database.config (server-only stub available).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildExistingMenuV1Manifest } from "../../src/server/catalog/menu-import/build-manifest";
import { rejectArbitraryManifestPath } from "../../src/server/catalog/menu-import/importer";
import type { ExistingMenuV1Manifest } from "../../src/server/catalog/menu-import/manifest-types";
import { computeSourceInventorySha256 } from "../../src/server/catalog/menu-import/source-digest";
import {
  AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS,
  inventoryAuthoritativeMenuSource,
  summarizeInventory,
} from "../../src/server/catalog/menu-import/source-inventory";
import { normalizeProductCode, stableUuid } from "../../src/server/catalog/menu-import/stable-ids";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "../../src/server/catalog/menu-import/validate-manifest";
import {
  BOBA_BEAR_BRAND_CODE,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
  PRIMARY_MENU_CODE,
} from "../../src/shared/catalog/menu";

const projectRoot = process.cwd();

function loadCheckedInManifest(): ExistingMenuV1Manifest {
  return JSON.parse(
    readFileSync(path.join(projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH), "utf8"),
  ) as ExistingMenuV1Manifest;
}

function cloneManifest(manifest: ExistingMenuV1Manifest): ExistingMenuV1Manifest {
  return structuredClone(manifest) as ExistingMenuV1Manifest;
}

describe("menu source inventory and digest", () => {
  it("parses authoritative source with zero structured variants/modifiers", () => {
    const inventory = inventoryAuthoritativeMenuSource(projectRoot);
    expect(AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS).toEqual([
      "src/data/menu.json",
      "src/lib/menuImages.ts",
      "src/types/menu.ts",
    ]);
    expect(inventory.cards.length).toBeGreaterThan(0);
    expect(inventory.rootSections.length).toBeGreaterThan(0);
    expect(inventory.childSections.length).toBeGreaterThan(0);
    expect(inventory.structuredVariationFields).toBe(0);
    expect(inventory.structuredModifierDefinitions).toBe(0);
    expect(inventory.missingImages).toEqual([]);
    expect(inventory.duplicateNames).toEqual([]);

    const summary = summarizeInventory(inventory);
    expect(summary.sourceCards).toBe(inventory.cards.length);
    expect(summary.structuredVariations).toBe(0);
    expect(summary.structuredModifiers).toBe(0);

    // Positions are zero-based within each parent.
    for (const root of inventory.rootSections) {
      expect(root.position).toBeGreaterThanOrEqual(0);
      expect(root.depth).toBe(1);
    }
    for (const child of inventory.childSections) {
      expect(child.position).toBeGreaterThanOrEqual(0);
      expect(child.depth).toBe(2);
      expect(child.parentSourceKey).toMatch(/^category:/);
    }
  });

  it("computes a stable 64-char hex digest over ordered source files", () => {
    const a = computeSourceInventorySha256(projectRoot);
    const b = computeSourceInventorySha256(projectRoot);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).toBe(loadCheckedInManifest().source_inventory_sha256);
  });
});

describe("existing-menu-v1 manifest schema and validation", () => {
  it("validates the checked-in manifest structure and digest", () => {
    const manifest = loadCheckedInManifest();
    expect(() => validateManifestStructure(manifest, projectRoot)).not.toThrow();
    expect(() => assertSourceDigestMatches(manifest, projectRoot)).not.toThrow();

    expect(manifest.import_id).toBe(EXISTING_MENU_IMPORT_ID);
    expect(manifest.version).toBe(1);
    expect(manifest.brand.code).toBe(BOBA_BEAR_BRAND_CODE);
    expect(manifest.menu.code).toBe(PRIMARY_MENU_CODE);
    expect(manifest.products.every((p) => p.product_kind === "standard")).toBe(true);
    expect(
      manifest.products.every(
        (p) =>
          p.variant.code === DEFAULT_VARIANT_CODE &&
          p.variant.is_default === true &&
          p.variant.is_selector_visible === false,
      ),
    ).toBe(true);
    expect(manifest.expected_zeros.multi_variant_products).toBe(0);
    expect(manifest.expected_zeros.modifier_groups).toBe(0);
    expect(manifest.expected_zeros.bundle_products).toBe(0);
    expect(manifest.expected_zeros.dietary_assignments).toBe(0);
  });

  it("matches buildExistingMenuV1Manifest to the checked-in file", () => {
    const built = buildExistingMenuV1Manifest(projectRoot);
    const checkedIn = loadCheckedInManifest();
    expect(built).toEqual(checkedIn);
  });

  it("throws SOURCE_DRIFT when the digest is tampered", () => {
    const tampered = cloneManifest(loadCheckedInManifest());
    (tampered as { source_inventory_sha256: string }).source_inventory_sha256 =
      "0".repeat(64);
    expect(() => assertSourceDigestMatches(tampered, projectRoot)).toThrow(MenuImportError);
    try {
      assertSourceDigestMatches(tampered, projectRoot);
    } catch (error) {
      expect(error).toBeInstanceOf(MenuImportError);
      expect((error as MenuImportError).code).toBe("SOURCE_DRIFT");
    }
  });

  it("rejects invalid image paths", () => {
    const bad = cloneManifest(loadCheckedInManifest());
    const entry = bad.entries[0]!;
    (entry as { image_path: string }).image_path = "https://example.com/x.png";
    expect(() => validateManifestStructure(bad, projectRoot)).toThrow(MenuImportError);

    (entry as { image_path: string }).image_path = "/assets/menu/../secret.png";
    expect(() => validateManifestStructure(bad, projectRoot)).toThrow(MenuImportError);

    (entry as { image_path: string }).image_path = "/assets/menu/does-not-exist-xyz.png";
    expect(() => validateManifestStructure(bad, projectRoot)).toThrow(/Image file missing/i);
  });

  it("produces stable UUIDs and product codes", () => {
    expect(stableUuid("brand:boba-bear")).toBe(stableUuid("brand:boba-bear"));
    expect(stableUuid("product:a")).not.toBe(stableUuid("product:b"));
    expect(normalizeProductCode("Classic Milk Tea")).toBe("classic-milk-tea");

    const first = buildExistingMenuV1Manifest(projectRoot);
    const second = buildExistingMenuV1Manifest(projectRoot);
    expect(first.brand.id).toBe(second.brand.id);
    expect(first.menu.id).toBe(second.menu.id);
    expect(first.products.map((p) => p.id)).toEqual(second.products.map((p) => p.id));
    expect(first.sections.map((s) => s.id)).toEqual(second.sections.map((s) => s.id));
    expect(first.entries.map((e) => e.id)).toEqual(second.entries.map((e) => e.id));
  });

  it("rejects arbitrary --file / --url / stdin manifest paths", () => {
    expect(() => rejectArbitraryManifestPath(["--file=evil.json"])).toThrow(MenuImportError);
    expect(() => rejectArbitraryManifestPath(["--url=https://x"])).toThrow(MenuImportError);
    expect(() => rejectArbitraryManifestPath(["--manifest", "x"])).toThrow(MenuImportError);
    expect(() => rejectArbitraryManifestPath(["-"])).toThrow(MenuImportError);
    expect(() => rejectArbitraryManifestPath(["--apply"])).not.toThrow();
  });

  it("does not infer multi-variant, modifiers, bundles, or dietary from tags/meals", () => {
    const inventory = inventoryAuthoritativeMenuSource(projectRoot);
    const manifest = loadCheckedInManifest();

    expect(inventory.structuredVariationFields).toBe(0);
    expect(inventory.structuredModifierDefinitions).toBe(0);
    expect(manifest.products.every((p) => p.product_kind === "standard")).toBe(true);
    expect(manifest.products).toHaveLength(inventory.cards.length);

    // Tags on source cards are marketing/presentation tags — not dietary catalog rows.
    expect(inventory.cards.some((c) => c.tags.length > 0)).toBe(true);
    expect(manifest.expected_zeros.dietary_assignments).toBe(0);

    expect(inventory.mealComboCards.length).toBeGreaterThan(0);
    for (const name of inventory.mealComboCards) {
      const product = manifest.products.find((p) => p.name === name);
      expect(product?.product_kind).toBe("standard");
    }
  });
});
