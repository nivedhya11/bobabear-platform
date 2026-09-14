/**
 * Coupon activation-readiness rules (IMP-016 / IMP-036F F5).
 *
 * Shared by activateCoupon, enableCoupon, and consequence preview so a reviewed
 * active proposed effect matches an executable activation / re-enable command.
 * Lifecycle transition legality remains in coupon-lifecycle.ts.
 */
import { PromotionAdminError, PromotionValidationError } from "./errors";

export type CouponActivationWindow = Readonly<{
  startsAt: Date | null;
  endsAt: Date | null;
}>;

export type PromotionActivationReadiness = Readonly<{
  triggerType: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
}>;

/**
 * Immutable / readiness conditions required before a Coupon may become
 * customer-active against its parent Promotion (draft→active or disabled→active).
 */
export function assertCouponActivationReady(input: {
  coupon: CouponActivationWindow;
  promotion: PromotionActivationReadiness;
}): void {
  if (input.promotion.triggerType !== "coupon") {
    throw new PromotionValidationError(
      "Coupons may only reference coupon-triggered promotions.",
    );
  }
  if (input.promotion.status !== "active") {
    throw new PromotionAdminError(
      "COUPON_PROMOTION_NOT_ACTIVE",
      "Coupon activation requires an active promotion.",
    );
  }
  if (input.coupon.startsAt && input.coupon.startsAt < input.promotion.startsAt) {
    throw new PromotionAdminError(
      "COUPON_WINDOW_INVALID",
      "Coupon startsAt cannot precede promotion startsAt.",
    );
  }
  if (input.coupon.endsAt && input.promotion.endsAt && input.coupon.endsAt > input.promotion.endsAt) {
    throw new PromotionAdminError(
      "COUPON_WINDOW_INVALID",
      "Coupon endsAt cannot exceed promotion endsAt.",
    );
  }
}
