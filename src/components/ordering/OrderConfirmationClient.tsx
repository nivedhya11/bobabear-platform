"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatPaise } from "@/components/ordering/format-money";
import { orderStatusLabel } from "@/components/ordering/order-status";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import { clearPaymentRecovery, getCustomerOrder, type CommerceOrderDetail } from "@/lib/customer-commerce";

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<CommerceOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/order/confirmation/"));
        return;
      }
      if (!orderId) {
        setError("Missing order.");
        setLoading(false);
        return;
      }
      clearPaymentRecovery();
      const result = await getCustomerOrder(orderId);
      if (cancelled) return;
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        setLoading(false);
        return;
      }
      setOrder(result.data.order);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[640px] px-5 py-12 md:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Boba Bear · Order
          </p>
          <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
            Order confirmed
          </h1>
        </header>

        {loading ? (
          <p className="font-body text-[15px] text-[var(--text-secondary)]">Loading your order…</p>
        ) : null}

        {error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}

        {order ? (
          <div className="flex flex-col gap-4" data-testid="order-confirmation">
            <p className="font-body text-[15px] text-[var(--text-secondary)]">
              {order.orderNumber}
            </p>
            <p data-testid="order-status" className="font-body text-[15px] text-[var(--text-primary)]">
              {orderStatusLabel(order.status)}
            </p>
            <p className="font-body text-[15px]">
              Total {formatPaise(order.money.grandTotalMinor)}
            </p>
            <Button asChild variant="primary">
              <a href={`/order/orders/detail/?orderId=${encodeURIComponent(order.orderId)}`}>
                View order
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/order/orders/">Order history</a>
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
