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
  menuEntriesTable,
  menusTable,
  menuSectionsTable,
} from "../../../platform/database/schema/menu";
import { outletsTable } from "../../../platform/database/schema/organizations";
import { CustomerMenuError } from "../../../shared/customer-menu/errors";
import type {
  CustomerMenuAvailability,
  CustomerMenuItem,
  CustomerMenuProjection,
  CustomerMenuSection,
} from "../../../shared/customer-menu/types";
import { loadEffectiveVariantAvailabilityState } from "../../assortment/availability";
import { effectiveEntryDisplay } from "../../catalog/menu/reads";
import { assertUuid } from "../../catalog/lifecycle";
import type { PersistenceQueryContext } from "../../persistence/types";
import { PricingNotFoundError, PricingResolutionError } from "../../pricing/errors";
import { resolveBrandVariantPrice, resolveOutletVariantPrice } from "../../pricing/resolve-price";
import { loadCustomerMenuModifiersByVariantId } from "./load-customer-menu-modifiers";

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

function pickDefaultActiveVariant(
  variants: ReadonlyArray<typeof catalogVariantsTable.$inferSelect>,
): typeof catalogVariantsTable.$inferSelect {
  const active = variants.filter((variant) => variant.lifecycleStatus === "active");
  const defaults = active.filter((variant) => variant.isDefault);
  if (defaults.length !== 1) {
    throw new CustomerMenuError(
      "MENU_UNAVAILABLE",
      "Active menu entry product lacks exactly one active default variant.",
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

  const sectionRows = await context.db
    .select()
    .from(menuSectionsTable)
    .where(
      and(eq(menuSectionsTable.menuId, menuId), eq(menuSectionsTable.lifecycleStatus, "active")),
    )
    .orderBy(asc(menuSectionsTable.position), asc(menuSectionsTable.id));

  const entryRows = await context.db
    .select()
    .from(menuEntriesTable)
    .where(
      and(eq(menuEntriesTable.menuId, menuId), eq(menuEntriesTable.lifecycleStatus, "active")),
    )
    .orderBy(asc(menuEntriesTable.position), asc(menuEntriesTable.id));

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
    if (!product || product.lifecycleStatus !== "active") {
      throw new CustomerMenuError(
        "MENU_UNAVAILABLE",
        "Active menu entry references missing or inactive product.",
      );
    }

    const productVariants = variantsByProductId.get(entry.productId) ?? [];
    const variant = pickDefaultActiveVariant(productVariants);
    const display = effectiveEntryDisplay(entry, product);

    projectedVariantIds.push(variant.id);
    pendingItems.push({ entry, product, variant, display });
  }

  const modifiersByVariantId = await loadCustomerMenuModifiersByVariantId(context, {
    brandId,
    outletId,
    variantIds: projectedVariantIds,
    at,
  });

  const sections: CustomerMenuSection[] = sectionRows.map((section) =>
    Object.freeze({
      id: section.id,
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
    if (outletId) {
      availability = await loadEffectiveVariantAvailabilityState(
        context,
        outletId,
        variant.id,
        at,
      );
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
