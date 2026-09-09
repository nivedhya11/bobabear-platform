/**
 * Effective assortment eligibility reads (IMP-014).
 */
import { and, eq, inArray, or } from "drizzle-orm";

import type { EligibilityDecisionCode } from "../../shared/assortment";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { findOutletById } from "../organization/outlets";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { requireAssortmentRead } from "./authorize-assortment";
import { AssortmentNotFoundError, AssortmentValidationError } from "./errors";
import type { AssortmentEligibilityResult } from "./types";
import { findVariantById } from "../catalog/variants";
import { findModifierOptionById } from "../catalog/modifiers";
import { findProductById } from "../catalog/products";

export type OutletAncestry = Readonly<{
  outletId: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  status: string;
}>;

/** Request-scoped ancestry memoization (one PersistenceQueryContext = one request). */
const ancestryByContext = new WeakMap<
  PersistenceQueryContext,
  Map<string, Promise<OutletAncestry>>
>();

export async function loadOutletAncestry(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<OutletAncestry> {
  assertApplicationRole(context, "loadOutletAncestry");
  const id = assertUuid(outletId, "outletId");
  let cache = ancestryByContext.get(context);
  if (!cache) {
    cache = new Map();
    ancestryByContext.set(context, cache);
  }
  const cached = cache.get(id);
  if (cached) return cached;

  const pending = (async (): Promise<OutletAncestry> => {
    const outlet = await findOutletById(context, id);
    if (!outlet) throw new AssortmentNotFoundError("outlet");
    return {
      outletId: outlet.id,
      brandId: outlet.brandId,
      organizationId: outlet.organizationId,
      territoryId: outlet.territoryId,
      status: outlet.status,
    };
  })();
  cache.set(id, pending);
  try {
    return await pending;
  } catch (error) {
    cache.delete(id);
    throw error;
  }
}

/** Batch brand-variant include checks for menu composition. */
export async function loadActiveBrandVariantIncludes(
  context: PersistenceQueryContext,
  brandId: string,
  variantIds: readonly string[],
): Promise<ReadonlySet<string>> {
  const included = new Set<string>();
  if (variantIds.length === 0) return included;
  const rows = await context.db
    .select({ variantId: assortmentRulesTable.variantId })
    .from(assortmentRulesTable)
    .where(
      and(
        eq(assortmentRulesTable.status, "active"),
        eq(assortmentRulesTable.brandId, brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.targetType, "variant"),
        eq(assortmentRulesTable.decision, "include"),
        inArray(assortmentRulesTable.variantId, [...variantIds]),
      ),
    );
  for (const row of rows) {
    if (row.variantId) included.add(row.variantId);
  }
  return included;
}

type ExclusionScope = "brand" | "territory" | "organization" | "outlet";

const EXCLUSION_CODES: Readonly<Record<ExclusionScope, EligibilityDecisionCode>> = {
  brand: "ASSORTMENT_EXCLUDED_BRAND",
  territory: "ASSORTMENT_EXCLUDED_TERRITORY",
  organization: "ASSORTMENT_EXCLUDED_ORGANIZATION",
  outlet: "ASSORTMENT_EXCLUDED_OUTLET",
};

export type OutletExclusionIndex = Readonly<{
  excludedProductIds: ReadonlyMap<string, EligibilityDecisionCode>;
  excludedVariantIds: ReadonlyMap<string, EligibilityDecisionCode>;
  excludedModifierOptionIds: ReadonlySet<string>;
}>;

const SCOPE_PRIORITY: ReadonlyArray<ExclusionScope> = [
  "brand",
  "territory",
  "organization",
  "outlet",
];

/**
 * Load active exclusions for an outlet ancestry once, then resolve in memory.
 * Preserves existing scope precedence (brand → territory → organization → outlet).
 */
export async function loadOutletExclusionIndex(
  context: PersistenceQueryContext,
  ancestry: OutletAncestry,
): Promise<OutletExclusionIndex> {
  const scopeFilter = or(
    and(
      eq(assortmentRulesTable.scopeType, "brand"),
      eq(assortmentRulesTable.brandId, ancestry.brandId),
    ),
    and(
      eq(assortmentRulesTable.scopeType, "territory"),
      eq(assortmentRulesTable.brandId, ancestry.brandId),
      eq(assortmentRulesTable.territoryId, ancestry.territoryId),
    ),
    and(
      eq(assortmentRulesTable.scopeType, "organization"),
      eq(assortmentRulesTable.brandId, ancestry.brandId),
      eq(assortmentRulesTable.organizationId, ancestry.organizationId),
    ),
    and(
      eq(assortmentRulesTable.scopeType, "outlet"),
      eq(assortmentRulesTable.brandId, ancestry.brandId),
      eq(assortmentRulesTable.outletId, ancestry.outletId),
    ),
  );

  const rows = await context.db
    .select({
      scopeType: assortmentRulesTable.scopeType,
      targetType: assortmentRulesTable.targetType,
      productId: assortmentRulesTable.productId,
      variantId: assortmentRulesTable.variantId,
      modifierOptionId: assortmentRulesTable.modifierOptionId,
    })
    .from(assortmentRulesTable)
    .where(
      and(
        eq(assortmentRulesTable.status, "active"),
        eq(assortmentRulesTable.decision, "exclude"),
        scopeFilter!,
      ),
    );

  const excludedProductIds = new Map<string, EligibilityDecisionCode>();
  const excludedVariantIds = new Map<string, EligibilityDecisionCode>();
  const excludedModifierOptionIds = new Set<string>();

  const ranked = [...rows].sort((left, right) => {
    const leftRank = SCOPE_PRIORITY.indexOf(left.scopeType as ExclusionScope);
    const rightRank = SCOPE_PRIORITY.indexOf(right.scopeType as ExclusionScope);
    return leftRank - rightRank;
  });

  for (const row of ranked) {
    const scope = row.scopeType as ExclusionScope;
    if (!EXCLUSION_CODES[scope]) continue;
    const code = EXCLUSION_CODES[scope];
    if (row.targetType === "product" && row.productId && !excludedProductIds.has(row.productId)) {
      excludedProductIds.set(row.productId, code);
    } else if (
      row.targetType === "variant" &&
      row.variantId &&
      !excludedVariantIds.has(row.variantId)
    ) {
      excludedVariantIds.set(row.variantId, code);
    } else if (row.targetType === "modifier_option" && row.modifierOptionId) {
      excludedModifierOptionIds.add(row.modifierOptionId);
    }
  }

  return { excludedProductIds, excludedVariantIds, excludedModifierOptionIds };
}

export function lookupProductOrVariantExclusion(
  index: OutletExclusionIndex,
  productId: string,
  variantId: string,
): EligibilityDecisionCode | null {
  return (
    index.excludedProductIds.get(productId) ??
    index.excludedVariantIds.get(variantId) ??
    null
  );
}

async function hasActiveRule(
  context: PersistenceQueryContext,
  where: Parameters<typeof and>[0],
): Promise<boolean> {
  const rows = await context.db
    .select({ id: assortmentRulesTable.id })
    .from(assortmentRulesTable)
    .where(and(eq(assortmentRulesTable.status, "active"), where))
    .limit(1);
  return rows.length > 0;
}

export async function hasActiveBrandVariantInclude(
  context: PersistenceQueryContext,
  brandId: string,
  variantId: string,
): Promise<boolean> {
  return hasActiveRule(
    context,
    and(
      eq(assortmentRulesTable.brandId, brandId),
      eq(assortmentRulesTable.scopeType, "brand"),
      eq(assortmentRulesTable.targetType, "variant"),
      eq(assortmentRulesTable.variantId, variantId),
      eq(assortmentRulesTable.decision, "include"),
    )!,
  );
}

async function findProductOrVariantExclusion(
  context: PersistenceQueryContext,
  ancestry: OutletAncestry,
  productId: string,
  variantId: string,
): Promise<EligibilityDecisionCode | null> {
  const scopes: Array<{
    scope: ExclusionScope;
    filter: ReturnType<typeof and>;
  }> = [
    {
      scope: "brand",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.decision, "exclude"),
      ),
    },
    {
      scope: "territory",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "territory"),
        eq(assortmentRulesTable.territoryId, ancestry.territoryId),
        eq(assortmentRulesTable.decision, "exclude"),
      ),
    },
    {
      scope: "organization",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "organization"),
        eq(assortmentRulesTable.organizationId, ancestry.organizationId),
        eq(assortmentRulesTable.decision, "exclude"),
      ),
    },
    {
      scope: "outlet",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "outlet"),
        eq(assortmentRulesTable.outletId, ancestry.outletId),
        eq(assortmentRulesTable.decision, "exclude"),
      ),
    },
  ];

  for (const { scope, filter } of scopes) {
    const productHit = await hasActiveRule(
      context,
      and(
        filter!,
        eq(assortmentRulesTable.targetType, "product"),
        eq(assortmentRulesTable.productId, productId),
      )!,
    );
    if (productHit) return EXCLUSION_CODES[scope];

    const variantHit = await hasActiveRule(
      context,
      and(
        filter!,
        eq(assortmentRulesTable.targetType, "variant"),
        eq(assortmentRulesTable.variantId, variantId),
      )!,
    );
    if (variantHit) return EXCLUSION_CODES[scope];
  }
  return null;
}

