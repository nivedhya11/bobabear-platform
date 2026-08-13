"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import { loginUrlWithReturn } from "@/lib/customer-auth/return-to";
import {
  clearPaymentRecovery,
  getPaymentState,
  listCustomerOrders,
  readPaymentRecovery,
} from "@/lib/customer-commerce";

async function waitForCustomerOrder(): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const listed = await listCustomerOrders({ limit: 5 });
    if (listed.ok && listed.data.items[0]) return listed.data.items[0].orderId;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

export function PaymentReturnClient() {
  const searchParams = useSearchParams();
  const queryPaymentId = searchParams.get("paymentId");
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        window.location.assign(loginUrlWithReturn("/order/payment/"));
        return;
      }
      const recovery = readPaymentRecovery();
      const resolved = queryPaymentId ?? recovery?.paymentId ?? null;
      if (!resolved) {
        setError("No payment to check.");
        return;
      }
      setPaymentId(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryPaymentId]);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    const poll = async () => {
      const result = await getPaymentState(paymentId);
      if (cancelled) return;
      if (!result.ok) {
        setError(commerceErrorCopy(result.code));
        return;
      }
      const state = result.data.state;
      if (state.payment?.status === "SUCCEEDED" || state.checkoutStatus === "COMPLETED") {
        const orderId = await waitForCustomerOrder();
        if (cancelled) return;
        clearPaymentRecovery();
        if (!orderId) {
          setError("Payment succeeded. Check your order history.");
          return;
        }
        window.location.assign(`/order/confirmation/?orderId=${encodeURIComponent(orderId)}`);
        return;
      }
      if (
        state.payment?.status === "EXPIRED" ||
        state.payment?.status === "CANCELLED" ||
        state.payment?.status === "SUPERSEDED"
      ) {
        setError(
          commerceErrorCopy(state.payment.status === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_TERMINAL"),
        );
        return;
      }
      if (state.attempt?.status === "FAILED" && state.payment?.status === "OPEN") {
        window.location.assign("/order/checkout/");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paymentId]);

  return (
    <main id="main-content" tabIndex={-1} className="bg-[var(--bg-page)] focus:outline-none">
      <div className="mx-auto max-w-[640px] px-5 py-12 md:py-16 flex flex-col gap-6">
        <h1 className="font-display text-[clamp(36px,8vw,56px)] leading-[0.95] text-[var(--text-primary)]">
          Payment
        </h1>
        {error ? (
          <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
            {error}
          </p>
        ) : (
          <p data-testid="payment-checking" className="font-body text-[15px] text-[var(--text-secondary)]">
            Checking payment…
          </p>
        )}
        <Button asChild variant="outline">
          <a href="/order/checkout/">Back to checkout</a>
        </Button>
      </div>
    </main>
  );
}
