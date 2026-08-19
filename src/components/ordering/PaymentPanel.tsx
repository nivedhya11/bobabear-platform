"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { snapshotPayableRows } from "@/components/ordering/checkout-snapshot-presentation";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { formatPaise } from "@/components/ordering/format-money";
import { interpretClientAction, isZeroPayableTotal } from "@/components/ordering/client-action";
import { browserNavigate } from "@/components/ordering/browser-navigate";
import {
  loadRazorpayCheckoutScript,
  openRazorpayStandardCheckout,
  parseRazorpayStandardCheckoutAction,
  RAZORPAY_STANDARD_CHECKOUT_KIND,
  type RazorpayCheckoutHandlerResponse,
} from "@/lib/razorpay";
import { SITE_NAME } from "@/lib/site";
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
  submitPaymentClientEvidence,
  type CommerceCheckout,
  type CommerceCheckoutSnapshot,
  type CommerceClientAction,
  type CommercePaymentMethodIntent,
  type CommercePaymentStartResult,
  type CommercePaymentState,
} from "@/lib/customer-commerce";

type PaymentScreen =
  | "idle"
  | "starting"
  | "loading_checkout"
  | "checkout_open"
  | "checking"
  | "retryable"
  | "checkout_load_failed"
  | "error";

type CheckingKind = "processing" | "pending" | "indeterminate" | "confirming" | "generic";

const METHOD_OPTIONS: ReadonlyArray<{ value: CommercePaymentMethodIntent; label: string }> = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "netbanking", label: "Net banking" },
];

const RAZORPAY_LOGO_SRC = "/assets/logos/boba-bear-full-logo.svg";

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

function unresolvedAttempt(state: CommercePaymentState): boolean {
  const attempt = latestAttempt(state);
  if (!attempt) return false;
  return attempt.status === "PENDING" || attempt.status === "INDETERMINATE" || attempt.status === "CREATED";
}

function checkingKindForState(state: CommercePaymentState): CheckingKind {
  const payment = state.payment;
  const attempt = latestAttempt(state);
  if (attempt?.status === "INDETERMINATE") return "indeterminate";
  if (attempt?.status === "PENDING") return "pending";
  if (payment?.status === "PROCESSING") return "processing";
  return "generic";
}

function checkingStatusCopy(kind: CheckingKind): string {
  switch (kind) {
    case "indeterminate":
      return "We're still checking your payment. Don't pay again yet.";
    case "pending":
      return "Waiting for payment confirmation. Don't pay again yet.";
    case "processing":
      return "We're confirming your payment. Don't pay again yet.";
    case "confirming":
      return "We're confirming your payment. Don't pay again yet.";
    default:
      return "Checking payment… Don't pay again yet.";
  }
}

function integrationErrorCopy(reason: "malformed" | "secret" | "unsupported"): string {
  if (reason === "secret") return "Payment checkout is misconfigured. Please try again shortly.";
  return "Payment checkout could not start. Please try again.";
}

