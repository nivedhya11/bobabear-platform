"use client";

import { Button } from "@/components/ui/Button";
import type { CommerceScheduledWindow } from "@/lib/customer-commerce";
import { cn } from "@/lib/utils";

/**
 * ASAP and Scheduled are peer timing choices (IMP-036I).
 * Windows are server-provided. This control does not invent eligibility.
 */
export function CheckoutTimingChoice(props: {
  pending: boolean;
  loading: boolean;
  mode: "DELIVERY" | "PICKUP";
  selectedTiming: "ASAP" | "SCHEDULED" | null;
  selectedWindowStart: string | null;
  windows: readonly CommerceScheduledWindow[];
  availability: string | null;
  message: string | null;
  timeZone: string | null;
  cancellationCutoffMinutes: number | null;
  errorId?: string;
  errorMessage?: string | null;
  onSelectAsap: () => void;
  onSelectWindow: (window: CommerceScheduledWindow) => void;
}) {
  const {
    pending,
    loading,
    mode,
    selectedTiming,
    selectedWindowStart,
    windows,
    message,
    timeZone,
    cancellationCutoffMinutes,
    errorId,
    errorMessage,
    onSelectAsap,
    onSelectWindow,
  } = props;
  const describedBy = errorMessage && errorId ? errorId : undefined;
  const today = windows.filter((window) => window.day === "TODAY");
  const tomorrow = windows.filter((window) => window.day === "TOMORROW");
  const promiseLabel =
    mode === "DELIVERY" ? "Arrival / fulfilment window" : "Pickup window";

  return (
    <section
      className="flex w-full flex-col gap-4"
      data-testid="checkout-timing-choice"
      aria-labelledby="checkout-timing-heading"
    >
      <h2 id="checkout-timing-heading" className="font-display text-[22px] text-[var(--text-primary)]">
        When should we fulfil this order?
      </h2>
      <p className="font-body text-[14px] text-[var(--text-secondary)]">
        {mode === "DELIVERY"
          ? "Choose as soon as possible, or an arrival / fulfilment window."
          : "Choose as soon as possible, or a pickup window."}
        {timeZone ? ` Times use ${timeZone}.` : ""}
      </p>

      <div role="group" aria-labelledby="checkout-timing-heading" aria-describedby={describedBy} className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending || loading}
          aria-pressed={selectedTiming === "ASAP"}
          aria-label="As soon as possible"
          data-testid="checkout-timing-asap"
          data-selected={selectedTiming === "ASAP" ? "true" : "false"}
          className={cn(
            "min-h-11 w-full justify-start px-4 text-left whitespace-normal",
            selectedTiming === "ASAP" &&
              "border-[var(--interactive-primary)] bg-[var(--interactive-primary)]/[0.12] outline outline-2 outline-offset-2 outline-[var(--interactive-primary)]",
          )}
          onClick={onSelectAsap}
        >
          <span className="font-semibold">As soon as possible</span>
          {selectedTiming === "ASAP" ? <span className="ml-2 text-[13px]">Selected</span> : null}
        </Button>

        <div className="flex flex-col gap-3" data-testid="checkout-timing-scheduled">
          <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">{promiseLabel}</p>
          {loading ? (
            <p data-testid="checkout-timing-loading" className="font-body text-[14px] text-[var(--text-secondary)]">
              Loading available times…
            </p>
          ) : windows.length === 0 ? (
            <p role="status" data-testid="checkout-timing-empty" className="font-body text-[14px] text-[var(--text-secondary)]">
              {message ?? "No scheduled times are available right now."}
            </p>
          ) : (
            <>
              <WindowDay
                title="Today"
                windows={today}
                selectedStart={selectedWindowStart}
                pending={pending}
                onSelect={onSelectWindow}
              />
              <WindowDay
                title="Tomorrow"
                windows={tomorrow}
                selectedStart={selectedWindowStart}
                pending={pending}
                onSelect={onSelectWindow}
              />
            </>
          )}
          {cancellationCutoffMinutes !== null ? (
            <p data-testid="checkout-timing-cutoff" className="font-body text-[13px] text-[var(--text-secondary)]">
              Self-service cancellation for this scheduled order closes {cancellationCutoffMinutes} minutes
              before the window starts.
            </p>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p id={errorId} role="alert" data-testid="checkout-timing-error" className="font-body text-[14px]">
          <span className="font-semibold">Check this time: </span>
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function WindowDay(props: {
  title: string;
  windows: readonly CommerceScheduledWindow[];
  selectedStart: string | null;
  pending: boolean;
  onSelect: (window: CommerceScheduledWindow) => void;
}) {
  if (props.windows.length === 0) return null;
  const headingId = `checkout-timing-${props.title.toLowerCase()}`;
  return (
    <div>
      <h3 id={headingId} className="mb-2 font-body text-[13px] font-semibold uppercase tracking-[0.08em]">
        {props.title}
      </h3>
      <div role="group" aria-labelledby={headingId} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {props.windows.map((window) => {
          const selected = props.selectedStart === window.startAt;
          return (
            <Button
              key={window.startAt}
              type="button"
              variant="outline"
              disabled={props.pending}
              aria-pressed={selected}
              aria-label={`${props.title} ${window.label} ${window.timeZone}`}
              data-testid={`checkout-window-${window.startAt}`}
              data-selected={selected ? "true" : "false"}
              className={cn(
                "min-h-11",
                selected &&
                  "border-[var(--interactive-primary)] bg-[var(--interactive-primary)]/[0.12] outline outline-2 outline-offset-2 outline-[var(--interactive-primary)]",
              )}
              onClick={() => props.onSelect(window)}
            >
              {window.label}
              {selected ? <span className="sr-only"> selected</span> : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
