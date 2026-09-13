/**
 * Bounded Brand Promotions commercial inspection (IMP-036F F5).
 */
import { and, desc, eq } from "drizzle-orm";

import {
  promotionAuditEventsTable,
  promotionBenefitsTable,
  promotionCouponsTable,
  promotionsTable,
  promotionTargetsTable,
} from "../../platform/database/schema/promotions";
import {
  COUPON_STATUSES,
  PROMOTION_STATUSES,
  type CouponStatus,
  type PromotionStatus,
} from "../../shared/promotions";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { requireCouponsRead, requirePromotionsAuditRead, requirePromotionsRead } from "./authorize-promotions";
import { PromotionNotFoundError } from "./errors";

function serializePromotion(row: typeof promotionsTable.$inferSelect) {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    displayName: row.displayName,
    scopeType: row.scopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    salesChannel: row.salesChannel,
    status: row.status as PromotionStatus,
    triggerType: row.triggerType,
    stackingPolicy: row.stackingPolicy,
    priority: row.priority,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    minimumQualifyingAmountPaise: row.minimumQualifyingAmountPaise?.toString(10) ?? null,
    minimumItemQuantity: row.minimumItemQuantity,
    configurationFingerprint: row.configurationFingerprint,
    revision: row.revision.toString(10),
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
    retiredAt: row.retiredAt ? row.retiredAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    supportedLifecycleStates: PROMOTION_STATUSES,
  };
}

function serializeCoupon(row: typeof promotionCouponsTable.$inferSelect) {
  return {
    id: row.id,
    promotionId: row.promotionId,
    origin: row.origin,
    status: row.status as CouponStatus,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    maximumRedemptions: row.maximumRedemptions,
    maximumRedemptionsPerCustomer: row.maximumRedemptionsPerCustomer,
    revision: row.revision.toString(10),
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
    retiredAt: row.retiredAt ? row.retiredAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    supportedLifecycleStates: COUPON_STATUSES,
  };
}

export async function listBrandPromotions(
  context: PersistenceQueryContext,
  input: { actor: unknown; brandId: string },
) {
  assertApplicationRole(context, "listBrandPromotions");
  const brandId = assertUuid(input.brandId, "brandId");
  await requirePromotionsRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.brandId, brandId));
  return { promotions: rows.map(serializePromotion) };
}

export async function inspectBrandPromotion(
  context: PersistenceQueryContext,
  input: { actor: unknown; brandId: string; promotionId: string },
) {
  assertApplicationRole(context, "inspectBrandPromotion");
  const brandId = assertUuid(input.brandId, "brandId");
  const promotionId = assertUuid(input.promotionId, "promotionId");
  await requirePromotionsRead(context, input.actor, brandId);
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(and(eq(promotionsTable.id, promotionId), eq(promotionsTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new PromotionNotFoundError("promotion");
  const [benefit] = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  const targets = await context.db
    .select()
    .from(promotionTargetsTable)
    .where(eq(promotionTargetsTable.promotionId, row.id));
  return {
    promotion: serializePromotion(row),
    benefit: benefit
      ? {
          benefitType: benefit.benefitType,
          percentageBps: benefit.percentageBps,
          fixedAmountPaise: benefit.fixedAmountPaise?.toString(10) ?? null,
          maximumDiscountPaise: benefit.maximumDiscountPaise?.toString(10) ?? null,
          buyQuantity: benefit.buyQuantity,
          getQuantity: benefit.getQuantity,
          repeatable: benefit.repeatable,
          maximumRewardQuantity: benefit.maximumRewardQuantity,
          includeModifiers: benefit.includeModifiers,
          includeBundleDeltas: benefit.includeBundleDeltas,
        }
      : null,
    qualifierTargets: targets
      .filter((t) => t.targetRole === "qualifier")
      .map((t) => ({
        targetType: t.targetType,
        productId: t.productId,
        variantId: t.variantId,
        chargeDefinitionId: t.chargeDefinitionId,
      })),
    benefitTargets: targets
      .filter((t) => t.targetRole === "benefit")
      .map((t) => ({
        targetType: t.targetType,
        productId: t.productId,
        variantId: t.variantId,
        chargeDefinitionId: t.chargeDefinitionId,
      })),
  };
}

export async function listPromotionCoupons(
  context: PersistenceQueryContext,
  input: { actor: unknown; brandId: string; promotionId: string },
) {
  assertApplicationRole(context, "listPromotionCoupons");
  const brandId = assertUuid(input.brandId, "brandId");
  const promotionId = assertUuid(input.promotionId, "promotionId");
  await requireCouponsRead(context, input.actor, brandId);
  const promotions = await context.db
    .select({ id: promotionsTable.id })
    .from(promotionsTable)
    .where(and(eq(promotionsTable.id, promotionId), eq(promotionsTable.brandId, brandId)))
    .limit(1);
  if (!promotions[0]) throw new PromotionNotFoundError("promotion");
  const coupons = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.promotionId, promotionId));
  return { coupons: coupons.map(serializeCoupon) };
}

export async function inspectBrandCoupon(
  context: PersistenceQueryContext,
  input: { actor: unknown; brandId: string; couponId: string },
) {
  assertApplicationRole(context, "inspectBrandCoupon");
  const brandId = assertUuid(input.brandId, "brandId");
  const couponId = assertUuid(input.couponId, "couponId");
  await requireCouponsRead(context, input.actor, brandId);
  const coupons = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.id, couponId))
    .limit(1);
  const coupon = coupons[0];
  if (!coupon) throw new PromotionNotFoundError("coupon");
  const promotions = await context.db
    .select({ id: promotionsTable.id, brandId: promotionsTable.brandId })
    .from(promotionsTable)
    .where(eq(promotionsTable.id, coupon.promotionId))
    .limit(1);
  const promotion = promotions[0];
  if (!promotion || promotion.brandId !== brandId) throw new PromotionNotFoundError("coupon");
  return { coupon: serializeCoupon(coupon), promotionId: promotion.id };
}

export async function listBrandPromotionAuditEvents(
  context: PersistenceQueryContext,
  input: { actor: unknown; brandId: string; resourceId?: string },
) {
  assertApplicationRole(context, "listBrandPromotionAuditEvents");
  const brandId = assertUuid(input.brandId, "brandId");
  await requirePromotionsAuditRead(context, input.actor, brandId);
  const rows = input.resourceId
    ? await context.db
        .select()
        .from(promotionAuditEventsTable)
        .where(
          and(
            eq(promotionAuditEventsTable.brandId, brandId),
            eq(promotionAuditEventsTable.resourceId, assertUuid(input.resourceId, "resourceId")),
          ),
        )
        .orderBy(desc(promotionAuditEventsTable.occurredAt))
    : await context.db
        .select()
        .from(promotionAuditEventsTable)
        .where(eq(promotionAuditEventsTable.brandId, brandId))
        .orderBy(desc(promotionAuditEventsTable.occurredAt));
  return {
    events: rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      permissionKey: row.permissionKey,
      configurationFingerprint: row.configurationFingerprint,
      metadata: row.metadata,
    })),
  };
}
