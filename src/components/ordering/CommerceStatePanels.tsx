"use client";

import { Button } from "@/components/ui/Button";

export function CommerceRetryPanel(props: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4"
      role="status"
      data-testid="commerce-retry-panel"
    >
      <p className="font-body text-[15px] text-[var(--text-secondary)]">{props.message}</p>
      {props.onRetry ? (
        <Button type="button" variant="secondary" className="min-h-[44px]" onClick={props.onRetry}>
          {props.retryLabel ?? "Try again"}
        </Button>
      ) : null}
    </div>
  );
}

export function CommerceLoadingPanel(props: { message?: string }) {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      data-testid="commerce-loading"
    >
      <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg-surface-sunken)]" />
      <p className="font-body text-[15px] text-[var(--text-secondary)]">
        {props.message ?? "Loading…"}
      </p>
    </div>
  );
}
