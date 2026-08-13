"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import { listCustomerOrders, type CommerceOrderSummary } from "@/lib/customer-commerce";

export function OrderHistoryClient() {
  const [items, setItems] = useState<readonly CommerceOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/order/orders/"));
        return;
      }
      const listed = await listCustomerOrders({ limit: 20 });
      if (cancelled) return;
      if (!listed.ok) {
        setError(commerceErrorCopy(listed.code));
        setLoading(false);
        return;
      }
      setItems(listed.data.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[720px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Orders
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Your orders
          </h1>
        </header>

        {loading ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading orders…</p>
        ) : null}

        {error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        {items && items.length === 0 ? (
          <div className="flex flex-col gap-4" data-testid="orders-empty">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              You don’t have any orders yet.
            </p>
            <Button asChild variant="primary">
              <a href="/order">Order now</a>
            </Button>
          </div>
        ) : null}

        {items && items.length > 0 ? (
          <ul className="flex flex-col gap-4" data-testid="orders-list">
            {items.map((order) => (
              <li key={order.orderId} className="border border-[var(--border-subtle)] p-4 flex flex-col gap-2">
                <a
                  href={`/order/orders/detail/?orderId=${encodeURIComponent(order.orderId)}`}
                  className="font-body text-[15px] font-semibold text-[var(--text-primary)]"
                >
                  {order.orderNumber}
                </a>
                <p className="font-body text-[13px] text-[var(--text-secondary)]">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
                </p>
                <p className="font-body text-[14px]">{formatPaise(order.money.grandTotalMinor)}</p>
                <p data-testid="order-status">{orderStatusLabel(order.status)}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
