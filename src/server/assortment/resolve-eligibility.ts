/**
 * Outlet eligibility resolvers (IMP-014).
 *
 * Fail closed. Trusted server `now` only — ancestry always loaded from PostgreSQL.
 */
import { and, eq } from "drizzle-orm";

import type { EligibilityDecisionCode } from "../../shared/assortment";
import {
  catalogBundleGroupOptionsTable,
  catalogBundleGroupsTable,
  catalogModifierGroupOptionsTable,
  catalogModifierOptionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import { findModifierOptionById } from "../catalog/modifiers";
import { findProductById } from "../catalog/products";
import { findVariantById } from "../catalog/variants";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import {
  findModifierOptionExclusion,
  findProductOrVariantExclusion,
  hasActiveBrandVariantInclude,
  loadOutletAncestry,
} from "./assortment-reads";
import {
  loadEffectiveModifierOptionAvailabilityState,
  loadEffectiveVariantAvailabilityState,
} from "./availability";
import { resolveOutletOperatingState } from "./resolve-operating";
import type {
  EligibilityDecision,
  ResolveModifierOptionAvailabilityInput,
  ResolveOutletProductAvailabilityInput,
  ResolveOutletVariantAvailabilityInput,
} from "./types";

function denied(code: EligibilityDecisionCode): EligibilityDecision {
  return { eligible: false, code };
}

function available(): EligibilityDecision {
  return { eligible: true, code: "AVAILABLE" };
}

async function isModifierOptionApplicableToVariant(
  context: PersistenceQueryContext,
  brandId: string,
  variantId: string,
  modifierOptionId: string,
): Promise<boolean> {
  const bindings = await context.db
    .select({
      bindingId: catalogVariantModifierGroupsTable.id,
      groupId: catalogVariantModifierGroupsTable.modifierGroupId,
    })
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        eq(catalogVariantModifierGroupsTable.variantId, variantId),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );

  for (const binding of bindings) {
    const links = await context.db
      .select({ id: catalogModifierGroupOptionsTable.id })
      .from(catalogModifierGroupOptionsTable)
      .where(
        and(
          eq(catalogModifierGroupOptionsTable.brandId, brandId),
          eq(catalogModifierGroupOptionsTable.modifierGroupId, binding.groupId),
          eq(catalogModifierGroupOptionsTable.modifierOptionId, modifierOptionId),
          eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
        ),
      )
      .limit(1);
    if (links.length > 0) return true;
  }
  return false;
}

/**
 * Assortment + operational availability for a modifier option (no parent
 * variant assortment check — caller supplies that when needed).
 */
async function isModifierOptionSelectableAtOutlet(
  context: PersistenceQueryContext,
  ancestry: Awaited<ReturnType<typeof loadOutletAncestry>>,
  variantId: string,
  modifierOptionId: string,
  now: Date,
): Promise<boolean> {
  const option = await findModifierOptionById(context, modifierOptionId);
  if (!option || option.brandId !== ancestry.brandId || option.lifecycleStatus !== "active") {
    return false;
  }

  const applicable = await isModifierOptionApplicableToVariant(
    context,
    ancestry.brandId,
    variantId,
    modifierOptionId,
  );
  if (!applicable) return false;

  const exclusion = await findModifierOptionExclusion(context, ancestry, modifierOptionId);
  if (exclusion) return false;

  const state = await loadEffectiveModifierOptionAvailabilityState(
    context,
    ancestry.outletId,
    modifierOptionId,
    now,
  );
  return state === "available";
}

async function requiredModifierConfigurationFeasible(
  context: PersistenceQueryContext,
  ancestry: Awaited<ReturnType<typeof loadOutletAncestry>>,
  variantId: string,
  now: Date,
): Promise<boolean> {
  const bindings = await context.db
    .select()
    .from(catalogVariantModifierGroupsTable)
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, ancestry.brandId),
        eq(catalogVariantModifierGroupsTable.variantId, variantId),
        eq(catalogVariantModifierGroupsTable.lifecycleStatus, "active"),
      ),
    );

  for (const binding of bindings) {
    if (binding.minTotalQuantity <= 0) continue;

    const groupOptions = await context.db
      .select()
      .from(catalogModifierGroupOptionsTable)
      .where(
        and(
          eq(catalogModifierGroupOptionsTable.brandId, ancestry.brandId),
          eq(catalogModifierGroupOptionsTable.modifierGroupId, binding.modifierGroupId),
          eq(catalogModifierGroupOptionsTable.lifecycleStatus, "active"),
        ),
      );

    let capacity = 0;
    for (const groupOption of groupOptions) {
      const optionRows = await context.db
        .select()
        .from(catalogModifierOptionsTable)
        .where(
          and(
            eq(catalogModifierOptionsTable.id, groupOption.modifierOptionId),
            eq(catalogModifierOptionsTable.lifecycleStatus, "active"),
          ),
        )
        .limit(1);
      if (!optionRows[0]) continue;

      const selectable = await isModifierOptionSelectableAtOutlet(
        context,
        ancestry,
        variantId,
        groupOption.modifierOptionId,
        now,
      );
      if (!selectable) continue;

      const maxQty =
        typeof groupOption.maxQuantity === "number" && groupOption.maxQuantity > 0
          ? groupOption.maxQuantity
          : 1;
      capacity += maxQty;
    }

    if (capacity < binding.minTotalQuantity) {
      return false;
    }
  }
  return true;
}

