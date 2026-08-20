/**
 * Customer Menu modifier graph loading (IMP-028C / D-368 extension).
 *
 * READ composition over existing catalog and pricing authorities.
 */
import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { isModifierGroupRequired } from "../../../shared/catalog";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierGroupsTable,
  catalogModifierOptionsTable,
  catalogVariantModifierGroupsTable,
} from "../../../platform/database/schema/catalog";
import type {
  CustomerMenuModifierGroup,
  CustomerMenuModifierOption,
} from "../../../shared/customer-menu/types";
import type { PersistenceQueryContext } from "../../persistence/types";
import { resolveModifierDisplayPriceDeltas } from "../../pricing/resolve-price";
import { PricingResolutionError } from "../../pricing/errors";

function compareByPositionThenId(
  left: { position: number; id: string },
  right: { position: number; id: string },
): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.id.localeCompare(right.id);
}

export async function loadCustomerMenuModifiersByVariantId(
  context: PersistenceQueryContext,
  input: Readonly<{
    brandId: string;
    outletId: string | null;
    variantIds: readonly string[];
    at: Date;
  }>,
): Promise<ReadonlyMap<string, readonly CustomerMenuModifierGroup[]>> {
  const result = new Map<string, readonly CustomerMenuModifierGroup[]>();
  if (input.variantIds.length === 0) {
    return result;
  }

  const variantModifierGroupRows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, input.brandId),
        inArray(catalogVariantModifierGroupsTable.variantId, [...input.variantIds]),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    )
    .orderBy(
      asc(catalogVariantModifierGroupsTable.position),
      asc(catalogVariantModifierGroupsTable.id),
    );

  if (variantModifierGroupRows.length === 0) {
    return result;
  }

  const modifierGroupIds = [
    ...new Set(variantModifierGroupRows.map((row) => row.modifierGroupId)),
  ];

  const modifierGroupRows = await context.db
    .select()
    .from(catalogModifierGroupsTable)
    .where(
      and(
        eq(catalogModifierGroupsTable.brandId, input.brandId),
        inArray(catalogModifierGroupsTable.id, modifierGroupIds),
        eq(catalogModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );

  const activeGroupById = new Map(
    modifierGroupRows.map((row) => [row.id, row]),
  );

  const groupOptionRows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.brandId, input.brandId),
        inArray(catalogModifierGroupOptionsTable.modifierGroupId, modifierGroupIds),
        eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
      ),
    )
    .orderBy(
      asc(catalogModifierGroupOptionsTable.position),
      asc(catalogModifierGroupOptionsTable.id),
    );

  const modifierOptionIds = [
    ...new Set(groupOptionRows.map((row) => row.modifierOptionId)),
  ];

  const modifierOptionRows =
    modifierOptionIds.length === 0
      ? []
      : await context.db
          .select()
          .from(catalogModifierOptionsTable)
          .where(
            and(
              eq(catalogModifierOptionsTable.brandId, input.brandId),
              inArray(catalogModifierOptionsTable.id, modifierOptionIds),
              eq(catalogModifierOptionsTable.lifecycleStatus, "active"),
            ),
          );

  const activeOptionById = new Map(
    modifierOptionRows.map((row) => [row.id, row]),
  );

  const groupOptionsByGroupId = new Map<string, Array<typeof catalogModifierGroupOptionsTable.$inferSelect>>();
  for (const row of groupOptionRows) {
    const option = activeOptionById.get(row.modifierOptionId);
    if (!option) continue;
    const list = groupOptionsByGroupId.get(row.modifierGroupId) ?? [];
    list.push(row);
    groupOptionsByGroupId.set(row.modifierGroupId, list);
  }

  const priceKeys: Array<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
  }> = [];
  for (const vmg of variantModifierGroupRows) {
    const group = activeGroupById.get(vmg.modifierGroupId);
    if (!group) continue;
    const bindings = groupOptionsByGroupId.get(group.id) ?? [];
    for (const binding of bindings) {
      priceKeys.push({
        variantModifierGroupId: vmg.id,
        modifierGroupOptionId: binding.id,
      });
    }
  }

  const priceDeltas = await resolveModifierDisplayPriceDeltas(context, {
    brandId: input.brandId,
    outletId: input.outletId,
    keys: priceKeys,
    at: input.at,
  });

  const modifiersByVariantId = new Map<string, CustomerMenuModifierGroup[]>();
  for (const vmg of variantModifierGroupRows) {
    const group = activeGroupById.get(vmg.modifierGroupId);
    if (!group) continue;

    const bindings = [...(groupOptionsByGroupId.get(group.id) ?? [])].sort((left, right) =>
      compareByPositionThenId(
        { position: left.position, id: left.id },
        { position: right.position, id: right.id },
      ),
    );

    const options: CustomerMenuModifierOption[] = [];
    for (const binding of bindings) {
      const option = activeOptionById.get(binding.modifierOptionId);
      if (!option) continue;

      const priceKey = `${vmg.id}:${binding.id}`;
      const delta = priceDeltas.get(priceKey);
      if (delta === undefined) continue;

      const displayPriceDeltaPaise = Number(delta);
      if (!Number.isSafeInteger(displayPriceDeltaPaise)) {
        throw new PricingResolutionError(
          "PRICE_MISSING",
          "Modifier display price delta exceeds JSON safe integer range.",
        );
      }

      options.push(
        Object.freeze({
          modifierOptionId: option.id,
          modifierGroupOptionId: binding.id,
          name: option.name,
          minQuantity: binding.minQuantity,
          maxQuantity: binding.maxQuantity,
          defaultQuantity: binding.defaultQuantity,
          position: binding.position,
          displayPriceDeltaPaise,
          currency: "INR" as const,
        }),
      );
    }

    if (options.length === 0) continue;

    const projectedGroup = Object.freeze({
      modifierGroupId: group.id,
      variantModifierGroupId: vmg.id,
      name: group.name,
      required: isModifierGroupRequired(vmg.minTotalQuantity),
      minTotalQuantity: vmg.minTotalQuantity,
      maxTotalQuantity: vmg.maxTotalQuantity,
      position: vmg.position,
      options: Object.freeze(options),
    });

    const list = modifiersByVariantId.get(vmg.variantId) ?? [];
    list.push(projectedGroup);
    modifiersByVariantId.set(vmg.variantId, list);
  }

  for (const [variantId, groups] of modifiersByVariantId) {
    groups.sort((left, right) =>
      compareByPositionThenId(
        { position: left.position, id: left.variantModifierGroupId },
        { position: right.position, id: right.variantModifierGroupId },
      ),
    );
    result.set(variantId, Object.freeze(groups.map((group) => Object.freeze(group))));
  }

  return result;
}
