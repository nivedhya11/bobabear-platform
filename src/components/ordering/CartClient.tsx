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
      <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex gap-2 justify-between items-start">
          <div className="flex flex-col gap-2">
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
          </div>
          {!empty ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void handleClear()}>
              Clear all
            </Button>
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

        {cart && cart.lines.length > 0 ? (
          <CartSummary estimate={presentationEstimate} itemCount={lineCount} />
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
            <Button asChild variant="ghost">
              <a href="/order/">Keep browsing</a>
            </Button>
          </div>
        ) : null}
      </div>

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