/**
 * Component eligibility for bundle feasibility: catalog + assortment +
 * availability + modifier feasibility — not nested bundles.
 */
async function isStandardComponentEligible(
  context: PersistenceQueryContext,
  ancestry: Awaited<ReturnType<typeof loadOutletAncestry>>,
  componentVariantId: string,
  now: Date,
): Promise<boolean> {
  const variant = await findVariantById(context, componentVariantId);
  if (
    !variant ||
    variant.brandId !== ancestry.brandId ||
    variant.lifecycleStatus !== "active" ||
    variant.productKind !== "standard"
  ) {
    return false;
  }
  const product = await findProductById(context, variant.productId);
  if (!product || product.lifecycleStatus !== "active") return false;

  const included = await hasActiveBrandVariantInclude(
    context,
    ancestry.brandId,
    componentVariantId,
  );
  if (!included) return false;

  const exclusion = await findProductOrVariantExclusion(
    context,
    ancestry,
    product.id,
    componentVariantId,
  );
  if (exclusion) return false;

  const avail = await loadEffectiveVariantAvailabilityState(
    context,
    ancestry.outletId,
    componentVariantId,
    now,
  );
  if (avail !== "available") return false;

  return requiredModifierConfigurationFeasible(context, ancestry, componentVariantId, now);
}

async function requiredBundleConfigurationFeasible(
  context: PersistenceQueryContext,
  ancestry: Awaited<ReturnType<typeof loadOutletAncestry>>,
  bundleVariantId: string,
  now: Date,
): Promise<boolean> {
  const groups = await context.db
    .select()
    .from(catalogBundleGroupsTable)
    .where(
      and(
        eq(catalogBundleGroupsTable.brandId, ancestry.brandId),
        eq(catalogBundleGroupsTable.bundleVariantId, bundleVariantId),
        eq(catalogBundleGroupsTable.lifecycleStatus, "active"),
      ),
    );

  for (const group of groups) {
    if (group.minSelections <= 0) continue;

    const options = await context.db
      .select()
      .from(catalogBundleGroupOptionsTable)
      .where(
        and(
          eq(catalogBundleGroupOptionsTable.brandId, ancestry.brandId),
          eq(catalogBundleGroupOptionsTable.bundleGroupId, group.id),
          eq(catalogBundleGroupOptionsTable.lifecycleStatus, "active"),
        ),
      );

    let eligibleCount = 0;
    for (const option of options) {
      const ok = await isStandardComponentEligible(
        context,
        ancestry,
        option.componentVariantId,
        now,
      );
      if (ok) eligibleCount += 1;
    }

    if (eligibleCount < group.minSelections) {
      return false;
    }
  }
  return true;
}

function operatingCodeToDecision(
  code: EligibilityDecisionCode,
): EligibilityDecision | null {
  if (code === "AVAILABLE") return null;
  return denied(code);
}

export async function resolveOutletVariantAvailability(
  context: PersistenceQueryContext,
  input: ResolveOutletVariantAvailabilityInput,
): Promise<EligibilityDecision> {
  assertApplicationRole(context, "resolveOutletVariantAvailability");
  try {
    const variantId = assertUuid(input.variantId, "variantId");
    const outletId = assertUuid(input.outletId, "outletId");
    const now = input.context.now;

    const ancestry = await loadOutletAncestry(context, outletId);
    const variant = await findVariantById(context, variantId);
    if (!variant || variant.brandId !== ancestry.brandId) {
      return denied("DENIED");
    }

    const product = await findProductById(context, variant.productId);
    if (!product || product.brandId !== ancestry.brandId) {
      return denied("DENIED");
    }
    if (product.lifecycleStatus !== "active" || variant.lifecycleStatus !== "active") {
      return denied("CATALOG_INACTIVE");
    }

    const included = await hasActiveBrandVariantInclude(
      context,
      ancestry.brandId,
      variantId,
    );
    if (!included) return denied("ASSORTMENT_NOT_INCLUDED");

    const exclusion = await findProductOrVariantExclusion(
      context,
      ancestry,
      product.id,
      variantId,
    );
    if (exclusion) return denied(exclusion);

    const operating = await resolveOutletOperatingState(context, {
      outletId,
      context: { now },
    });
    const operatingDenied = operatingCodeToDecision(operating.code);
    if (operatingDenied) return operatingDenied;

    const avail = await loadEffectiveVariantAvailabilityState(
      context,
      outletId,
      variantId,
      now,
    );
    if (avail === "temporarily_unavailable") {
      return denied("VARIANT_TEMPORARILY_UNAVAILABLE");
    }
    if (avail === "sold_out") {
      return denied("VARIANT_SOLD_OUT");
    }

    const modifiersOk = await requiredModifierConfigurationFeasible(
      context,
      ancestry,
      variantId,
      now,
    );
    if (!modifiersOk) return denied("MODIFIER_CONFIGURATION_UNAVAILABLE");

    if (variant.productKind === "bundle") {
      const bundlesOk = await requiredBundleConfigurationFeasible(
        context,
        ancestry,
        variantId,
        now,
      );
      if (!bundlesOk) return denied("BUNDLE_COMPONENT_UNAVAILABLE");
    }

    return available();
  } catch {
    return denied("ERROR");
  }
}

