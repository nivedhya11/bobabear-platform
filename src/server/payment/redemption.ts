/**
 * Promotion redemption claim orchestration for Payment (IMP-022).
 *
 * Capacity authority remains with Promotions; Payment only reserves /
 * consumes / releases claims at the financial boundary.
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  checkoutSnapshotsTable,
  checkoutsTable,
} from "../../platform/database/schema/checkout";
import {
  promotionCouponsTable,
  promotionRedemptionClaimsTable,
  promotionsTable,
} from "../../platform/database/schema/promotions";
import { PaymentError } from "../../shared/payment";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import { loadAppliedPromotionEffects } from "./repository";

export type AppliedPromotionTarget = Readonly<{
  promotionId: string;
  couponId: string | null;
}>;

export function newClaimId(): string {
  return randomUUID();
}

async function lockPromotionsAndCoupons(
  context: PersistenceTransactionContext,
  targets: readonly AppliedPromotionTarget[],
): Promise<void> {
  assertTransactionContext(context, "lockPromotionsAndCoupons");
  const promotionIds = [...new Set(targets.map((t) => t.promotionId))].sort();
  for (const promotionId of promotionIds) {
    await context.db
      .select({ id: promotionsTable.id })
      .from(promotionsTable)
      .where(eq(promotionsTable.id, promotionId))
      .for("update");
  }

  const couponIds = [
    ...new Set(
      targets
        .map((t) => t.couponId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ].sort();
  for (const couponId of couponIds) {
    await context.db
      .select({ id: promotionCouponsTable.id })
      .from(promotionCouponsTable)
      .where(eq(promotionCouponsTable.id, couponId))
      .for("update");
  }
}

async function countActiveUnitsForPromotion(
  context: PersistenceTransactionContext,
  promotionId: string,
): Promise<bigint> {
  const rows = await context.db
    .select({
      total: sql<string>`coalesce(sum(${promotionRedemptionClaimsTable.redemptionUnits}), 0)`,
    })
    .from(promotionRedemptionClaimsTable)
    .where(
      and(
        eq(promotionRedemptionClaimsTable.promotionId, promotionId),
        inArray(promotionRedemptionClaimsTable.status, [
          "RESERVED",
          "CONSUMED",
        ]),
      ),
    );
  return BigInt(rows[0]?.total ?? "0");
}

async function countActiveUnitsForCustomer(
  context: PersistenceTransactionContext,
  promotionId: string,
  customerAuthUserId: string,
): Promise<bigint> {
  const rows = await context.db
    .select({
      total: sql<string>`coalesce(sum(${promotionRedemptionClaimsTable.redemptionUnits}), 0)`,
    })
    .from(promotionRedemptionClaimsTable)
    .innerJoin(
      checkoutSnapshotsTable,
      eq(
        checkoutSnapshotsTable.id,
        promotionRedemptionClaimsTable.checkoutSnapshotId,
      ),
    )
    .innerJoin(
      checkoutsTable,
      eq(checkoutsTable.id, checkoutSnapshotsTable.checkoutId),
    )
    .where(
      and(
        eq(promotionRedemptionClaimsTable.promotionId, promotionId),
        inArray(promotionRedemptionClaimsTable.status, [
          "RESERVED",
          "CONSUMED",
        ]),
        eq(checkoutsTable.customerAuthUserId, customerAuthUserId),
      ),
    );
  return BigInt(rows[0]?.total ?? "0");
}

async function enforceCouponCapacity(
  context: PersistenceTransactionContext,
  target: AppliedPromotionTarget,
  customerAuthUserId: string,
  redemptionUnits: bigint,
): Promise<void> {
  if (!target.couponId) return;

  const couponRows = await context.db
    .select()
    .from(promotionCouponsTable)
    .where(eq(promotionCouponsTable.id, target.couponId))
    .limit(1);
  const coupon = couponRows[0];
  if (!coupon) {
    throw new PaymentError(
      "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
      "Promotion coupon capacity could not be verified.",
    );
  }

  if (coupon.maximumRedemptions !== null) {
    const globalUsage = await countActiveUnitsForPromotion(
      context,
      target.promotionId,
    );
    if (globalUsage + redemptionUnits > BigInt(coupon.maximumRedemptions)) {
      throw new PaymentError(
        "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
        "Promotion redemption capacity is unavailable.",
      );
    }
  }

  if (coupon.maximumRedemptionsPerCustomer !== null) {
    const customerUsage = await countActiveUnitsForCustomer(
      context,
      target.promotionId,
      customerAuthUserId,
    );
    if (
      customerUsage + redemptionUnits >
      BigInt(coupon.maximumRedemptionsPerCustomer)
    ) {
      throw new PaymentError(
        "PAYMENT_PROMOTION_CAPACITY_UNAVAILABLE",
        "Promotion redemption capacity is unavailable for this customer.",
      );
    }
  }
}

/**
 * Reserve promotion capacity for a positive Payment attempt.
 * Inserts RESERVED claims bound to payment + attempt.
 */
