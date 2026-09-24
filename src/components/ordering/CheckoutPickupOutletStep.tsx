"use client";

import { Button } from "@/components/ui/Button";
import type { CommercePickupOption } from "@/lib/customer-commerce";
import { cn } from "@/lib/utils";
import {
  pickupAddressLines,
  type PickupLocationFields,
} from "@/components/ordering/pickup-location-presentation";

export type PickupSelectionPolicy = "UNAVAILABLE" | "AUTO_SELECT" | "CUSTOMER_SELECT";

/**
 * Pickup outlet step — AUTO_SELECT / CUSTOMER_SELECT / UNAVAILABLE.
 * Does not mount Maps or delivery destination flows (AC-036H-030).
 */
export function CheckoutPickupOutletStep(props: {
  pending: boolean;
  loading: boolean;
  selectionPolicy: PickupSelectionPolicy | null;
  outlets: readonly CommercePickupOption[];
  selectedOutletId: string | null;
  onSelectOutlet: (outletId: string) => void;
  onContinue: () => void;
  onChooseDelivery: () => void;
  onBackToMode: () => void;
  errorId?: string;
  errorMessage?: string | null;
}) {
  const {
    pending,
    loading,
    selectionPolicy,
    outlets,
    selectedOutletId,
    onSelectOutlet,
    onContinue,
    onChooseDelivery,
    onBackToMode,
    errorId,
    errorMessage,
  } = props;

  if (loading) {
    return (
      <section
        className="flex flex-col gap-4"
        data-testid="checkout-pickup-loading"
        aria-busy="true"
        aria-live="polite"
      >
        <h2 className="font-display text-[22px] text-[var(--text-primary)]">Pickup</h2>
        <p className="font-body text-[15px] text-[var(--text-secondary)]">
          Checking pickup locations…
        </p>
      </section>
    );
  }

  if (selectionPolicy === "UNAVAILABLE" || outlets.length === 0) {
    return (
      <section
        className="flex flex-col gap-4"
        data-testid="checkout-pickup-unavailable"
        aria-labelledby="checkout-pickup-unavailable-heading"
      >
        <h2
          id="checkout-pickup-unavailable-heading"
          className="font-display text-[22px] text-[var(--text-primary)]"
        >
          Pickup unavailable
        </h2>
        <p
          id={errorId ?? "checkout-pickup-unavailable-message"}
          role="alert"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          <span className="font-semibold text-[var(--text-primary)]">Not available: </span>
          No BOBA Bear location can take this order for pickup right now. Delivery remains
          available if your address is serviceable.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="min-h-[44px]"
            disabled={pending}
            data-testid="checkout-pickup-switch-delivery"
            onClick={onChooseDelivery}
          >
            Choose Delivery
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={pending}
            data-testid="checkout-pickup-back-to-mode"
            onClick={onBackToMode}
          >
            Back
          </Button>
        </div>
      </section>
    );
  }

  const autoOutlet =
    selectionPolicy === "AUTO_SELECT" && outlets.length === 1 ? outlets[0]! : null;
  const selected =
    autoOutlet ?? outlets.find((outlet) => outlet.outletId === selectedOutletId) ?? null;

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="checkout-pickup-outlet"
      aria-labelledby="checkout-pickup-outlet-heading"
    >
      <h2
        id="checkout-pickup-outlet-heading"
        className="font-display text-[22px] text-[var(--text-primary)]"
      >
        {autoOutlet ? "Your pickup location" : "Choose a pickup location"}
      </h2>
      <p className="font-body text-[14px] text-[var(--text-secondary)]">
        Collect your order from BOBA Bear. No delivery address is required.
      </p>

      {autoOutlet ? (
        <PickupOutletCard
          outlet={autoOutlet}
          selected
          selectable={false}
          pending={pending}
        />
      ) : (
        <div
          role="listbox"
          aria-labelledby="checkout-pickup-outlet-heading"
          aria-describedby={errorMessage && errorId ? errorId : undefined}
          aria-activedescendant={
            selected ? `pickup-outlet-${selected.outletId}` : undefined
          }
          className="flex flex-col gap-3"
          data-testid="checkout-pickup-outlet-list"
        >
          {outlets.map((outlet) => (
            <PickupOutletCard
              key={outlet.outletId}
              outlet={outlet}
              selected={selectedOutletId === outlet.outletId}
              selectable
              pending={pending}
              onSelect={() => onSelectOutlet(outlet.outletId)}
            />
          ))}
        </div>
      )}

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          data-testid="checkout-pickup-outlet-error"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          <span className="font-semibold text-[var(--text-primary)]">Error: </span>
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="min-h-[44px]"
          disabled={pending || !selected}
          data-testid="checkout-pickup-continue"
          onClick={onContinue}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          disabled={pending}
          data-testid="checkout-pickup-back-to-mode"
          onClick={onBackToMode}
        >
          Change fulfilment
        </Button>
      </div>
    </section>
  );
}

function PickupOutletCard(props: {
  outlet: CommercePickupOption;
  selected: boolean;
  selectable: boolean;
  pending: boolean;
  onSelect?: () => void;
}) {
  const { outlet, selected, selectable, pending, onSelect } = props;
  const location: PickupLocationFields = outlet;
  const lines = pickupAddressLines(location);
  const id = `pickup-outlet-${outlet.outletId}`;

  if (!selectable) {
    return (
      <div
        id={id}
        data-testid="checkout-pickup-outlet-auto"
        data-selected="true"
        className="rounded-xl border border-[var(--interactive-primary)] bg-[var(--bg-section)] p-4"
      >
        <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
          {outlet.displayName}
        </p>
        {lines.map((line) => (
          <p key={line} className="font-body text-[14px] text-[var(--text-secondary)]">
            {line}
          </p>
        ))}
        {outlet.instructions ? (
          <p className="mt-2 font-body text-[14px] text-[var(--text-primary)]">
            <span className="font-semibold">Instructions: </span>
            {outlet.instructions}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      aria-label={`Pickup at ${outlet.displayName}`}
      disabled={pending}
      data-testid={`checkout-pickup-outlet-${outlet.outletId}`}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "rounded-xl border bg-[var(--bg-section)] p-4 text-left focus-ring min-h-[44px]",
        selected
          ? "border-[var(--interactive-primary)]"
          : "border-[var(--border-strong)]",
      )}
      onClick={onSelect}
    >
      <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
        {outlet.displayName}
      </p>
      {lines.map((line) => (
        <p key={line} className="font-body text-[14px] text-[var(--text-secondary)]">
          {line}
        </p>
      ))}
      {outlet.instructions ? (
        <p className="mt-2 font-body text-[14px] text-[var(--text-primary)]">
          <span className="font-semibold">Instructions: </span>
          {outlet.instructions}
        </p>
      ) : null}
      {selected ? <span className="sr-only">Selected</span> : null}
    </button>
  );
}
