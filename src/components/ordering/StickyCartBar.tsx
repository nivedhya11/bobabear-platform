"use client";

import { Bag } from "@/components/icons";
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-strong)] bg-[var(--bg-surface-sunken)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(0,0,0,0.24)] backdrop-blur-[12px] xl:hidden"
      data-testid="sticky-cart"
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--interactive-primary)]/45 text-[var(--interactive-primary)]"
          >
            <Bag size={18} strokeWidth={1.8} />
          </span>
          <div
            data-testid="mobile-sticky-cart-content"
            className="min-w-0 flex flex-col leading-tight"
          >
            <span className="truncate font-body text-[14px] font-bold text-[var(--text-primary)]">
              {itemCount} item{itemCount === 1 ? "" : "s"}
              {compactAmount ? ` · ${compactAmount}` : ""}
            </span>
            <span className="font-body text-[11px] text-[var(--text-tertiary)]">
              Estimated subtotal
            </span>
          </div>
        </div>

        <a
          href="/order/cart/"
          className="shrink-0 font-body text-[13px] font-bold text-[var(--interactive-primary)] underline-offset-2 hover:underline focus-ring"
        >
          View cart
        </a>

        <Button asChild variant="primary" size="lg" className="min-h-[48px] shrink-0 rounded-lg px-5">
          <a href="/order/checkout/">Checkout</a>
        </Button>
      </div>

      <span className="sr-only">
        {compactAmount
          ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}, ${compactAmount}, ${label}`
          : `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}, ${label}`}
      </span>
    </div>
  );
}
