"use client";

import { useEffect, useState } from "react";

import {
  deliverToOperatingAreaHeading,
  deliverToOperatingAreaLocality,
  deliverToOrientationBody,
  deliverToPinHint,
} from "@/components/ordering/serviceability-copy";
import {
  readDeliveryPinContext,
  subscribeToDeliveryPinContext,
  writeDeliveryPinContext,
} from "@/components/ordering/delivery-pin-context";

export function DeliverToOrientation(props: {
  variant?: "page-strip" | "header-pill";
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  serviceabilityNote?: string | null;
}) {
  const {
    variant = "page-strip",
    postalCode,
    onPostalCodeChange,
    serviceabilityNote,
  } = props;
  const isHeaderPill = variant === "header-pill";
  if (isHeaderPill) {
    return (
      <div
        data-testid="deliver-to-header-orientation"
        className="relative hidden lg:flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-section)]/80 px-4 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
      >
        <div className="flex flex-col items-center text-center leading-tight">
          <p className="font-body text-[10px] text-[var(--text-tertiary)]">
            {deliverToOperatingAreaHeading()}
          </p>
          <p className="font-body text-[13px] font-bold text-[var(--text-primary)]">
            {deliverToOperatingAreaLocality()}
            {postalCode.length === 6 ? ` · ${postalCode}` : null}
          </p>
        </div>
        <details className="ml-3 font-body text-[12px] text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--interactive-primary)] underline-offset-2 hover:underline">
            Check PIN
          </summary>
          <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-page)] p-4 shadow-lg">
            <PinFields postalCode={postalCode} onPostalCodeChange={onPostalCodeChange} />
          </div>
        </details>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="deliver-to-heading"
      className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] lg:hidden"
      data-testid="deliver-to-orientation"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p
            id="deliver-to-heading"
            className="font-body text-[12px] text-[var(--text-secondary)]"
          >
            {deliverToOperatingAreaHeading()}
          </p>
          <p className="font-body text-[15px] font-bold leading-none text-[var(--text-primary)]">
            {deliverToOperatingAreaLocality()}
            {postalCode.length === 6 ? ` · ${postalCode}` : null}
          </p>
        </div>
        <details className="font-body text-[13px] text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--interactive-primary)] underline-offset-2 hover:underline">
            Check delivery PIN
          </summary>
          <div className="mt-3">
            <PinFields postalCode={postalCode} onPostalCodeChange={onPostalCodeChange} />
          </div>
        </details>

        {serviceabilityNote ? (
          <p role="status" className="w-full font-body text-[13px] text-[var(--text-secondary)]">
            {serviceabilityNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PinFields(props: {
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
}) {
  const { postalCode, onPostalCodeChange } = props;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          onChange={(event) =>
            onPostalCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="font-body text-[15px] border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2 min-h-[44px] rounded-md"
        />
      </div>
      <p className="mt-2 font-body text-[12px] text-[var(--text-tertiary)]">
        {deliverToOrientationBody()} {deliverToPinHint()}
      </p>
    </>
  );
}

export function NavDeliverToOrientation() {
  const [postalCode, setPostalCode] = useState(() => readDeliveryPinContext());

  useEffect(() => subscribeToDeliveryPinContext(setPostalCode), []);

  function handlePostalCodeChange(value: string): void {
    setPostalCode(value);
    writeDeliveryPinContext(value);
  }

  return (
    <DeliverToOrientation
      variant="header-pill"
      postalCode={postalCode}
      onPostalCodeChange={handlePostalCodeChange}
    />
  );
}
