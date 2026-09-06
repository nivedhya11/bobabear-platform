/**
 * Bounded Store Operations read projections (IMP-036E).
 *
 * No new domain authority — joins safe display identity over existing Assortment /
 * Availability reads after HTTP-boundary authorization.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import {
  assortmentRulesTable,
  outletModifierOptionAvailabilityTable,
} from "../../../platform/database/schema/assortment";
import type { WorkforcePrincipal } from "../../access-control";
import {
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

export async function listStoreAvailabilityProjection(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
): Promise<Readonly<{ outletId: string; items: readonly StoreAvailabilityListItem[] }>> {
  const outlet = await requireAvailabilityRead(context, actor, outletId);
  if (!outlet) throw new AssortmentNotFoundError("outlet");
  const now = new Date();
  const items: StoreAvailabilityListItem[] = [];

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
    await getEffectiveVariantAssortment(context, {
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
  }

  const modifierRows = await context.db
    .select()
    .from(outletModifierOptionAvailabilityTable)
    .where(eq(outletModifierOptionAvailabilityTable.outletId, outletId))
    .limit(LIST_CAP);

  for (const row of modifierRows) {
    if (items.length >= LIST_CAP) break;
    const option = await findModifierOptionById(context, row.modifierOptionId);
    const availability = await getModifierOptionAvailability(context, {
      actor,
      outletId,
      modifierOptionId: row.modifierOptionId,
      now,
    });
    items.push({
      kind: "modifier_option",
      id: row.modifierOptionId,
      ...(option?.name !== undefined ? { variantName: option.name } : {}),
      ...(option?.code !== undefined ? { code: option.code } : {}),
      effectiveState: availability.effectiveState,
      persistedState: availability.persistedState,
      unavailableUntil: availability.unavailableUntil
        ? availability.unavailableUntil.toISOString()
        : null,
    });
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
