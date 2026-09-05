"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatPaise } from "@/components/ordering/format-money";
import {
  bindPendingRefundCommand,
  buildPendingRefundCommandFacts,
  clearPendingRefundCommand,
  findPendingRefundInList,
  isAmbiguousRefundTransportFailure,
  markPendingRefundCommandAmbiguous,
  readPendingRefundCommand,
} from "@/lib/operations/pending-refund-command";
import { parseOperatorRefundAmountInrToPaise } from "@/lib/operations/refund-amount";
import {
  createOrderRefund,
  getOrderRefunds,
  refundStatusLabel,
  type OperationsRefundBalance,
  type OperationsRefundItem,
} from "@/lib/operations/refunds";

type PanelState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "hidden" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      balance: OperationsRefundBalance;
      refunds: readonly OperationsRefundItem[];
      paymentStatus: string;
    }>;

function errorMessage(code: string): string {
  if (code === "WORKFORCE_AUTH_REQUIRED") return "Sign in with your workforce account to continue.";
  if (code === "REFUND_UNAUTHORIZED" || code === "REFUND_NOT_FOUND") {
    return "Refund support is not available for this order.";
  }
  if (code === "REFUND_IDEMPOTENCY_CONFLICT") {
    return "This refund request conflicts with an earlier submission. Start a new refund if needed.";
  }
  if (code === "REFUND_AMOUNT_EXCEEDS_REMAINING" || code === "REFUND_FULLY_REFUNDED") {
    return "The refund amount is not available against the remaining balance.";
  }
  if (code === "REFUND_INVALID_INPUT" || code === "REFUND_REASON_REQUIRED") {
    return "Check the refund amount and reason, then try again.";
  }
  if (isAmbiguousRefundTransportFailure(code)) {
    return "The network connection was interrupted before the result was confirmed. Check refund status or retry this same request — do not start a different refund yet.";
  }
  return "The refund could not be submitted. Check the details and try again.";
}

