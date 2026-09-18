/**
 * Read-only Founder staging seed-baseline compatibility classifier.
 *
 * Distinguishes FRESH_EMPTY / COMPLETE_COMPATIBLE / PARTIAL_OR_INCOMPATIBLE
 * using stable identity from checked-in seed artifacts. Does not require
 * mutable commercial/content fields that IMP-036F authoring may change
 * (names, descriptions, prices, modifier presentation, menu placement
 * including entry sectionId and section parentSectionId, or current Brand
 * Assortment active include/exclude decisions).
 *
 * Assortment initialization is proved by bootstrap lineage rows
 * (brand-scope variant include with reason_code existing-menu-v1), whether
 * those rows are still active or have been retired — not by the current
 * commercial assortment outcome.
 *
 * Never writes. Uses application Persistence withContext only.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq, inArray, sql } from "drizzle-orm";

import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import {
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
} from "../../platform/database/schema/menu";
import { brandsTable } from "../../platform/database/schema/organizations";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import {
  priceBookVariantPricesTable,
  priceBooksTable,
} from "../../platform/database/schema/pricing";
import {
  BOBA_BEAR_BRAND_CODE,
  EXISTING_MENU_IMPORT_ID,
  EXISTING_MENU_MANIFEST_RELATIVE_PATH,
} from "../../shared/catalog/menu";
import {
  IMP028C_MODIFIER_GROUP_CODE,
  IMP028C_MODIFIERS_ARTIFACT_RELATIVE_PATH,
  HONG_KONG_MILK_TEA_PRODUCT_CODE,
  HONG_KONG_MILK_TEA_VARIANT_CODE,
} from "../../shared/catalog/imp028c-modifiers/constants";
import {
  BOOTSTRAP_PRICE_BOOK_CODE,
  BOOTSTRAP_PRICE_BOOK_ID,
  EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH,
} from "../../shared/pricing";
import type { ExistingMenuV1Manifest } from "../catalog/menu-import/manifest-types";
import type { Persistence } from "../persistence/types";

export const STAGING_BASELINE_STATES = [
  "FRESH_EMPTY",
  "COMPLETE_COMPATIBLE",
  "PARTIAL_OR_INCOMPATIBLE",
] as const;

export type StagingBaselineState = (typeof STAGING_BASELINE_STATES)[number];

export const STAGING_BOOTSTRAP_ACTIONS = ["APPLY", "PRESERVE", "BLOCK"] as const;
export type StagingBootstrapAction = (typeof STAGING_BOOTSTRAP_ACTIONS)[number];

export type StagingBaselineClassification = Readonly<{
  state: StagingBaselineState;
  reasons: readonly string[];
}>;

const IMP036C_ARTIFACT_RELATIVE_PATH =
  "data/platform/catalog/imp036c-hong-kong-required-topping-v1.json";
const IMP036C_MODIFIER_GROUP_CODE = "imp036c-required-topping";

type ModifierGroupSpec = Readonly<{
  groupCode: string;
  optionCodes: readonly string[];
}>;

function loadJson<T>(projectRoot: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;
}

function loadExpectedBaseline(projectRoot: string): {
  manifest: ExistingMenuV1Manifest;
  variantIds: readonly string[];
  modifierGroups: readonly ModifierGroupSpec[];
  hongKongVariantCode: string;
  hongKongProductCode: string;
} {
  const manifest = loadJson<ExistingMenuV1Manifest>(
    projectRoot,
    EXISTING_MENU_MANIFEST_RELATIVE_PATH,
  );
  const pricing = loadJson<{
    price_book: { id: string; code: string };
    variant_prices: readonly { variant_id: string }[];
  }>(projectRoot, EXISTING_MENU_PRICING_ARTIFACT_RELATIVE_PATH);
  if (pricing.price_book.id !== BOOTSTRAP_PRICE_BOOK_ID) {
    throw new Error("Pricing artifact price_book.id drifted from BOOTSTRAP_PRICE_BOOK_ID.");
  }
  if (pricing.price_book.code !== BOOTSTRAP_PRICE_BOOK_CODE) {
    throw new Error("Pricing artifact price_book.code drifted from BOOTSTRAP_PRICE_BOOK_CODE.");
  }

  // Touch 028C artifact path so expected truth stays file-backed (no second copy).
  const imp028c = loadJson<{
    modifier_group: { code: string };
    modifier_options: readonly { option: { code: string } }[];
  }>(projectRoot, IMP028C_MODIFIERS_ARTIFACT_RELATIVE_PATH);
  const imp036c = loadJson<{
    modifier_group: { code: string };
    modifier_options: readonly { option: { code: string } }[];
  }>(projectRoot, IMP036C_ARTIFACT_RELATIVE_PATH);
  if (imp028c.modifier_group.code !== IMP028C_MODIFIER_GROUP_CODE) {
    throw new Error("IMP-028C artifact group code drifted.");
  }
  if (imp036c.modifier_group.code !== IMP036C_MODIFIER_GROUP_CODE) {
    throw new Error("IMP-036C artifact group code drifted.");
  }

  return {
    manifest,
    variantIds: manifest.products.map((p) => p.variant.id),
    modifierGroups: [
      {
        groupCode: imp028c.modifier_group.code,
        optionCodes: imp028c.modifier_options.map((entry) => entry.option.code),
      },
      {
        groupCode: imp036c.modifier_group.code,
        optionCodes: imp036c.modifier_options.map((entry) => entry.option.code),
      },
    ],
    hongKongProductCode: HONG_KONG_MILK_TEA_PRODUCT_CODE,
    hongKongVariantCode: HONG_KONG_MILK_TEA_VARIANT_CODE,
  };
}

export function resolveStagingBootstrapAction(
  state: StagingBaselineState,
): StagingBootstrapAction {
  switch (state) {
    case "FRESH_EMPTY":
      return "APPLY";
    case "COMPLETE_COMPATIBLE":
      return "PRESERVE";
    case "PARTIAL_OR_INCOMPATIBLE":
      return "BLOCK";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function formatMarkerLines(
  state: StagingBaselineState,
  action: StagingBootstrapAction,
): string[] {
  const lines = [
    `STAGING_BASELINE_STATE ${state}`,
    `STAGING_BOOTSTRAP_ACTION ${action}`,
  ];
  if (action === "PRESERVE") {
    lines.push("STAGING_PERSISTENT_BUSINESS_STATE_PRESERVED YES");
  }
  return lines;
}

export function stagingBaselineMarkerLines(
  classification: StagingBaselineClassification,
): string[] {
  return formatMarkerLines(
    classification.state,
    resolveStagingBootstrapAction(classification.state),
  );
}

/**
 * Read-only classification of Founder staging persistent seed baseline.
 */
