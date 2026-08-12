/**
 * Validate the fixed existing-menu-v1 manifest before any DB work.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import {
  BOBA_BEAR_BRAND_CODE,
  BOBA_BEAR_BRAND_NAME,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  MENU_CODE_PATTERN,
  MENU_SECTION_MAX_DEPTH,
  PRIMARY_MENU_CODE,
} from "../../../shared/catalog/menu";
import { computeSourceInventorySha256 } from "./source-digest";
import { inventoryAuthoritativeMenuSource } from "./source-inventory";
import type { ExistingMenuV1Manifest } from "./manifest-types";

export class MenuImportError extends Error {
  readonly code: "SOURCE_DRIFT" | "IMPORT_CONFLICT" | "validation";

  constructor(code: MenuImportError["code"], message: string) {
    super(message);
    this.name = "MenuImportError";
    this.code = code;
  }

  toSafeJSON(): { name: string; code: string; message: string } {
    return { name: this.name, code: this.code, message: this.message };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new MenuImportError("validation", `${field} must be a UUID.`);
  }
}

function assertCode(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !MENU_CODE_PATTERN.test(value) || value.length > 64) {
    throw new MenuImportError("validation", `${field} must match catalog code format.`);
  }
}

export function validateManifestStructure(
  manifest: ExistingMenuV1Manifest,
  projectRoot: string,
): void {
  if (manifest.import_id !== EXISTING_MENU_IMPORT_ID) {
    throw new MenuImportError("validation", "import_id must be existing-menu-v1.");
  }
  if (manifest.version !== EXISTING_MENU_IMPORT_VERSION) {
    throw new MenuImportError("validation", "version must be 1.");
  }
  if (typeof manifest.source_inventory_sha256 !== "string" || manifest.source_inventory_sha256.length !== 64) {
    throw new MenuImportError("validation", "source_inventory_sha256 must be a 64-char hex digest.");
  }

  assertUuid(manifest.brand.id, "brand.id");
  if (manifest.brand.code !== BOBA_BEAR_BRAND_CODE || manifest.brand.name !== BOBA_BEAR_BRAND_NAME) {
    throw new MenuImportError("validation", "Brand must be exactly boba-bear / BOBA Bear.");
  }
  assertUuid(manifest.menu.id, "menu.id");
  if (manifest.menu.code !== PRIMARY_MENU_CODE) {
    throw new MenuImportError("validation", "Menu code must be primary.");
  }

  const uuids = new Set<string>();
  const takeUuid = (id: string, field: string) => {
    assertUuid(id, field);
    if (uuids.has(id)) {
      throw new MenuImportError("validation", `Duplicate UUID: ${field}`);
    }
    uuids.add(id);
  };

  takeUuid(manifest.brand.id, "brand.id");
  takeUuid(manifest.menu.id, "menu.id");

  const sectionIds = new Set<string>();
  const sectionCodes = new Set<string>();
  for (const section of manifest.sections) {
    takeUuid(section.id, `section:${section.source_key}`);
    assertCode(section.code, `section.code:${section.source_key}`);
    if (sectionCodes.has(section.code)) {
      throw new MenuImportError("validation", `Duplicate section code: ${section.code}`);
    }
    sectionCodes.add(section.code);
    sectionIds.add(section.id);
    if (section.parent_section_id === section.id) {
      throw new MenuImportError("validation", "Section cannot parent itself.");
    }
    if (typeof section.position !== "number" || section.position < 0) {
      throw new MenuImportError("validation", "Section position must be >= 0.");
    }
  }

  // Depth / parent integrity
  const byId = new Map(manifest.sections.map((s) => [s.id, s]));
  for (const section of manifest.sections) {
    if (section.parent_section_id === null) continue;
    if (!sectionIds.has(section.parent_section_id)) {
      throw new MenuImportError("validation", `Unknown parent section for ${section.source_key}`);
    }
    let depth = 1;
    let current: string | null = section.parent_section_id;
    const seen = new Set<string>([section.id]);
    while (current !== null) {
      if (seen.has(current)) {
        throw new MenuImportError("validation", "Section cycle detected.");
      }
      seen.add(current);
      depth += 1;
      if (depth > MENU_SECTION_MAX_DEPTH) {
        throw new MenuImportError("validation", "Section hierarchy depth exceeds 2.");
      }
      const parent = byId.get(current);
      if (!parent) break;
      current = parent.parent_section_id;
    }
  }

  const productIds = new Set<string>();
  const productCodes = new Set<string>();
  const sourceKeys = new Set<string>();
  for (const product of manifest.products) {
    takeUuid(product.id, `product:${product.source_key}`);
    takeUuid(product.variant.id, `variant:${product.source_key}`);
    assertCode(product.code, `product.code:${product.source_key}`);
    if (productCodes.has(product.code)) {
      throw new MenuImportError("validation", `Duplicate product code: ${product.code}`);
    }
    productCodes.add(product.code);
    if (sourceKeys.has(product.source_key)) {
      throw new MenuImportError("validation", `Duplicate product source_key: ${product.source_key}`);
    }
    sourceKeys.add(product.source_key);
    if (product.product_kind !== "standard") {
      throw new MenuImportError("validation", "v1 products must be standard.");
    }
    if (
      product.variant.code !== DEFAULT_VARIANT_CODE ||
      product.variant.is_default !== true ||
      product.variant.is_selector_visible !== false
    ) {
      throw new MenuImportError("validation", "Each product must have one hidden default variant.");
    }
    productIds.add(product.id);
  }

  const entrySourceKeys = new Set<string>();
  for (const entry of manifest.entries) {
    takeUuid(entry.id, `entry:${entry.source_key}`);
    if (!sectionIds.has(entry.section_id)) {
      throw new MenuImportError("validation", `Entry references unknown section: ${entry.source_key}`);
    }
    if (!productIds.has(entry.product_id)) {
      throw new MenuImportError("validation", `Entry references unknown product: ${entry.source_key}`);
    }
    if (entry.display_name !== null || entry.display_description !== null) {
      throw new MenuImportError(
        "validation",
        `v1 entries must use null display overrides when matching product text: ${entry.source_key}`,
      );
    }
    if (typeof entry.position !== "number" || entry.position < 0) {
      throw new MenuImportError("validation", "Entry position must be >= 0.");
    }
    if (
      typeof entry.image_path !== "string" ||
      !entry.image_path.startsWith("/") ||
      entry.image_path.includes("..") ||
      entry.image_path.startsWith("http://") ||
      entry.image_path.startsWith("https://") ||
      entry.image_path.startsWith("data:")
    ) {
      throw new MenuImportError("validation", `Invalid image_path for ${entry.source_key}`);
    }
    const absolute = path.join(projectRoot, "public", entry.image_path.replace(/^\//, ""));
    if (!existsSync(absolute)) {
      throw new MenuImportError("validation", `Image file missing for ${entry.source_key}`);
    }
    if (entrySourceKeys.has(entry.source_key)) {
      throw new MenuImportError("validation", `Duplicate entry source_key: ${entry.source_key}`);
    }
    entrySourceKeys.add(entry.source_key);
  }

  if (
    manifest.expected_zeros.multi_variant_products !== 0 ||
    manifest.expected_zeros.modifier_groups !== 0 ||
    manifest.expected_zeros.modifier_options !== 0 ||
    manifest.expected_zeros.bundle_products !== 0 ||
    manifest.expected_zeros.bundle_groups !== 0 ||
    manifest.expected_zeros.bundle_options !== 0 ||
    manifest.expected_zeros.dietary_assignments !== 0
  ) {
    throw new MenuImportError("validation", "expected_zeros must all be 0 for v1.");
  }
}

export function assertSourceDigestMatches(
  manifest: ExistingMenuV1Manifest,
  projectRoot: string,
): void {
  const current = computeSourceInventorySha256(projectRoot);
  if (current !== manifest.source_inventory_sha256) {
    throw new MenuImportError(
      "SOURCE_DRIFT",
      "Authoritative menu source digest does not match manifest.source_inventory_sha256.",
    );
  }

  const inventory = inventoryAuthoritativeMenuSource(projectRoot);
  if (inventory.cards.length !== manifest.products.length) {
    throw new MenuImportError(
      "SOURCE_DRIFT",
      "Source card count does not match manifest product count.",
    );
  }
  if (inventory.cards.length !== manifest.entries.length) {
    throw new MenuImportError(
      "SOURCE_DRIFT",
      "Source card count does not match manifest entry count.",
    );
  }
  for (const card of inventory.cards) {
    const product = manifest.products.find((p) => p.source_key === card.sourceKey);
    if (!product) {
      throw new MenuImportError("SOURCE_DRIFT", `Missing product mapping for ${card.sourceKey}`);
    }
    if (product.name !== card.name || product.description !== card.description) {
      throw new MenuImportError(
        "SOURCE_DRIFT",
        `Product text drift for ${card.sourceKey}`,
      );
    }
    const entry = manifest.entries.find((e) => e.source_key === card.sourceKey);
    if (!entry || entry.image_path !== card.imagePath) {
      throw new MenuImportError("SOURCE_DRIFT", `Image mapping drift for ${card.sourceKey}`);
    }
  }
}
