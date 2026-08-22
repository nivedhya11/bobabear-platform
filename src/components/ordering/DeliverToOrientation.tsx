"use client";

import {
  deliverToOperatingAreaHeading,
  deliverToOperatingAreaLocality,
  deliverToOrientationBody,
  deliverToPinHint,
} from "@/components/ordering/serviceability-copy";

export function DeliverToOrientation(props: {
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  serviceabilityNote?: string | null;
}) {
  const { postalCode, onPostalCodeChange, serviceabilityNote } = props;

  return (
    <section
      aria-labelledby="deliver-to-heading"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      data-testid="deliver-to-orientation"
    >
      <div className="flex items-baseline gap-2">
        <p
          id="deliver-to-heading"
          className="font-body text-[12px] text-[var(--text-secondary)]"
        >
          {deliverToOperatingAreaHeading()}
        </p>
        <p className="font-body text-[16px] font-bold leading-none text-[var(--text-primary)]">
          {deliverToOperatingAreaLocality()}
        </p>
      </div>
      <details className="font-body text-[13px] text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--interactive-primary)] underline-offset-2 hover:underline">
          Check delivery PIN
        </summary>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="menu-delivery-pin" className="font-body text-[13px] font-semibold">
            Delivery PIN
          </label>
          <input
            id="menu-delivery-pin"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="6-digit PIN"
            value={postalCode}
            onChange={(event) => onPostalCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-body text-[15px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 min-h-[44px] rounded-md"
          />
        </div>
        <p className="mt-2 font-body text-[12px] text-[var(--text-tertiary)]">
          {deliverToOrientationBody()} {deliverToPinHint()}
        </p>
      </details>

      {serviceabilityNote ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
          {serviceabilityNote}
        </p>
      ) : null}
    </section>
  );
}
