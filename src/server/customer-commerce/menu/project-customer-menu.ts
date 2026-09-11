/**
 * Customer Menu read projection composition (IMP-028B / D-368).
 *
 * Application-layer READ composition over existing menu/catalog/pricing/availability
 * authorities. No persistence, no workforce actor fabrication.
 */
import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import {
  catalogProductsTable,
  catalogVariantsTable,
} from "../../../platform/database/schema/catalog";
import {
  menuEntryVersionsTable,
  menusTable,
  menuSectionVersionsTable,
  menuVersionsTable,
} from "../../../platform/database/schema/menu";
import { outletsTable } from "../../../platform/database/schema/organizations";
import { CustomerMenuError } from "../../../shared/customer-menu/errors";
import type {
  CustomerMenuAvailability,
  CustomerMenuItem,
  CustomerMenuProjection,
  CustomerMenuSection,
} from "../../../shared/customer-menu/types";
import { createOutletEligibilitySession } from "../../assortment/outlet-eligibility-session";
import { effectiveEntryDisplay } from "../../catalog/menu/reads";
import { assertUuid } from "../../catalog/lifecycle";
import {
  loadEffectiveProductContentMap,
  loadEffectiveVariantContentMap,
} from "../../catalog/revisions";
import type { PersistenceQueryContext } from "../../persistence/types";
import { PricingNotFoundError, PricingResolutionError } from "../../pricing/errors";
import { resolveBrandVariantPrice, resolveOutletVariantPrice } from "../../pricing/resolve-price";
import type { EligibilityDecision } from "../../assortment/types";
import { loadCustomerMenuModifiersByVariantId } from "./load-customer-menu-modifiers";

function isAssortmentOrCatalogOmission(code: EligibilityDecision["code"]): boolean {
  return (
    code === "ASSORTMENT_NOT_INCLUDED" ||
    code === "ASSORTMENT_EXCLUDED_BRAND" ||
    code === "ASSORTMENT_EXCLUDED_TERRITORY" ||
    code === "ASSORTMENT_EXCLUDED_ORGANIZATION" ||
    code === "ASSORTMENT_EXCLUDED_OUTLET" ||
    code === "CATALOG_INACTIVE" ||
    code === "OUTLET_INACTIVE" ||
    code === "DENIED"
  );
}

function isOperatingEligibilityCode(code: EligibilityDecision["code"]): boolean {
  return (
    code === "OUTLET_PAUSED" ||
    code === "OUTLET_SUSPENDED" ||
    code === "OUTLET_CLOSED_BY_SCHEDULE" ||
    code === "OPERATING_CONFIGURATION_MISSING"
  );
}

/**
 * Compose existing IMP-014 eligibility onto CustomerMenuAvailability.
 * Assortment exclusions are omitted (ADR-006). Operating state remains
 * Serviceability/location authority and is not remapped as item availability
 * when an outletId is supplied for merchandise projection.
 */
function displayAvailabilityFromEligibility(
  decision: EligibilityDecision,
  opsAvailability: CustomerMenuAvailability,
): CustomerMenuAvailability | "omit" {
  if (isAssortmentOrCatalogOmission(decision.code)) return "omit";
  if (decision.code === "VARIANT_SOLD_OUT") return "sold_out";
  if (
    decision.code === "VARIANT_TEMPORARILY_UNAVAILABLE" ||
    decision.code === "MODIFIER_CONFIGURATION_UNAVAILABLE" ||
    decision.code === "BUNDLE_COMPONENT_UNAVAILABLE"
  ) {
    return "temporarily_unavailable";
  }
  if (decision.eligible || isOperatingEligibilityCode(decision.code)) {
    return opsAvailability;
  }
  if (decision.code === "ERROR") return "temporarily_unavailable";
  return opsAvailability;
}

export type ProjectCustomerMenuInput = Readonly<{
  brandId: string;
  outletId?: string | null;
  at?: Date;
}>;

function bigintToJsonNumber(amountPaise: bigint): number {
  const asNumber = Number(amountPaise);
  if (!Number.isSafeInteger(asNumber)) {
    throw new PricingResolutionError("PRICE_MISSING", "Display price exceeds JSON safe integer range.");
  }
  return asNumber;
}

