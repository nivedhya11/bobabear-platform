"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  addCartLine,
  getActiveCart,
  removeCartLine,
  setCartLineQuantity,
  type CommerceCart,
} from "@/lib/customer-commerce";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatRupees } from "@/components/ordering/format-money";
import type { OrderingCatalog, OrderingCatalogItem } from "@/shared/ordering-catalog";

export function OrderingCatalogClient(props: { catalog: OrderingCatalog }) {
  const { catalog } = props;
  const [cart, setCart] = useState<CommerceCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    const result = await getActiveCart(catalog.brandId, { guestToken: true });
    if (!result.ok) {
      if (result.code === "CART_EXPIRED" || result.code === "CART_NOT_FOUND") {
        setCart(null);
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
  }, [catalog.brandId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshCart();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCart]);

  const quantityByVariant = useMemo(() => {
    const map = new Map<string, { lineId: string; quantity: number }>();
    for (const line of cart?.lines ?? []) {
      map.set(line.variantId, { lineId: line.id, quantity: line.quantity });
    }
    return map;
  }, [cart]);

  const lineCount = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

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

  async function addItem(item: OrderingCatalogItem): Promise<void> {
    await withPending(item.variantId, async () => {
      const existing = quantityByVariant.get(item.variantId);
      if (existing && cart) {
        const result = await setCartLineQuantity({
          brandId: catalog.brandId,
          cartLineId: existing.lineId,
          quantity: existing.quantity + 1,
          expectedRevision: cart.revision,
        });
        if (!result.ok) {
          setError(commerceErrorCopy(result.code));
          return;
        }
        setCart(result.data.cart);
        return;
      }
      const result = await addCartLine({
        brandId: catalog.brandId,
        variantId: item.variantId,
        quantity: 1,
        expectedRevision: cart?.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      setCart(result.data.cart);
    });
  }

  async function decrementItem(item: OrderingCatalogItem): Promise<void> {
    const existing = quantityByVariant.get(item.variantId);
    if (!existing || !cart) return;
    await withPending(item.variantId, async () => {
      if (existing.quantity <= 1) {
        const result = await removeCartLine({
          brandId: catalog.brandId,
          cartLineId: existing.lineId,
          expectedRevision: cart.revision,
        });
        if (!result.ok) {
          setError(commerceErrorCopy(result.code));
          return;
        }
        setCart(result.data.cart);
        return;
      }
      const result = await setCartLineQuantity({
        brandId: catalog.brandId,
        cartLineId: existing.lineId,
        quantity: existing.quantity - 1,
        expectedRevision: cart.revision,
      });
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      setCart(result.data.cart);
    });
  }

  const groups = useMemo(() => {
    const byCategory = new Map<string, Map<string, OrderingCatalogItem[]>>();
    for (const item of catalog.items) {
      let subs = byCategory.get(item.categorySlug);
      if (!subs) {
        subs = new Map();
        byCategory.set(item.categorySlug, subs);
      }
      const list = subs.get(item.subcategoryName) ?? [];
      list.push(item);
      subs.set(item.subcategoryName, list);
    }
    return catalog.sections
      .filter((section) => section.parentSectionId === null)
      .sort((a, b) => a.position - b.position)
      .map((root) => {
        const slug = root.sourceKey.replace(/^category:/, "");
        const subs = byCategory.get(slug);
        if (!subs) return null;
        return {
          id: root.id,
          name: root.name,
          slug,
          subcategories: [...subs.entries()].map(([name, items]) => ({
            name,
            items: [...items].sort((a, b) => a.position - b.position),
          })),
        };
      })
      .filter((group) => group !== null);
  }, [catalog]);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[1100px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Boba Bear · Owned ordering
            </p>
            <h1 className="font-display text-[clamp(36px,8vw,64px)] leading-[0.95] text-[var(--text-primary)]">
              Order with Boba Bear
            </h1>
            <p className="font-body text-[15px] text-[var(--text-secondary)] max-w-[40rem]">
              Add items to your cart. Prices below are for discovery — checkout uses the
              server-authoritative total.
            </p>
          </div>
          <Button asChild variant="primary" size="lg">
            <a href="/order/cart/">Cart{loading ? "" : ` · ${lineCount}`}</a>
          </Button>
        </header>

        {error ? (
          <p role="status" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`cat-${group.slug}`} className="flex flex-col gap-5">
            <h2 id={`cat-${group.slug}`} className="font-display text-[32px] text-[var(--text-primary)]">
              {group.name}
            </h2>
            {group.subcategories.map((sub) => (
              <div key={`${group.slug}-${sub.name}`} className="flex flex-col gap-3">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {sub.name}
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list">
                  {sub.items.map((item) => {
                    const inCart = quantityByVariant.get(item.variantId);
                    const busy = pendingKey === item.variantId;
                    return (
                      <li
                        key={item.sourceKey}
                        className="border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex gap-4"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imagePath} alt="" className="h-20 w-20 object-cover shrink-0" />
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-display text-[20px] leading-tight text-[var(--text-primary)]">
                              {item.name}
                            </h4>
                            <span className="font-body font-bold text-[14px] text-[var(--interactive-secondary)] shrink-0">
                              {formatRupees(item.presentationPriceRupees)}
                            </span>
                          </div>
                          <p className="font-heading text-[13px] text-[var(--text-secondary)] line-clamp-2">
                            {item.description}
                          </p>
                          {inCart ? (
                            <div className="flex items-center gap-2 mt-auto">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                aria-label={`Decrease ${item.name}`}
                                onClick={() => void decrementItem(item)}
                              >
                                −
                              </Button>
                              <span className="font-mono text-[13px] min-w-[1.5rem] text-center">
                                {inCart.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={busy}
                                aria-label={`Increase ${item.name}`}
                                onClick={() => void addItem(item)}
                              >
                                +
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="self-start mt-auto"
                              disabled={busy}
                              onClick={() => void addItem(item)}
                            >
                              {busy ? "Adding…" : "Add to cart"}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
