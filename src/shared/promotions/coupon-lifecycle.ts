/**
 * Coupon lifecycle transition rules (IMP-016 / IMP-036F F5).
 *
 * Shared by effect commands and consequence preview so reviewed transitions
 * match executable lifecycle commands.
 */
import type { CouponStatus } from "./constants";
import { PromotionAdminError } from "./errors";

/** Legal Coupon status transitions. Retired is terminal. */
export function isLegalCouponLifecycleTransition(
  current: CouponStatus,
  proposed: CouponStatus,
): boolean {
  if (current === "draft" && proposed === "active") return true;
  if (current === "active" && proposed === "disabled") return true;
  if (current === "disabled" && proposed === "active") return true;
  if (current === "active" && proposed === "retired") return true;
  if (current === "disabled" && proposed === "retired") return true;
  return false;
}

export function assertLegalCouponLifecycleTransition(
  current: CouponStatus,
  proposed: CouponStatus,
): void {
  if (current === "retired") {
    throw new PromotionAdminError("invalid_state", "Retired coupons are terminal.");
  }
  if (!isLegalCouponLifecycleTransition(current, proposed)) {
    throw new PromotionAdminError(
      "invalid_state",
      `Illegal coupon lifecycle transition: ${current} -> ${proposed}.`,
    );
  }
}
