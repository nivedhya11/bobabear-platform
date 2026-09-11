/**
 * Customer Menu modifier graph loading (IMP-028C / D-368 extension).
 *
 * READ composition over existing catalog and pricing authorities.
 * Unavailable / excluded modifier options are omitted from projection
 * (accepted D-368 semantics; no per-option public availability DTO field).
 *
 * Customer visibility uses EFFECTIVE Catalog content/lifecycle truth only.
 * Primary draft lifecycle must not leak unpublished activation/retirement.
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
import {
  loadOutletAncestry,
  loadOutletExclusionIndex,
  type OutletExclusionIndex,
} from "../../assortment/assortment-reads";
import { loadEffectiveModifierOptionAvailabilityStates } from "../../assortment/availability";
import type { PersistenceQueryContext } from "../../persistence/types";
import { resolveModifierDisplayPriceDeltas } from "../../pricing/resolve-price";
import { PricingResolutionError } from "../../pricing/errors";
import {
  loadEffectiveModifierGroupContent,
  loadEffectiveModifierGroupOptionContent,
  loadEffectiveModifierOptionContent,
  loadEffectiveVariantModifierGroupContent,
} from "../../catalog/revisions";

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
    exclusionIndex?: OutletExclusionIndex;
  }>,
): Promise<ReadonlyMap<string, readonly CustomerMenuModifierGroup[]>> {
  const result = new Map<string, readonly CustomerMenuModifierGroup[]>();
  if (input.variantIds.length === 0) {
    return result;
  }

  // Load candidate rows without filtering on mutable primary lifecycle —
  // effective revision lifecycle is authoritative for customer visibility.
  const variantModifierGroupRows = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, input.brandId),
        inArray(catalogVariantModifierGroupsTable.variantId, [...input.variantIds]),
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
      ),
    );

  const groupById = new Map(modifierGroupRows.map((row) => [row.id, row]));

  const groupOptionRows = await context.db
    .select()
    .from(catalogModifierGroupOptionsTable)
    .where(
      and(
        eq(catalogModifierGroupOptionsTable.brandId, input.brandId),
        inArray(catalogModifierGroupOptionsTable.modifierGroupId, modifierGroupIds),
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
            ),
          );

  const optionById = new Map(modifierOptionRows.map((row) => [row.id, row]));

  const groupOptionsByGroupId = new Map<
    string,
    Array<typeof catalogModifierGroupOptionsTable.$inferSelect>
  >();
  for (const row of groupOptionRows) {
    const list = groupOptionsByGroupId.get(row.modifierGroupId) ?? [];
    list.push(row);
    groupOptionsByGroupId.set(row.modifierGroupId, list);
  }

  // Resolve effective content first so price keys only include customer-visible
  // bindings (omit staged activation / retired-but-not-yet-published).
  type EffectiveVmg = {
    vmg: (typeof variantModifierGroupRows)[number];
    vmgContent: NonNullable<
      Awaited<ReturnType<typeof loadEffectiveVariantModifierGroupContent>>
    >;
    group: (typeof modifierGroupRows)[number];
    groupContent: NonNullable<
      Awaited<ReturnType<typeof loadEffectiveModifierGroupContent>>
    >;
  };

  const effectiveVmgs: EffectiveVmg[] = [];
  for (const vmg of variantModifierGroupRows) {
    const vmgContent = await loadEffectiveVariantModifierGroupContent(context, vmg);
    if (!vmgContent || vmgContent.lifecycleStatus !== "active") continue;
    const group = groupById.get(vmg.modifierGroupId);
    if (!group) continue;
    const groupContent = await loadEffectiveModifierGroupContent(context, group);
    if (!groupContent) continue;
    effectiveVmgs.push({ vmg, vmgContent, group, groupContent });
  }

  type EffectiveBinding = {
    binding: (typeof groupOptionRows)[number];
    bindingContent: NonNullable<
      Awaited<ReturnType<typeof loadEffectiveModifierGroupOptionContent>>
    >;
    option: (typeof modifierOptionRows)[number];
    optionContent: NonNullable<
      Awaited<ReturnType<typeof loadEffectiveModifierOptionContent>>
    >;
  };

  const effectiveBindingsByGroupId = new Map<string, EffectiveBinding[]>();
  for (const row of groupOptionRows) {
    const bindingContent = await loadEffectiveModifierGroupOptionContent(context, row);
    if (!bindingContent || bindingContent.lifecycleStatus !== "active") continue;
    const option = optionById.get(row.modifierOptionId);
    if (!option) continue;
    const optionContent = await loadEffectiveModifierOptionContent(context, option);
    if (!optionContent) continue;
    const list = effectiveBindingsByGroupId.get(row.modifierGroupId) ?? [];
    list.push({ binding: row, bindingContent, option, optionContent });
    effectiveBindingsByGroupId.set(row.modifierGroupId, list);
  }

  const priceKeys: Array<{
    variantModifierGroupId: string;
    modifierGroupOptionId: string;
  }> = [];
  for (const { vmg, group } of effectiveVmgs) {
    const bindings = effectiveBindingsByGroupId.get(group.id) ?? [];
    for (const { binding } of bindings) {
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

  const visibleOptionIds = [
    ...new Set(
      [...effectiveBindingsByGroupId.values()].flatMap((list) =>
        list.map((item) => item.option.id),
      ),
    ),
  ];

  let exclusionIndex = input.exclusionIndex ?? null;
  let modifierAvailability = new Map<string, "available" | "sold_out" | "temporarily_unavailable">();
  if (input.outletId !== null) {
    if (!exclusionIndex) {
      const ancestry = await loadOutletAncestry(context, input.outletId);
      exclusionIndex = await loadOutletExclusionIndex(context, ancestry);
    }
    modifierAvailability = new Map(
      await loadEffectiveModifierOptionAvailabilityStates(
        context,
        input.outletId,
        visibleOptionIds,
        input.at,
      ),
    );
  }

  const modifiersByVariantId = new Map<string, CustomerMenuModifierGroup[]>();
  for (const { vmg, vmgContent, group, groupContent } of effectiveVmgs) {
    const bindings = [...(effectiveBindingsByGroupId.get(group.id) ?? [])];
    bindings.sort((left, right) =>
      compareByPositionThenId(
        { position: left.bindingContent.position, id: left.binding.id },
        { position: right.bindingContent.position, id: right.binding.id },
      ),
    );

    const options: CustomerMenuModifierOption[] = [];
    for (const { binding, bindingContent, option, optionContent } of bindings) {
      const priceKey = `${vmg.id}:${binding.id}`;
      const delta = priceDeltas.get(priceKey);
      if (delta === undefined) continue;

      const displayPriceDeltaPaise = Number(delta);
      if (!Number.isSafeInteger(displayPriceDeltaPaise)) {
        throw new PricingResolutionError(
          "PRICE_MISSING",
          "modifier display price delta exceeds JSON safe integer range.",
        );
      }

      if (exclusionIndex) {
        if (exclusionIndex.excludedModifierOptionIds.has(option.id)) {
          continue;
        }
        const state = modifierAvailability.get(option.id) ?? "available";
        if (state !== "available") {
          continue;
        }
      }

      options.push(
        Object.freeze({
          modifierOptionId: option.id,
          modifierGroupOptionId: binding.id,
          name: optionContent.name,
          minQuantity: bindingContent.minQuantity,
          maxQuantity: bindingContent.maxQuantity,
          defaultQuantity: bindingContent.defaultQuantity,
          position: bindingContent.position,
          displayPriceDeltaPaise,
          currency: "INR" as const,
        }),
      );
    }

    if (options.length === 0) continue;

    const projectedGroup = Object.freeze({
      modifierGroupId: group.id,
      variantModifierGroupId: vmg.id,
      name: groupContent.name,
      required: isModifierGroupRequired(vmgContent.minTotalQuantity),
      minTotalQuantity: vmgContent.minTotalQuantity,
      maxTotalQuantity: vmgContent.maxTotalQuantity,
      position: vmgContent.position,
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
    result.set(variantId, Object.freeze(groups));
  }

  return result;
}
