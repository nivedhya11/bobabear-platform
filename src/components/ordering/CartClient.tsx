"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CartLineList } from "@/components/ordering/CartLineList";
import { CartSummary } from "@/components/ordering/CartSummary";
import {
  buildCartLinePresentations,
  buildCustomerMenuLookups,
  cartBundleSelectionsToInput,
  cartModifiersToInput,
  cartUnitCount,
  formatCartEstimatePrimaryLabel,
  resolveCartPresentationEstimate,
} from "@/components/ordering/cart-presentation";
import { publishCartCount } from "@/components/ordering/cart-count-sync";
import { readDeliveryPinContext } from "@/components/ordering/delivery-pin-context";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { MenuItemCustomizationDialog } from "@/components/ordering/MenuItemCustomizationDialog";
import { cartEvaluationCustomerCopy } from "@/components/ordering/serviceability-copy";
import {
  clearCart,
  evaluateCart,
  getActiveCart,
  getCustomerMenu,
  removeCartLine,
  setCartLineQuantity,
  updateCartLineConfiguration,
  type CommerceCart,
  type CommerceCartEvaluation,
  type CommerceCartLine,
} from "@/lib/customer-commerce";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import type { CartModifierSelectionInput } from "@/shared/cart/types";
import type { CustomerMenuItem, CustomerMenuProjection } from "@/shared/customer-menu/types";

type EditTarget = Readonly<{
  line: CommerceCartLine;
  item: CustomerMenuItem;
}>;

