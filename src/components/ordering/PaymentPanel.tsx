"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatPaise } from "@/components/ordering/format-money";
import { isZeroPayableTotal, redirectUrlFromClientAction } from "@/components/ordering/client-action";
import { browserNavigate } from "@/components/ordering/browser-navigate";
import {
  completeZeroPayableCheckout,
  getPaymentState,
  listCustomerOrders,
  readOrCreateRetryIdempotencyKey,
  readOrCreateStartIdempotencyKey,
  readOrCreateZeroPayableIdempotencyKey,
  rememberPaymentRecovery,
  retryPayment,
  startPayment,
  type CommerceCheckout,
  type CommerceCheckoutSnapshot,
  type CommercePaymentMethodIntent,
  type CommercePaymentStartResult,
  type CommercePaymentState,
} from "@/lib/customer-commerce";

type PaymentScreen = "idle" | "starting" | "checking" | "retryable" | "error";

const METHOD_OPTIONS: ReadonlyArray<{ value: CommercePaymentMethodIntent; label: string }> = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "netbanking", label: "Net banking" },
];

async function waitForCustomerOrder(): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const listed = await listCustomerOrders({ limit: 5 });
    if (listed.ok && listed.data.items[0]) return listed.data.items[0].orderId;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

function latestAttempt(state: CommercePaymentState) {
  return state.attempt ?? state.attempts[state.attempts.length - 1] ?? null;
}

