"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { enterpriseFocusRingClass } from "@/components/enterprise/enterprise-tokens";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type AdminConfirmDialogProps = Readonly<{
  open: boolean;
  title: string;
  targetLabel: string;
  scopeLabel: string;
  consequenceLabel: string;
  busy?: boolean;
  error?: string | null;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}>;

/**
 * High-consequence confirm dialog for Admin Console (IMP-036G).
 * Follows ConsequenceReviewDialog focus / Escape / announce patterns.
 */
export function AdminConfirmDialog(props: AdminConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(props.busy === true);
  const confirmLabel = props.confirmLabel ?? "Confirm";

  useEffect(() => {
    busyRef.current = props.busy === true;
  }, [props.busy]);

  useEffect(() => {
    if (!props.open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const initial = focusables();
    const preferred =
      initial.find((el) => el.getAttribute("data-dialog-cancel") === "true") ?? initial[0];
    preferred?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (busyRef.current) return;
        props.onCancel();
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
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus();
    };
  }, [props.open, props.onCancel]);

  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="admin-confirm-dialog"
        className="w-full max-w-lg rounded-lg border border-[var(--enterprise-border,#D6C39A)] bg-[var(--enterprise-surface,#FFF8E8)] p-4 shadow-lg sm:p-5"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[var(--enterprise-text,#3A2E16)]">
          {props.title}
        </h2>
        <dl className="mt-3 space-y-2 text-sm text-[var(--enterprise-text-secondary,#5C4B24)]">
          <div>
            <dt className="font-medium text-[var(--enterprise-text,#3A2E16)]">Target</dt>
            <dd>{props.targetLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--enterprise-text,#3A2E16)]">Scope</dt>
            <dd>{props.scopeLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--enterprise-text,#3A2E16)]">Consequence</dt>
            <dd>{props.consequenceLabel}</dd>
          </div>
        </dl>
        {props.error ? (
          <p className="mt-3 text-sm text-rose-800" role="alert">
            {props.error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            data-dialog-cancel="true"
            disabled={props.busy}
            className={cn(enterpriseFocusRingClass)}
            onClick={props.onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-dialog-primary="true"
            disabled={props.busy}
            className={cn(enterpriseFocusRingClass)}
            onClick={props.onConfirm}
          >
            {props.busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
