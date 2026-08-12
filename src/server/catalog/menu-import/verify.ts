/**
 * Read-only verification of PostgreSQL state against existing-menu-v1 (IMP-013).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq, sql } from "drizzle-orm";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../../shared/catalog/menu";
import {
  catalogProductsTable,
  catalogVariantDietaryTagsTable,
  catalogVariantsTable,
} from "../../../platform/database/schema/catalog";
import {
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
} from "../../../platform/database/schema/menu";
import { brandsTable } from "../../../platform/database/schema/organizations";
import type { Persistence } from "../../persistence/types";
import type { ExistingMenuV1Manifest } from "./manifest-types";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "./validate-manifest";

export type VerifyResult = Readonly<{
  ok: true;
  import_id: string;
  brandId: string;
  counts: Readonly<{
    products: number;
    singleVariantProducts: number;
    multiVariantProducts: number;
    variants: number;
    modifierGroups: number;
    modifierOptions: number;
    bundleProducts: number;
    bundleGroups: number;
    bundleOptions: number;
    dietaryAssignments: number;
    menus: number;
    rootSections: number;
    childSections: number;
    totalSections: number;
    entries: number;
  }>;
}>;

export async function verifyExistingMenuImport(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
}): Promise<VerifyResult> {
  const absolute = path.join(options.projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  const manifest = JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;
  validateManifestStructure(manifest, options.projectRoot);
  assertSourceDigestMatches(manifest, options.projectRoot);

  return options.persistence.withContext(async (ctx) => {
    const brandRows = await ctx.db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.code, manifest.brand.code))
      .limit(1);
    const brand = brandRows[0];
    if (!brand || brand.name !== manifest.brand.name) {
      throw new MenuImportError("validation", "BOBA Bear brand missing or mismatched.");
    }

    for (const product of manifest.products) {
      const rows = await ctx.db
        .select()
        .from(catalogProductsTable)
        .where(eq(catalogProductsTable.id, product.id))
        .limit(1);
      const row = rows[0];
      if (
        !row ||
        row.brandId !== brand.id ||
        row.code !== product.code ||
        row.name !== product.name ||
        row.description !== product.description ||
        row.productKind !== "standard" ||
        row.lifecycleStatus !== "active"
      ) {
        throw new MenuImportError("validation", `Product verify failed: ${product.code}`);
      }
      const variants = await ctx.db
        .select()
        .from(catalogVariantsTable)
        .where(
          and(
            eq(catalogVariantsTable.productId, product.id),
            sql`${catalogVariantsTable.lifecycleStatus} <> 'retired'`,
          ),
        );
      if (variants.length !== 1) {
        throw new MenuImportError(
          "validation",
          `Expected exactly one non-retired variant for ${product.code}`,
        );
      }
      const variant = variants[0]!;
      if (
        variant.id !== product.variant.id ||
        variant.code !== "default" ||
        variant.isDefault !== true ||
        variant.isSelectorVisible !== false ||
        variant.lifecycleStatus !== "active"
      ) {
        throw new MenuImportError("validation", `Variant verify failed: ${product.code}`);
      }

      const dietary = await ctx.db
        .select({ id: catalogVariantDietaryTagsTable.id })
        .from(catalogVariantDietaryTagsTable)
        .where(
          and(
            eq(catalogVariantDietaryTagsTable.targetId, variant.id),
            sql`${catalogVariantDietaryTagsTable.retiredAt} is null`,
          ),
        );
      if (dietary.length !== 0) {
        throw new MenuImportError(
          "validation",
          `Imported variant must have zero dietary assignments: ${product.code}`,
        );
      }
    }

    const menuRows = await ctx.db
      .select()
      .from(menusTable)
      .where(eq(menusTable.id, manifest.menu.id))
      .limit(1);
    const menu = menuRows[0];
    if (
      !menu ||
      menu.brandId !== brand.id ||
      menu.code !== manifest.menu.code ||
      menu.lifecycleStatus !== "active"
    ) {
      throw new MenuImportError("validation", "Menu verify failed.");
    }

    for (const section of manifest.sections) {
      const rows = await ctx.db
        .select()
        .from(menuSectionsTable)
        .where(eq(menuSectionsTable.id, section.id))
        .limit(1);
      const row = rows[0];
      if (
        !row ||
        row.brandId !== brand.id ||
        row.menuId !== manifest.menu.id ||
        row.code !== section.code ||
        row.name !== section.name ||
        row.parentSectionId !== section.parent_section_id ||
        row.position !== section.position ||
        row.lifecycleStatus !== "active"
      ) {
        throw new MenuImportError("validation", `Section verify failed: ${section.code}`);
      }
    }

    for (const entry of manifest.entries) {
      const rows = await ctx.db
        .select()
        .from(menuEntriesTable)
        .where(eq(menuEntriesTable.id, entry.id))
        .limit(1);
      const row = rows[0];
      if (
        !row ||
        row.brandId !== brand.id ||
        row.menuId !== manifest.menu.id ||
        row.sectionId !== entry.section_id ||
        row.productId !== entry.product_id ||
        row.imagePath !== entry.image_path ||
        row.position !== entry.position ||
        row.lifecycleStatus !== "active"
      ) {
        throw new MenuImportError("validation", `Entry verify failed: ${entry.source_key}`);
      }
    }

    const rootSections = manifest.sections.filter((s) => s.parent_section_id === null).length;
    const childSections = manifest.sections.length - rootSections;

    return {
      ok: true as const,
      import_id: manifest.import_id,
      brandId: brand.id,
      counts: {
        products: manifest.products.length,
        singleVariantProducts: manifest.products.length,
        multiVariantProducts: 0,
        variants: manifest.products.length,
        modifierGroups: 0,
        modifierOptions: 0,
        bundleProducts: 0,
        bundleGroups: 0,
        bundleOptions: 0,
        dietaryAssignments: 0,
        menus: 1,
        rootSections,
        childSections,
        totalSections: manifest.sections.length,
        entries: manifest.entries.length,
      },
    };
  });
}
