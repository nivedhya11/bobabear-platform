/**
 * Coupon draft administration + lifecycle (IMP-016).
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

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

function staleCouponRevision(): never {
  throw new PromotionAdminError(
    "COUPON_STALE_REVISION",
    "expectedCouponRevision does not match current Coupon revision; no mutation effect.",
  );
}

export function parseExpectedCouponRevision(
  value: unknown,
  field = "expectedCouponRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new PromotionAdminError("validation", `${field} must be > 0.`);
    }
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value) && value !== "0" && !/^0\d+/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new PromotionAdminError("validation", `${field} must be > 0.`);
    }
    return parsed;
  }
  throw new PromotionAdminError("validation", `${field} must be a positive integer.`);
}

async function lockCoupon(context: PersistenceTransactionContext, id: string) {
  const rows = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.id, id))
    .for("update")
    .limit(1);
  return rows[0] ?? null;
}

async function advanceCouponRevision(
  context: PersistenceTransactionContext,
  coupon: typeof promotionCouponsTable.$inferSelect,
  expected: bigint,
  extra: Record<string, unknown>,
  now: Date,
): Promise<bigint> {
  if (coupon.revision !== expected) staleCouponRevision();
  const next = coupon.revision + BigInt(1);
  const updated = await context.db
    .update(promotionCouponsTable)
    .set({
      revision: next,
      updatedAt: now,
      ...extra,
    })
    .where(and(eq(promotionCouponsTable.id, coupon.id), eq(promotionCouponsTable.revision, expected)))
    .returning({ revision: promotionCouponsTable.revision });
  if (!updated[0]) staleCouponRevision();
  return next;
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
): Promise<{ id: string; canonicalCode: string; revision: bigint }> {
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
      revision: BigInt(1),
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
    metadata: { promotionId: promotion.id, origin: input.origin, revision: "1" },
  });
  return { id, canonicalCode, revision: BigInt(1) };
}

export async function updateCouponDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
    startsAt?: Date | null;
    endsAt?: Date | null;
    maximumRedemptions?: number | null;
    maximumRedemptionsPerCustomer?: number | null;
  },
): Promise<{ revision: bigint }> {
  assertTransactionContext(context, "updateCouponDraft");
  const expected = parseExpectedCouponRevision(input.expectedCouponRevision);
  const coupon = await lockCoupon(context, assertUuid(input.couponId, "couponId"));
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
  if (coupon.revision !== expected) staleCouponRevision();
  if (coupon.status !== "draft" || coupon.activatedAt !== null) {
    throw new PromotionAdminError("COUPON_NOT_DRAFT", "Only draft coupons are mutable.");
  }
  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  const revision = await advanceCouponRevision(
    context,
    coupon,
    expected,
    {
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
    },
    now,
  );
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.updated",
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { updated: true, revision: revision.toString(10) },
  });
  return { revision };
}

export async function deleteCouponDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
): Promise<void> {
  assertTransactionContext(context, "deleteCouponDraft");
  const expected = parseExpectedCouponRevision(input.expectedCouponRevision);
  const coupon = await lockCoupon(context, assertUuid(input.couponId, "couponId"));
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
  if (coupon.revision !== expected) staleCouponRevision();
  if (coupon.activatedAt !== null || coupon.status !== "draft") {
    throw new PromotionAdminError("COUPON_IMMUTABLE", "Ever-active coupons cannot be deleted.");
  }
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
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
): Promise<{ revision: bigint }> {
  assertTransactionContext(context, "activateCoupon");
  const expected = parseExpectedCouponRevision(input.expectedCouponRevision);
  const coupon = await lockCoupon(context, assertUuid(input.couponId, "couponId"));
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
  if (coupon.revision !== expected) staleCouponRevision();
  if (coupon.status !== "draft") {
    throw new PromotionAdminError("COUPON_NOT_DRAFT", "Only draft coupons can activate.");
  }
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
  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  const revision = await advanceCouponRevision(
    context,
    coupon,
    expected,
    { status: "active", activatedAt: now },
    now,
  );
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action: "coupon.activated",
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { activated: true, promotionId: promotion.id, revision: revision.toString(10) },
  });
  return { revision };
}

async function transitionCoupon(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
  to: "disabled" | "active" | "retired",
  action: "coupon.disabled" | "coupon.enabled" | "coupon.retired",
): Promise<{ revision: bigint }> {
  assertTransactionContext(context, `coupon:${to}`);
  const expected = parseExpectedCouponRevision(input.expectedCouponRevision);
  const coupon = await lockCoupon(context, assertUuid(input.couponId, "couponId"));
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
  if (coupon.revision !== expected) staleCouponRevision();

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
  const revision = await advanceCouponRevision(
    context,
    coupon,
    expected,
    {
      status: to,
      disabledAt: to === "disabled" ? now : to === "active" ? null : coupon.disabledAt,
      retiredAt: to === "retired" ? now : coupon.retiredAt,
    },
    now,
  );
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "coupons.manage",
    action,
    resourceType: "coupon",
    resourceId: coupon.id,
    brandId: promotion.brandId,
    metadata: { status: to, promotionId: promotion.id, revision: revision.toString(10) },
  });
  return { revision };
}

export async function disableCoupon(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
) {
  return transitionCoupon(context, input, "disabled", "coupon.disabled");
}

export async function enableCoupon(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
) {
  return transitionCoupon(context, input, "active", "coupon.enabled");
}

export async function retireCoupon(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    couponId: string;
    expectedCouponRevision: bigint | number | string;
  },
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
