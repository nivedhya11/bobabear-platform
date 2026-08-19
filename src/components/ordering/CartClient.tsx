"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  buildCartLinePresentations,
  buildCustomerMenuLookups,
  cartBundleSelectionsToInput,
  cartModifiersToInput,
  cartUnitCount,
  estimateCartPresentationPaise,
  formatModifierPriceDelta,
  formatPresentationEstimateLabel,
  STALE_MODIFIER_OPTION_LABEL,
} from "@/components/ordering/cart-presentation";
import { readDeliveryPinContext } from "@/components/ordering/delivery-pin-context";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatPaise } from "@/components/ordering/format-money";
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

const QTY_BUTTON_CLASS = "min-h-[44px] min-w-[44px] md:min-h-8 md:min-w-8";

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
    () => buildCartLinePresentations(cart, menuLookups ?? buildCustomerMenuLookups(emptyMenu(brandId))),
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

  function openEdit(line: CommerceCartLine): void {
    if (!menuLookups) return;
    const item = menuLookups.itemByVariant.get(line.variantId);
    if (!item) return;
    const presentation = linePresentations.find((entry) => entry.lineId === line.id);
    if (!presentation?.editEligible) return;
    setDialogError(null);
    setEditTarget({ line, item });
  }

  async function saveEditConfiguration(modifiers: readonly CartModifierSelectionInput[]): Promise<void> {
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
    ? estimateCartPresentationPaise(cart, menuLookups)
    : BigInt(0);
  const presentationLabel = formatPresentationEstimateLabel(presentationEstimate);
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
              const presentation = linePresentations.find((entry) => entry.lineId === line.id);
              const itemName = presentation?.itemName ?? "Item";
              return (
                <li
                  key={line.id}
                  className="border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[20px] text-[var(--text-primary)]">
                        {itemName}
                      </p>
                      {presentation ? (
                        <p className="font-body text-[13px] text-[var(--text-tertiary)]">
                          {formatPaise(presentation.unitPricePaise)} each (menu price)
                        </p>
                      ) : null}
                      {presentation && presentation.modifiers.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-2" role="list">
                          {presentation.modifiers.map((modifier) => (
                            <li
                              key={`${modifier.variantModifierGroupId}:${modifier.modifierGroupOptionId}`}
                              className="font-body text-[13px] text-[var(--text-secondary)]"
                            >
                              {modifier.stale ? (
                                <span>
                                  {STALE_MODIFIER_OPTION_LABEL}
                                  {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                                </span>
                              ) : (
                                <>
                                  {modifier.groupName ? (
                                    <span className="block text-[var(--text-tertiary)]">
                                      {modifier.groupName}
                                    </span>
                                  ) : null}
                                  <span className="flex items-center justify-between gap-3">
                                    <span>
                                      {modifier.optionName}
                                      {modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}
                                    </span>
                                    {modifier.displayPriceDeltaPaise !== null &&
                                    modifier.displayPriceDeltaPaise !== 0 ? (
                                      <span>
                                        {formatModifierPriceDelta(
                                          modifier.displayPriceDeltaPaise * modifier.quantity,
                                        )}
                                      </span>
                                    ) : null}
                                  </span>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {presentation?.hasBundleSelections ? (
                        <p className="mt-2 font-body text-[13px] text-[var(--text-tertiary)]">
                          Bundle configuration preserved — component details appear at checkout.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {presentation ? (
                        <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">
                          {formatPaise(presentation.lineTotalPaise)}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={QTY_BUTTON_CLASS}
                          disabled={pending}
                          aria-label={`Decrease ${itemName} quantity`}
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
                          aria-label={`Increase ${itemName} quantity`}
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
                          aria-label={`Remove ${itemName} from cart`}
                          onClick={() => void changeQuantity(line.id, 0)}
                        >
                          Remove
                        </Button>
                      </div>
                      {presentation?.editEligible ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="min-h-[44px]"
                          disabled={pending}
                          aria-label={`Edit customization for ${itemName}`}
                          onClick={() => openEdit(line)}
                        >
                          Edit
                        </Button>
                      ) : null}
                    </div>
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