export async function findProductExclusion(
  context: PersistenceQueryContext,
  ancestry: OutletAncestry,
  productId: string,
): Promise<EligibilityDecisionCode | null> {
  const scopes: Array<{
    scope: ExclusionScope;
    filter: ReturnType<typeof and>;
  }> = [
    {
      scope: "brand",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "product"),
        eq(assortmentRulesTable.productId, productId),
      ),
    },
    {
      scope: "territory",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "territory"),
        eq(assortmentRulesTable.territoryId, ancestry.territoryId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "product"),
        eq(assortmentRulesTable.productId, productId),
      ),
    },
    {
      scope: "organization",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "organization"),
        eq(assortmentRulesTable.organizationId, ancestry.organizationId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "product"),
        eq(assortmentRulesTable.productId, productId),
      ),
    },
    {
      scope: "outlet",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "outlet"),
        eq(assortmentRulesTable.outletId, ancestry.outletId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "product"),
        eq(assortmentRulesTable.productId, productId),
      ),
    },
  ];

  for (const { scope, filter } of scopes) {
    if (await hasActiveRule(context, filter!)) return EXCLUSION_CODES[scope];
  }
  return null;
}

export async function findModifierOptionExclusion(
  context: PersistenceQueryContext,
  ancestry: OutletAncestry,
  modifierOptionId: string,
): Promise<EligibilityDecisionCode | null> {
  const scopes: Array<{
    scope: ExclusionScope;
    filter: ReturnType<typeof and>;
  }> = [
    {
      scope: "brand",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "brand"),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "modifier_option"),
        eq(assortmentRulesTable.modifierOptionId, modifierOptionId),
      ),
    },
    {
      scope: "territory",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "territory"),
        eq(assortmentRulesTable.territoryId, ancestry.territoryId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "modifier_option"),
        eq(assortmentRulesTable.modifierOptionId, modifierOptionId),
      ),
    },
    {
      scope: "organization",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "organization"),
        eq(assortmentRulesTable.organizationId, ancestry.organizationId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "modifier_option"),
        eq(assortmentRulesTable.modifierOptionId, modifierOptionId),
      ),
    },
    {
      scope: "outlet",
      filter: and(
        eq(assortmentRulesTable.brandId, ancestry.brandId),
        eq(assortmentRulesTable.scopeType, "outlet"),
        eq(assortmentRulesTable.outletId, ancestry.outletId),
        eq(assortmentRulesTable.decision, "exclude"),
        eq(assortmentRulesTable.targetType, "modifier_option"),
        eq(assortmentRulesTable.modifierOptionId, modifierOptionId),
      ),
    },
  ];

  for (const { scope, filter } of scopes) {
    if (await hasActiveRule(context, filter!)) return EXCLUSION_CODES[scope];
  }
  return null;
}

