/**
 * Load sealed promotions / coupons for quote evaluation (IMP-016).
 */
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import {
  promotionBenefitsTable,
  promotionCouponsTable,
  promotionsTable,
  promotionTargetsTable,
} from "../../platform/database/schema/promotions";
import { outletsTable } from "../../platform/database/schema/organizations";
import {
  assertActivePromotionIntegrity,
  normalizeCouponCode,
  type PromotionBenefitConfig,
  type PromotionBenefitType,
  type PromotionDefinition,
  type PromotionScopeType,
  type PromotionStackingPolicy,
  type PromotionStatus,
  type PromotionTargetConfig,
  type PromotionTargetRole,
  type PromotionTargetType,
  type PromotionTriggerType,
  type CouponRecord,
} from "../../shared/promotions";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { PromotionFatalError } from "./errors";
import { findCouponByCanonicalCode } from "./coupons";

function toBenefit(row: typeof promotionBenefitsTable.$inferSelect): PromotionBenefitConfig {
  return {
    benefitType: row.benefitType as PromotionBenefitType,
    percentageBps: row.percentageBps,
    fixedAmountPaise: row.fixedAmountPaise,
    maximumDiscountPaise: row.maximumDiscountPaise,
    buyQuantity: row.buyQuantity,
    getQuantity: row.getQuantity,
    repeatable: row.repeatable,
    maximumRewardQuantity: row.maximumRewardQuantity,
    includeModifiers: row.includeModifiers,
    includeBundleDeltas: row.includeBundleDeltas,
  };
}

function toTarget(row: typeof promotionTargetsTable.$inferSelect): PromotionTargetConfig {
  return {
    targetRole: row.targetRole as PromotionTargetRole,
    targetType: row.targetType as PromotionTargetType,
    productId: row.productId,
    variantId: row.variantId,
    chargeDefinitionId: row.chargeDefinitionId,
  };
}

export async function hydratePromotionDefinition(
  context: PersistenceQueryContext,
  row: typeof promotionsTable.$inferSelect,
): Promise<PromotionDefinition> {
  const [benefit] = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  if (!benefit) {
    throw new PromotionFatalError(
      "PROMOTION_CONFIGURATION_INVALID",
      "Active promotion missing benefit.",
    );
  }
  const targets = await context.db
    .select()
    .from(promotionTargetsTable)
    .where(eq(promotionTargetsTable.promotionId, row.id));
  const qualifierTargets = targets.filter((t) => t.targetRole === "qualifier").map(toTarget);
  const benefitTargets = targets.filter((t) => t.targetRole === "benefit").map(toTarget);
  const def: PromotionDefinition = {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    displayName: row.displayName,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    salesChannel: "direct",
    status: row.status as PromotionStatus,
    triggerType: row.triggerType as PromotionTriggerType,
    stackingPolicy: row.stackingPolicy as PromotionStackingPolicy,
    priority: row.priority,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    minimumQualifyingAmountPaise: row.minimumQualifyingAmountPaise,
    minimumItemQuantity: row.minimumItemQuantity,
    configurationFingerprint: row.configurationFingerprint,
    benefit: toBenefit(benefit),
    qualifierTargets,
    benefitTargets,
  };
  if (def.status === "active") assertActivePromotionIntegrity(def);
  return def;
}

export async function loadApplicableAutomaticPromotions(
  context: PersistenceQueryContext,
  input: {
    brandId: string;
    territoryId: string | null;
    organizationId: string | null;
    outletId: string;
    at: Date;
  },
): Promise<PromotionDefinition[]> {
  assertApplicationRole(context, "loadApplicableAutomaticPromotions");
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(
      and(
        eq(promotionsTable.brandId, input.brandId),
        eq(promotionsTable.status, "active"),
        eq(promotionsTable.salesChannel, "direct"),
        eq(promotionsTable.triggerType, "automatic"),
        lte(promotionsTable.startsAt, input.at),
        or(isNull(promotionsTable.endsAt), sql`${promotionsTable.endsAt} > ${input.at}`),
      ),
    );

  const scoped = rows.filter((row) => {
    switch (row.scopeType) {
      case "brand":
        return true;
      case "territory":
        return row.territoryId !== null && row.territoryId === input.territoryId;
      case "organization":
        return row.organizationId !== null && row.organizationId === input.organizationId;
      case "outlet":
        return row.outletId === input.outletId;
      default:
        return false;
    }
  });

  const defs: PromotionDefinition[] = [];
  for (const row of scoped) {
    defs.push(await hydratePromotionDefinition(context, row));
  }
  return defs;
}

export async function resolveOutletHierarchy(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<{
  brandId: string;
  territoryId: string;
  organizationId: string;
  outletId: string;
}> {
  assertUuid(outletId, "outletId");
  const rows = await context.db
    .select()
    .from(outletsTable)
    .where(eq(outletsTable.id, outletId))
    .limit(1);
  const outlet = rows[0];
  if (!outlet) {
    throw new PromotionFatalError("PROMOTION_CONTEXT_INVALID", "Outlet not found for promotion context.");
  }
  return {
    brandId: outlet.brandId,
    territoryId: outlet.territoryId,
    organizationId: outlet.organizationId,
    outletId: outlet.id,
  };
}

export async function loadSubmittedCoupon(
  context: PersistenceQueryContext,
  rawCode: string,
): Promise<{
  coupon: CouponRecord | null;
  promotion: PromotionDefinition | null;
  canonicalCode: string | null;
}> {
  let canonicalCode: string | null = null;
  try {
    canonicalCode = normalizeCouponCode(rawCode);
  } catch {
    return { coupon: null, promotion: null, canonicalCode: null };
  }
  const row = await findCouponByCanonicalCode(context, canonicalCode);
  if (!row) return { coupon: null, promotion: null, canonicalCode };
  const promoRows = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, row.promotionId))
    .limit(1);
  const promoRow = promoRows[0];
  if (!promoRow) return { coupon: null, promotion: null, canonicalCode };
  const promotion = await hydratePromotionDefinition(context, promoRow);
  const coupon: CouponRecord = {
    id: row.id,
    promotionId: row.promotionId,
    canonicalCode: row.canonicalCode,
    origin: row.origin as CouponRecord["origin"],
    status: row.status as CouponRecord["status"],
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    maximumRedemptions: row.maximumRedemptions,
    maximumRedemptionsPerCustomer: row.maximumRedemptionsPerCustomer,
  };
  return { coupon, promotion, canonicalCode };
}

// silence unused import when tree-shaken oddly
void promotionCouponsTable;
