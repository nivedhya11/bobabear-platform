"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { enterpriseFocusRingClass } from "@/components/enterprise/enterprise-tokens";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type StepUpMfaDialogProps = Readonly<{
  open: boolean;
  title?: string;
  description?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (totpCode: string) => void;
}>;

/**
 * Collects a TOTP code for IMP-038 step-up re-authentication before
 * high-consequence admin/ops mutations.
 */
export function StepUpMfaDialog(props: StepUpMfaDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(props.busy === true);
  const [code, setCode] = useState("");
  const title = props.title ?? "Confirm with authenticator";
  const description =
    props.description ??
    "Enter the current code from your authenticator app to continue this privileged action.";

  useEffect(() => {
    busyRef.current = props.busy === true;
  }, [props.busy]);

  useEffect(() => {
    if (!props.open) {
      setCode("");
      return;
    }
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const initial = focusables();
    const preferred =
      initial.find((el) => el.tagName === "INPUT") ??
      initial.find((el) => el.getAttribute("data-dialog-primary") === "true") ??
      initial[0];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[var(--enterprise-border,#3D6026)] bg-[var(--enterprise-bg-panel,#22361A)] p-6 shadow-xl"
        data-testid="step-up-mfa-dialog"
      >
        <h2
          id={titleId}
          className="text-lg font-semibold text-[var(--enterprise-fg,#F5F0E8)]"
        >
          {title}
        </h2>
        <p className="text-sm text-[var(--enterprise-muted,#C9C2B4)]">{description}</p>
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--enterprise-fg,#F5F0E8)]">
          Authenticator code
        </label>
        <input
          id={inputId}
          data-testid="step-up-mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={cn(
            "rounded border border-[var(--enterprise-border,#3D6026)] bg-[var(--enterprise-bg,#1A2A14)] px-3 py-2 text-[var(--enterprise-fg,#F5F0E8)]",
            enterpriseFocusRingClass,
          )}
          value={code}
          disabled={props.busy === true}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && code.trim().length > 0 && props.busy !== true) {
              event.preventDefault();
              props.onConfirm(code.trim());
            }
          }}
        />
        {props.error ? (
          <p className="text-sm text-red-300" role="alert" data-testid="step-up-mfa-error">
            {props.error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            data-dialog-cancel="true"
            disabled={props.busy === true}
            onClick={props.onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-dialog-primary="true"
            data-testid="step-up-mfa-confirm"
            disabled={props.busy === true || code.trim().length === 0}
            onClick={() => props.onConfirm(code.trim())}
          >
            {props.busy === true ? "Verifying…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
