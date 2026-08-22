"use client";

import { Bag } from "@/components/icons";
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
  cartHref?: string;
  showCheckoutLink?: boolean;
  showViewCartLink?: boolean;
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
    cartHref = "/order/cart/",
    showCheckoutLink = false,
    showViewCartLink = false,
    compact = false,
  } = props;

  if (itemCount <= 0) return null;

  const primary = formatCartEstimatePrimaryLabel(estimate);

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2"
          : "flex flex-col gap-3 border-t border-[var(--border-strong)] pt-4"
      }
    >
      {compact ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-body text-[13px] text-[var(--text-secondary)]">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
          <p className="font-body text-[17px] font-bold text-[var(--text-primary)]">{primary}</p>
        </div>
      ) : (
        <p className="font-body text-[17px] font-bold text-[var(--text-primary)]">{primary}</p>
      )}
      <p className="font-body text-[12px] text-[var(--text-tertiary)]">
        {CART_ESTIMATE_SUPPORTING_COPY}
      </p>
      {showViewCartLink || showCheckoutLink ? (
        <div className="mt-1 flex gap-3">
          {showViewCartLink ? (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-[44px] flex-1 rounded-lg border-[var(--interactive-primary)] text-[var(--interactive-primary)] hover:text-[var(--interactive-primary)]"
            >
              <a href={cartHref}>View cart</a>
            </Button>
          ) : null}
          {showCheckoutLink ? (
            <Button asChild variant="primary" size="lg" className="min-h-[52px] flex-1 rounded-lg">
              <a href={checkoutHref}>Checkout</a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
