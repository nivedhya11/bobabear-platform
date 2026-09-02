"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  addressFormToCreateInput,
  type AddressFormValues,
} from "@/components/account/AddressForm";
import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";
import { GoogleMapsAttribution } from "@/components/location/GoogleMapsAttribution";
import {
  commerceAddressToNormalizedLocation,
  hasMapCoordinates,
  locationCoordinates,
  locationToAddressForm,
  savedAddressCardCopy,
} from "@/components/location/location-flow-helpers";
import {
  geolocationFailureCopy,
  locationProviderUnavailableCopy,
  savedAddressReconfirmationCopy,
  serviceabilityRecoveryHint,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import {
  evaluateDeliveryServiceability,
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
import { getDeviceCoordinates } from "@/lib/customer-location/geolocation";
import { isMapsJsConfigured } from "@/lib/customer-location/maps-js-config";
import {
  completeLocationSearchSession,
  startLocationSearchSession,
  type LocationSearchSession,
} from "@/lib/customer-location/search-session";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 3;

type FlowStep = "select" | "map" | "address";
type FlowIntent = "use-saved" | "add-new" | "one-time";

export type CheckoutDestinationDraft =
  | Readonly<{ kind: "SAVED_ADDRESS"; savedAddressId: string }>
  | Readonly<{
      kind: "ONE_TIME_ADDRESS";
      recipientName: string;
      recipientPhone: string;
      addressLine1: string;
      addressLine2?: string | null;
      landmark?: string | null;
      locality?: string | null;
      city: string;
      stateCode: string;
      postalCode: string;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
      label?: string | null;
    }>
  | Readonly<{
      kind: "NEW_SAVED_ADDRESS";
      createInput: ReturnType<typeof addressFormToCreateInput> & {
        coordinates: Readonly<{ latitude: string; longitude: string }>;
      };
    }>
  | Readonly<{
      kind: "UPDATE_SAVED_COORDINATES";
      savedAddressId: string;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
    }>;

export function CheckoutDestinationFlow(props: {
  brandId: string;
  addresses: readonly CommerceAddress[];
  pending: boolean;
  onComplete: (draft: CheckoutDestinationDraft) => void;
}) {
  const { brandId, addresses, pending, onComplete } = props;
  const [step, setStep] = useState<FlowStep>("select");
  const [intent, setIntent] = useState<FlowIntent>("use-saved");
  const [query, setQuery] = useState("");
  const [flowPending, setFlowPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<CommerceServiceabilityDecision | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [providerStatusLoaded, setProviderStatusLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly LocationSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingLocation, setPendingLocation] = useState<NormalizedCommerceLocation | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const [reconfirmSavedAddressId, setReconfirmSavedAddressId] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSessionRef = useRef<LocationSearchSession | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const providerConfiguredRef = useRef(false);
  const queryRef = useRef("");
  const listboxId = useId();
  const comboboxId = useId();

  const busy = pending || flowPending;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getLocationProviderStatus();
      if (cancelled) return;
      const configured = status.ok && status.data.configured === true;
      providerConfiguredRef.current = configured;
      setProviderConfigured(configured);
      setProviderStatusLoaded(true);
      if (!configured) setStatusMessage(locationProviderUnavailableCopy());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetSearchState(): void {
    searchAbortRef.current?.abort();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    searchSessionRef.current = null;
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function returnToSearch(): void {
    setStep("select");
    setPendingLocation(null);
    setDecision(null);
    setStatusMessage(null);
    setReconfirmSavedAddressId(null);
    resetSearchState();
    const trimmed = queryRef.current.trim();
    if (providerConfiguredRef.current && trimmed.length >= SEARCH_MIN_CHARS) {
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
      return;
    }
    const existing = searchSessionRef.current;
    const session = existing && !existing.completed ? existing : startLocationSearchSession();
    searchSessionRef.current = session;
    debounceTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      searchAbortRef.current?.abort();
      searchAbortRef.current = controller;
      void autocompleteLocation({ query: trimmed, sessionToken: session.token }, controller.signal).then(
        (result) => {
          if (controller.signal.aborted) return;
          if (!result.ok) {
            setSuggestions([]);
            setStatusMessage(locationProviderUnavailableCopy());
            return;
          }
          setSuggestions(result.data.suggestions);
          setActiveIndex(-1);
          setStatusMessage(
            result.data.suggestions.length === 0 ? "No matching places. Try another search." : null,
          );
        },
      );
    }, SEARCH_DEBOUNCE_MS);
  }

  async function evaluateServiceability(
    coordinates: Readonly<{ latitude: string; longitude: string }>,
    postalCode: string | null,
  ): Promise<CommerceServiceabilityDecision | null> {
    setFlowPending(true);
    setStatusMessage(null);
    setDecision(null);
    const evaluated = await evaluateDeliveryServiceability(brandId, coordinates, postalCode);
    setFlowPending(false);
    if (!evaluated.ok) {
      setStatusMessage("We couldn't confirm delivery right now.");
      return null;
    }
    const nextDecision = evaluated.data.decision;
    setDecision(nextDecision);
    setStatusMessage(serviceabilityStatusCopy(nextDecision.status));
    return nextDecision;
  }

  async function openLocationOnMap(
    location: NormalizedCommerceLocation,
    nextIntent: FlowIntent,
    savedAddressId: string | null = null,
  ): Promise<void> {
    setIntent(nextIntent);
    setPendingLocation(location);
    setReconfirmSavedAddressId(savedAddressId);
    setDecision(null);
    setStatusMessage(null);
    if (hasMapCoordinates(location) && isMapsJsConfigured()) {
      setStep("map");
      return;
    }
    const coordinates = locationCoordinates(location);
    if (!coordinates) {
      setStatusMessage("We couldn't confirm this location. Try another search.");
      return;
    }
    const nextDecision = await evaluateServiceability(coordinates, location.postalCode);
    if (!nextDecision || nextDecision.status !== "SERVICEABLE") return;
    if (nextIntent === "add-new" || nextIntent === "one-time") {
      setAddressForm(locationToAddressForm(location));
      setStep("address");
      return;
    }
    if (savedAddressId) {
      onComplete({ kind: "UPDATE_SAVED_COORDINATES", savedAddressId, coordinates });
    }
  }

  async function handleSelectSuggestion(suggestion: LocationSuggestion): Promise<void> {
    const token =
      searchSessionRef.current && !searchSessionRef.current.completed
        ? searchSessionRef.current.token
        : null;
    if (!token) return;
    setFlowPending(true);
    const resolved = await resolveLocationPlace({ placeId: suggestion.placeId, sessionToken: token });
    searchSessionRef.current = completeLocationSearchSession(searchSessionRef.current!);
    setFlowPending(false);
    if (!resolved.ok) {
      setStatusMessage(locationProviderUnavailableCopy());
      return;
    }
    const searchIntent = intent === "add-new" ? "add-new" : "one-time";
    setIntent(searchIntent);
    await openLocationOnMap(resolved.data.location, searchIntent, reconfirmSavedAddressId);
  }

  async function handleDeviceLocation(nextIntent: FlowIntent): Promise<void> {
    setFlowPending(true);
    const geo = await getDeviceCoordinates();
    if (!geo.ok) {
      setFlowPending(false);
      setStatusMessage(geolocationFailureCopy(geo.reason));
      return;
    }
    let location: NormalizedCommerceLocation = Object.freeze({
      displayAddress: "Current location",
      postalCode: null,
      pinConfirmed: false,
      locality: null,
      administrativeArea: null,
      stateCode: null,
      country: "India",
      countryCode: "IN",
      latitude: geo.coordinates.latitude,
      longitude: geo.coordinates.longitude,
    });
    if (providerConfigured) {
      const reverse = await reverseGeocodeLocation({
        latitude: Number.parseFloat(geo.coordinates.latitude),
        longitude: Number.parseFloat(geo.coordinates.longitude),
      });
      if (reverse.ok) location = reverse.data.location;
    }
    setFlowPending(false);
    await openLocationOnMap(location, nextIntent, reconfirmSavedAddressId);
  }

  async function handleSavedAddress(address: CommerceAddress): Promise<void> {
    setIntent("use-saved");
    if (address.coordinates) {
      const nextDecision = await evaluateServiceability(address.coordinates, address.postalCode);
      if (!nextDecision || nextDecision.status !== "SERVICEABLE") return;
      onComplete({ kind: "SAVED_ADDRESS", savedAddressId: address.id });
      return;
    }
    if (!providerConfigured) {
      setStatusMessage(savedAddressReconfirmationCopy());
      return;
    }
    setStatusMessage(savedAddressReconfirmationCopy());
    const searchText = [address.addressLine1, address.locality, address.city].filter(Boolean).join(", ");
    queryRef.current = searchText;
    setQuery(searchText);
    await openLocationOnMap(commerceAddressToNormalizedLocation(address), "use-saved", address.id);
  }

  async function handleMapConfirm(
    location: NormalizedCommerceLocation,
    mapDecision: CommerceServiceabilityDecision,
  ): Promise<void> {
    const coordinates = locationCoordinates(location);
    if (mapDecision.status !== "SERVICEABLE" || !coordinates) return;
    if (intent === "add-new" || intent === "one-time") {
      setAddressForm(locationToAddressForm(location));
      setPendingLocation(location);
      setStep("address");
      return;
    }
    if (reconfirmSavedAddressId) {
      onComplete({
        kind: "UPDATE_SAVED_COORDINATES",
        savedAddressId: reconfirmSavedAddressId,
        coordinates,
      });
    }
  }

  function handleAddressSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (busy || !pendingLocation) return;
    const coordinates = locationCoordinates(pendingLocation);
    if (!coordinates) {
      setStatusMessage("We couldn't confirm this location. Try another search.");
      return;
    }
    const input = addressFormToCreateInput(addressForm);
    if (intent === "one-time") {
      onComplete({ kind: "ONE_TIME_ADDRESS", ...input, coordinates });
      return;
    }
    onComplete({ kind: "NEW_SAVED_ADDRESS", createInput: { ...input, coordinates } });
  }

  const searchUnavailable = providerStatusLoaded && !providerConfigured;
  const recoveryHint = decision ? serviceabilityRecoveryHint(decision.status) : null;

  if (step === "map" && pendingLocation) {
    return (
      <div
        className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-[var(--border-strong)]"
        data-testid="checkout-destination-map"
      >
        <DeliveryLocationMapConfirmation
          initialLocation={pendingLocation}
          pending={busy}
          onBack={returnToSearch}
          onChooseAnother={returnToSearch}
          onConfirm={(location, mapDecision) => void handleMapConfirm(location, mapDecision)}
        />
      </div>
    );
  }

  if (step === "address") {
    return (
      <div className="flex flex-col gap-4" data-testid="checkout-destination-address">
        {pendingLocation ? (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)] p-3">
            <p className="font-body text-[13px] text-[var(--text-secondary)]">Confirmed location</p>
            <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">
              {pendingLocation.displayAddress}
            </p>
          </div>
        ) : null}
        <form onSubmit={handleAddressSubmit} className="flex flex-col gap-4">
          <AddressForm
            values={addressForm}
            onChange={setAddressForm}
            disabled={busy}
            idPrefix="checkout"
            hideAdministrativeFields
          />
          <Button type="submit" variant="primary" disabled={busy}>
            {intent === "one-time" ? "Use this destination" : "Save and continue"}
          </Button>
        </form>
        {statusMessage ? (
          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
            {statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="checkout-destination-select">
      <p className="font-body text-[15px] text-[var(--text-secondary)]">
        Search or choose a saved address. Delivery is confirmed from map coordinates, not PIN entry.
      </p>

      <div className="flex flex-col gap-2">
        <label className="font-body text-[13px] font-semibold" htmlFor={comboboxId}>
          Search area, street or landmark
          <input
            id={comboboxId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={listboxId}
            className="mt-1 h-11 w-full rounded-md border border-[var(--border-strong)] bg-transparent px-3"
            value={query}
            placeholder="Search area, street or landmark"
            disabled={busy}
            autoComplete="off"
            onChange={(event) => {
              queryRef.current = event.target.value;
              setQuery(event.target.value);
              scheduleAutocomplete(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
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
        {suggestions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="flex flex-col gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-section)] p-1"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} role="presentation">
                <button
                  type="button"
                  role="option"
                  disabled={busy}
                  className={cn(
                    "w-full rounded-sm px-3 py-2 text-left font-body text-[14px] focus-ring",
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setIntent("one-time");
            void handleDeviceLocation("one-time");
          }}
        >
          Use current location
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setIntent("add-new")}>
          Add new address
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setIntent("one-time")}>
          One-time destination
        </Button>
      </div>

      {intent === "add-new" || intent === "one-time" ? (
        <Button
          type="button"
          variant="primary"
          disabled={busy}
          onClick={() => void handleDeviceLocation(intent)}
        >
          {intent === "add-new" ? "Add address using current location" : "Locate one-time destination"}
        </Button>
      ) : null}

      {addresses.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="checkout-saved-addresses">
          {addresses.map((address) => {
            const card = savedAddressCardCopy(address);
            return (
              <li key={address.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-3 text-left font-body hover:bg-[var(--interactive-ghost-hover)] focus-ring"
                  onClick={() => void handleSavedAddress(address)}
                >
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{card.title}</p>
                  <p className="text-[13px] text-[var(--text-secondary)]">{card.line}</p>
                  <p className="text-[13px] text-[var(--text-secondary)]">{card.pinLine}</p>
                  {!address.coordinates ? (
                    <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">Map confirmation required</p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
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
  );
}
