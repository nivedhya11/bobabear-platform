/**
 * Coupon draft administration + lifecycle (IMP-016).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import {
  promotionCouponsTable,
  promotionsTable,
} from "../../platform/database/schema/promotions";
import {
  generateCouponCode,
  normalizeCouponCode,
  type CouponOrigin,
  type PromotionScopeType,
} from "../../shared/promotions";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, assertUuid, isUniqueViolation } from "./assert-role";
import { insertPromotionAuditEvent } from "./audit";
import { requireCouponsManageForPromotionScope } from "./authorize-promotions";
import { PromotionAdminError, PromotionNotFoundError } from "./errors";

async function loadCoupon(context: PersistenceQueryContext, id: string) {
  const rows = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function loadPromotion(context: PersistenceQueryContext, id: string) {
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCouponDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    promotionId: string;
    origin: CouponOrigin;
    canonicalCode?: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
    maximumRedemptions?: number | null;
    maximumRedemptionsPerCustomer?: number | null;
  },
): Promise<{ id: string; canonicalCode: string }> {
  assertTransactionContext(context, "createCouponDraft");
  const promotion = await loadPromotion(context, assertUuid(input.promotionId, "promotionId"));
  if (!promotion) throw new PromotionNotFoundError("promotion");
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });

  let canonicalCode: string;
  if (input.origin === "generated") {
    canonicalCode = generateCouponCode();
  } else {
    if (!input.canonicalCode) {
      throw new PromotionAdminError("COUPON_CODE_INVALID", "Manual coupons require a code.");
    }
    canonicalCode = normalizeCouponCode(input.canonicalCode);
  }

  const id = randomUUID();
  const now = new Date();
  const principal = requireWorkforcePrincipal(input.actor);
  try {
    await context.db.insert(promotionCouponsTable).values({
      id,
      promotionId: promotion.id,
      canonicalCode,
      origin: input.origin,
      status: "draft",
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      maximumRedemptions: input.maximumRedemptions ?? null,
      maximumRedemptionsPerCustomer: input.maximumRedemptionsPerCustomer ?? null,
      activatedAt: null,
      disabledAt: null,
      retiredAt: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PromotionAdminError("COUPON_CODE_CONFLICT", "Coupon code already exists.");
    }
    throw error;
  }

  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.created",
    resourceType: "coupon",
    resourceId: id,
    brandId: promotion.brandId,
    metadata: { promotionId: promotion.id, origin: input.origin },
  });
  return { id, canonicalCode };
}

export async function updateCouponDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
    maximumRedemptions?: number | null;
    maximumRedemptionsPerCustomer?: number | null;
  },
): Promise<void> {
  assertTransactionContext(context, "updateCouponDraft");
  const coupon = await loadCoupon(context, assertUuid(input.couponId, "couponId"));
  if (!coupon) throw new PromotionNotFoundError("coupon");
  if (coupon.status !== "draft" || coupon.activatedAt !== null) {
    throw new PromotionAdminError("COUPON_NOT_DRAFT", "Only draft coupons are mutable.");
  }
  const promotion = await loadPromotion(context, coupon.promotionId);
  if (!promotion) throw new PromotionNotFoundError("promotion");
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  await context.db
    .update(promotionCouponsTable)
    .set({
      startsAt: input.startsAt !== undefined ? input.startsAt : coupon.startsAt,
      endsAt: input.endsAt !== undefined ? input.endsAt : coupon.endsAt,
      maximumRedemptions:
        input.maximumRedemptions !== undefined
          ? input.maximumRedemptions
          : coupon.maximumRedemptions,
      maximumRedemptionsPerCustomer:
        input.maximumRedemptionsPerCustomer !== undefined
          ? input.maximumRedemptionsPerCustomer
          : coupon.maximumRedemptionsPerCustomer,
      updatedAt: new Date(),
    })
    .where(eq(promotionCouponsTable.id, coupon.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.updated",
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { updated: true },
  });
}

export async function deleteCouponDraft(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
): Promise<void> {
  assertTransactionContext(context, "deleteCouponDraft");
  const coupon = await loadCoupon(context, assertUuid(input.couponId, "couponId"));
  if (!coupon) throw new PromotionNotFoundError("coupon");
  if (coupon.activatedAt !== null || coupon.status !== "draft") {
    throw new PromotionAdminError("COUPON_IMMUTABLE", "Ever-active coupons cannot be deleted.");
  }
  const promotion = await loadPromotion(context, coupon.promotionId);
  if (!promotion) throw new PromotionNotFoundError("promotion");
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  await context.db.delete(promotionCouponsTable).where(eq(promotionCouponsTable.id, coupon.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.deleted",
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { deleted: true },
  });
}

export async function activateCoupon(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
): Promise<void> {
  assertTransactionContext(context, "activateCoupon");
  const coupon = await loadCoupon(context, assertUuid(input.couponId, "couponId"));
  if (!coupon) throw new PromotionNotFoundError("coupon");
  if (coupon.status !== "draft") {
    throw new PromotionAdminError("COUPON_NOT_DRAFT", "Only draft coupons can activate.");
  }
  const promotion = await loadPromotion(context, coupon.promotionId);
  if (!promotion) throw new PromotionNotFoundError("promotion");
  if (promotion.status !== "active") {
    throw new PromotionAdminError(
      "COUPON_PROMOTION_NOT_ACTIVE",
      "Coupon activation requires an active promotion.",
    );
  }
  if (coupon.startsAt && coupon.startsAt < promotion.startsAt) {
    throw new PromotionAdminError(
      "COUPON_WINDOW_INVALID",
      "Coupon startsAt cannot precede promotion startsAt.",
    );
  }
  if (coupon.endsAt && promotion.endsAt && coupon.endsAt > promotion.endsAt) {
    throw new PromotionAdminError(
      "COUPON_WINDOW_INVALID",
      "Coupon endsAt cannot exceed promotion endsAt.",
    );
  }
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  await context.db
    .update(promotionCouponsTable)
    .set({ status: "active", activatedAt: now, updatedAt: now })
    .where(eq(promotionCouponsTable.id, coupon.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.activated",
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { activated: true },
  });
}

async function transitionCoupon(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
  to: "disabled" | "active" | "retired",
  action: "coupon.disabled" | "coupon.enabled" | "coupon.retired",
) {
  assertTransactionContext(context, `coupon:${to}`);
  const coupon = await loadCoupon(context, assertUuid(input.couponId, "couponId"));
  if (!coupon) throw new PromotionNotFoundError("coupon");
  const promotion = await loadPromotion(context, coupon.promotionId);
  if (!promotion) throw new PromotionNotFoundError("promotion");
  await requireCouponsManageForPromotionScope(context, input.actor, {
    brandId: promotion.brandId,
    scopeType: promotion.scopeType as PromotionScopeType,
    territoryId: promotion.territoryId,
    organizationId: promotion.organizationId,
    outletId: promotion.outletId,
  });

  if (to === "disabled" && coupon.status !== "active") {
    throw new PromotionAdminError("invalid_state", "Only active coupons can disable.");
  }
  if (to === "active" && coupon.status !== "disabled") {
    throw new PromotionAdminError("invalid_state", "Only disabled coupons can re-enable.");
  }
  if (to === "retired" && coupon.status !== "active" && coupon.status !== "disabled") {
    throw new PromotionAdminError("invalid_state", "Only active/disabled coupons can retire.");
  }
  if (coupon.status === "retired") {
    throw new PromotionAdminError("invalid_state", "Retired coupons are terminal.");
  }

  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  await context.db
    .update(promotionCouponsTable)
    .set({
      status: to,
      disabledAt: to === "disabled" ? now : to === "active" ? null : coupon.disabledAt,
      retiredAt: to === "retired" ? now : coupon.retiredAt,
      updatedAt: now,
    })
    .where(eq(promotionCouponsTable.id, coupon.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action,
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { status: to },
  });
}

export async function disableCoupon(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
) {
  return transitionCoupon(context, input, "disabled", "coupon.disabled");
}

export async function enableCoupon(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
) {
  return transitionCoupon(context, input, "active", "coupon.enabled");
}

export async function retireCoupon(
  context: PersistenceTransactionContext,
  input: { actor: unknown; couponId: string },
) {
  return transitionCoupon(context, input, "retired", "coupon.retired");
}

export async function getCoupon(context: PersistenceQueryContext, couponId: string) {
  return loadCoupon(context, assertUuid(couponId, "couponId"));
}

export async function findCouponByCanonicalCode(
  context: PersistenceQueryContext,
  rawCode: string,
) {
  let canonical: string;
  try {
    canonical = normalizeCouponCode(rawCode);
  } catch {
    return null;
  }
  const rows = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.canonicalCode, canonical))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCoupons(
  context: PersistenceQueryContext,
  promotionId: string,
) {
  return context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.promotionId, assertUuid(promotionId, "promotionId")));
}
