"use client";

import { Button } from "@/components/ui/Button";
import type { CartReconciliationResolution } from "@/lib/customer-commerce";

export function ReconcileConflictDialog(props: {
  pending: boolean;
  onChoose: (resolution: CartReconciliationResolution) => void;
}) {
  return (
    <div
      role="dialog"
      aria-labelledby="reconcile-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div className="w-full max-w-md rounded-sm border border-[var(--border-strong)] bg-[var(--bg-page)] p-6 flex flex-col gap-4">
        <h2 id="reconcile-title" className="font-display text-[28px] text-[var(--text-primary)]">
          Keep which cart?
        </h2>
        <p className="font-body text-[15px] text-[var(--text-secondary)]">
          You already have a signed-in cart, and a guest cart from this visit. Choose which one to
          keep. This choice is required before checkout.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={props.pending}
            onClick={() => props.onChoose("KEEP_GUEST")}
          >
            Keep guest cart
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={props.pending}
            onClick={() => props.onChoose("KEEP_CUSTOMER")}
          >
            Keep signed-in cart
          </Button>
        </div>
      </div>
    </div>
  );
}
