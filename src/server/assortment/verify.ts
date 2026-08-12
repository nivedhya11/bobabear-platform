/**
 * Read-only verification that Brand include rules cover existing-menu-v1 (IMP-014).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { EXISTING_MENU_MANIFEST_RELATIVE_PATH } from "../../shared/catalog/menu";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { brandsTable } from "../../platform/database/schema/organizations";
import type { Persistence } from "../persistence/types";
import type { ExistingMenuV1Manifest } from "../catalog/menu-import/manifest-types";
import {
  assertSourceDigestMatches,
  MenuImportError,
  validateManifestStructure,
} from "../catalog/menu-import/validate-manifest";
import { AssortmentBootstrapError } from "./errors";

export type AssortmentVerifyResult = Readonly<{
  ok: true;
  brandId: string;
  derivedVariantCount: number;
  activeBrandIncludes: number;
  missingVariantIds: readonly string[];
}>;

export async function verifyExistingMenuAssortment(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
}): Promise<AssortmentVerifyResult> {
  const absolute = path.join(options.projectRoot, EXISTING_MENU_MANIFEST_RELATIVE_PATH);
  const manifest = JSON.parse(readFileSync(absolute, "utf8")) as ExistingMenuV1Manifest;

  try {
    validateManifestStructure(manifest, options.projectRoot);
    assertSourceDigestMatches(manifest, options.projectRoot);
  } catch (error) {
    if (error instanceof MenuImportError && error.code === "SOURCE_DRIFT") {
      throw new AssortmentBootstrapError("SOURCE_DRIFT", error.message);
    }
    if (error instanceof MenuImportError) {
      throw new AssortmentBootstrapError("validation", error.message);
    }
    throw error;
  }

  return options.persistence.withContext(async (ctx) => {
    const brandRows = await ctx.db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.code, manifest.brand.code))
      .limit(1);
    const brand = brandRows[0];
    if (!brand || brand.name !== manifest.brand.name) {
      throw new AssortmentBootstrapError(
        "validation",
        "BOBA Bear brand missing or mismatched.",
      );
    }

    const missing: string[] = [];
    let activeBrandIncludes = 0;
    for (const product of manifest.products) {
      const rows = await ctx.db
        .select({ id: assortmentRulesTable.id })
        .from(assortmentRulesTable)
        .where(
          and(
            eq(assortmentRulesTable.brandId, brand.id),
            eq(assortmentRulesTable.scopeType, "brand"),
            eq(assortmentRulesTable.targetType, "variant"),
            eq(assortmentRulesTable.variantId, product.variant.id),
            eq(assortmentRulesTable.decision, "include"),
            eq(assortmentRulesTable.status, "active"),
          ),
        )
        .limit(1);
      if (rows.length === 0) {
        missing.push(product.variant.id);
      } else {
        activeBrandIncludes += 1;
      }
    }

    if (missing.length > 0) {
      throw new AssortmentBootstrapError(
        "validation",
        `Missing active brand include rules for ${missing.length} manifest variant(s).`,
      );
    }

    return {
      ok: true as const,
      brandId: brand.id,
      derivedVariantCount: manifest.products.length,
      activeBrandIncludes,
      missingVariantIds: [],
    };
  });
}
