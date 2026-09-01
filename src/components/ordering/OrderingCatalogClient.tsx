"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CartLineList } from "@/components/ordering/CartLineList";
import { CartSummary } from "@/components/ordering/CartSummary";
import { DeliverToOrientation } from "@/components/ordering/DeliverToOrientation";
import { MenuItemCustomizationDialog } from "@/components/ordering/MenuItemCustomizationDialog";
import { MenuItemRow } from "@/components/ordering/MenuItemRow";
import { StickyCartBar } from "@/components/ordering/StickyCartBar";
import {
  buildCartLinePresentations,
  buildCustomerMenuLookups,
  cartBundleSelectionsToInput,
  cartModifiersToInput,
  cartUnitCount,
  resolveCartPresentationEstimate,
} from "@/components/ordering/cart-presentation";
import { publishCartCount } from "@/components/ordering/cart-count-sync";
import {
  readDeliveryContext,
  subscribeToDeliveryContext,
  type DeliveryContext,
} from "@/lib/customer-location/delivery-context";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { cartEvaluationCustomerCopy } from "@/components/ordering/serviceability-copy";
import {
  addCartLine,
  clearCart,
  decrementLatestCartVariant,
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
import type { CartModifierSelectionInput } from "@/shared/cart/types";
import type { CustomerMenuItem, CustomerMenuProjection } from "@/shared/customer-menu/types";

type EditTarget = Readonly<{
  line: CommerceCartLine;
  item: CustomerMenuItem;
}>;

export function OrderingCatalogClient(props: { brandId: string }) {
  const { brandId } = props;
  const [menu, setMenu] = useState<CustomerMenuProjection | null>(null);
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [evaluation, setEvaluation] = useState<CommerceCartEvaluation | null>(null);
  const [deliveryContext, setDeliveryContext] = useState<DeliveryContext>(() => readDeliveryContext());
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customizingItem, setCustomizingItem] = useState<CustomerMenuItem | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const menuLookups = useMemo(
    () => (menu ? buildCustomerMenuLookups(menu) : null),
    [menu],
  );

  const refreshEvaluation = useCallback(
    async (context: DeliveryContext, currentCart: CommerceCart | null) => {
      if (!currentCart || currentCart.lines.length === 0 || !context.coordinates) {
        setEvaluation(null);
        return;
      }
      const evaluated = await evaluateCart({
        brandId,
        location: {
          coordinates: context.coordinates,
          ...(context.postalCode.length === 6 ? { postalCode: context.postalCode } : {}),
        },
      });
      if (evaluated.ok) setEvaluation(evaluated.data);
      else setEvaluation(null);
    },
    [brandId],
  );

  const refreshCart = useCallback(async () => {
    const result = await getActiveCart(brandId, { guestToken: true });
    if (!result.ok) {
      if (result.code === "CART_EXPIRED" || result.code === "CART_NOT_FOUND") {
        setCart(null);
        setEvaluation(null);
        setError(commerceErrorCopy(result.code));
        return;
      }
      if (result.code === "NETWORK_ERROR") {
        setCart(null);
        return;
      }
      setError(commerceErrorCopy(result.code));
      return;
    }
    setCart(result.data.cart);
    setError(null);
    await refreshEvaluation(deliveryContext, result.data.cart);
  }, [brandId, deliveryContext, refreshEvaluation]);

  const refreshMenu = useCallback(async () => {
    const result = await getCustomerMenu({ brandId });
    if (!result.ok) {
      setMenu(null);
      setError(commerceErrorCopy(result.code));
      return false;
    }
    setMenu(result.data.menu);
    setError(null);
    return true;
  }, [brandId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([refreshMenu(), refreshCart()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCart, refreshMenu]);

  const groups = useMemo(() => {
    if (!menu) return [];
    const sectionsById = new Map(menu.sections.map((section) => [section.id, section]));
    const itemsBySection = new Map<string, CustomerMenuItem[]>();
    for (const item of menu.items) {
      const list = itemsBySection.get(item.sectionId) ?? [];
      list.push(item);
      itemsBySection.set(item.sectionId, list);
    }

    return menu.sections
      .filter((section) => section.parentSectionId === null)
      .sort((a, b) => a.position - b.position)
      .map((root) => {
        const childSections = menu.sections
          .filter((section) => section.parentSectionId === root.id)
          .sort((a, b) => a.position - b.position);
        const subcategories =
          childSections.length > 0
            ? childSections.map((child) => ({
                id: child.id,
                name: child.name,
                items: [...(itemsBySection.get(child.id) ?? [])],
              }))
            : [
                {
                  id: root.id,
                  name: sectionsById.get(root.id)?.name ?? root.name,
                  items: [...(itemsBySection.get(root.id) ?? [])],
                },
              ];
        return {
          id: root.id,
          name: root.name,
          subcategories: subcategories.filter((sub) => sub.items.length > 0),
        };
      })
      .filter((group) => group.subcategories.length > 0);
  }, [menu]);

  const categoryNav = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    [groups],
  );

  const activeCategoryId =
    selectedCategoryId && categoryNav.some((category) => category.id === selectedCategoryId)
      ? selectedCategoryId
      : (categoryNav[0]?.id ?? null);
  const selectedGroup = groups.find((group) => group.id === activeCategoryId) ?? null;

  useEffect(() => {
    return subscribeToDeliveryContext((nextContext) => {
      setDeliveryContext(nextContext);
      void refreshEvaluation(nextContext, cart);
    });
  }, [cart, refreshEvaluation]);

  async function updateCartFromMutation(nextCart: CommerceCart): Promise<void> {
    setCart(nextCart);
    publishCartCount(cartUnitCount(nextCart));
    await refreshEvaluation(deliveryContext, nextCart);
  }

  const quantityByVariant = useMemo(() => {
    const map = new Map<string, { lineId: string; quantity: number }>();
    for (const line of cart?.lines ?? []) {
      // Simple quantity controls only for non-configured lines.
      if (line.modifiers.length > 0 || line.bundleSelections.length > 0) continue;
      map.set(line.variantId, { lineId: line.id, quantity: line.quantity });
    }
    return map;
  }, [cart]);

  const aggregateQuantityByVariant = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const line of cart?.lines ?? []) {
      quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
    }
    return quantities;
  }, [cart]);

  const linePresentations = useMemo(
    () =>
      buildCartLinePresentations(
        cart,
        menuLookups ?? buildCustomerMenuLookups(emptyMenu(brandId)),
      ),
    [cart, menuLookups, brandId],
  );

  const presentationEstimate = useMemo(
    () =>
      resolveCartPresentationEstimate(
        cart,
        menuLookups ?? buildCustomerMenuLookups(emptyMenu(brandId)),
      ),
    [cart, menuLookups, brandId],
  );

  const lineCount = cartUnitCount(cart);
  const serviceabilityNote = cartEvaluationCustomerCopy(evaluation, Boolean(deliveryContext.coordinates));

  async function withPending(key: string, work: () => Promise<void>): Promise<void> {
    if (pendingKey) return;
    setPendingKey(key);
    setError(null);
    try {
      await work();
    } finally {
      setPendingKey(null);
    }
  }

  async function addItem(item: CustomerMenuItem): Promise<void> {
    await withPending(item.variantId, async () => {
      const existing = quantityByVariant.get(item.variantId);
      if (existing && cart) {
        const result = await setCartLineQuantity({
          brandId,
          cartLineId: existing.lineId,
          quantity: existing.quantity + 1,
          expectedRevision: cart.revision,
        });
        if (!result.ok) {
          setError(commerceErrorCopy(result.code));
          return;
        }
        await updateCartFromMutation(result.data.cart);
        return;
      }
      const result = await addCartLine({
        brandId,
        variantId: item.variantId,
        quantity: 1,
        expectedRevision: cart?.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await updateCartFromMutation(result.data.cart);
    });
  }

  async function changeLiveCartQuantity(lineId: string, quantity: number): Promise<void> {
    if (!cart) return;
    await withPending(`line:${lineId}`, async () => {
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
        await updateCartFromMutation(result.data.cart);
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
      await updateCartFromMutation(result.data.cart);
    });
  }

  async function decrementItem(item: CustomerMenuItem): Promise<void> {
    if (!cart) return;
    await withPending(`decrement:${item.variantId}`, async () => {
      const result = await decrementLatestCartVariant({
        brandId,
        variantId: item.variantId,
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await updateCartFromMutation(result.data.cart);
    });
  }

  async function handleClearLiveCart(): Promise<void> {
    if (!cart) return;
    await withPending("clear", async () => {
      const result = await clearCart({
        brandId,
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await updateCartFromMutation(result.data.cart);
      setEvaluation(null);
    });
  }

  async function addConfiguredItem(
    modifiers: Parameters<typeof addCartLine>[0]["modifiers"],
  ): Promise<void> {
    if (!customizingItem || pendingKey) return;
    const item = customizingItem;
    setPendingKey(`customize:${item.variantId}`);
    setError(null);
    try {
      const result = await addCartLine({
        brandId,
        variantId: item.variantId,
        quantity: 1,
        modifiers,
        expectedRevision: cart?.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      await updateCartFromMutation(result.data.cart);
      setCustomizingItem(null);
    } finally {
      setPendingKey(null);
    }
  }

  function openLiveCartEdit(lineId: string): void {
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

  async function saveLiveCartEdit(
    modifiers: readonly CartModifierSelectionInput[],
  ): Promise<void> {
    if (!editTarget || !cart || pendingKey) return;
    setPendingKey(`edit:${editTarget.line.id}`);
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
      await updateCartFromMutation(result.data.cart);
      setEditTarget(null);
    } finally {
      setPendingKey(null);
    }
  }

  function renderCategoryNav(variant: "horizontal" | "vertical") {
    if (categoryNav.length === 0) return null;
    const isVertical = variant === "vertical";
    return (
      <nav
        aria-label="Menu categories"
        data-testid={isVertical ? "desktop-category-rail" : "menu-category-nav"}
        className={
          isVertical
            ? "sticky top-20 self-start rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-2 shadow-[0_10px_28px_rgba(0,0,0,0.12)]"
            : "sticky top-14 z-20 -mx-5 px-5 py-2 bg-[var(--bg-page)]/95 backdrop-blur-[10px] border-b border-[var(--border-default)] xl:hidden"
        }
      >
        <ul
          className={
            isVertical
              ? "flex flex-col gap-1"
              : "flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
          }
          role="list"
        >
          {categoryNav.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <li key={category.id} className={isVertical ? undefined : "shrink-0 snap-start"}>
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={
                    isVertical
                      ? `block w-full rounded-lg px-3 py-2.5 text-left font-body font-semibold text-[13px] ${
                          isActive
                            ? "bg-[var(--interactive-primary)] text-[var(--text-on-primary)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--interactive-ghost-hover)]"
                        }`
                      : `inline-flex min-h-[44px] items-center rounded-full border px-4 font-body text-[13px] whitespace-nowrap ${
                          isActive
                            ? "border-[var(--interactive-primary)] bg-[var(--interactive-primary)] text-[var(--text-on-primary)]"
                            : "border-[var(--border-default)] bg-[var(--bg-section)] text-[var(--text-primary)]"
                        }`
                  }
                >
                  {category.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
        <div className="mx-auto max-w-[1100px] px-5 py-12 md:py-16">
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading menu…</p>
        </div>
      </main>
    );
  }

  if (!menu) {
    return (
      <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
        <div className="mx-auto max-w-[1100px] px-5 py-12 md:py-16">
          <p role="status" className="font-body text-[15px] text-[var(--text-secondary)]">
            {error ?? "Menu is unavailable right now."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div
        data-testid="desktop-ordering-shell"
        className="mx-auto max-w-[1620px] px-5 md:px-8 py-6 md:py-8 flex flex-col gap-4 pb-[calc(7rem+env(safe-area-inset-bottom))] xl:pb-12"
      >
        <DeliverToOrientation serviceabilityNote={serviceabilityNote} />

        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between xl:col-span-3">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[clamp(40px,5vw,58px)] uppercase leading-[0.9] tracking-wide text-[var(--text-primary)]">
              {selectedGroup?.name ?? "Menu"}
            </h1>
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              Crafted fresh and ready when you are.
            </p>
          </div>
        </header>

        {renderCategoryNav("horizontal")}

        {error ? (
          <p role="status" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        <div className="xl:grid xl:grid-cols-[12rem_minmax(0,1fr)_25rem] xl:gap-6 xl:items-start">
          <aside className="hidden xl:block">{renderCategoryNav("vertical")}</aside>

          <div data-testid="desktop-menu" className="flex flex-col gap-6 min-w-0">
            {selectedGroup ? (
              <section
                key={selectedGroup.id}
                aria-label={selectedGroup.name}
                className="flex flex-col gap-4"
              >
                {selectedGroup.subcategories.map((sub) => (
                  <div key={sub.id} className="flex flex-col gap-3">
                    {selectedGroup.subcategories.length > 1 ||
                    sub.name !== selectedGroup.name ? (
                      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                        {sub.name}
                      </h2>
                    ) : null}
                    <ul
                      className="flex flex-col gap-3 xl:grid xl:grid-cols-3 xl:gap-3"
                      role="list"
                    >
                      {sub.items.map((item) => {
                        const busy =
                          pendingKey === item.variantId ||
                          pendingKey === `decrement:${item.variantId}`;
                        return (
                          <MenuItemRow
                            key={`${item.productId}-${item.variantId}`}
                            item={item}
                            layout="responsive"
                            busy={busy}
                            quantity={aggregateQuantityByVariant.get(item.variantId) ?? 0}
                            onAdd={(next) => void addItem(next)}
                            onDecrement={(next) => void decrementItem(next)}
                            onCustomize={setCustomizingItem}
                          />
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            ) : null}
          </div>

          <aside
            data-testid="desktop-live-cart"
            className="hidden xl:flex sticky top-20 self-start h-[calc(100vh-20rem)] min-h-[28rem] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] shadow-[0_14px_36px_rgba(0,0,0,0.2)]"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-default)] px-4 py-3">
                <h2 className="font-display text-[24px] uppercase tracking-wide text-[var(--text-primary)]">
                  Your cart
                </h2>
                {lineCount > 0 ? (
                  <button
                    type="button"
                    disabled={pendingKey !== null}
                    onClick={() => void handleClearLiveCart()}
                    className="font-body text-[13px] font-semibold text-[var(--interactive-secondary)] underline-offset-2 hover:underline focus-ring"
                  >
                    Clear cart
                  </button>
                ) : null}
              </div>
              {lineCount === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-12 text-center">
                  <span aria-hidden="true" className="text-[44px] opacity-40">♧</span>
                  <p className="font-body text-[15px] font-semibold text-[var(--text-secondary)]">Your cart is empty</p>
                  <p className="font-body text-[13px] text-[var(--text-tertiary)]">Add something from the menu.</p>
                </div>
              ) : (
                <>
                  <div data-testid="desktop-cart-items" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                    <CartLineList
                      lines={linePresentations}
                      pending={pendingKey !== null}
                      compact
                      onChangeQuantity={(lineId, quantity) =>
                        void changeLiveCartQuantity(lineId, quantity)
                      }
                      onEdit={openLiveCartEdit}
                    />
                  </div>
                  <div
                    data-testid="desktop-cart-footer"
                    className="shrink-0 border-t border-[var(--border-default)] bg-[var(--bg-section)] px-4 py-3"
                  >
                    <CartSummary
                      estimate={presentationEstimate}
                      itemCount={lineCount}
                      showCheckoutLink
                      showViewCartLink
                      compact
                    />
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      <StickyCartBar
        itemCount={lineCount}
        estimate={presentationEstimate}
      />
      {customizingItem ? (
        <MenuItemCustomizationDialog
          item={customizingItem}
          pending={pendingKey !== null}
          error={error}
          onClose={() => {
            if (!pendingKey) {
              setCustomizingItem(null);
              setError(null);
            }
          }}
          onAdd={(modifiers) => void addConfiguredItem(modifiers)}
        />
      ) : null}
      {editTarget ? (
        <MenuItemCustomizationDialog
          item={editTarget.item}
          mode="edit"
          initialModifiers={cartModifiersToInput(editTarget.line.modifiers)}
          pending={pendingKey !== null}
          error={dialogError}
          onClose={() => {
            if (!pendingKey) {
              setEditTarget(null);
              setDialogError(null);
            }
          }}
          onSave={(modifiers) => void saveLiveCartEdit(modifiers)}
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
