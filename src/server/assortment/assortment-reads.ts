/**
 * Effective assortment eligibility reads (IMP-014).
 */
import { and, eq } from "drizzle-orm";

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

export async function loadOutletAncestry(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<OutletAncestry> {
  assertApplicationRole(context, "loadOutletAncestry");
  const outlet = await findOutletById(context, assertUuid(outletId, "outletId"));
  if (!outlet) throw new AssortmentNotFoundError("outlet");
  return {
    outletId: outlet.id,
    brandId: outlet.brandId,
    organizationId: outlet.organizationId,
    territoryId: outlet.territoryId,
    status: outlet.status,
  };
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

type ExclusionScope = "brand" | "territory" | "organization" | "outlet";

const EXCLUSION_CODES: Readonly<Record<ExclusionScope, EligibilityDecisionCode>> = {
  brand: "ASSORTMENT_EXCLUDED_BRAND",
  territory: "ASSORTMENT_EXCLUDED_TERRITORY",
  organization: "ASSORTMENT_EXCLUDED_ORGANIZATION",
  outlet: "ASSORTMENT_EXCLUDED_OUTLET",
};

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
