"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  cartUnitCount,
  estimateCartPresentationPaise,
  formatPresentationEstimateLabel,
} from "@/components/ordering/cart-presentation";
import {
  readDeliveryPinContext,
} from "@/components/ordering/delivery-pin-context";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatRupees } from "@/components/ordering/format-money";
import { cartEvaluationCustomerCopy } from "@/components/ordering/serviceability-copy";
import {
  clearCart,
  evaluateCart,
  getActiveCart,
  removeCartLine,
  setCartLineQuantity,
  type CommerceCart,
  type CommerceCartEvaluation,
} from "@/lib/customer-commerce";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import type { OrderingCatalog } from "@/shared/ordering-catalog";

const QTY_BUTTON_CLASS = "min-h-[44px] min-w-[44px] md:min-h-8 md:min-w-8";

export function CartClient(props: { catalog: OrderingCatalog }) {
  const { catalog } = props;
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [evaluation, setEvaluation] = useState<CommerceCartEvaluation | null>(null);
  const [deliveryPin, setDeliveryPin] = useState(() => readDeliveryPinContext());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemByVariant = useMemo(() => {
    return new Map(catalog.items.map((item) => [item.variantId, item]));
  }, [catalog.items]);

  const refreshEvaluation = useCallback(
    async (pin: string, currentCart: CommerceCart | null) => {
      if (!currentCart || currentCart.lines.length === 0) {
        setEvaluation(null);
        return;
      }
      const evaluated = await evaluateCart(
        pin.length === 6 ? { brandId: catalog.brandId, location: { postalCode: pin } } : { brandId: catalog.brandId },
      );
      if (evaluated.ok) setEvaluation(evaluated.data);
      else setEvaluation(null);
    },
    [catalog.brandId],
  );

  const load = useCallback(async () => {
    const result = await getActiveCart(catalog.brandId, { guestToken: true });
    if (!result.ok) {
      setError(commerceErrorCopy(result.code));
      setCart(null);
      return;
    }
    setCart(result.data.cart);
    const pin = readDeliveryPinContext();
    setDeliveryPin(pin);
    await refreshEvaluation(pin, result.data.cart);
  }, [catalog.brandId, refreshEvaluation]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function applyCartMutation(nextCart: CommerceCart): Promise<void> {
    setCart(nextCart);
    await refreshEvaluation(deliveryPin, nextCart);
  }

  async function withPending(work: () => Promise<void>): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await work();
    } finally {
      setPending(false);
    }
  }

  async function changeQuantity(lineId: string, quantity: number): Promise<void> {
    if (!cart) return;
    await withPending(async () => {
      if (quantity < 1) {
        const result = await removeCartLine({
          brandId: catalog.brandId,
          cartLineId: lineId,
          expectedRevision: cart.revision,
        });
        if (!result.ok) {
          setError(commerceErrorCopy(result.code));
          return;
        }
        await applyCartMutation(result.data.cart);
        return;
      }
      const result = await setCartLineQuantity({
        brandId: catalog.brandId,
        cartLineId: lineId,
        quantity,
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await applyCartMutation(result.data.cart);
    });
  }

  async function handleClear(): Promise<void> {
    if (!cart) return;
    await withPending(async () => {
      const result = await clearCart({
        brandId: catalog.brandId,
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await applyCartMutation(result.data.cart);
      setEvaluation(null);
    });
  }

  async function handleCheckout(): Promise<void> {
    if (pending || !cart || cart.lines.length === 0) return;
    setPending(true);
    const session = await fetchCustomerSession();
    setPending(false);
    if (!session.ok || !session.data.authenticated) {
      window.location.assign(loginUrlWithReturn("/order/checkout/"));
      return;
    }
    window.location.assign("/order/checkout/");
  }

  const empty = !loading && (!cart || cart.lines.length === 0);
  const lineCount = cartUnitCount(cart);
  const presentationEstimate = estimateCartPresentationPaise(cart, itemByVariant);
  const presentationLabel = formatPresentationEstimateLabel(presentationEstimate);
  const serviceabilityNote = cartEvaluationCustomerCopy(evaluation, deliveryPin.length === 6);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Cart
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Your cart
          </h1>
          {!empty ? (
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              {lineCount} item{lineCount === 1 ? "" : "s"} · {presentationLabel}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading cart…</p>
        ) : null}

        {error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        {empty ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Your cart is empty. Browse the menu to add something.
            </p>
            <Button asChild variant="primary">
              <a href="/order">Back to menu</a>
            </Button>
          </div>
        ) : null}

        {cart && cart.lines.length > 0 ? (
          <ul className="flex flex-col gap-3" role="list">
            {cart.lines.map((line) => {
              const item = itemByVariant.get(line.variantId);
              return (
                <li
                  key={line.id}
                  className="border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-display text-[20px] text-[var(--text-primary)]">
                      {item?.name ?? "Item"}
                    </p>
                    {item ? (
                      <p className="font-body text-[13px] text-[var(--text-tertiary)]">
                        {formatRupees(item.presentationPriceRupees)} each (menu price)
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={QTY_BUTTON_CLASS}
                      disabled={pending}
                      aria-label={`Decrease ${item?.name ?? "item"} quantity`}
                      onClick={() => void changeQuantity(line.id, line.quantity - 1)}
                    >
                      −
                    </Button>
                    <span
                      className="font-mono text-[13px] min-w-[1.5rem] text-center"
                      aria-live="polite"
                    >
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={QTY_BUTTON_CLASS}
                      disabled={pending}
                      aria-label={`Increase ${item?.name ?? "item"} quantity`}
                      onClick={() => void changeQuantity(line.id, line.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={pending}
                      aria-label={`Remove ${item?.name ?? "item"} from cart`}
                      onClick={() => void changeQuantity(line.id, 0)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {cart && cart.lines.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-4">
            <p className="font-body text-[15px] font-semibold">
              Cart total (menu prices): {presentationLabel}
            </p>
            <p className="font-body text-[13px] text-[var(--text-tertiary)]">
              Packaging, delivery, tax, and your payable total appear at checkout.
            </p>
          </div>
        ) : null}

        {serviceabilityNote ? (
          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
            {serviceabilityNote}
          </p>
        ) : null}

        {cart && cart.lines.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="min-h-[44px]"
              disabled={pending}
              onClick={() => void handleCheckout()}
            >
              {pending ? "Continuing…" : "Checkout"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => void handleClear()}>
              Clear cart
            </Button>
            <Button asChild variant="ghost">
              <a href="/order">Keep browsing</a>
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