/**
 * Assortment-only gate for a Variant at an Outlet (include + exclusions).
 * Does not evaluate operating state or operational availability.
 */
export async function getEffectiveVariantAssortment(
  context: PersistenceQueryContext,
  input: Readonly<{
    actor?: unknown;
    outletId: string;
    variantId: string;
    authorize?: boolean;
  }>,
): Promise<AssortmentEligibilityResult> {
  assertApplicationRole(context, "getEffectiveVariantAssortment");
  const variantId = assertUuid(input.variantId, "variantId");
  const ancestry = await loadOutletAncestry(context, input.outletId);

  if (input.authorize !== false) {
    if (input.actor === undefined) {
      throw new AssortmentValidationError({
        message: "actor is required when authorize is enabled.",
      });
    }
    await requireAssortmentRead(context, input.actor, ancestry.brandId);
  }

  const variant = await findVariantById(context, variantId);
  if (!variant || variant.brandId !== ancestry.brandId) {
    return { eligible: false, code: "DENIED" };
  }

  const product = await findProductById(context, variant.productId);
  if (!product || product.brandId !== ancestry.brandId) {
    return { eligible: false, code: "DENIED" };
  }

  const included = await hasActiveBrandVariantInclude(context, ancestry.brandId, variantId);
  if (!included) {
    return { eligible: false, code: "ASSORTMENT_NOT_INCLUDED" };
  }

  const exclusion = await findProductOrVariantExclusion(
    context,
    ancestry,
    product.id,
    variantId,
  );
  if (exclusion) {
    return { eligible: false, code: exclusion };
  }

  return { eligible: true, code: "AVAILABLE" };
}

/**
 * Assortment-only gate for a Modifier Option at an Outlet (exclusions only).
 */
export async function getEffectiveModifierOptionAssortment(
  context: PersistenceQueryContext,
  input: Readonly<{
    actor?: unknown;
    outletId: string;
    modifierOptionId: string;
    authorize?: boolean;
  }>,
): Promise<AssortmentEligibilityResult> {
  assertApplicationRole(context, "getEffectiveModifierOptionAssortment");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  const ancestry = await loadOutletAncestry(context, input.outletId);

  if (input.authorize !== false) {
    if (input.actor === undefined) {
      throw new AssortmentValidationError({
        message: "actor is required when authorize is enabled.",
      });
    }
    await requireAssortmentRead(context, input.actor, ancestry.brandId);
  }

  const option = await findModifierOptionById(context, modifierOptionId);
  if (!option || option.brandId !== ancestry.brandId) {
    return { eligible: false, code: "DENIED" };
  }

  const exclusion = await findModifierOptionExclusion(context, ancestry, modifierOptionId);
  if (exclusion) {
    return { eligible: false, code: exclusion };
  }

  return { eligible: true, code: "AVAILABLE" };
}

export { findProductOrVariantExclusion };
