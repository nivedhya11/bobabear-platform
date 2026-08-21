"use client";

import { Button } from "@/components/ui/Button";
import {
  formatCartEstimatePrimaryLabel,
  formatPresentationEstimateLabel,
  type CartPresentationEstimate,
} from "@/components/ordering/cart-presentation";

export function StickyCartBar(props: {
  itemCount: number;
  estimate: CartPresentationEstimate;
}) {
  const { itemCount, estimate } = props;
  if (itemCount <= 0) return null;

  const label = formatCartEstimatePrimaryLabel(estimate);
  const compactAmount = estimate.complete
    ? formatPresentationEstimateLabel(estimate.totalPaise)
    : null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 xl:hidden border-t border-[var(--border-default)] bg-[var(--bg-page)]/95 backdrop-blur-[12px] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid="sticky-cart"
    >
      <Button
        asChild
        variant="primary"
        size="lg"
        className="w-full min-h-[44px] justify-between"
      >
        <a
          href="/order/cart/"
          aria-label={
            compactAmount
              ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}, ${compactAmount}`
              : `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`
          }
        >
          <span data-testid="mobile-sticky-cart-content" className="md:hidden">
            {itemCount} item{itemCount === 1 ? "" : "s"}
            {compactAmount ? ` · ${compactAmount}` : ""}
          </span>
          <span className="hidden md:inline">
            View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[13px] opacity-90">
            <span className="md:hidden">View Cart →</span>
            <span className="hidden md:inline">{label}</span>
          </span>
        </a>
      </Button>
    </div>
  );
}
