/**
 * Bounded Store Operations read projections (IMP-036E).
 *
 * No new domain authority — joins safe display identity over existing Assortment /
 * Availability reads after HTTP-boundary authorization.
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { assortmentRulesTable } from "../../../platform/database/schema/assortment";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierOptionsTable,
  catalogVariantModifierGroupsTable,
} from "../../../platform/database/schema/catalog";
import type { WorkforcePrincipal } from "../../access-control";
import {
  getEffectiveModifierOptionAssortment,
  getEffectiveVariantAssortment,
  getModifierOptionAvailability,
  getVariantAvailability,
  requireAssortmentRead,
  requireAvailabilityRead,
} from "../../assortment";
import { findModifierOptionById } from "../../catalog/modifiers";
import { findProductById } from "../../catalog/products";
import { findVariantById } from "../../catalog/variants";
import { findOutletById } from "../../organization/outlets";
import type { PersistenceQueryContext } from "../../persistence/types";
import { AssortmentNotFoundError } from "../../assortment/errors";

const LIST_CAP = 500;

export type StoreAvailabilityListItem = Readonly<{
  kind: "variant" | "modifier_option";
  id: string;
  productName?: string;
  variantName?: string;
  code?: string;
  effectiveState: string;
  persistedState: string | null;
  unavailableUntil: string | null;
}>;

export type StoreAssortmentListItem = Readonly<{
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  code: string;
  eligible: boolean;
  eligibilityCode: string;
}>;

/**
 * Discover active Modifier Options reachable from an active Variant via the
 * canonical Catalog binding graph (variant → group → option).
 */
async function discoverModifierOptionIdsForVariant(
  context: PersistenceQueryContext,
  brandId: string,
  variantId: string,
): Promise<readonly string[]> {
  const bindings = await context.db
    .select({ groupId: catalogVariantModifierGroupsTable.modifierGroupId })
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        eq(catalogVariantModifierGroupsTable.variantId, variantId),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );
  if (bindings.length === 0) return [];

  const groupIds = [...new Set(bindings.map((row) => row.groupId))];
  const links = await context.db
    .select({
      modifierOptionId: catalogModifierGroupOptionsTable.modifierOptionId,
    })
    .from(catalogModifierGroupOptionsTable)
    .innerJoin(
      catalogModifierOptionsTable,
      and(
        eq(catalogModifierOptionsTable.id, catalogModifierGroupOptionsTable.modifierOptionId),
        eq(catalogModifierOptionsTable.brandId, catalogModifierGroupOptionsTable.brandId),
      ),
    )
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.brandId, brandId),
        inArray(catalogModifierGroupOptionsTable.modifierGroupId, groupIds),
        eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
        eq(catalogModifierOptionsTable.lifecycleStatus, "active"),
      ),
    );

  return [...new Set(links.map((row) => row.modifierOptionId))];
}

export async function listStoreAvailabilityProjection(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
): Promise<Readonly<{ outletId: string; items: readonly StoreAvailabilityListItem[] }>> {
  const outlet = await requireAvailabilityRead(context, actor, outletId);
  if (!outlet) throw new AssortmentNotFoundError("outlet");
  const now = new Date();
  const items: StoreAvailabilityListItem[] = [];
  const seenModifierOptionIds = new Set<string>();

  const includeRows = await context.db
    .select({
      variantId: assortmentRulesTable.variantId,
    })
    .from(assortmentRulesTable)
    .where(
      and(
        eq(assortmentRulesTable.brandId, outlet.brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.targetType, "variant"),
        eq(assortmentRulesTable.decision, "include"),
        eq(assortmentRulesTable.status, "active"),
      ),
    )
    .limit(LIST_CAP);

  for (const row of includeRows) {
    if (items.length >= LIST_CAP) break;
    const variantId = row.variantId;
    if (!variantId) continue;

    // HTTP boundary already authorized availability.read; avoid re-checking Brand assortment.
    const variantAssortment = await getEffectiveVariantAssortment(context, {
      outletId,
      variantId,
      authorize: false,
    });
    const variant = await findVariantById(context, variantId);
    const product = variant ? await findProductById(context, variant.productId) : null;
    const availability = await getVariantAvailability(context, {
      actor,
      outletId,
      variantId,
      now,
    });

    items.push({
      kind: "variant",
      id: variantId,
      ...(product?.name !== undefined ? { productName: product.name } : {}),
      ...(variant?.name !== undefined ? { variantName: variant.name } : {}),
      ...(variant?.code !== undefined ? { code: variant.code } : {}),
      effectiveState: availability.effectiveState,
      persistedState: availability.persistedState,
      unavailableUntil: availability.unavailableUntil
        ? availability.unavailableUntil.toISOString()
        : null,
    });

    // Modifier Options are discovered from the Catalog/Assortment graph — never
    // from existing availability override rows (no-row ⇒ default available).
    if (!variantAssortment.eligible) continue;

    const optionIds = await discoverModifierOptionIdsForVariant(
      context,
      outlet.brandId,
      variantId,
    );
    for (const modifierOptionId of optionIds) {
      if (items.length >= LIST_CAP) break;
      if (seenModifierOptionIds.has(modifierOptionId)) continue;
      seenModifierOptionIds.add(modifierOptionId);

      const optionAssortment = await getEffectiveModifierOptionAssortment(context, {
        outletId,
        modifierOptionId,
        authorize: false,
      });
      if (!optionAssortment.eligible) continue;

      const option = await findModifierOptionById(context, modifierOptionId);
      const optionAvailability = await getModifierOptionAvailability(context, {
        actor,
        outletId,
        modifierOptionId,
        now,
      });
      items.push({
        kind: "modifier_option",
        id: modifierOptionId,
        ...(option?.name !== undefined ? { variantName: option.name } : {}),
        ...(option?.code !== undefined ? { code: option.code } : {}),
        effectiveState: optionAvailability.effectiveState,
        persistedState: optionAvailability.persistedState,
        unavailableUntil: optionAvailability.unavailableUntil
          ? optionAvailability.unavailableUntil.toISOString()
          : null,
      });
    }
  }

  return { outletId, items };
}

export async function listStoreAssortmentProjection(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
): Promise<
  Readonly<{
    outletId: string;
    brandId: string;
    items: readonly StoreAssortmentListItem[];
  }>
> {
  const outlet = await findOutletById(context, outletId);
  if (!outlet) throw new AssortmentNotFoundError("outlet");

  await requireAssortmentRead(context, actor, outlet.brandId);

  const includeRows = await context.db
    .select({
      variantId: assortmentRulesTable.variantId,
    })
    .from(assortmentRulesTable)
    .where(
      and(
        eq(assortmentRulesTable.brandId, outlet.brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.targetType, "variant"),
        eq(assortmentRulesTable.decision, "include"),
        eq(assortmentRulesTable.status, "active"),
      ),
    )
    .limit(LIST_CAP);

  const items: StoreAssortmentListItem[] = [];
  for (const row of includeRows) {
    if (items.length >= LIST_CAP) break;
    const variantId = row.variantId;
    if (!variantId) continue;

    const eligibility = await getEffectiveVariantAssortment(context, {
      actor,
      outletId,
      variantId,
      authorize: true,
    });

    const variant = await findVariantById(context, variantId);
    if (!variant) continue;
    const product = await findProductById(context, variant.productId);
    if (!product) continue;

    items.push({
      variantId,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      code: variant.code,
      eligible: eligibility.eligible,
      eligibilityCode: eligibility.code,
    });
  }

  return { outletId: outlet.id, brandId: outlet.brandId, items };
}
