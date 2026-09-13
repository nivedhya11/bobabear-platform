/**
 * Non-authoritative Promotion / Coupon consequence preview (IMP-036F F5).
 *
 * Read/validate only. Returns expectedPromotionRevision / expectedCouponRevision
 * for the subsequent effect. Does not persist a review record.
 */
import { eq } from "drizzle-orm";

import {
  promotionBenefitsTable,
  promotionCouponsTable,
  promotionsTable,
  promotionTargetsTable,
} from "../../platform/database/schema/promotions";
import {
  PROMOTION_STATUSES,
  COUPON_STATUSES,
  assertLegalCouponLifecycleTransition,
  type CouponStatus,
  type PromotionStatus,
} from "../../shared/promotions";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import {
  requireCouponsManageForPromotionScope,
  requirePromotionManageForScope,
  requirePromotionsActivate,
} from "./authorize-promotions";
import { PromotionAdminError, PromotionNotFoundError } from "./errors";
import type { PromotionScopeType } from "../../shared/promotions";

export type PromotionConsequencePreview = Readonly<{
  promotionId: string;
  brandId: string;
  expectedPromotionRevision: string;
  currentStatus: PromotionStatus;
  proposedStatus: PromotionStatus;
  lifecycleStatus: PromotionStatus;
  draftVsEffective: "draft" | "effective" | "retired";
  scopeType: string;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  triggerType: string;
  stackingPolicy: string;
  startsAt: string;
  endsAt: string | null;
  benefit: Readonly<Record<string, unknown>> | null;
  qualifierTargets: readonly Readonly<Record<string, unknown>>[];
  benefitTargets: readonly Readonly<Record<string, unknown>>[];
  configurationFingerprint: string | null;
  customerVisibleImplication: string;
  supportedLifecycleStates: readonly PromotionStatus[];
}>;

export type CouponConsequencePreview = Readonly<{
  couponId: string;
  promotionId: string;
  brandId: string;
  canonicalCode: string;
  expectedCouponRevision: string;
  currentStatus: CouponStatus;
  proposedStatus: CouponStatus;
  draftVsEffective: "draft" | "effective" | "disabled" | "retired";
  startsAt: string | null;
  endsAt: string | null;
  maximumRedemptions: number | null;
  maximumRedemptionsPerCustomer: number | null;
  customerVisibleImplication: string;
  supportedLifecycleStates: readonly CouponStatus[];
}>;

function draftVsEffective(status: string): PromotionConsequencePreview["draftVsEffective"] {
  if (status === "active") return "effective";
  if (status === "retired") return "retired";
  return "draft";
}

function couponDraftVsEffective(status: string): CouponConsequencePreview["draftVsEffective"] {
  if (status === "active") return "effective";
  if (status === "disabled") return "disabled";
  if (status === "retired") return "retired";
  return "draft";
}

function assertLegalPromotionLifecycleTransition(
  current: PromotionStatus,
  proposed: PromotionStatus,
): void {
  if (current === "draft" && proposed === "active") return;
  if (current === "active" && proposed === "retired") return;
  throw new PromotionAdminError(
    "invalid_state",
    `Illegal promotion lifecycle transition: ${current} -> ${proposed}.`,
  );
}

function promotionalImplication(input: {
  status: string;
  triggerType: string;
  benefitType: string | null;
}): string {
  if (input.status === "draft") {
    return "Draft only; customers do not receive this promotion until activation.";
  }
  if (input.status === "retired") {
    return "Retired; customers no longer receive this promotion.";
  }
  if (input.triggerType === "coupon") {
    return "Active coupon promotion; customers receive the benefit only with a valid coupon code.";
  }
  if (input.benefitType === "percentage_discount") {
    return "Active automatic percentage discount for qualifying customers.";
  }
  if (input.benefitType === "fixed_amount_discount") {
    return "Active automatic fixed-amount discount for qualifying customers.";
  }
  if (input.benefitType === "buy_x_get_y") {
    return "Active automatic buy-X-get-Y benefit for qualifying customers.";
  }
  return "Active automatic promotion for qualifying customers.";
}

