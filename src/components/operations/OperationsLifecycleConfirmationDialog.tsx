"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import {
  OPERATIONS_CANCELLATION_REASON_CODES,
  OPERATIONS_CANCELLATION_REASON_LABELS,
  type OperationsCancellationReasonCode,
  type OperationsLifecycleAction,
} from "@/lib/operations/types";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type OperationsLifecycleConfirmationDialogProps = Readonly<{
  action: OperationsLifecycleAction;
  orderNumber: string;
  pending: boolean;
  error: string | null;
  cancellationReasonCode: OperationsCancellationReasonCode | "";
  onCancellationReasonChange: (value: OperationsCancellationReasonCode | "") => void;
  onConfirm: () => void;
  onDismiss: () => void;
}>;

function dialogTitle(action: OperationsLifecycleAction): string {
  if (action === "ACCEPT") return "Accept this order?";
  if (action === "FULFIL") return "Mark this order fulfilled?";
  return "Cancel this order?";
}

function confirmLabel(action: OperationsLifecycleAction): string {
  if (action === "ACCEPT") return "Confirm accept";
  if (action === "FULFIL") return "Confirm fulfil";
  return "Confirm cancel";
}

function actionSummary(action: OperationsLifecycleAction, orderNumber: string): string {
  if (action === "ACCEPT") {
    return `Accept order ${orderNumber}. This moves the order from Placed to Accepted.`;
  }
  if (action === "FULFIL") {
    return `Fulfil order ${orderNumber}. This moves the order from Accepted to Fulfilled.`;
  }
  return `Cancel order ${orderNumber}. This permanently cancels the order. Choose a cancellation reason.`;
}

export function OperationsLifecycleConfirmationDialog(
  props: OperationsLifecycleConfirmationDialogProps,
) {
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(props.pending);

  useEffect(() => {
    pendingRef.current = props.pending;
  }, [props.pending]);

  const reasonRequired = props.action === "CANCEL";
  const reasonMissing = reasonRequired && props.cancellationReasonCode === "";
  const confirmDisabled = props.pending || reasonMissing;

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const initial = focusables();
    const preferred =
      initial.find((el) => el.tagName === "SELECT") ??
      initial.find((el) => el.getAttribute("data-dialog-primary") === "true") ??
      initial[0];
    preferred?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (pendingRef.current) return;
        props.onDismiss();
        return;
      }
      if (event.key !== "Tab") return;

      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (active instanceof HTMLElement && !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
    // Mount-only focus trap for this confirmation instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-scoped
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      data-testid="operations-lifecycle-dialog-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md border border-[var(--border-strong)] bg-[var(--bg-page)] p-6 flex flex-col gap-4"
        data-testid="operations-lifecycle-dialog"
      >
        <h2 id={titleId} className="font-display text-[28px] text-[var(--text-primary)]">
          {dialogTitle(props.action)}
        </h2>
        <p id={descriptionId} className="font-body text-[15px] text-[var(--text-secondary)]">
          {actionSummary(props.action, props.orderNumber)}
        </p>

        {reasonRequired ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={reasonId} className="font-body text-[13px] text-[var(--text-secondary)]">
              Cancellation reason
            </label>
            <select
              id={reasonId}
              value={props.cancellationReasonCode}
              disabled={props.pending}
              aria-required="true"
              aria-invalid={reasonMissing}
              onChange={(event) => {
                const value = event.target.value;
                props.onCancellationReasonChange(
                  value === "" ? "" : (value as OperationsCancellationReasonCode),
                );
              }}
              className={cn(
                "h-11 min-h-11 px-3 rounded-sm w-full",
                "bg-transparent text-[var(--text-primary)]",
                "border border-[var(--border-strong)]",
                "font-body text-[14px]",
                "focus:border-[var(--interactive-secondary)] focus:outline-none",
                "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
              )}
            >
              <option value="">Select a reason</option>
              {OPERATIONS_CANCELLATION_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {OPERATIONS_CANCELLATION_REASON_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {props.error ? (
          <p id={errorId} role="alert" className="font-body text-[14px] text-[var(--text-primary)]">
            {props.error}
          </p>
        ) : null}

        {props.pending ? (
          <p aria-live="polite" className="font-body text-[14px] text-[var(--text-secondary)]">
            Updating order…
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={props.pending}
            onClick={props.onDismiss}
          >
            Go back
          </Button>
          <Button
            type="button"
            variant={props.action === "CANCEL" ? "destructive" : "primary"}
            size="md"
            disabled={confirmDisabled}
            aria-busy={props.pending}
            data-dialog-primary="true"
            onClick={props.onConfirm}
          >
            {confirmLabel(props.action)}
          </Button>
        </div>
      </div>
    </div>
  );
}
