/**
 * Bounded Brand Assortment commercial inspection (IMP-036F F4).
 *
 * Assortment intent is separate from operational Availability. These helpers
 * never treat paused/unavailable as commercial exclusion.
 */
import { and, asc, eq, or } from "drizzle-orm";

import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import { outletsTable } from "../../platform/database/schema/organizations";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { getEffectiveVariantAssortment } from "./assortment-reads";
import { requireAssortmentRead } from "./authorize-assortment";
import { AssortmentNotFoundError } from "./errors";
import { findActiveEquivalentAssortmentRule } from "./rules";
import type { AssortmentRule } from "./types";

function rowToRule(row: typeof assortmentRulesTable.$inferSelect): AssortmentRule {
  return {
    id: row.id,
    brandId: row.brandId,
    scopeType: row.scopeType as AssortmentRule["scopeType"],
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    targetType: row.targetType as AssortmentRule["targetType"],
    productId: row.productId,
    variantId: row.variantId,
    modifierOptionId: row.modifierOptionId,
    decision: row.decision as AssortmentRule["decision"],
    status: row.status as AssortmentRule["status"],
    reasonCode: row.reasonCode,
    revision: row.revision,
    createdByWorkforceUserId: row.createdByWorkforceUserId,
    retiredByWorkforceUserId: row.retiredByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

export type BrandAssortmentRuleList = Readonly<{
  brandId: string;
  rules: readonly AssortmentRule[];
}>;

export async function listBrandAssortmentRules(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string }>,
): Promise<BrandAssortmentRuleList> {
  assertApplicationRole(context, "listBrandAssortmentRules");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentRead(context, input.actor, brandId);

  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.brandId, brandId))
    .orderBy(asc(assortmentRulesTable.createdAt), asc(assortmentRulesTable.id));

  return { brandId, rules: rows.map(rowToRule) };
}

export type OutletAssortmentConsequence = Readonly<{
  outletId: string;
  intendedByAssortment: boolean;
  assortmentCode: string;
  availabilityIsSeparate: true;
}>;

export type BrandVariantAssortmentInspection = Readonly<{
  brandId: string;
  variantId: string;
  includeRule: AssortmentRule | null;
  relatedRules: readonly AssortmentRule[];
  outletConsequences: readonly OutletAssortmentConsequence[];
  availabilityIsSeparate: true;
}>;

export async function inspectBrandVariantAssortment(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; variantId: string }>,
): Promise<BrandVariantAssortmentInspection> {
  assertApplicationRole(context, "inspectBrandVariantAssortment");
  const brandId = assertUuid(input.brandId, "brandId");
  const variantId = assertUuid(input.variantId, "variantId");
  await requireAssortmentRead(context, input.actor, brandId);

  const variantRows = await context.db
    .select({
      id: catalogVariantsTable.id,
      productId: catalogVariantsTable.productId,
    })
    .from(catalogVariantsTable)
    .where(
      and(eq(catalogVariantsTable.id, variantId), eq(catalogVariantsTable.brandId, brandId)),
    )
    .limit(1);
  const variant = variantRows[0];
  if (!variant) throw new AssortmentNotFoundError("variant");

  const includeRule = await findActiveEquivalentAssortmentRule(context, {
    brandId,
    scopeType: "brand",
    territoryId: null,
    organizationId: null,
    outletId: null,
    targetType: "variant",
    productId: null,
    variantId,
    modifierOptionId: null,
    decision: "include",
  });

  const relatedRows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(
      and(
        eq(assortmentRulesTable.brandId, brandId),
        or(
          and(
            eq(assortmentRulesTable.targetType, "variant"),
            eq(assortmentRulesTable.variantId, variantId),
          ),
          and(
            eq(assortmentRulesTable.targetType, "product"),
            eq(assortmentRulesTable.productId, variant.productId),
          ),
        ),
      ),
    )
    .orderBy(asc(assortmentRulesTable.createdAt), asc(assortmentRulesTable.id));

  const outlets = await context.db
    .select({ id: outletsTable.id })
    .from(outletsTable)
    .where(eq(outletsTable.brandId, brandId))
    .orderBy(asc(outletsTable.name), asc(outletsTable.id));

  const outletConsequences: OutletAssortmentConsequence[] = [];
  for (const outlet of outlets) {
    const decision = await getEffectiveVariantAssortment(context, {
      actor: input.actor,
      outletId: outlet.id,
      variantId,
      authorize: false,
    });
    outletConsequences.push({
      outletId: outlet.id,
      intendedByAssortment: decision.eligible,
      assortmentCode: decision.code,
      availabilityIsSeparate: true,
    });
  }

  return {
    brandId,
    variantId,
    includeRule,
    relatedRules: relatedRows.map(rowToRule),
    outletConsequences,
    availabilityIsSeparate: true,
  };
}
