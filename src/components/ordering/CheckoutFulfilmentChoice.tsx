"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type CheckoutFulfilmentChoiceMode = "DELIVERY" | "PICKUP";

/**
 * First checkout step: Delivery | Pickup (AC-036H-041).
 * Keyboard-reachable toggle buttons with accessible names and selected state.
 */
export function CheckoutFulfilmentChoice(props: {
  pending: boolean;
  selectedMode: CheckoutFulfilmentChoiceMode | null;
  onSelect: (mode: CheckoutFulfilmentChoiceMode) => void;
  errorId?: string;
  errorMessage?: string | null;
}) {
  const { pending, selectedMode, onSelect, errorId, errorMessage } = props;

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="checkout-fulfilment-choice"
      aria-labelledby="checkout-fulfilment-heading"
    >
      <h2
        id="checkout-fulfilment-heading"
        className="font-display text-[22px] text-[var(--text-primary)]"
      >
        How would you like your order?
      </h2>
      <p className="font-body text-[14px] text-[var(--text-secondary)]">
        Choose delivery to your address, or pick up from a BOBA Bear location.
      </p>

      <div
        role="group"
        aria-labelledby="checkout-fulfilment-heading"
        aria-describedby={errorMessage && errorId ? errorId : undefined}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <ModeOption
          mode="DELIVERY"
          label="Delivery"
          description="Have your order brought to your address"
          selected={selectedMode === "DELIVERY"}
          disabled={pending}
          onSelect={onSelect}
        />
        <ModeOption
          mode="PICKUP"
          label="Pickup"
          description="Collect from a BOBA Bear location"
          selected={selectedMode === "PICKUP"}
          disabled={pending}
          onSelect={onSelect}
        />
      </div>

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          data-testid="checkout-fulfilment-choice-error"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          <span className="font-semibold text-[var(--text-primary)]">Unavailable: </span>
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function ModeOption(props: {
  mode: CheckoutFulfilmentChoiceMode;
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (mode: CheckoutFulfilmentChoiceMode) => void;
}) {
  const { mode, label, description, selected, disabled, onSelect } = props;
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${label}. ${description}`}
      data-testid={`checkout-fulfilment-${mode.toLowerCase()}`}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "min-h-[72px] flex-1 flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal",
        selected &&
          "border-[var(--interactive-primary)] bg-[var(--interactive-primary)]/[0.12] text-[var(--text-primary)]",
      )}
      onClick={() => onSelect(mode)}
    >
      <span className="font-body text-[16px] font-bold">{label}</span>
      <span className="font-body text-[13px] font-normal text-[var(--text-secondary)]">
        {description}
      </span>
      {selected ? (
        <span className="sr-only">Selected</span>
      ) : null}
    </Button>
  );
}
