"use client";

import { Button } from "@/components/ui/Button";
import { formatPresentationEstimateLabel } from "@/components/ordering/cart-presentation";

export function StickyCartBar(props: {
  itemCount: number;
  presentationEstimatePaise: bigint;
}) {
  const { itemCount, presentationEstimatePaise } = props;
  if (itemCount <= 0) return null;

  const estimate = formatPresentationEstimateLabel(presentationEstimatePaise);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-[var(--border-default)] bg-[var(--bg-page)]/95 backdrop-blur-[12px] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
          aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}, ${estimate}`}
        >
          <span>
            View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[13px] opacity-90">{estimate}</span>
        </a>
      </Button>
    </div>
  );
}
