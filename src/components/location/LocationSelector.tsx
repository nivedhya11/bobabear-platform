"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  addressFormToCreateInput,
  type AddressFormValues,
} from "@/components/account/AddressForm";
import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";
import { GoogleMapsAttribution } from "@/components/location/GoogleMapsAttribution";
import {
  geolocationFailureCopy,
  locationProviderUnavailableCopy,
  savedAddressReconfirmationCopy,
  serviceabilityRecoveryHint,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import { commerceErrorCopy } from "@/components/ordering/error-copy";
import { fetchCustomerSession } from "@/lib/customer-auth/client";
import {
  createOwnAddress,
  evaluateDeliveryServiceability,
  listOwnAddresses,
  type CommerceAddress,
  type CommerceServiceabilityDecision,
} from "@/lib/customer-commerce";
import {
  autocompleteLocation,
  getLocationProviderStatus,
  resolveLocationPlace,
  reverseGeocodeLocation,
  type LocationSuggestion,
  type NormalizedCommerceLocation,
} from "@/lib/customer-commerce/location";
import {
  deliveryContextTriggerLabel,
  useDeliveryContext,
  writeDeliveryContext,
} from "@/lib/customer-location/delivery-context";
import {
  compactNormalizedLocationLabel,
  deliveryHeaderContext,
} from "@/lib/customer-location/display-label";
import { getDeviceCoordinates } from "@/lib/customer-location/geolocation";
import { isMapsJsConfigured } from "@/lib/customer-location/maps-js-config";
import { savedAddressResults } from "@/lib/customer-location/location-provider";
import {
  completeLocationSearchSession,
  startLocationSearchSession,
  type LocationSearchSession,
} from "@/lib/customer-location/search-session";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 3;

type SelectorStep = "select" | "map" | "address";
type JourneyIntent = "set-context" | "add-address";

function hasMapCoordinates(location: NormalizedCommerceLocation): boolean {
  if (!location.latitude || !location.longitude) return false;
  const lat = Number.parseFloat(location.latitude);
  const lng = Number.parseFloat(location.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function locationToAddressForm(location: NormalizedCommerceLocation): AddressFormValues {
  return {
    ...EMPTY_ADDRESS_FORM,
    addressLine1: location.displayAddress.split(",")[0]?.trim() ?? location.displayAddress,
    locality: location.locality ?? "",
    city: location.locality ?? "",
    stateCode: location.stateCode ?? "",
    postalCode: location.postalCode ?? "",
  };
}

function savedAddressCardCopy(address: CommerceAddress): Readonly<{ title: string; line: string; pinLine: string }> {
  const label = address.label?.trim() || "Address";
  const line = [address.addressLine1, address.addressLine2, address.locality]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
  const pinLine = [address.city, address.postalCode].filter(Boolean).join(" · ");
  return Object.freeze({ title: label, line, pinLine });
}

function locationCoordinates(
  location: NormalizedCommerceLocation,
): Readonly<{ latitude: string; longitude: string }> | null {
  if (!hasMapCoordinates(location)) return null;
  return Object.freeze({
    latitude: location.latitude!,
    longitude: location.longitude!,
  });
}

export function LocationSelector(props: {
  variant?: "page-strip" | "header-pill";
  serviceabilityNote?: string | null;
}) {
  const { variant = "page-strip", serviceabilityNote } = props;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SelectorStep>("select");
  const [intent, setIntent] = useState<JourneyIntent>("set-context");
  const context = useDeliveryContext();
  const [query, setQuery] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<readonly CommerceAddress[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<CommerceServiceabilityDecision | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [providerStatusLoaded, setProviderStatusLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly LocationSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingLocation, setPendingLocation] = useState<NormalizedCommerceLocation | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSessionRef = useRef<LocationSearchSession | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const providerConfiguredRef = useRef(false);
  const queryRef = useRef("");
  const titleId = useId();
  const listboxId = useId();
  const comboboxId = useId();
  const isHeaderPill = variant === "header-pill";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      const status = await getLocationProviderStatus();
      if (cancelled) return;
      const configured = status.ok && status.data.configured === true;
      providerConfiguredRef.current = configured;
      setProviderConfigured(configured);
      setProviderStatusLoaded(true);
      if (!configured) {
        setStatusMessage(locationProviderUnavailableCopy());
      }
    })();

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
    if (!open || !providerConfigured) return;
    const trimmed = queryRef.current.trim();
    if (trimmed.length >= SEARCH_MIN_CHARS) {
      scheduleAutocomplete(trimmed);
    }
  }, [open, providerConfigured]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetSearchState(): void {
    searchAbortRef.current?.abort();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    searchSessionRef.current = null;
    setSuggestions([]);
    setSearching(false);
    setActiveIndex(-1);
  }

  function resetFlowState(): void {
    resetSearchState();
    setStep("select");
    setIntent("set-context");
    setPendingLocation(null);
    setDecision(null);
    setStatusMessage(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setProviderStatusLoaded(false);
    providerConfiguredRef.current = false;
    setProviderConfigured(false);
    queryRef.current = "";
    setQuery("");
  }

  function closeDialog(): void {
    resetFlowState();
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function returnToSearch(): void {
    setStep("select");
    setPendingLocation(null);
    setDecision(null);
    setStatusMessage(null);
    resetSearchState();
    const trimmed = queryRef.current.trim();
    if (providerConfiguredRef.current && trimmed.length >= SEARCH_MIN_CHARS) {
      setSearching(true);
      scheduleAutocomplete(trimmed);
    }
  }

  function scheduleAutocomplete(nextQuery: string): void {
    const trimmed = nextQuery.trim();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!providerConfiguredRef.current || trimmed.length < SEARCH_MIN_CHARS) {
      searchAbortRef.current?.abort();
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const existing = searchSessionRef.current;
    const session =
      existing && !existing.completed ? existing : startLocationSearchSession();
    searchSessionRef.current = session;
    debounceTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current?.abort();
      searchAbortRef.current = controller;
      setSearching(true);
      void autocompleteLocation(
        { query: trimmed, sessionToken: session.token },
        controller.signal,
      ).then((result) => {
        if (controller.signal.aborted) return;
        setSearching(false);
        if (!result.ok) {
          setSuggestions([]);
          setStatusMessage(locationProviderUnavailableCopy());
          return;
        }
        setSuggestions(result.data.suggestions);
        setActiveIndex(-1);
        if (result.data.suggestions.length === 0) {
          setStatusMessage("No matching places. Try another search.");
        } else {
          setStatusMessage(null);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  async function evaluateAndPresent(
    location: NormalizedCommerceLocation,
    nextIntent: JourneyIntent,
  ): Promise<void> {
    const coordinates = locationCoordinates(location);
    if (!coordinates) {
      setPendingLocation(location);
      setStatusMessage("We couldn't confirm this location. Try another search.");
      setDecision(null);
      return;
    }
    setPending(true);
    setStatusMessage(null);
    setDecision(null);
    const evaluated = await evaluateDeliveryServiceability(
      DIRECT_ORDERING_BRAND_ID,
      coordinates,
      location.postalCode,
    );
    setPending(false);
    if (!evaluated.ok) {
      setStatusMessage("We couldn't confirm delivery right now.");
      return;
    }
    const nextDecision = evaluated.data.decision;
    setDecision(nextDecision);
    setStatusMessage(serviceabilityStatusCopy(nextDecision.status));
    if (nextDecision.status !== "SERVICEABLE") return;

    if (nextIntent === "add-address") {
      setAddressForm(locationToAddressForm(location));
      setPendingLocation(location);
      setStep("address");
      return;
    }

    writeDeliveryContext({
      postalCode: location.postalCode ?? undefined,
      displayLabel: compactNormalizedLocationLabel(location),
      source: "location_search",
      coordinates,
    });
    closeDialog();
  }

  async function openLocationOnMap(
    location: NormalizedCommerceLocation,
    nextIntent: JourneyIntent,
  ): Promise<void> {
    setIntent(nextIntent);
    setPendingLocation(location);
    setDecision(null);
    setStatusMessage(null);
    if (hasMapCoordinates(location) && isMapsJsConfigured()) {
      setStep("map");
      return;
    }
    await evaluateAndPresent(location, nextIntent);
  }

  async function handleSelectSuggestion(suggestion: LocationSuggestion): Promise<void> {
    const token = searchSessionRef.current && !searchSessionRef.current.completed
      ? searchSessionRef.current.token
      : null;
    if (!token) return;
    setPending(true);
    setStatusMessage(null);
    const resolved = await resolveLocationPlace({
      placeId: suggestion.placeId,
      sessionToken: token,
    });
    const completed = completeLocationSearchSession(searchSessionRef.current!);
    searchSessionRef.current = completed;
    setPending(false);
    if (!resolved.ok) {
      setStatusMessage(locationProviderUnavailableCopy());
      return;
    }
    await openLocationOnMap(resolved.data.location, intent);
  }

  async function handleDeviceLocation(nextIntent: JourneyIntent = intent): Promise<void> {
    setPending(true);
    setStatusMessage(null);
    const geo = await getDeviceCoordinates();
    if (!geo.ok) {
      setPending(false);
      setStatusMessage(geolocationFailureCopy(geo.reason));
      return;
    }
    const coordinates = geo.coordinates;
    let location: NormalizedCommerceLocation = Object.freeze({
      displayAddress: "Current location",
      postalCode: null,
      pinConfirmed: false,
      locality: null,
      administrativeArea: null,
      stateCode: null,
      country: "India",
      countryCode: "IN",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
    if (providerConfigured) {
      const reverse = await reverseGeocodeLocation({
        latitude: Number.parseFloat(coordinates.latitude),
        longitude: Number.parseFloat(coordinates.longitude),
      });
      if (reverse.ok) {
        location = reverse.data.location;
      }
    }
    setPending(false);
    await openLocationOnMap(location, nextIntent);
  }

  async function handleSavedAddress(address: CommerceAddress): Promise<void> {
    if (address.coordinates) {
      setPending(true);
      setStatusMessage(null);
      setDecision(null);
      const evaluated = await evaluateDeliveryServiceability(
        DIRECT_ORDERING_BRAND_ID,
        address.coordinates,
        address.postalCode,
      );
      setPending(false);
      if (!evaluated.ok) {
        setStatusMessage("We couldn't confirm delivery right now.");
        return;
      }
      const nextDecision = evaluated.data.decision;
      setDecision(nextDecision);
      setStatusMessage(serviceabilityStatusCopy(nextDecision.status));
      if (nextDecision.status !== "SERVICEABLE") return;
      const result = savedAddressResults([address])[0]!;
      writeDeliveryContext({
        postalCode: address.postalCode,
        displayLabel: result.displayLabel,
        source: "saved_address",
        savedAddressId: address.id,
        coordinates: address.coordinates,
      });
      closeDialog();
      return;
    }

    if (!providerConfigured) {
      setStatusMessage(savedAddressReconfirmationCopy());
      return;
    }

    setStatusMessage(savedAddressReconfirmationCopy());
    setQuery([address.addressLine1, address.locality, address.city].filter(Boolean).join(", "));
    return;
  }

  async function handleMapConfirm(
    location: NormalizedCommerceLocation,
    mapDecision: CommerceServiceabilityDecision,
  ): Promise<void> {
    const coordinates = locationCoordinates(location);
    if (mapDecision.status !== "SERVICEABLE" || !coordinates) return;
    if (intent === "add-address") {
      setAddressForm(locationToAddressForm(location));
      setPendingLocation(location);
      setStep("address");
      return;
    }
    writeDeliveryContext({
      postalCode: location.postalCode ?? undefined,
      displayLabel: compactNormalizedLocationLabel(location),
      source: "location_search",
      coordinates,
    });
    closeDialog();
  }

  async function handleSaveAddress(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setStatusMessage(null);
    const created = await createOwnAddress({
      ...addressFormToCreateInput(addressForm),
      makeDefault: savedAddresses.length === 0,
      coordinates: pendingLocation ? locationCoordinates(pendingLocation) : null,
    });
    setPending(false);
    if (!created.ok) {
      setStatusMessage(commerceErrorCopy(created.code));
      return;
    }
    const coordinates = pendingLocation ? locationCoordinates(pendingLocation) : null;
    if (coordinates) {
      writeDeliveryContext({
        postalCode: pendingLocation?.postalCode ?? undefined,
        displayLabel: pendingLocation
          ? compactNormalizedLocationLabel(pendingLocation)
          : "Selected location",
        source: "saved_address",
        savedAddressId: created.data.address.id,
        coordinates,
      });
    }
    closeDialog();
  }

  function startAddAddress(): void {
    setIntent("add-address");
    setStatusMessage(null);
    setDecision(null);
  }

  const header = deliveryHeaderContext(deliveryContextTriggerLabel(context), "Dehradun");
  const searchUnavailable = providerStatusLoaded && !providerConfigured;
  const trimmedQuery = query.trim();
  const showSearchSearching =
    searching && trimmedQuery.length >= SEARCH_MIN_CHARS && providerConfigured;
  const showSearchNoResults =
    !searching &&
    providerConfigured &&
    trimmedQuery.length >= SEARCH_MIN_CHARS &&
    suggestions.length === 0 &&
    statusMessage === "No matching places. Try another search.";
  const recoveryHint = decision ? serviceabilityRecoveryHint(decision.status) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid={isHeaderPill ? "deliver-to-header-orientation" : "deliver-to-orientation"}
        onClick={() => {
          resetFlowState();
          setOpen(true);
        }}
        className={cn(
          "font-body text-left focus-ring rounded-md",
          isHeaderPill
            ? "hidden lg:flex flex-col items-start rounded-full border border-[var(--border-strong)] bg-[var(--bg-section)]/80 px-4 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
            : "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] lg:hidden",
        )}
      >
        <span className="font-body text-[12px] text-[var(--text-secondary)]">{header.title}</span>
        <span className="font-body text-[15px] font-bold text-[var(--text-primary)] line-clamp-1">
          {header.context}
        </span>
      </button>

      {!isHeaderPill && serviceabilityNote ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)] lg:hidden">
          {serviceabilityNote}
        </p>
      ) : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className="fixed inset-0 z-[70] flex items-end sm:items-stretch sm:justify-end bg-black/60"
              data-testid="location-selector-dialog"
            >
              <div
                className={cn(
                  "w-full bg-[var(--bg-page)] flex flex-col min-h-0 overflow-hidden",
                  step === "map"
                    ? "h-[100dvh] sm:h-full sm:max-w-xl sm:border-l sm:border-[var(--border-strong)]"
                    : "h-[95dvh] sm:h-full sm:max-w-md sm:border-l sm:border-[var(--border-strong)] rounded-t-xl sm:rounded-none",
                )}
                data-testid="location-selector-panel"
              >
                {step === "map" && pendingLocation ? (
                  <DeliveryLocationMapConfirmation
                    brandId={DIRECT_ORDERING_BRAND_ID}
                    initialLocation={pendingLocation}
                    pending={pending}
                    onBack={returnToSearch}
                    onChooseAnother={returnToSearch}
                    onConfirm={(location, mapDecision) => void handleMapConfirm(location, mapDecision)}
                  />
                ) : step === "address" ? (
                  <>
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
                      <h2 id={titleId} className="font-display text-[28px] text-[var(--text-primary)]">
                        Complete delivery address
                      </h2>
                      <button
                        type="button"
                        aria-label="Close"
                        className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
                        onClick={() => closeDialog()}
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-5">
                      {pendingLocation ? (
                        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)] p-3">
                          <p className="font-body text-[13px] text-[var(--text-secondary)]">Confirmed location</p>
                          <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
                            {pendingLocation.displayAddress}
                          </p>
                        </div>
                      ) : null}
                      <form onSubmit={(event) => void handleSaveAddress(event)} className="flex flex-col gap-4">
                        <AddressForm values={addressForm} onChange={setAddressForm} disabled={pending} idPrefix="delivery" />
                        <Button type="submit" variant="primary" disabled={pending}>
                          Save address
                        </Button>
                      </form>
                      {statusMessage ? (
                        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
                          {statusMessage}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
                      <h2 id={titleId} className="font-display text-[28px] text-[var(--text-primary)]">
                        Select delivery location
                      </h2>
                      <button
                        type="button"
                        aria-label="Close"
                        className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
                        onClick={() => closeDialog()}
                      >
                        Close
                      </button>
                    </div>
                    <div
                      className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-5"
                      data-testid="location-selector-body"
                    >
                      <div className="flex flex-col gap-2">
                        <label className="font-body text-[13px] font-semibold" htmlFor={comboboxId}>
                          Search area, street or landmark
                          <input
                            id={comboboxId}
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={suggestions.length > 0}
                            aria-controls={listboxId}
                            aria-activedescendant={
                              activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
                            }
                            className="mt-1 h-11 w-full border border-[var(--border-strong)] bg-transparent px-3 rounded-md"
                            value={query}
                            placeholder="Search area, street or landmark"
                            disabled={pending}
                            autoComplete="off"
                            onChange={(event) => {
                              const value = event.target.value;
                              queryRef.current = value;
                              setQuery(value);
                              scheduleAutocomplete(value);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
                              } else if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setActiveIndex((index) => Math.max(index - 1, 0));
                              } else if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
                                event.preventDefault();
                                void handleSelectSuggestion(suggestions[activeIndex]!);
                              }
                            }}
                          />
                        </label>
                        {searchUnavailable ? (
                          <p className="font-body text-[13px] text-[var(--text-secondary)]">
                            {locationProviderUnavailableCopy()}
                          </p>
                        ) : null}
                        {showSearchSearching ? (
                          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
                            Finding locations…
                          </p>
                        ) : null}
                        {showSearchNoResults ? (
                          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
                            No matching places. Try another search.
                          </p>
                        ) : null}
                        {suggestions.length > 0 ? (
                          <ul
                            id={listboxId}
                            role="listbox"
                            className="flex flex-col gap-1 border border-[var(--border-subtle)] bg-[var(--bg-section)] p-1 rounded-md"
                            data-testid="location-search-results"
                          >
                            {suggestions.map((suggestion, index) => (
                              <li key={suggestion.placeId} role="presentation">
                                <button
                                  type="button"
                                  role="option"
                                  id={`${listboxId}-opt-${index}`}
                                  aria-selected={index === activeIndex}
                                  disabled={pending}
                                  className={cn(
                                    "w-full text-left px-3 py-2 font-body text-[14px] focus-ring rounded-sm",
                                    index === activeIndex
                                      ? "bg-[var(--interactive-ghost-hover)]"
                                      : "hover:bg-[var(--interactive-ghost-hover)]",
                                  )}
                                  onClick={() => void handleSelectSuggestion(suggestion)}
                                >
                                  {suggestion.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {suggestions.length > 0 ? <GoogleMapsAttribution /> : null}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void handleDeviceLocation("set-context")}
                      >
                        Use current location
                      </Button>

                      {authenticated ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body text-[13px] font-semibold">Saved addresses</p>
                            <button
                              type="button"
                              className="font-body text-[13px] text-[var(--interactive-primary)] focus-ring rounded-sm"
                              onClick={startAddAddress}
                            >
                              Add new address
                            </button>
                          </div>
                          {savedAddresses.length === 0 ? (
                            <p className="font-body text-[13px] text-[var(--text-secondary)]">
                              No saved addresses yet.
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-2" data-testid="location-saved-results">
                              {savedAddresses.map((address) => {
                                const card = savedAddressCardCopy(address);
                                return (
                                  <li key={address.id}>
                                    <button
                                      type="button"
                                      disabled={pending}
                                      className="w-full text-left border border-[var(--border-subtle)] rounded-lg px-3 py-3 font-body hover:bg-[var(--interactive-ghost-hover)] focus-ring"
                                      onClick={() => void handleSavedAddress(address)}
                                    >
                                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                                        {card.title}
                                        {address.isDefault ? (
                                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                                            Default
                                          </span>
                                        ) : null}
                                      </p>
                                      <p className="text-[13px] text-[var(--text-secondary)]">{card.line}</p>
                                      <p className="text-[13px] text-[var(--text-secondary)]">{card.pinLine}</p>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}

                      {authenticated && intent === "add-address" ? (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={pending}
                          onClick={() => void handleDeviceLocation("add-address")}
                        >
                          Add address using current location
                        </Button>
                      ) : null}

                      {statusMessage ? (
                        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
                          {statusMessage}
                        </p>
                      ) : null}
                      {recoveryHint ? (
                        <p className="font-body text-[13px] text-[var(--text-secondary)]">{recoveryHint}</p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function NavLocationSelector() {
  return <LocationSelector variant="header-pill" />;
}
