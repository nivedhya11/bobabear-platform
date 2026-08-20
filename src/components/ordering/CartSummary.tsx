"use client";

import { Button } from "@/components/ui/Button";
import {
  CART_ESTIMATE_SUPPORTING_COPY,
  formatCartEstimatePrimaryLabel,
  type CartPresentationEstimate,
} from "@/components/ordering/cart-presentation";

export type CartSummaryProps = Readonly<{
  estimate: CartPresentationEstimate;
  itemCount: number;
  checkoutHref?: string;
  showCheckoutLink?: boolean;
  compact?: boolean;
}>;

/**
 * Presentation-only Cart summary. Does not claim Checkout Snapshot authority.
 */
export function CartSummary(props: CartSummaryProps) {
  const {
    estimate,
    itemCount,
    checkoutHref = "/order/checkout/",
    showCheckoutLink = false,
    compact = false,
  } = props;

  if (itemCount <= 0) return null;

  const primary = formatCartEstimatePrimaryLabel(estimate);

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2 pt-3 border-t border-[var(--border-default)]"
          : "flex flex-col gap-2 border-t border-[var(--border-default)] pt-4"
      }
    >
      <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">{primary}</p>
      <p className="font-body text-[12px] text-[var(--text-tertiary)]">
        {CART_ESTIMATE_SUPPORTING_COPY}
      </p>
      {showCheckoutLink ? (
        <Button asChild variant="primary" size="lg" className="min-h-[44px] w-full mt-1">
          <a href={checkoutHref}>Checkout</a>
        </Button>
      ) : null}
    </div>
  );
}