export async function previewPromotionConsequence(
  context: PersistenceQueryContext,
  input: {
    actor: unknown;
    brandId: string;
    promotionId: string;
    proposedStatus: PromotionStatus;
  },
): Promise<PromotionConsequencePreview> {
  assertApplicationRole(context, "previewPromotionConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  const promotionId = assertUuid(input.promotionId, "promotionId");
  if (!(PROMOTION_STATUSES as readonly string[]).includes(input.proposedStatus)) {
    throw new PromotionAdminError("validation", "Unsupported promotion lifecycle state.");
  }
  const proposedStatus = input.proposedStatus;
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, promotionId))
    .limit(1);
  const row = rows[0];
  if (!row || row.brandId !== brandId) throw new PromotionNotFoundError("promotion");
  const currentStatus = row.status as PromotionStatus;
  assertLegalPromotionLifecycleTransition(currentStatus, proposedStatus);

  // Authorization matches the corresponding effect endpoint.
  if (proposedStatus === "active") {
    await requirePromotionManageForScope(context, input.actor, {
      brandId: row.brandId,
      scopeType: row.scopeType as PromotionScopeType,
      territoryId: row.territoryId,
      organizationId: row.organizationId,
      outletId: row.outletId,
    });
    await requirePromotionsActivate(context, input.actor, row.brandId);
  } else {
    await requirePromotionsActivate(context, input.actor, row.brandId);
  }

  const [benefit] = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  const targets = await context.db
    .select()
    .from(promotionTargetsTable)
    .where(eq(promotionTargetsTable.promotionId, row.id));

  const qualifierTargets = targets.filter((t) => t.targetRole === "qualifier");
  const benefitTargets = targets.filter((t) => t.targetRole === "benefit");

  return {
    promotionId: row.id,
    brandId: row.brandId,
    expectedPromotionRevision: row.revision.toString(10),
    currentStatus,
    proposedStatus,
    lifecycleStatus: currentStatus,
    draftVsEffective: draftVsEffective(proposedStatus),
    scopeType: row.scopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    triggerType: row.triggerType,
    stackingPolicy: row.stackingPolicy,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
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
    qualifierTargets: qualifierTargets.map((t) => ({
      targetType: t.targetType,
      productId: t.productId,
      variantId: t.variantId,
      chargeDefinitionId: t.chargeDefinitionId,
    })),
    benefitTargets: benefitTargets.map((t) => ({
      targetType: t.targetType,
      productId: t.productId,
      variantId: t.variantId,
      chargeDefinitionId: t.chargeDefinitionId,
    })),
    configurationFingerprint: row.configurationFingerprint,
    customerVisibleImplication: promotionalImplication({
      status: proposedStatus,
      triggerType: row.triggerType,
      benefitType: benefit?.benefitType ?? null,
    }),
    supportedLifecycleStates: PROMOTION_STATUSES,
  };
}

export async function previewCouponConsequence(
  context: PersistenceQueryContext,
  input: {
    actor: unknown;
    brandId: string;
    couponId: string;
    proposedStatus: CouponStatus;
  },
): Promise<CouponConsequencePreview> {
  assertApplicationRole(context, "previewCouponConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  const couponId = assertUuid(input.couponId, "couponId");
  if (!(COUPON_STATUSES as readonly string[]).includes(input.proposedStatus)) {
    throw new PromotionAdminError("validation", "Unsupported coupon lifecycle state.");
  }
  const proposedStatus = input.proposedStatus;
  const coupons = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.id, couponId))
    .limit(1);
  const coupon = coupons[0];
  if (!coupon) throw new PromotionNotFoundError("coupon");
  const promotions = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, coupon.promotionId))
    .limit(1);
  const promotion = promotions[0];
  if (!promotion || promotion.brandId !== brandId) throw new PromotionNotFoundError("coupon");
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });

  const currentStatus = coupon.status as CouponStatus;
  assertLegalCouponLifecycleTransition(currentStatus, proposedStatus);

  let implication = "Draft coupon; customers cannot redeem this code until activation.";
  if (proposedStatus === "active") {
    implication = "Customers can redeem this coupon code against the referenced Promotion.";
  } else if (proposedStatus === "disabled") {
    implication = "Disabled; customers cannot redeem this coupon code until it is enabled.";
  } else if (proposedStatus === "retired") {
    implication = "Retired; customers cannot redeem this coupon code.";
  }

  return {
    couponId: coupon.id,
    promotionId: coupon.promotionId,
    brandId: promotion.brandId,
    canonicalCode: coupon.canonicalCode,
    expectedCouponRevision: coupon.revision.toString(10),
    currentStatus,
    proposedStatus,
    draftVsEffective: couponDraftVsEffective(proposedStatus),
    startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
    endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
    maximumRedemptions: coupon.maximumRedemptions,
    maximumRedemptionsPerCustomer: coupon.maximumRedemptionsPerCustomer,
    customerVisibleImplication: implication,
    supportedLifecycleStates: COUPON_STATUSES,
  };
}