async function loadActiveMenuForBrand(context: PersistenceQueryContext, brandId: string) {
  const rows = await context.db
    .select()
    .from(menusTable)
    .where(and(eq(menusTable.brandId, brandId), eq(menusTable.lifecycleStatus, "active")))
    .orderBy(asc(menusTable.id));
  if (rows.length !== 1) {
    throw new CustomerMenuError(
      "MENU_UNAVAILABLE",
      rows.length === 0
        ? "No active menu exists for this brand."
        : "Multiple active menus exist for this brand.",
    );
  }
  return rows[0]!;
}

async function resolveOutletForBrand(
  context: PersistenceQueryContext,
  brandId: string,
  outletId: string,
): Promise<string> {
  const id = assertUuid(outletId, "outletId");
  const rows = await context.db
    .select({ id: outletsTable.id, brandId: outletsTable.brandId })
    .from(outletsTable)
    .where(eq(outletsTable.id, id))
    .limit(1);
  const outlet = rows[0];
  if (!outlet || outlet.brandId !== brandId) {
    throw new CustomerMenuError("OUTLET_NOT_FOUND", "Outlet not found for this brand.", {
      field: "outletId",
    });
  }
  return outlet.id;
}

function pickDefaultEffectiveVariant(
  variants: ReadonlyArray<{
    id: string;
    isDefault: boolean;
  }>,
): { id: string; isDefault: boolean } {
  // Customer truth is effective content only — primary lifecycle/draft defaults
  // must not participate in default selection.
  const defaults = variants.filter((variant) => variant.isDefault);
  if (defaults.length !== 1) {
    throw new CustomerMenuError(
      "MENU_UNAVAILABLE",
      "Active menu entry product lacks exactly one effective default variant.",
    );
  }
  return defaults[0]!;
}

