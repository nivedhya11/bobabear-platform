"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  geolocationFailureCopy,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import {
  evaluateDeliveryServiceability,
  listOwnAddresses,
  type CommerceAddress,
  type CommerceServiceabilityDecision,
} from "@/lib/customer-commerce";
import {
  deliveryContextTriggerLabel,
  readDeliveryContext,
  subscribeToDeliveryContext,
  writeDeliveryContext,
  type DeliveryContext,
} from "@/lib/customer-location/delivery-context";
import { getDeviceCoordinates } from "@/lib/customer-location/geolocation";
import { manualOnlyProvider } from "@/lib/customer-location/location-provider";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";
import { cn } from "@/lib/utils";

export function LocationSelector(props: {
  variant?: "page-strip" | "header-pill";
  serviceabilityNote?: string | null;
}) {
  const { variant = "page-strip", serviceabilityNote } = props;
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<DeliveryContext>(() => readDeliveryContext());
  const [query, setQuery] = useState("");
  const [manualPin, setManualPin] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<readonly CommerceAddress[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<CommerceServiceabilityDecision | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const isHeaderPill = variant === "header-pill";

  useEffect(() => subscribeToDeliveryContext(setContext), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const session = await fetchCustomerSession();
      if (cancelled) return;
      if (!session.ok || !session.data.authenticated) {
        setAuthenticated(false);
        setSavedAddresses([]);
        return;
      }
      setAuthenticated(true);
      const listed = await listOwnAddresses();
      if (cancelled) return;
      if (listed.ok) setSavedAddresses(listed.data.addresses);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  const searchResults = manualOnlyProvider.search(query, authenticated ? savedAddresses : []);

  async function applySelection(input: Readonly<{
    postalCode: string;
    displayLabel: string;
    source: DeliveryContext["source"];
    savedAddressId?: string;
  }>): Promise<void> {
    if (!/^\d{6}$/.test(input.postalCode)) {
      setStatusMessage("Enter a valid 6-digit PIN.");
      setDecision(null);
      return;
    }
    setPending(true);
    setStatusMessage(null);
    setDecision(null);
    const evaluated = await evaluateDeliveryServiceability(
      DIRECT_ORDERING_BRAND_ID,
      input.postalCode,
    );
    setPending(false);
    if (!evaluated.ok) {
      setStatusMessage("We couldn't check delivery right now. Try again shortly.");
      return;
    }
    const nextDecision = evaluated.data.decision;
    setDecision(nextDecision);
    setStatusMessage(serviceabilityStatusCopy(nextDecision.status));
    writeDeliveryContext({
      postalCode: input.postalCode,
      displayLabel: input.displayLabel,
      source: input.source,
      savedAddressId: input.savedAddressId,
    });
    if (nextDecision.status === "SERVICEABLE" || nextDecision.status === "NOT_SERVICEABLE") {
      setOpen(false);
      setQuery("");
      setManualPin("");
    }
  }

  async function handleManualPinSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    await applySelection({
      postalCode: manualPin,
      displayLabel: manualPin,
      source: "manual_pin",
    });
  }

  async function handleDeviceLocation(): Promise<void> {
    setPending(true);
    setStatusMessage(null);
    const geo = await getDeviceCoordinates();
    if (!geo.ok) {
      setPending(false);
      setStatusMessage(geolocationFailureCopy(geo.reason));
      return;
    }
    const pin = context.postalCode.length === 6 ? context.postalCode : manualPin;
    if (!/^\d{6}$/.test(pin)) {
      setPending(false);
      setStatusMessage("Enter your PIN to check delivery for your current location.");
      return;
    }
    setPending(false);
    await applySelection({
      postalCode: pin,
      displayLabel: "Current location",
      source: "device_location",
    });
  }

  const triggerLabel = deliveryContextTriggerLabel(context);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid={isHeaderPill ? "deliver-to-header-orientation" : "deliver-to-orientation"}
        onClick={() => {
          setManualPin(context.postalCode);
          setOpen(true);
        }}
        className={cn(
          "font-body text-left focus-ring rounded-md",
          isHeaderPill
            ? "hidden lg:flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-section)]/80 px-4 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
            : "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] lg:hidden",
        )}
      >
        <span className="font-body text-[12px] text-[var(--text-secondary)]">Delivering to </span>
        <span className="font-body text-[15px] font-bold text-[var(--text-primary)]">{triggerLabel}</span>
      </button>

      {!isHeaderPill && serviceabilityNote ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)] lg:hidden">
          {serviceabilityNote}
        </p>
      ) : null}

      {open ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
          data-testid="location-selector-dialog"
        >
          <div className="w-full max-w-lg rounded-t-xl sm:rounded-xl border border-[var(--border-strong)] bg-[var(--bg-page)] p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-[28px] text-[var(--text-primary)]">
                Delivery location
              </h2>
              <button
                type="button"
                aria-label="Close"
                className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <label className="font-body text-[13px] font-semibold">
              Search saved addresses
              <input
                className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                value={query}
                placeholder={authenticated ? "Search by name, area, or PIN" : "Sign in to search saved addresses"}
                disabled={!authenticated || pending}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            {authenticated && searchResults.length > 0 ? (
              <ul className="flex flex-col gap-2" data-testid="location-saved-results">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      disabled={pending}
                      className="w-full text-left border border-[var(--border-subtle)] px-3 py-2 font-body text-[14px] hover:bg-[var(--interactive-ghost-hover)] focus-ring rounded-sm"
                      onClick={() =>
                        void applySelection({
                          postalCode: result.postalCode,
                          displayLabel: result.displayLabel,
                          source: "saved_address",
                          savedAddressId: result.savedAddressId,
                        })
                      }
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <form onSubmit={(event) => void handleManualPinSubmit(event)} className="flex flex-col gap-3">
              <label className="font-body text-[13px] font-semibold">
                Enter PIN manually
                <input
                  className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={manualPin}
                  disabled={pending}
                  onChange={(event) =>
                    setManualPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
              </label>
              <Button type="submit" variant="primary" disabled={pending || manualPin.length !== 6}>
                Use this PIN
              </Button>
            </form>

            <Button type="button" variant="outline" disabled={pending} onClick={() => void handleDeviceLocation()}>
              Use current device location
            </Button>

            {statusMessage ? (
              <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
                {statusMessage}
              </p>
            ) : null}
            {decision ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Serviceability: {decision.status}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function NavLocationSelector() {
  return <LocationSelector variant="header-pill" />;
}