export async function resolveOutletProductAvailability(
  context: PersistenceQueryContext,
  input: ResolveOutletProductAvailabilityInput,
): Promise<EligibilityDecision> {
  assertApplicationRole(context, "resolveOutletProductAvailability");
  try {
    const productId = assertUuid(input.productId, "productId");
    const outletId = assertUuid(input.outletId, "outletId");
    const now = input.context.now;

    const ancestry = await loadOutletAncestry(context, outletId);
    const product = await findProductById(context, productId);
    if (!product || product.brandId !== ancestry.brandId) {
      return denied("DENIED");
    }
    if (product.lifecycleStatus !== "active") {
      return denied("CATALOG_INACTIVE");
    }

    // Product effective availability is derived: at least one active Variant
    // must be effectively eligible. No persisted Product operational row.
    const variants = await context.db
      .select({ id: catalogVariantsTable.id })
      .from(catalogVariantsTable)
      .where(
        and(
          eq(catalogVariantsTable.productId, productId),
          eq(catalogVariantsTable.brandId, ancestry.brandId),
          eq(catalogVariantsTable.lifecycleStatus, "active"),
        ),
      );

    if (variants.length === 0) {
      return denied("CATALOG_INACTIVE");
    }

    let lastDenial: EligibilityDecision = denied("DENIED");
    for (const variant of variants) {
      const decision = await resolveOutletVariantAvailability(context, {
        variantId: variant.id,
        outletId,
        context: { now },
      });
      if (decision.eligible) return available();
      lastDenial = decision;
    }
    return lastDenial;
  } catch {
    return denied("ERROR");
  }
}

export async function resolveModifierOptionAvailability(
  context: PersistenceQueryContext,
  input: ResolveModifierOptionAvailabilityInput,
): Promise<EligibilityDecision> {
  assertApplicationRole(context, "resolveModifierOptionAvailability");
  try {
    const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
    const variantId = assertUuid(input.variantId, "variantId");
    const outletId = assertUuid(input.outletId, "outletId");
    const now = input.context.now;

    const ancestry = await loadOutletAncestry(context, outletId);
    const option = await findModifierOptionById(context, modifierOptionId);
    if (!option || option.brandId !== ancestry.brandId) {
      return denied("DENIED");
    }
    if (option.lifecycleStatus !== "active") {
      return denied("CATALOG_INACTIVE");
    }

    const applicable = await isModifierOptionApplicableToVariant(
      context,
      ancestry.brandId,
      variantId,
      modifierOptionId,
    );
    if (!applicable) {
      return denied("DENIED");
    }

    // Parent variant must be assortment+operating eligible (without requiring
    // this option's own group feasibility again for the parent resolve).
    const parent = await resolveOutletVariantAvailability(context, {
      variantId,
      outletId,
      context: { now },
    });
    // Parent may fail on MODIFIER_CONFIGURATION_UNAVAILABLE because *this*
    // option is unavailable — still allow evaluating the option itself for
    // assortment/ops. Re-check parent assortment gates explicitly instead.
    if (
      parent.code === "OUTLET_INACTIVE" ||
      parent.code === "OPERATING_CONFIGURATION_MISSING" ||
      parent.code === "OUTLET_PAUSED" ||
      parent.code === "OUTLET_SUSPENDED" ||
      parent.code === "OUTLET_CLOSED_BY_SCHEDULE" ||
      parent.code === "ASSORTMENT_NOT_INCLUDED" ||
      parent.code === "ASSORTMENT_EXCLUDED_BRAND" ||
      parent.code === "ASSORTMENT_EXCLUDED_TERRITORY" ||
      parent.code === "ASSORTMENT_EXCLUDED_ORGANIZATION" ||
      parent.code === "ASSORTMENT_EXCLUDED_OUTLET" ||
      parent.code === "CATALOG_INACTIVE" ||
      parent.code === "VARIANT_TEMPORARILY_UNAVAILABLE" ||
      parent.code === "VARIANT_SOLD_OUT" ||
      parent.code === "DENIED" ||
      parent.code === "ERROR"
    ) {
      return denied(parent.code);
    }

    const exclusion = await findModifierOptionExclusion(
      context,
      ancestry,
      modifierOptionId,
    );
    if (exclusion) return denied(exclusion);

    const state = await loadEffectiveModifierOptionAvailabilityState(
      context,
      outletId,
      modifierOptionId,
      now,
    );
    if (state !== "available") {
      return denied("DENIED");
    }

    return available();
  } catch {
    return denied("ERROR");
  }
}
