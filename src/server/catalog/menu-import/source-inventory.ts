/**
 * Authoritative static menu source inventory (IMP-013).
 *
 * Reads only:
 *   src/data/menu.json
 *   src/lib/menuImages.ts  (via MENU_IMAGES export)
 *   src/types/menu.ts      (types only; content covered by digest)
 *
 * Does not invent variants, modifiers, bundles, or dietary tags.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { MENU_IMAGES } from "../../../lib/menuImages";
import type { MenuData, MenuItem } from "../../../types/menu";
import menuJson from "../../../data/menu.json";

export const AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS = [
  "src/data/menu.json",
  "src/lib/menuImages.ts",
  "src/types/menu.ts",
] as const;

export type SourceCard = Readonly<{
  sourceKey: string;
  categoryName: string;
  categorySlug: string;
  categoryIndex: number;
  subcategoryName: string;
  subcategoryIndex: number;
  itemIndex: number;
  name: string;
  description: string;
  price: number;
  tier: string;
  addons: readonly string[];
  tags: readonly string[];
  imagePath: string | null;
  imageMissing: boolean;
}>;

export type SourceSectionNode = Readonly<{
  sourceKey: string;
  name: string;
  codeHint: string;
  parentSourceKey: string | null;
  position: number;
  depth: 1 | 2;
}>;

export type MenuSourceInventory = Readonly<{
  cards: readonly SourceCard[];
  rootSections: readonly SourceSectionNode[];
  childSections: readonly SourceSectionNode[];
  duplicateNames: readonly string[];
  structuredVariationFields: number;
  structuredModifierDefinitions: number;
  imageReferences: number;
  missingImages: readonly string[];
  mealComboCards: readonly string[];
}>;

function normalizeCodeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function inventoryAuthoritativeMenuSource(
  projectRoot: string,
  menuData: MenuData = menuJson as MenuData,
  images: Readonly<Record<string, string>> = MENU_IMAGES,
): MenuSourceInventory {
  const cards: SourceCard[] = [];
  const rootSections: SourceSectionNode[] = [];
  const childSections: SourceSectionNode[] = [];
  const nameCounts = new Map<string, number>();
  let structuredVariationFields = 0;
  let structuredModifierDefinitions = 0;
  const missingImages: string[] = [];
  const mealComboCards: string[] = [];

  for (let categoryIndex = 0; categoryIndex < menuData.categories.length; categoryIndex += 1) {
    const category = menuData.categories[categoryIndex]!;
    const rootKey = `category:${category.slug}`;
    rootSections.push({
      sourceKey: rootKey,
      name: category.name,
      codeHint: category.slug,
      parentSourceKey: null,
      position: categoryIndex,
      depth: 1,
    });

    for (
      let subcategoryIndex = 0;
      subcategoryIndex < category.subcategories.length;
      subcategoryIndex += 1
    ) {
      const subcategory = category.subcategories[subcategoryIndex]!;
      const childCode = `${category.slug}__${normalizeCodeSegment(subcategory.name)}`;
      const childKey = `subcategory:${category.slug}/${subcategory.name}`;
      childSections.push({
        sourceKey: childKey,
        name: subcategory.name,
        codeHint: childCode,
        parentSourceKey: rootKey,
        position: subcategoryIndex,
        depth: 2,
      });

      for (let itemIndex = 0; itemIndex < subcategory.items.length; itemIndex += 1) {
        const item = subcategory.items[itemIndex]! as MenuItem & Record<string, unknown>;
        nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);

        if ("variations" in item || "variants" in item || "sizes" in item) {
          structuredVariationFields += 1;
        }
        if (
          ("modifiers" in item && item.modifiers != null) ||
          ("modifierGroups" in item && item.modifierGroups != null) ||
          (Array.isArray(item.addons) && item.addons.length > 0)
        ) {
          structuredModifierDefinitions += 1;
        }

        const imagePath = images[item.name] ?? null;
        let imageMissing = false;
        if (imagePath === null) {
          imageMissing = true;
          missingImages.push(item.name);
        } else {
          const relative = imagePath.replace(/^\//, "");
          const absolute = path.join(projectRoot, "public", relative);
          if (!existsSync(absolute)) {
            imageMissing = true;
            missingImages.push(item.name);
          }
        }

        const sourceKey = `item:${category.slug}/${subcategory.name}/${item.name}`;
        if (
          category.slug === "meals-combos" ||
          /meal|combo/i.test(item.name)
        ) {
          mealComboCards.push(item.name);
        }

        cards.push({
          sourceKey,
          categoryName: category.name,
          categorySlug: category.slug,
          categoryIndex,
          subcategoryName: subcategory.name,
          subcategoryIndex,
          itemIndex,
          name: item.name,
          description: item.description,
          price: item.price,
          tier: item.tier,
          addons: [...item.addons],
          tags: [...item.tags],
          imagePath,
          imageMissing,
        });
      }
    }
  }

  const duplicateNames = [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort();

  return {
    cards,
    rootSections,
    childSections,
    duplicateNames,
    structuredVariationFields,
    structuredModifierDefinitions,
    imageReferences: cards.filter((c) => c.imagePath !== null).length,
    missingImages,
    mealComboCards,
  };
}

export function summarizeInventory(inventory: MenuSourceInventory): Record<string, number | string[]> {
  return {
    sourceCards: inventory.cards.length,
    rootSections: inventory.rootSections.length,
    childSections: inventory.childSections.length,
    totalSections: inventory.rootSections.length + inventory.childSections.length,
    duplicateNames: inventory.duplicateNames.length,
    structuredVariations: inventory.structuredVariationFields,
    structuredModifiers: inventory.structuredModifierDefinitions,
    imageReferences: inventory.imageReferences,
    missingImages: inventory.missingImages.length,
    mealComboCards: inventory.mealComboCards.length,
  };
}
