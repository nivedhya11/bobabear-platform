"use client";

import { cn } from "@/lib/utils";

const STEP_BUTTON =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-body font-bold text-[18px] leading-none focus-ring disabled:opacity-50";

export type QuantityStepperProps = Readonly<{
  quantity: number;
  disabled?: boolean;
  ariaLabel: string;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  className?: string;
}>;

/**
 * BOBA commerce quantity control: visually distinct [ − ] n [ + ] group.
 */
export function QuantityStepper(props: QuantityStepperProps) {
  const {
    quantity,
    disabled = false,
    ariaLabel,
    decrementLabel,
    incrementLabel,
    onDecrement,
    onIncrement,
    className,
  } = props;

  return (
    <div
      className={cn("inline-flex min-h-[44px] items-center gap-1.5", className)}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={decrementLabel}
        onClick={onDecrement}
        className={cn(
          STEP_BUTTON,
          "border border-[var(--interactive-primary)]/45 bg-transparent text-[var(--text-primary)]",
        )}
      >
        −
      </button>
      <span
        className="flex min-w-[2.25rem] items-center justify-center px-1 font-body text-[15px] font-bold text-[var(--text-primary)]"
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={incrementLabel}
        onClick={onIncrement}
        className={cn(STEP_BUTTON, "bg-[var(--interactive-primary)] [color:#1F2C08]")}
      >
        +
      </button>
    </div>
  );
}