export async function projectCustomerMenu(
  context: PersistenceQueryContext,
  input: ProjectCustomerMenuInput,
): Promise<CustomerMenuProjection> {
  const brandId = assertUuid(input.brandId, "brandId");
  const at = input.at ?? new Date();
  const menuRow = await loadActiveMenuForBrand(context, brandId);
  const menuId = menuRow.id;

  // Customer cutover: ACTIVE Menu → effectiveMenuVersionId → EFFECTIVE graph only.
  // No draft fallback. No legacy menu_sections / menu_entries fallback.
  if (!menuRow.effectiveMenuVersionId) {
    throw new CustomerMenuError(
      "MENU_UNAVAILABLE",
      "Active menu has no effective MenuVersion pointer.",
    );
  }

  const versionRows = await context.db
    .select()
    .from(menuVersionsTable)
    .where(eq(menuVersionsTable.id, menuRow.effectiveMenuVersionId))
    .limit(1);
  const menuVersion = versionRows[0];
  if (
    !menuVersion ||
    menuVersion.menuId !== menuId ||
    menuVersion.lifecycleStatus !== "EFFECTIVE"
  ) {
    throw new CustomerMenuError(
      "MENU_UNAVAILABLE",
      "Active menu effective MenuVersion is missing or not EFFECTIVE.",
    );
  }

  const sectionRows = await context.db
    .select()
    .from(menuSectionVersionsTable)
    .where(
      and(
        eq(menuSectionVersionsTable.menuVersionId, menuVersion.id),
        eq(menuSectionVersionsTable.lifecycleStatus, "active"),
      ),
    )
    .orderBy(
      asc(menuSectionVersionsTable.position),
      asc(menuSectionVersionsTable.sectionId),
    );

  const entryRows = await context.db
    .select()
    .from(menuEntryVersionsTable)
    .where(
      and(
        eq(menuEntryVersionsTable.menuVersionId, menuVersion.id),
        eq(menuEntryVersionsTable.lifecycleStatus, "active"),
      ),
    )
    .orderBy(asc(menuEntryVersionsTable.position), asc(menuEntryVersionsTable.entryId));

  const productIds = [...new Set(entryRows.map((entry) => entry.productId))];
  const productRows =
    productIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogProductsTable)
          .where(
            and(
              eq(catalogProductsTable.brandId, brandId),
              inArray(catalogProductsTable.id, productIds),
            ),
          );

  const variantRows =
    productIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogVariantsTable)
          .where(
            and(
              eq(catalogVariantsTable.brandId, brandId),
              inArray(catalogVariantsTable.productId, productIds),
            ),
          );

  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const variantsByProductId = new Map<string, Array<typeof catalogVariantsTable.$inferSelect>>();
  for (const variant of variantRows) {
    const list = variantsByProductId.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProductId.set(variant.productId, list);
  }

  const effectiveProducts = await loadEffectiveProductContentMap(context, productRows);
  const effectiveVariants = await loadEffectiveVariantContentMap(context, variantRows);

  const outletId =
    input.outletId && input.outletId.length > 0
      ? await resolveOutletForBrand(context, brandId, input.outletId)
      : null;

  const projectedVariantIds: string[] = [];
  const pendingItems: Array<{
    entry: (typeof entryRows)[number];
    product: typeof catalogProductsTable.$inferSelect;
    variant: typeof catalogVariantsTable.$inferSelect;
    display: ReturnType<typeof effectiveEntryDisplay>;
  }> = [];

  for (const entry of entryRows) {
    const product = productsById.get(entry.productId);
    const productContent = product ? effectiveProducts.get(product.id) : undefined;
    // Customer-visible product = effective content present. Staged activation
    // (primary active, effective null) and missing revision rows fail closed.
    if (!product || !productContent) {
      throw new CustomerMenuError(
        "MENU_UNAVAILABLE",
        "Active menu entry references missing or inactive product.",
      );
    }

    const productVariants = (variantsByProductId.get(entry.productId) ?? [])
      .map((variant) => {
        const content = effectiveVariants.get(variant.id);
        if (!content) return null;
        return {
          ...variant,
          name: content.name,
          description: content.description,
          isDefault: content.isDefault,
          isSelectorVisible: content.isSelectorVisible,
        };
      })
      .filter((variant): variant is NonNullable<typeof variant> => variant != null);
    const variant = pickDefaultEffectiveVariant(productVariants);
    const display = effectiveEntryDisplay(entry, {
      name: productContent.name,
      description: productContent.description,
    });

    projectedVariantIds.push(variant.id);
    pendingItems.push({
      entry,
      product,
      variant: productVariants.find((v) => v.id === variant.id)!,
      display,
    });
  }

  const eligibilitySession =
    outletId !== null
      ? await createOutletEligibilitySession(context, {
          outletId,
          variantIds: projectedVariantIds,
          now: at,
        })
      : null;

  const modifiersByVariantId = await loadCustomerMenuModifiersByVariantId(context, {
    brandId,
    outletId,
    variantIds: projectedVariantIds,
    at,
    exclusionIndex: eligibilitySession?.exclusions,
  });

  const sections: CustomerMenuSection[] = sectionRows.map((section) =>
    Object.freeze({
      id: section.sectionId,
      parentSectionId: section.parentSectionId,
      name: section.name,
      position: section.position,
    }),
  );

  const items: CustomerMenuItem[] = [];
  for (const pending of pendingItems) {
    const { entry, product, variant, display } = pending;

    const resolvedPrice = outletId
      ? await resolveOutletVariantPrice(context, { variantId: variant.id, outletId, at })
      : await resolveBrandVariantPrice(context, { brandId, variantId: variant.id, at });

    let availability: CustomerMenuAvailability | undefined;
    if (outletId && eligibilitySession) {
      const eligibility = await eligibilitySession.resolveVariant(variant.id);
      const opsAvailability = eligibilitySession.opsAvailability(variant.id);
      const projected = displayAvailabilityFromEligibility(eligibility, opsAvailability);
      if (projected === "omit") {
        continue;
      }
      availability = projected;
    }

    const modifierGroups = modifiersByVariantId.get(variant.id);

    items.push(
      Object.freeze({
        productId: product.id,
        variantId: variant.id,
        sectionId: entry.sectionId,
        name: display.name,
        description: display.description,
        imagePath: entry.imagePath,
        displayPricePaise: bigintToJsonNumber(resolvedPrice.amountPaise),
        currency: "INR" as const,
        ...(availability !== undefined ? { availability } : {}),
        ...(modifierGroups !== undefined ? { modifierGroups } : {}),
      }),
    );
  }

  return Object.freeze({
    brandId,
    menuId,
    name: menuRow.name,
    sections: Object.freeze(sections),
    items: Object.freeze(items),
  });
}

export { PricingNotFoundError, PricingResolutionError };