export async function classifyStagingBaseline(options: {
  readonly projectRoot: string;
  readonly persistence: Persistence;
}): Promise<StagingBaselineClassification> {
  const expected = loadExpectedBaseline(options.projectRoot);
  const { manifest } = expected;
  const reasons: string[] = [];

  return options.persistence.withContext(async (ctx) => {
    const brandByCode = await ctx.db
      .select({
        id: brandsTable.id,
        code: brandsTable.code,
      })
      .from(brandsTable)
      .where(eq(brandsTable.code, BOBA_BEAR_BRAND_CODE))
      .limit(1);
    const brand = brandByCode[0] ?? null;

    const productIds = manifest.products.map((p) => p.id);
    const products = await ctx.db
      .select({
        id: catalogProductsTable.id,
        brandId: catalogProductsTable.brandId,
        code: catalogProductsTable.code,
        productKind: catalogProductsTable.productKind,
      })
      .from(catalogProductsTable)
      .where(inArray(catalogProductsTable.id, productIds));
    const productById = new Map(products.map((p) => [p.id, p]));

    const variantIds = expected.variantIds;
    const variants = await ctx.db
      .select({
        id: catalogVariantsTable.id,
        brandId: catalogVariantsTable.brandId,
        productId: catalogVariantsTable.productId,
        code: catalogVariantsTable.code,
        productKind: catalogVariantsTable.productKind,
      })
      .from(catalogVariantsTable)
      .where(inArray(catalogVariantsTable.id, [...variantIds]));
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const menus = await ctx.db
      .select({
        id: menusTable.id,
        brandId: menusTable.brandId,
        code: menusTable.code,
      })
      .from(menusTable)
      .where(eq(menusTable.id, manifest.menu.id))
      .limit(1);
    const menu = menus[0] ?? null;

    const sectionIds = manifest.sections.map((s) => s.id);
    const sections = await ctx.db
      .select({
        id: menuSectionsTable.id,
        brandId: menuSectionsTable.brandId,
        menuId: menuSectionsTable.menuId,
        code: menuSectionsTable.code,
      })
      .from(menuSectionsTable)
      .where(inArray(menuSectionsTable.id, sectionIds));
    const sectionById = new Map(sections.map((s) => [s.id, s]));

    const entryIds = manifest.entries.map((e) => e.id);
    const entries = await ctx.db
      .select({
        id: menuEntriesTable.id,
        brandId: menuEntriesTable.brandId,
        menuId: menuEntriesTable.menuId,
        productId: menuEntriesTable.productId,
      })
      .from(menuEntriesTable)
      .where(inArray(menuEntriesTable.id, entryIds));
    const entryById = new Map(entries.map((e) => [e.id, e]));

    const priceBooks = await ctx.db
      .select({
        id: priceBooksTable.id,
        brandId: priceBooksTable.brandId,
        code: priceBooksTable.code,
        scopeType: priceBooksTable.scopeType,
      })
      .from(priceBooksTable)
      .where(eq(priceBooksTable.id, BOOTSTRAP_PRICE_BOOK_ID))
      .limit(1);
    const priceBook = priceBooks[0] ?? null;

    let priceRowCount = 0;
    if (priceBook) {
      const priceRows = await ctx.db
        .select({ variantId: priceBookVariantPricesTable.variantId })
        .from(priceBookVariantPricesTable)
        .where(
          and(
            eq(priceBookVariantPricesTable.priceBookId, BOOTSTRAP_PRICE_BOOK_ID),
            inArray(priceBookVariantPricesTable.variantId, [...variantIds]),
          ),
        );
      priceRowCount = priceRows.length;
    }

    const modifierGroupCodes = expected.modifierGroups.map((g) => g.groupCode);
    const modifierGroups = brand
      ? await ctx.db
          .select({
            id: catalogModifierGroupsTable.id,
            brandId: catalogModifierGroupsTable.brandId,
            code: catalogModifierGroupsTable.code,
          })
          .from(catalogModifierGroupsTable)
          .where(
            and(
              eq(catalogModifierGroupsTable.brandId, brand.id),
              inArray(catalogModifierGroupsTable.code, modifierGroupCodes),
            ),
          )
      : [];
    const groupByCode = new Map(modifierGroups.map((g) => [g.code, g]));

    const allOptionCodes = expected.modifierGroups.flatMap((g) => [...g.optionCodes]);
    const modifierOptions = brand
      ? await ctx.db
          .select({
            id: catalogModifierOptionsTable.id,
            brandId: catalogModifierOptionsTable.brandId,
            code: catalogModifierOptionsTable.code,
          })
          .from(catalogModifierOptionsTable)
          .where(
            and(
              eq(catalogModifierOptionsTable.brandId, brand.id),
              inArray(catalogModifierOptionsTable.code, allOptionCodes),
            ),
          )
      : [];
    const optionByCode = new Map(modifierOptions.map((o) => [o.code, o]));

    // Bootstrap lineage: brand-scope variant includes stamped by
    // bootstrapExistingMenuAssortment (reason_code existing-menu-v1). Status may
    // be active or retired — current commercial decision is mutable (IMP-036F).
    let assortmentBootstrapVariantCount = 0;
    if (brand) {
      const bootstrapLineage = await ctx.db
        .select({ variantId: assortmentRulesTable.variantId })
        .from(assortmentRulesTable)
        .where(
          and(
            eq(assortmentRulesTable.brandId, brand.id),
            eq(assortmentRulesTable.scopeType, "brand"),
            eq(assortmentRulesTable.targetType, "variant"),
            eq(assortmentRulesTable.decision, "include"),
            eq(assortmentRulesTable.reasonCode, EXISTING_MENU_IMPORT_ID),
            inArray(assortmentRulesTable.variantId, [...variantIds]),
            sql`${assortmentRulesTable.territoryId} is null`,
            sql`${assortmentRulesTable.organizationId} is null`,
            sql`${assortmentRulesTable.outletId} is null`,
            sql`${assortmentRulesTable.productId} is null`,
            sql`${assortmentRulesTable.modifierOptionId} is null`,
          ),
        );
      assortmentBootstrapVariantCount = new Set(
        bootstrapLineage.map((r) => r.variantId).filter((id): id is string => id !== null),
      ).size;
    }

    const presence = {
      brand: brand !== null,
      products: products.length > 0,
      variants: variants.length > 0,
      menu: menu !== null,
      sections: sections.length > 0,
      entries: entries.length > 0,
      priceBook: priceBook !== null,
      priceRows: priceRowCount > 0,
      assortment: assortmentBootstrapVariantCount > 0,
      modifiers: modifierGroups.length > 0 || modifierOptions.length > 0,
    };
    const anyPresent = Object.values(presence).some(Boolean);
    const nonePresent = !anyPresent;

    if (nonePresent) {
      return { state: "FRESH_EMPTY" as const, reasons: ["no_baseline_artifacts"] };
    }

    // --- Compatible identity checks (fail closed on any gap/mismatch) ---
    if (!brand) {
      reasons.push("brand_missing_with_other_baseline");
    }

    const brandId = brand?.id;
    if (brand && brand.code !== BOBA_BEAR_BRAND_CODE) {
      reasons.push("brand_code_mismatch");
    }

    for (const product of manifest.products) {
      const row = productById.get(product.id);
      if (!row) {
        reasons.push(`product_missing:${product.code}`);
        continue;
      }
      if (brandId && row.brandId !== brandId) {
        reasons.push(`product_brand_mismatch:${product.code}`);
      }
      if (row.code !== product.code) {
        reasons.push(`product_code_mismatch:${product.code}`);
      }
      if (row.productKind !== product.product_kind) {
        reasons.push(`product_kind_mismatch:${product.code}`);
      }

      const variant = variantById.get(product.variant.id);
      if (!variant) {
        reasons.push(`variant_missing:${product.code}`);
        continue;
      }
      if (brandId && variant.brandId !== brandId) {
        reasons.push(`variant_brand_mismatch:${product.code}`);
      }
      if (variant.productId !== product.id) {
        reasons.push(`variant_product_mismatch:${product.code}`);
      }
      if (variant.code !== product.variant.code) {
        reasons.push(`variant_code_mismatch:${product.code}`);
      }
      if (variant.productKind !== product.product_kind) {
        reasons.push(`variant_kind_mismatch:${product.code}`);
      }
    }

    if (products.length !== manifest.products.length) {
      reasons.push("product_count_incomplete");
    }
    if (variants.length !== manifest.products.length) {
      reasons.push("variant_count_incomplete");
    }

    if (!menu) {
      reasons.push("menu_missing");
    } else {
      if (brandId && menu.brandId !== brandId) reasons.push("menu_brand_mismatch");
      if (menu.code !== manifest.menu.code) reasons.push("menu_code_mismatch");
    }

    for (const section of manifest.sections) {
      const row = sectionById.get(section.id);
      if (!row) {
        reasons.push(`section_missing:${section.code}`);
        continue;
      }
      if (brandId && row.brandId !== brandId) reasons.push(`section_brand_mismatch:${section.code}`);
      if (row.menuId !== manifest.menu.id) reasons.push(`section_menu_mismatch:${section.code}`);
      if (row.code !== section.code) reasons.push(`section_code_mismatch:${section.code}`);
      // parentSectionId is mutable menu placement (IMP-036F updateMenuSection), not seed identity.
    }
    if (sections.length !== manifest.sections.length) {
      reasons.push("section_count_incomplete");
    }

    for (const entry of manifest.entries) {
      const row = entryById.get(entry.id);
      if (!row) {
        reasons.push(`entry_missing:${entry.source_key}`);
        continue;
      }
      if (brandId && row.brandId !== brandId) reasons.push(`entry_brand_mismatch:${entry.source_key}`);
      if (row.menuId !== manifest.menu.id) reasons.push(`entry_menu_mismatch:${entry.source_key}`);
      // sectionId is mutable menu placement (IMP-036F moveMenuEntry), not seed identity.
      if (row.productId !== entry.product_id) {
        reasons.push(`entry_product_mismatch:${entry.source_key}`);
      }
    }
    if (entries.length !== manifest.entries.length) {
      reasons.push("entry_count_incomplete");
    }

    if (assortmentBootstrapVariantCount !== variantIds.length) {
      reasons.push("assortment_bootstrap_incomplete");
    }

    if (!priceBook) {
      reasons.push("price_book_missing");
    } else {
      if (brandId && priceBook.brandId !== brandId) reasons.push("price_book_brand_mismatch");
      if (priceBook.code !== BOOTSTRAP_PRICE_BOOK_CODE) reasons.push("price_book_code_mismatch");
      if (priceBook.scopeType !== "brand") reasons.push("price_book_scope_mismatch");
    }
    if (priceRowCount !== variantIds.length) {
      reasons.push("price_rows_incomplete");
    }

    const hongKongProduct = manifest.products.find(
      (p) => p.code === expected.hongKongProductCode,
    );
    const hongKongVariantId = hongKongProduct?.variant.id;
    if (!hongKongVariantId || hongKongProduct?.variant.code !== expected.hongKongVariantCode) {
      reasons.push("hong_kong_target_missing_from_manifest");
    }

    for (const groupSpec of expected.modifierGroups) {
      const group = groupByCode.get(groupSpec.groupCode);
      if (!group) {
        reasons.push(`modifier_group_missing:${groupSpec.groupCode}`);
        continue;
      }
      if (brandId && group.brandId !== brandId) {
        reasons.push(`modifier_group_brand_mismatch:${groupSpec.groupCode}`);
      }

      for (const optionCode of groupSpec.optionCodes) {
        const option = optionByCode.get(optionCode);
        if (!option) {
          reasons.push(`modifier_option_missing:${optionCode}`);
          continue;
        }
        if (brandId && option.brandId !== brandId) {
          reasons.push(`modifier_option_brand_mismatch:${optionCode}`);
        }
        const bindings = await ctx.db
          .select({ id: catalogModifierGroupOptionsTable.id })
          .from(catalogModifierGroupOptionsTable)
          .where(
            and(
              eq(catalogModifierGroupOptionsTable.modifierGroupId, group.id),
              eq(catalogModifierGroupOptionsTable.modifierOptionId, option.id),
            ),
          )
          .limit(1);
        if (bindings.length === 0) {
          reasons.push(`modifier_group_option_missing:${optionCode}`);
        }
      }

      if (hongKongVariantId) {
        const vmg = await ctx.db
          .select({ id: catalogVariantModifierGroupsTable.id })
          .from(catalogVariantModifierGroupsTable)
          .where(
            and(
              eq(catalogVariantModifierGroupsTable.variantId, hongKongVariantId),
              eq(catalogVariantModifierGroupsTable.modifierGroupId, group.id),
            ),
          )
          .limit(1);
        if (vmg.length === 0) {
          reasons.push(`variant_modifier_group_missing:${groupSpec.groupCode}`);
        }
      }
    }

    if (reasons.length > 0) {
      return { state: "PARTIAL_OR_INCOMPATIBLE" as const, reasons };
    }
    return { state: "COMPLETE_COMPATIBLE" as const, reasons: [] };
  });
}
