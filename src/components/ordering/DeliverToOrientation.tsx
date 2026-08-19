"use client";

import {
  deliverToOperatingAreaHeading,
  deliverToOperatingAreaLocality,
  deliverToOrientationBody,
  deliverToPinHint,
} from "@/components/ordering/serviceability-copy";
import { BUSINESS } from "@/lib/site";

export function DeliverToOrientation(props: {
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  serviceabilityNote?: string | null;
}) {
  const { postalCode, onPostalCodeChange, serviceabilityNote } = props;

  return (
    <section
      aria-labelledby="deliver-to-heading"
      className="border border-[var(--border-default)] bg-[var(--bg-section)] p-4 flex flex-col gap-3"
      data-testid="deliver-to-orientation"
    >
      <div className="flex flex-col gap-1">
        <p
          id="deliver-to-heading"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]"
        >
          {deliverToOperatingAreaHeading()}
        </p>
        <p className="font-display text-[28px] leading-none text-[var(--text-primary)]">
          {deliverToOperatingAreaLocality()}
        </p>
        <p className="font-body text-[14px] text-[var(--text-secondary)]">
          {deliverToOrientationBody()} Open {BUSINESS.hoursDisplay}, every day.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="menu-delivery-pin" className="font-body text-[13px] font-semibold">
          Delivery PIN (optional)
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
        <p className="font-body text-[12px] text-[var(--text-tertiary)]">{deliverToPinHint()}</p>
      </div>

      {serviceabilityNote ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
          {serviceabilityNote}
        </p>
      ) : null}
    </section>
  );
}