export function OperationsRefundPanel({
  orderId,
  canInitiate,
}: Readonly<{ orderId: string; canInitiate: boolean }>) {
  const amountId = useId();
  const reasonId = useId();
  const noteId = useId();
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [amountInr, setAmountInr] = useState("");
  const [reason, setReason] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingAmbiguous, setPendingAmbiguous] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyReady = useCallback(
    (data: {
      balance: OperationsRefundBalance;
      refunds: readonly OperationsRefundItem[];
      paymentStatus: string;
    }) => {
      const pending = readPendingRefundCommand(orderId);
      if (pending) {
        const existing = findPendingRefundInList(data.refunds, pending.refundRequestId);
        if (existing) {
          clearPendingRefundCommand(orderId);
          setPendingAmbiguous(false);
          setStatusMessage(`Refund ${refundStatusLabel(existing.status)}.`);
        } else {
          setPendingAmbiguous(pending.ambiguous);
        }
      } else {
        setPendingAmbiguous(false);
      }
      setState({
        kind: "ready",
        balance: data.balance,
        refunds: data.refunds,
        paymentStatus: data.paymentStatus,
      });
    },
    [orderId],
  );

  const loadRefunds = useCallback(async () => {
    const result = await getOrderRefunds(orderId);
    if (!mountedRef.current) return result;
    if (!result.ok) {
      if (
        result.status === 403 ||
        result.code === "REFUND_UNAUTHORIZED" ||
        result.code === "REFUND_NOT_FOUND"
      ) {
        setState({ kind: "hidden" });
        return result;
      }
      if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
        setState({ kind: "forbidden" });
        return result;
      }
      setState({ kind: "error", message: errorMessage(result.code) });
      return result;
    }
    applyReady(result.data);
    return result;
  }, [applyReady, orderId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getOrderRefunds(orderId);
      if (cancelled || !mountedRef.current) return;
      if (!result.ok) {
        if (
          result.status === 403 ||
          result.code === "REFUND_UNAUTHORIZED" ||
          result.code === "REFUND_NOT_FOUND"
        ) {
          setState({ kind: "hidden" });
          return;
        }
        if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
          setState({ kind: "forbidden" });
          return;
        }
        setState({ kind: "error", message: errorMessage(result.code) });
        return;
      }
      applyReady(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyReady, orderId]);

  async function reconcilePendingStatus() {
    setAlert(null);
    setBusy(true);
    setStatusMessage("Checking refund status…");
    const result = await loadRefunds();
    if (!mountedRef.current) return;
    setBusy(false);
    if (!result.ok) {
      setAlert(errorMessage(result.code));
      setStatusMessage("Could not confirm refund status.");
      return;
    }
    const pending = readPendingRefundCommand(orderId);
    if (!pending) {
      setStatusMessage("Refund status updated.");
      return;
    }
    const existing = findPendingRefundInList(result.data.refunds, pending.refundRequestId);
    if (existing) {
      setStatusMessage(`Refund ${refundStatusLabel(existing.status)}.`);
      return;
    }
    setPendingAmbiguous(true);
    setAlert(
      "No matching refund is recorded yet. You can safely retry this same request without starting a different refund.",
    );
    setStatusMessage("Pending refund not found on server yet.");
  }

  async function submitRefund() {
    if (state.kind !== "ready" || busy) return;
    setAlert(null);

    const parsedAmount = parseOperatorRefundAmountInrToPaise(amountInr);
    if (!parsedAmount.ok) {
      setAlert(
        parsedAmount.reason === "non_positive"
          ? "Enter a refund amount greater than zero."
          : "Enter a valid refund amount in rupees (up to two decimal places).",
      );
      return;
    }
    if (reason.trim().length === 0) {
      setAlert("A refund reason is required.");
      return;
    }

    const facts = buildPendingRefundCommandFacts({
      orderId,
      amountPaise: parsedAmount.amountPaise,
      reason,
      operatorNote,
    });
    const command = bindPendingRefundCommand(facts);
    setBusy(true);
    setStatusMessage("Submitting refund…");
    const result = await createOrderRefund(orderId, {
      refundRequestId: command.refundRequestId,
      amountPaise: facts.amountPaise,
      reason: facts.reason,
      ...(facts.operatorNote !== null ? { operatorNote: facts.operatorNote } : {}),
    });
    if (!mountedRef.current) return;
    setBusy(false);
    if (!result.ok) {
      if (isAmbiguousRefundTransportFailure(result.code)) {
        markPendingRefundCommandAmbiguous(orderId);
        setPendingAmbiguous(true);
      }
      setAlert(errorMessage(result.code));
      setStatusMessage("Refund submission failed.");
      return;
    }
    clearPendingRefundCommand(orderId);
    setPendingAmbiguous(false);
    setAmountInr("");
    setReason("");
    setOperatorNote("");
    setState({
      kind: "ready",
      balance: result.data.balance,
      refunds: [
        result.data.refund,
        ...state.refunds.filter((r) => r.refundId !== result.data.refund.refundId),
      ],
      paymentStatus: result.data.paymentStatus,
    });
    setStatusMessage(`Refund ${refundStatusLabel(result.data.refund.status)}.`);
  }

  if (state.kind === "loading" || state.kind === "hidden") return null;
  if (state.kind === "forbidden") {
    return (
      <section className="mt-8" aria-labelledby="refund-heading">
        <h2 id="refund-heading" className="text-lg font-semibold text-[var(--enterprise-fg)]">
          Refunds
        </h2>
        <p className="mt-2 text-sm text-[var(--enterprise-muted)]">Sign in required for refund support.</p>
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section className="mt-8" aria-labelledby="refund-heading">
        <h2 id="refund-heading" className="text-lg font-semibold text-[var(--enterprise-fg)]">
          Refunds
        </h2>
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      </section>
    );
  }

  const remaining = state.balance.remainingRefundableAmountPaise;
  const amountParse = parseOperatorRefundAmountInrToPaise(amountInr);
  const canSubmit =
    canInitiate &&
    !state.balance.fullyRefunded &&
    state.paymentStatus === "SUCCEEDED" &&
    amountParse.ok &&
    reason.trim().length > 0;

  return (
    <section className="mt-8" aria-labelledby="refund-heading">
      <h2 id="refund-heading" className="text-lg font-semibold text-[var(--enterprise-fg)]">
        Refunds
      </h2>
      <p className="mt-1 text-sm text-[var(--enterprise-muted)]">
        Cancellation and refund are separate actions. Refunds are authorized here and completed by the payment
        processor asynchronously.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--enterprise-muted)]">Captured</dt>
          <dd>{formatPaise(state.balance.capturedAmountPaise)}</dd>
        </div>
        <div>
          <dt className="text-[var(--enterprise-muted)]">Remaining refundable</dt>
          <dd>{formatPaise(remaining)}</dd>
        </div>
        <div>
          <dt className="text-[var(--enterprise-muted)]">Reserved</dt>
          <dd>{formatPaise(state.balance.reservedAmountPaise)}</dd>
        </div>
        <div>
          <dt className="text-[var(--enterprise-muted)]">Processed refunds</dt>
          <dd>{formatPaise(state.balance.processedRefundedAmountPaise)}</dd>
        </div>
      </dl>

      {state.refunds.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Refund history">
          {state.refunds.map((refund) => (
            <li
              key={refund.refundId}
              className="rounded border border-[var(--enterprise-border)] px-3 py-2 text-sm"
            >
              <p>
                <span className="font-medium">{formatPaise(refund.amountPaise)}</span>
                {" · "}
                <span>{refundStatusLabel(refund.status)}</span>
              </p>
              <p className="text-[var(--enterprise-muted)]">{refund.reason}</p>
              {refund.recoveryHint ? (
                <p className="mt-1 text-[var(--enterprise-muted)]">{refund.recoveryHint}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--enterprise-muted)]">No refunds yet for this order.</p>
      )}

      {canInitiate && !state.balance.fullyRefunded ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitRefund();
          }}
        >
          <div>
            <label htmlFor={amountId} className="block text-sm font-medium">
              Refund amount (₹)
            </label>
            <input
              id={amountId}
              name="amountInr"
              inputMode="decimal"
              className="mt-1 w-full min-h-11 rounded border border-[var(--enterprise-border)] px-3"
              value={amountInr}
              disabled={busy}
              onChange={(event) => setAmountInr(event.target.value)}
              aria-describedby={`${amountId}-hint`}
            />
            <p id={`${amountId}-hint`} className="mt-1 text-xs text-[var(--enterprise-muted)]">
              Enter the amount in rupees (up to two decimal places). Remaining refundable:{" "}
              {formatPaise(remaining)}.
            </p>
          </div>
          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium">
              Reason
            </label>
            <input
              id={reasonId}
              name="reason"
              required
              className="mt-1 w-full min-h-11 rounded border border-[var(--enterprise-border)] px-3"
              value={reason}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={noteId} className="block text-sm font-medium">
              Operator note (optional)
            </label>
            <textarea
              id={noteId}
              name="operatorNote"
              className="mt-1 w-full rounded border border-[var(--enterprise-border)] px-3 py-2"
              rows={2}
              value={operatorNote}
              disabled={busy}
              onChange={(event) => setOperatorNote(event.target.value)}
            />
          </div>
          {alert ? (
            <p className="text-sm text-red-700" role="alert">
              {alert}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {statusMessage}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canSubmit || busy} aria-busy={busy}>
              {busy ? "Submitting…" : "Authorize refund"}
            </Button>
            {pendingAmbiguous ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  void reconcilePendingStatus();
                }}
              >
                Check refund status
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
