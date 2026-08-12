/**
 * Build the reviewed existing-menu-v1 manifest from authoritative source.
 * Runtime apply never regenerates — only this generator (or a checked-in file) may.
 */
import {
  BOBA_BEAR_BRAND_CODE,
  BOBA_BEAR_BRAND_NAME,
  DEFAULT_VARIANT_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_IMPORT_VERSION,
  PRIMARY_MENU_CODE,
} from "../../../shared/catalog/menu";
import { computeSourceInventorySha256 } from "./source-digest";
import { inventoryAuthoritativeMenuSource } from "./source-inventory";
import { normalizeProductCode, stableUuid } from "./stable-ids";
import type { ExistingMenuV1Manifest } from "./manifest-types";

export function buildExistingMenuV1Manifest(projectRoot: string): ExistingMenuV1Manifest {
  const inventory = inventoryAuthoritativeMenuSource(projectRoot);
  if (inventory.duplicateNames.length > 0) {
    throw new Error(
      `Duplicate source item names require explicit manifest overrides: ${inventory.duplicateNames.join(", ")}`,
    );
  }
  if (inventory.structuredVariationFields > 0) {
    throw new Error("SOURCE_DRIFT: structured variations present in authoritative source.");
  }
  if (inventory.structuredModifierDefinitions > 0) {
    throw new Error("SOURCE_DRIFT: structured modifiers present in authoritative source.");
  }
  if (inventory.missingImages.length > 0) {
    throw new Error(`Missing menu images: ${inventory.missingImages.join(", ")}`);
  }

  const productCodes = new Map<string, string>();
  for (const card of inventory.cards) {
    const code = normalizeProductCode(card.name);
    const existing = [...productCodes.entries()].find(([, c]) => c === code);
    if (existing && existing[0] !== card.sourceKey) {
      throw new Error(
        `Product code collision for "${code}" between "${existing[0]}" and "${card.sourceKey}".`,
      );
    }
    productCodes.set(card.sourceKey, code);
  }

  const brandId = stableUuid("brand:boba-bear");
  const menuId = stableUuid("menu:primary");

  const sectionIdBySourceKey = new Map<string, string>();
  const sections = [
    ...inventory.rootSections.map((section) => {
      const id = stableUuid(`section:${section.sourceKey}`);
      sectionIdBySourceKey.set(section.sourceKey, id);
      return {
        id,
        code: section.codeHint,
        name: section.name,
        description: null,
        parent_section_id: null as string | null,
        position: section.position,
        source_key: section.sourceKey,
      };
    }),
    ...inventory.childSections.map((section) => {
      const id = stableUuid(`section:${section.sourceKey}`);
      sectionIdBySourceKey.set(section.sourceKey, id);
      const parentId = sectionIdBySourceKey.get(section.parentSourceKey!);
      if (!parentId) {
        throw new Error(`Missing parent section for ${section.sourceKey}`);
      }
      return {
        id,
        code: section.codeHint,
        name: section.name,
        description: null,
        parent_section_id: parentId,
        position: section.position,
        source_key: section.sourceKey,
      };
    }),
  ];

  const products = inventory.cards.map((card) => {
    const code = productCodes.get(card.sourceKey)!;
    const productId = stableUuid(`product:${card.sourceKey}`);
    const variantId = stableUuid(`variant:${card.sourceKey}:default`);
    return {
      id: productId,
      code,
      name: card.name,
      description: card.description,
      product_kind: "standard" as const,
      source_key: card.sourceKey,
      variant: {
        id: variantId,
        code: DEFAULT_VARIANT_CODE,
        is_default: true as const,
        is_selector_visible: false as const,
      },
    };
  });

  const productIdBySourceKey = new Map(products.map((p) => [p.source_key, p.id]));

  const entries = inventory.cards.map((card) => {
    const childKey = `subcategory:${card.categorySlug}/${card.subcategoryName}`;
    const sectionId = sectionIdBySourceKey.get(childKey);
    if (!sectionId) {
      throw new Error(`Missing section for entry ${card.sourceKey}`);
    }
    const productId = productIdBySourceKey.get(card.sourceKey);
    if (!productId) {
      throw new Error(`Missing product for entry ${card.sourceKey}`);
    }
    if (!card.imagePath) {
      throw new Error(`Missing image path for ${card.sourceKey}`);
    }
    return {
      id: stableUuid(`entry:${card.sourceKey}`),
      section_id: sectionId,
      product_id: productId,
      display_name: null,
      display_description: null,
      image_path: card.imagePath,
      position: card.itemIndex,
      source_key: card.sourceKey,
    };
  });

  return {
    import_id: EXISTING_MENU_IMPORT_ID,
    version: EXISTING_MENU_IMPORT_VERSION,
    source_inventory_sha256: computeSourceInventorySha256(projectRoot),
    brand: {
      id: brandId,
      code: BOBA_BEAR_BRAND_CODE,
      name: BOBA_BEAR_BRAND_NAME,
    },
    menu: {
      id: menuId,
      code: PRIMARY_MENU_CODE,
      name: "Primary Menu",
    },
    sections,
    products: products as ExistingMenuV1Manifest["products"],
    entries,
    expected_zeros: {
      multi_variant_products: 0,
      modifier_groups: 0,
      modifier_options: 0,
      bundle_products: 0,
      bundle_groups: 0,
      bundle_options: 0,
      dietary_assignments: 0,
    },
  };
}