export function CartClient(props: { brandId: string }) {
  const { brandId } = props;
  const [menu, setMenu] = useState<CustomerMenuProjection | null>(null);
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [evaluation, setEvaluation] = useState<CommerceCartEvaluation | null>(null);
  const [deliveryPin, setDeliveryPin] = useState(() => readDeliveryPinContext());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const menuLookups = useMemo(
    () => (menu ? buildCustomerMenuLookups(menu) : null),
    [menu],
  );

  const linePresentations = useMemo(
    () =>
      buildCartLinePresentations(
        cart,
        menuLookups ?? buildCustomerMenuLookups(emptyMenu(brandId)),
      ),
    [cart, menuLookups, brandId],
  );

  const refreshEvaluation = useCallback(
    async (pin: string, currentCart: CommerceCart | null) => {
      if (!currentCart || currentCart.lines.length === 0) {
        setEvaluation(null);
        return;
      }
      const evaluated = await evaluateCart(
        pin.length === 6
          ? { brandId, location: { postalCode: pin } }
          : { brandId },
      );
      if (evaluated.ok) setEvaluation(evaluated.data);
      else setEvaluation(null);
    },
    [brandId],
  );

  const load = useCallback(async () => {
    const menuResult = await getCustomerMenu({ brandId });
    if (!menuResult.ok) {
      setMenu(null);
      setError(commerceErrorCopy(menuResult.code));
    } else {
      setMenu(menuResult.data.menu);
    }

    const cartResult = await getActiveCart(brandId, { guestToken: true });
    if (!cartResult.ok) {
      setError(commerceErrorCopy(cartResult.code));
      setCart(null);
      return;
    }
    setCart(cartResult.data.cart);
    const pin = readDeliveryPinContext();
    setDeliveryPin(pin);
    await refreshEvaluation(pin, cartResult.data.cart);
  }, [brandId, refreshEvaluation]);

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
    publishCartCount(cartUnitCount(nextCart));
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
          brandId,
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
        brandId,
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
        brandId,
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

  function openEdit(lineId: string): void {
    if (!menuLookups || !cart) return;
    const line = cart.lines.find((entry) => entry.id === lineId);
    if (!line) return;
    const item = menuLookups.itemByVariant.get(line.variantId);
    if (!item) return;
    const presentation = linePresentations.find((entry) => entry.lineId === line.id);
    if (!presentation?.editEligible) return;
    setDialogError(null);
    setEditTarget({ line, item });
  }

  async function saveEditConfiguration(
    modifiers: readonly CartModifierSelectionInput[],
  ): Promise<void> {
    if (!editTarget || !cart || pending) return;
    setPending(true);
    setDialogError(null);
    try {
      const result = await updateCartLineConfiguration({
        brandId,
        cartLineId: editTarget.line.id,
        variantId: editTarget.line.variantId,
        modifiers,
        bundleSelections: cartBundleSelectionsToInput(editTarget.line.bundleSelections),
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setDialogError(commerceErrorCopy(result.code));
        return;
      }
      await applyCartMutation(result.data.cart);
      setEditTarget(null);
      setDialogError(null);
    } finally {
      setPending(false);
    }
  }

  const empty = !loading && (!cart || cart.lines.length === 0);
  const lineCount = cartUnitCount(cart);
  const presentationEstimate = menuLookups
    ? resolveCartPresentationEstimate(cart, menuLookups)
    : { complete: false as const, totalPaise: BigInt(0) };
  const presentationLabel = formatCartEstimatePrimaryLabel(presentationEstimate);
  const serviceabilityNote = cartEvaluationCustomerCopy(evaluation, deliveryPin.length === 6);

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
        <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16">
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading cart…</p>
        </div>
      </main>
    );
  }

  if (!menu) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
        <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16">
          <p role="status" className="font-body text-[15px] text-[var(--text-secondary)]">
            {error ?? "Menu is unavailable right now."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:pb-10">
        <section className="flex min-w-0 flex-col gap-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-1">
            <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
              YOUR CART
            </h1>
            {!empty ? (
              <p
                data-testid="cart-item-count"
                className="font-body text-[15px] text-[var(--interactive-primary)] sm:text-[var(--text-secondary)]"
              >
                {lineCount} item{lineCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          {!empty ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleClear()}
              className="shrink-0 font-body text-[13px] font-semibold text-[var(--interactive-secondary)] underline-offset-2 hover:underline focus-ring"
            >
              Clear cart
            </button>
          ) : null}
        </header>

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
              <a href="/order/">Back to menu</a>
            </Button>
          </div>
        ) : null}

        {cart && cart.lines.length > 0 ? (
          <CartLineList
            lines={linePresentations}
            pending={pending}
            onChangeQuantity={(lineId, quantity) => void changeQuantity(lineId, quantity)}
            onEdit={openEdit}
            onRemove={(lineId) => void changeQuantity(lineId, 0)}
          />
        ) : null}

        {serviceabilityNote ? (
          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
            {serviceabilityNote}
          </p>
        ) : null}

        </section>

        {cart && cart.lines.length > 0 ? (
          <aside
            data-testid="cart-order-summary"
            className="hidden lg:block lg:sticky lg:top-20 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.18)]"
          >
            <h2 className="font-display text-[24px] uppercase tracking-wide text-[var(--text-primary)]">
              Order summary
            </h2>
            <div className="mt-5">
              <CartSummary estimate={presentationEstimate} itemCount={lineCount} />
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="mt-6 min-h-[52px] w-full rounded-lg"
              disabled={pending}
              onClick={() => void handleCheckout()}
            >
              {pending ? "Continuing…" : "Checkout"}
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <a href="/order/">Keep browsing</a>
            </Button>
          </aside>
        ) : null}
      </div>

      {cart && cart.lines.length > 0 ? (
        <div
          data-testid="cart-mobile-checkout"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-strong)] bg-[var(--bg-surface-sunken)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(0,0,0,0.24)] backdrop-blur-[12px] lg:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {presentationEstimate.complete ? (
                <p className="font-body text-[11px] text-[var(--text-tertiary)]">Estimated subtotal</p>
              ) : null}
              <p className="font-body text-[18px] font-bold text-[var(--text-primary)]">
                {presentationLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="min-h-[48px] shrink-0 rounded-lg px-6"
              disabled={pending}
              onClick={() => void handleCheckout()}
            >
              {pending ? "Continuing…" : "Checkout"}
            </Button>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <MenuItemCustomizationDialog
          item={editTarget.item}
          mode="edit"
          initialModifiers={cartModifiersToInput(editTarget.line.modifiers)}
          pending={pending}
          error={dialogError}
          onClose={() => {
            if (!pending) {
              setEditTarget(null);
              setDialogError(null);
            }
          }}
          onSave={(modifiers) => void saveEditConfiguration(modifiers)}
        />
      ) : null}
    </main>
  );
}

function emptyMenu(brandId: string): CustomerMenuProjection {
  return {
    brandId,
    menuId: "empty",
    name: "Empty",
    sections: [],
    items: [],
  };
}
