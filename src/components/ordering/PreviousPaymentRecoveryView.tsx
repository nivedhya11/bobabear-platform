"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import {
  CheckoutSnapshotLineList,
} from "@/components/ordering/CheckoutReviewSections";
import { OrderMoneySummaryPanel } from "@/components/ordering/OrderMoneySummaryPanel";
import { narrowCheckoutSnapshotLines } from "@/components/ordering/checkout-line-presentation";
import {
  cartChangedRecoveryPresentation,
  PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY,
  PREVIOUS_CHECKOUT_LOCK_COPY,
} from "@/components/ordering/cart-changed-recovery-presentation";
import { formatPaise } from "@/components/ordering/format-money";
import type {
  CommerceCart,
  CommerceCheckoutSnapshot,
} from "@/lib/customer-commerce";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

function currentCartLineSummaries(
  cart: CommerceCart,
  catalog: OrderingCatalog,
): readonly { quantity: number; name: string }[] {
  const byVariant = new Map(catalog.items.map((item) => [item.variantId, item.name]));
  return cart.lines.map((line) =>
    Object.freeze({
      quantity: line.quantity,
      name: byVariant.get(line.variantId) ?? "Item",
    }),
  );
}

export function PreviousPaymentRecoveryView(props: {
  cart: CommerceCart;
  catalog: OrderingCatalog;
  previousSnapshot: CommerceCheckoutSnapshot | null;
  paymentSlot?: ReactNode;
}) {
  const unresolved = cartChangedRecoveryPresentation("unresolved");
  const previousLines = props.previousSnapshot
    ? narrowCheckoutSnapshotLines(props.previousSnapshot.lines)
    : [];
  const previousItemCount = previousLines.reduce((sum, line) => sum + line.quantity, 0);
  const previousTotal = props.previousSnapshot
    ? formatPaise(props.previousSnapshot.grandTotalPaise)
    : null;
  const currentLines = currentCartLineSummaries(props.cart, props.catalog);
  const currentItemCount = props.cart.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="cart-changed-unresolved"
      data-previous-payment-recovery="true"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3">
        <h2 className="font-body text-[18px] font-semibold text-[var(--text-primary)]">
          {unresolved.headline}
        </h2>
        <p className="font-body text-[14px] text-[var(--text-secondary)]">{unresolved.body}</p>
      </div>

      <section
        className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4 flex flex-col gap-3"
        data-testid="previous-checkout-summary"
        aria-label="Previous checkout"
      >
        <h3 className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
          Previous checkout
        </h3>
        <p className="font-body text-[14px] text-[var(--text-secondary)]">
          {previousItemCount} {previousItemCount === 1 ? "item" : "items"}
          {previousTotal ? ` · ${previousTotal}` : ""}
        </p>
        {previousLines.length > 0 ? (
          <CheckoutSnapshotLineList
            title="Previous checkout items"
            lines={previousLines}
          />
        ) : null}
        {props.previousSnapshot ? (
          <OrderMoneySummaryPanel snapshot={props.previousSnapshot} title="Previous checkout total" />
        ) : null}
        <p
          className="font-body text-[13px] text-[var(--text-tertiary)]"
          data-testid="previous-checkout-lock-copy"
        >
          {PREVIOUS_CHECKOUT_LOCK_COPY}
        </p>
        <p
          className="font-body text-[13px] text-[var(--text-tertiary)]"
          data-testid="previous-checkout-address-lock"
        >
          {PREVIOUS_CHECKOUT_ADDRESS_LOCK_COPY}
        </p>
      </section>

      <section
        className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-page)] p-4 flex flex-col gap-3"
        data-testid="current-cart-summary"
        aria-label="Current cart"
      >
        <h3 className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
          Current cart
        </h3>
        <p className="font-body text-[14px] text-[var(--text-secondary)]">
          {currentItemCount} {currentItemCount === 1 ? "item" : "items"}
        </p>
        {currentLines.length > 0 ? (
          <ul className="flex flex-col gap-2" data-testid="current-cart-lines">
            {currentLines.map((line, index) => (
              <li
                key={`${line.name}-${index}`}
                className="font-body text-[14px] text-[var(--text-primary)]"
              >
                {line.quantity} × {line.name}
              </li>
            ))}
          </ul>
        ) : null}
        <Button asChild variant="outline" className="min-h-[44px]">
          <a
            href={unresolved.secondaryHref ?? "/order/cart/"}
            data-testid={unresolved.secondaryTestId ?? "cart-changed-back-to-cart"}
          >
            View current cart
          </a>
        </Button>
      </section>

      {props.paymentSlot ? (
        <div data-testid="previous-payment-status-slot">{props.paymentSlot}</div>
      ) : null}
    </div>
  );
}
