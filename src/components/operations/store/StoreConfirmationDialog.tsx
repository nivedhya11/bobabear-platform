"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type StoreConfirmationDialogProps = Readonly<{
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  error: string | null;
  destructive?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}>;

export function StoreConfirmationDialog(props: StoreConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(props.pending);

  useEffect(() => {
    pendingRef.current = props.pending;
  }, [props.pending]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const initial = focusables();
    const preferred =
      initial.find((el) => el.getAttribute("data-dialog-primary") === "true") ?? initial[0];
    preferred?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
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
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-scoped focus trap
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-md flex-col gap-4 border border-[var(--border-strong)] bg-[var(--bg-page)] p-6"
        data-testid="store-confirmation-dialog"
      >
        <h2 id={titleId} className="text-xl font-semibold text-[var(--text-primary)]">
          {props.title}
        </h2>
        <p id={descriptionId} className="text-sm text-[var(--text-secondary)]">
          {props.description}
        </p>
        {props.error ? (
          <p role="alert" className="text-sm text-[var(--text-primary)]">
            {props.error}
          </p>
        ) : null}
        {props.pending ? (
          <p aria-live="polite" className="text-sm text-[var(--text-secondary)]">
            Updating…
          </p>
        ) : null}
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:justify-end")}>
          <Button type="button" variant="outline" disabled={props.pending} onClick={props.onDismiss}>
            Go back
          </Button>
          <Button
            type="button"
            variant={props.destructive ? "destructive" : "primary"}
            disabled={props.pending}
            aria-busy={props.pending}
            data-dialog-primary="true"
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