export async function acquireReservedClaimsForAttempt(
  context: PersistenceTransactionContext,
  input: {
    snapshotId: string;
    paymentId: string;
    paymentAttemptId: string;
    customerAuthUserId: string;
    now: Date;
  },
): Promise<void> {
  assertTransactionContext(context, "acquireReservedClaimsForAttempt");
  const targets = await loadAppliedPromotionEffects(context, input.snapshotId);
  if (targets.length === 0) return;

  await lockPromotionsAndCoupons(context, targets);

  for (const target of targets) {
    const redemptionUnits = BigInt(1);
    await enforceCouponCapacity(
      context,
      target,
      input.customerAuthUserId,
      redemptionUnits,
    );
    await context.db.insert(promotionRedemptionClaimsTable).values({
      id: newClaimId(),
      promotionId: target.promotionId,
      checkoutSnapshotId: input.snapshotId,
      paymentId: input.paymentId,
      paymentAttemptId: input.paymentAttemptId,
      redemptionUnits,
      status: "RESERVED",
      createdAt: input.now,
      consumedAt: null,
      releasedAt: null,
    });
  }
}

/**
 * Zero-payable path: acquire capacity directly as CONSUMED (no Payment row).
 */
export async function acquireConsumedClaimsForZeroPayable(
  context: PersistenceTransactionContext,
  input: {
    snapshotId: string;
    customerAuthUserId: string;
    now: Date;
  },
): Promise<void> {
  assertTransactionContext(context, "acquireConsumedClaimsForZeroPayable");
  const targets = await loadAppliedPromotionEffects(context, input.snapshotId);
  if (targets.length === 0) return;

  await lockPromotionsAndCoupons(context, targets);

  for (const target of targets) {
    const redemptionUnits = BigInt(1);
    await enforceCouponCapacity(
      context,
      target,
      input.customerAuthUserId,
      redemptionUnits,
    );
    await context.db.insert(promotionRedemptionClaimsTable).values({
      id: newClaimId(),
      promotionId: target.promotionId,
      checkoutSnapshotId: input.snapshotId,
      paymentId: null,
      paymentAttemptId: null,
      redemptionUnits,
      status: "CONSUMED",
      createdAt: input.now,
      consumedAt: input.now,
      releasedAt: null,
    });
  }
}

export async function releaseClaimsForAttempt(
  context: PersistenceTransactionContext,
  paymentAttemptId: string,
  now: Date,
): Promise<number> {
  assertTransactionContext(context, "releaseClaimsForAttempt");
  const rows = await context.db
    .update(promotionRedemptionClaimsTable)
    .set({
      status: "RELEASED",
      releasedAt: now,
      consumedAt: null,
    })
    .where(
      and(
        eq(promotionRedemptionClaimsTable.paymentAttemptId, paymentAttemptId),
        eq(promotionRedemptionClaimsTable.status, "RESERVED"),
      ),
    )
    .returning({ id: promotionRedemptionClaimsTable.id });
  return rows.length;
}

export async function consumeClaimsForAttempt(
  context: PersistenceTransactionContext,
  paymentAttemptId: string,
  now: Date,
): Promise<number> {
  assertTransactionContext(context, "consumeClaimsForAttempt");
  const rows = await context.db
    .update(promotionRedemptionClaimsTable)
    .set({
      status: "CONSUMED",
      consumedAt: now,
      releasedAt: null,
    })
    .where(
      and(
        eq(promotionRedemptionClaimsTable.paymentAttemptId, paymentAttemptId),
        eq(promotionRedemptionClaimsTable.status, "RESERVED"),
      ),
    )
    .returning({ id: promotionRedemptionClaimsTable.id });
  return rows.length;
}

export async function lockClaimsForAttempt(
  context: PersistenceTransactionContext,
  paymentAttemptId: string,
): Promise<void> {
  assertTransactionContext(context, "lockClaimsForAttempt");
  await context.db
    .select({ id: promotionRedemptionClaimsTable.id })
    .from(promotionRedemptionClaimsTable)
    .where(
      eq(promotionRedemptionClaimsTable.paymentAttemptId, paymentAttemptId),
    )
    .orderBy(asc(promotionRedemptionClaimsTable.id))
    .for("update");
}