export function PaymentPanel(props: {
  checkout: CommerceCheckout;
  snapshot: CommerceCheckoutSnapshot;
  onOrderReady: (orderId: string) => void;
}) {
  const zeroPayable = isZeroPayableTotal(props.snapshot.grandTotalPaise);
  const payableLabel = formatPaise(props.snapshot.grandTotalPaise);
  const payableRows = snapshotPayableRows(props.snapshot);

  const [screen, setScreen] = useState<PaymentScreen>("idle");
  const [checkingKind, setCheckingKind] = useState<CheckingKind>("generic");
  const [method, setMethod] = useState<CommercePaymentMethodIntent>("upi");
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [checkoutRevision, setCheckoutRevision] = useState(props.checkout.revision);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pendingCheckoutAction, setPendingCheckoutAction] = useState<CommerceClientAction | null>(null);
  const inflight = useRef(false);
  const handlerSubmitted = useRef(false);
  const finished = useRef(false);
  const payButtonRef = useRef<HTMLButtonElement>(null);

  function restorePayFocus(): void {
    queueMicrotask(() => payButtonRef.current?.focus());
  }

  async function finishWithOrder(): Promise<void> {
    finished.current = true;
    const orderId = await waitForCustomerOrder();
    if (!orderId) {
      setError("Payment confirmed. We're finishing your order — don't pay again.");
      setScreen("checking");
      setCheckingKind("generic");
      return;
    }
    props.onOrderReady(orderId);
  }

  async function applyPaymentState(
    state: CommercePaymentState,
    unresolved: "checking" | "idle" = "checking",
  ): Promise<void> {
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

    const interpreted = interpretClientAction(state.clientAction);
    if (interpreted?.kind === "redirect") {
      browserNavigate(interpreted.url);
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
    if (attempt?.status === "FAILED" && payment?.status === "OPEN" && !unresolvedAttempt(state)) {
      setScreen("retryable");
      restorePayFocus();
      return;
    }
    if (
      unresolved === "checking" &&
      (payment?.status === "PROCESSING" || unresolvedAttempt(state))
    ) {
      setCheckingKind(checkingKindForState(state));
      setScreen("checking");
      return;
    }
    setScreen(unresolved);
    if (unresolved === "idle") restorePayFocus();
  }

  useEffect(() => {
    if (screen !== "checking" || !paymentId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || finished.current) return;
      const state = await getPaymentState(paymentId);
      if (cancelled || finished.current) return;
      if (!state || !state.ok) {
        setError(commerceErrorCopy(state?.code));
        if (!state || state.code === "NETWORK_ERROR" || state.code === "INVALID_RESPONSE") return;
        setScreen("error");
        return;
      }
      await applyPaymentState(state.data.state, "checking");
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

  async function launchRazorpayCheckout(action: CommerceClientAction): Promise<void> {
    const parsed = parseRazorpayStandardCheckoutAction(action);
    if (!parsed.ok) {
      setError(integrationErrorCopy(parsed.reason === "secret" ? "secret" : "malformed"));
      setScreen("error");
      restorePayFocus();
      return;
    }

    setPendingCheckoutAction(action);
    handlerSubmitted.current = false;
    setScreen("loading_checkout");
    setError(null);
    try {
      await loadRazorpayCheckoutScript();
    } catch {
      setError("Payment checkout couldn't load. Check your connection. Don't start a new payment.");
      setScreen("checkout_load_failed");
      restorePayFocus();
      return;
    }

    setScreen("checkout_open");
    const prefillName = props.snapshot.destination?.recipientName?.trim();
    const prefillContact = props.snapshot.destination?.recipientPhone?.trim();
    openRazorpayStandardCheckout({
      action: parsed.value,
      display: {
        name: SITE_NAME,
        image: RAZORPAY_LOGO_SRC,
      },
      prefill: {
        ...(prefillName ? { name: prefillName } : {}),
        ...(prefillContact ? { contact: prefillContact } : {}),
      },
      onHandler: (evidence) => {
        void submitRazorpayHandlerEvidence(parsed.value.paymentId, evidence);
      },
      onDismiss: () => {
        void handleCheckoutDismiss(parsed.value.paymentId);
      },
      onProviderFailure: () => {
        void handleCheckoutProviderFailure(parsed.value.paymentId);
      },
    });
  }

  async function reopenPendingCheckout(): Promise<void> {
    if (!pendingCheckoutAction || inflight.current) return;
    await launchRazorpayCheckout(pendingCheckoutAction);
  }

  async function submitRazorpayHandlerEvidence(
    evidencePaymentId: string,
    evidence: RazorpayCheckoutHandlerResponse,
  ): Promise<void> {
    if (handlerSubmitted.current || inflight.current) return;
    handlerSubmitted.current = true;
    inflight.current = true;
    setError(null);
    setCheckingKind("confirming");
    setScreen("checking");
    const submitted = await submitPaymentClientEvidence({
      paymentId: evidencePaymentId,
      kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
      payload: {
        razorpay_payment_id: evidence.razorpay_payment_id,
        razorpay_order_id: evidence.razorpay_order_id,
        razorpay_signature: evidence.razorpay_signature,
      },
    });
    inflight.current = false;
    if (!submitted.ok) {
      setError(commerceErrorCopy(submitted.code));
      if (
        submitted.code === "NETWORK_ERROR" ||
        submitted.code === "INVALID_RESPONSE" ||
        submitted.code === "PAYMENT_PROVIDER_EVIDENCE_INVALID" ||
        submitted.code === "PAYMENT_PROVIDER_INDETERMINATE"
      ) {
        setCheckingKind(
          submitted.code === "PAYMENT_PROVIDER_INDETERMINATE" ? "indeterminate" : "confirming",
        );
        setScreen("checking");
        return;
      }
      setScreen("error");
      return;
    }
    await applyPaymentState(submitted.data.state, "checking");
  }

  async function handleCheckoutDismiss(currentPaymentId: string): Promise<void> {
    if (handlerSubmitted.current) return;
    setError("Payment window closed. Not confirmed.");
    const state = await getPaymentState(currentPaymentId);
    if (!state.ok) {
      setScreen("idle");
      restorePayFocus();
      return;
    }
    await applyPaymentState(state.data.state, "idle");
  }

  async function handleCheckoutProviderFailure(currentPaymentId: string): Promise<void> {
    if (handlerSubmitted.current) return;
    setError("That payment attempt did not complete. Checking status…");
    const state = await getPaymentState(currentPaymentId);
    if (!state.ok) {
      setScreen("idle");
      restorePayFocus();
      return;
    }
    await applyPaymentState(state.data.state, "idle");
  }

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

    const interpreted = interpretClientAction(result.clientAction);
    if (interpreted?.kind === "redirect") {
      browserNavigate(interpreted.url);
      return;
    }
    if (interpreted?.kind === RAZORPAY_STANDARD_CHECKOUT_KIND && result.clientAction) {
      await launchRazorpayCheckout(result.clientAction);
      return;
    }

    if (result.attempt.status === "FAILED" && result.payment.status === "OPEN") {
      setScreen("retryable");
      restorePayFocus();
      return;
    }

    setCheckingKind(checkingKindForState({
      payment: result.payment,
      attempt: result.attempt,
      attempts: [result.attempt],
      checkoutId: result.checkoutId,
      checkoutStatus: "PAYMENT_PENDING",
      checkoutRevision: result.checkoutRevision,
      zeroPayableCompleted: false,
      clientAction: result.clientAction,
    }));
    setScreen("checking");
  }

  async function handleStart(): Promise<void> {
    if (
      inflight.current ||
      screen === "starting" ||
      screen === "checking" ||
      screen === "checkout_open" ||
      screen === "loading_checkout"
    ) {
      return;
    }
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
        setCheckingKind("processing");
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

  const payBlocked =
    screen === "starting" ||
    screen === "checking" ||
    screen === "loading_checkout" ||
    screen === "checkout_open";

  const statusMessage =
    screen === "loading_checkout"
      ? "Opening secure payment…"
      : screen === "checkout_open"
        ? "Complete payment in the checkout window. Don't start another payment."
        : screen === "checking"
          ? checkingStatusCopy(checkingKind)
          : screen === "starting"
            ? zeroPayable
              ? "Completing order…"
              : "Starting payment…"
            : null;

  return (
    <div className="flex flex-col gap-4" data-testid="checkout-payment">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--interactive-secondary)]">
        {zeroPayable ? "No payment required" : "Pay for your order"}
      </p>
      <dl className="grid grid-cols-2 gap-2 font-body text-[14px]" data-testid="checkout-fee-breakdown">
        {payableRows.map((row) => (
          <div key={row.key} className="contents">
            <dt className={row.key === "total" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-tertiary)]"}>
              {row.label}
            </dt>
            <dd className={row.key === "total" ? "font-bold" : undefined}>{formatPaise(row.amountPaise)}</dd>
          </div>
        ))}
      </dl>

      {error ? (
        <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          role="status"
          aria-live="polite"
          data-testid={
            screen === "loading_checkout"
              ? "payment-loading-checkout"
              : screen === "checkout_open"
                ? "payment-checkout-open"
                : screen === "checking"
                  ? "payment-checking"
                  : "payment-starting"
          }
          className="font-body text-[15px] text-[var(--text-secondary)]"
        >
          {statusMessage}
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

      {screen === "checkout_load_failed" && pendingCheckoutAction ? (
        <Button
          ref={payButtonRef}
          type="button"
          variant="primary"
          size="lg"
          data-testid="payment-reopen-checkout"
          className="min-h-[44px]"
          onClick={() => void reopenPendingCheckout()}
        >
          Retry opening checkout
        </Button>
      ) : null}

      {zeroPayable ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="min-h-[44px]"
          disabled={screen === "starting" || screen === "checking"}
          onClick={() => void handleZeroPayable()}
        >
          {screen === "starting" ? "Completing…" : "Complete order"}
        </Button>
      ) : screen === "retryable" ? (
        <Button
          ref={payButtonRef}
          type="button"
          variant="primary"
          size="lg"
          data-testid="payment-retry"
          className="min-h-[44px]"
          aria-label={`Try payment again for ${payableLabel}`}
          onClick={() => void handleRetry()}
        >
          Try payment again · {payableLabel}
        </Button>
      ) : screen !== "checkout_load_failed" ? (
        <Button
          ref={payButtonRef}
          type="button"
          variant="primary"
          size="lg"
          data-testid="payment-start"
          className="min-h-[44px]"
          disabled={payBlocked}
          aria-label={`Pay ${payableLabel}`}
          onClick={() => void handleStart()}
        >
          {screen === "starting" || screen === "loading_checkout"
            ? "Starting…"
            : `Pay ${payableLabel}`}
        </Button>
      ) : null}

      <Button asChild variant="outline" className="min-h-[44px]">
        <a href="/order/cart/">Back to cart</a>
      </Button>
    </div>
  );
}