export function PaymentPanel(props: {
  checkout: CommerceCheckout;
  snapshot: CommerceCheckoutSnapshot;
  onOrderReady: (orderId: string) => void;
}) {
  const zeroPayable = isZeroPayableTotal(props.snapshot.grandTotalPaise);
  const [screen, setScreen] = useState<PaymentScreen>("idle");
  const [method, setMethod] = useState<CommercePaymentMethodIntent>("upi");
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [checkoutRevision, setCheckoutRevision] = useState(props.checkout.revision);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const inflight = useRef(false);

  async function finishWithOrder(): Promise<void> {
    const orderId = await waitForCustomerOrder();
    if (!orderId) {
      setError("Payment succeeded. Your order is being confirmed — check order history shortly.");
      setScreen("error");
      return;
    }
    props.onOrderReady(orderId);
  }

  async function applyPaymentState(state: CommercePaymentState): Promise<void> {
    const payment = state.payment;
    const attempt = latestAttempt(state);
    if (payment) {
      setPaymentId(payment.id);
      setCheckoutRevision(state.checkoutRevision);
      if (attempt) setAttemptId(attempt.id);
      rememberPaymentRecovery({
        paymentId: payment.id,
        checkoutId: state.checkoutId,
        checkoutRevision: state.checkoutRevision,
      });
    }

    const redirectUrl = redirectUrlFromClientAction(state.clientAction);
    if (redirectUrl) {
      browserNavigate(redirectUrl);
      return;
    }

    if (payment?.status === "SUCCEEDED" || state.checkoutStatus === "COMPLETED") {
      await finishWithOrder();
      return;
    }
    if (
      payment?.status === "EXPIRED" ||
      payment?.status === "CANCELLED" ||
      payment?.status === "SUPERSEDED"
    ) {
      setError(
        commerceErrorCopy(payment.status === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_TERMINAL"),
      );
      setScreen("error");
      return;
    }
    if (attempt?.status === "FAILED" && payment?.status === "OPEN") {
      setScreen("retryable");
      return;
    }
    setScreen("checking");
  }

  useEffect(() => {
    if (screen !== "checking" || !paymentId) return;
    let cancelled = false;
    const tick = async () => {
      const state = await getPaymentState(paymentId);
      if (cancelled) return;
      if (!state.ok) {
        setError(commerceErrorCopy(state.code));
        if (state.code === "NETWORK_ERROR" || state.code === "INVALID_RESPONSE") return;
        setScreen("error");
        return;
      }
      await applyPaymentState(state.data.state);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // applyPaymentState closes over current setters; poll key is paymentId/screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, paymentId]);

  async function applyStartResult(result: CommercePaymentStartResult): Promise<void> {
    setPaymentId(result.payment.id);
    setCheckoutRevision(result.checkoutRevision);
    setAttemptId(result.attempt.id);
    rememberPaymentRecovery({
      paymentId: result.payment.id,
      checkoutId: result.checkoutId,
      checkoutRevision: result.checkoutRevision,
    });

    if (result.payment.status === "SUCCEEDED") {
      await finishWithOrder();
      return;
    }
    if (
      result.payment.status === "EXPIRED" ||
      result.payment.status === "CANCELLED" ||
      result.payment.status === "SUPERSEDED"
    ) {
      setError(
        commerceErrorCopy(result.payment.status === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_TERMINAL"),
      );
      setScreen("error");
      return;
    }

    const redirectUrl = redirectUrlFromClientAction(result.clientAction);
    if (redirectUrl) {
      browserNavigate(redirectUrl);
      return;
    }

    if (result.attempt.status === "FAILED" && result.payment.status === "OPEN") {
      setScreen("retryable");
      return;
    }

    setScreen("checking");
  }

  async function handleStart(): Promise<void> {
    if (inflight.current || screen === "starting" || screen === "checking") return;
    inflight.current = true;
    setError(null);
    setScreen("starting");
    const idempotencyKey = readOrCreateStartIdempotencyKey({
      checkoutId: props.checkout.id,
      checkoutRevision,
      paymentMethodIntent: method,
    });
    const started = await startPayment({
      checkoutId: props.checkout.id,
      expectedCheckoutRevision: checkoutRevision,
      paymentMethodIntent: method,
      idempotencyKey,
    });
    inflight.current = false;
    if (!started.ok) {
      setError(commerceErrorCopy(started.code));
      if (started.code === "NETWORK_ERROR" || started.code === "INVALID_RESPONSE") {
        setScreen("idle");
        return;
      }
      if (started.code === "PAYMENT_ALREADY_PROCESSING" && paymentId) {
        setScreen("checking");
        return;
      }
      setScreen("error");
      return;
    }
    await applyStartResult(started.data);
  }

  async function handleRetry(): Promise<void> {
    if (inflight.current || !paymentId || !attemptId) return;
    inflight.current = true;
    setError(null);
    setScreen("starting");
    const idempotencyKey = readOrCreateRetryIdempotencyKey({
      paymentId,
      attemptId,
      checkoutRevision,
      paymentMethodIntent: method,
    });
    const retried = await retryPayment({
      paymentId,
      expectedCheckoutRevision: checkoutRevision,
      paymentMethodIntent: method,
      idempotencyKey,
    });
    inflight.current = false;
    if (!retried.ok) {
      setError(commerceErrorCopy(retried.code));
      if (retried.code === "NETWORK_ERROR" || retried.code === "INVALID_RESPONSE") {
        setScreen("retryable");
        return;
      }
      setScreen("error");
      return;
    }
    await applyStartResult(retried.data);
  }

  async function handleZeroPayable(): Promise<void> {
    if (inflight.current) return;
    inflight.current = true;
    setError(null);
    setScreen("starting");
    const idempotencyKey = readOrCreateZeroPayableIdempotencyKey({
      checkoutId: props.checkout.id,
      checkoutRevision,
    });
    const completed = await completeZeroPayableCheckout({
      checkoutId: props.checkout.id,
      expectedCheckoutRevision: checkoutRevision,
      idempotencyKey,
    });
    inflight.current = false;
    if (!completed.ok) {
      setError(commerceErrorCopy(completed.code));
      if (completed.code === "NETWORK_ERROR" || completed.code === "INVALID_RESPONSE") {
        setScreen("idle");
        return;
      }
      setScreen("error");
      return;
    }
    await finishWithOrder();
  }

  return (
    <div className="flex flex-col gap-4" data-testid="checkout-payment">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--interactive-secondary)]">
        {zeroPayable ? "No payment required" : "Pay for your order"}
      </p>
      <dl className="grid grid-cols-2 gap-2 font-body text-[14px]">
        <dt className="text-[var(--text-tertiary)]">Subtotal</dt>
        <dd>{formatPaise(props.snapshot.prePromotionSubtotalPaise)}</dd>
        <dt className="text-[var(--text-tertiary)]">Discount</dt>
        <dd>{formatPaise(props.snapshot.promotionDiscountPaise)}</dd>
        <dt className="text-[var(--text-tertiary)]">Tax</dt>
        <dd>{formatPaise(props.snapshot.taxPaise)}</dd>
        <dt className="text-[var(--text-tertiary)]">Total payable</dt>
        <dd className="font-bold">{formatPaise(props.snapshot.grandTotalPaise)}</dd>
      </dl>

      {error ? (
        <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
          {error}
        </p>
      ) : null}

      {screen === "checking" ? (
        <p data-testid="payment-checking" className="font-body text-[15px] text-[var(--text-secondary)]">
          Checking payment…
        </p>
      ) : null}

      {screen === "starting" ? (
        <p data-testid="payment-starting" className="font-body text-[15px] text-[var(--text-secondary)]">
          {zeroPayable ? "Completing order…" : "Starting payment…"}
        </p>
      ) : null}

      {!zeroPayable && (screen === "idle" || screen === "retryable" || screen === "error") ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-[13px] font-semibold text-[var(--text-primary)]">
            Payment method
          </legend>
          {METHOD_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 font-body text-[14px]">
              <input
                type="radio"
                name="paymentMethod"
                value={option.value}
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
                disabled={screen === "retryable"}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      {zeroPayable ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={screen === "starting" || screen === "checking"}
          onClick={() => void handleZeroPayable()}
        >
          {screen === "starting" ? "Completing…" : "Complete order"}
        </Button>
      ) : screen === "retryable" ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          data-testid="payment-retry"
          onClick={() => void handleRetry()}
        >
          Try payment again
        </Button>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="lg"
          data-testid="payment-start"
          disabled={screen === "starting" || screen === "checking"}
          onClick={() => void handleStart()}
        >
          {screen === "starting" ? "Starting…" : "Pay now"}
        </Button>
      )}

      <Button asChild variant="outline">
        <a href="/order/cart/">Back to cart</a>
      </Button>
    </div>
  );
}
