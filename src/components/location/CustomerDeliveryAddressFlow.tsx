"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  AddressForm,
  EMPTY_ADDRESS_FORM,
  addressFormFromCommerceAddress,
  addressFormToCreateInput,
  addressFormToUpdateInput,
  type AddressFormValues,
} from "@/components/account/AddressForm";
import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";
import { GoogleMapsAttribution } from "@/components/location/GoogleMapsAttribution";
import {
  commerceAddressToNormalizedLocation,
  hasMapCoordinates,
  locationCoordinates,
  locationToAddressForm,
} from "@/components/location/location-flow-helpers";
import {
  geolocationFailureCopy,
  locationProviderUnavailableCopy,
  savedAddressReconfirmationCopy,
} from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import type { CommerceAddress } from "@/lib/customer-commerce";
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
import { getIndiaSubdivisionName } from "@/shared/customer-addresses";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 3;

type FlowStep = "location" | "map" | "details";

export type CustomerDeliveryAddressFlowMode =
  | Readonly<{ kind: "add" }>
  | Readonly<{ kind: "edit"; address: CommerceAddress }>
  | Readonly<{ kind: "reconfirm"; address: CommerceAddress }>;

export type CustomerDeliveryAddressFlowResult =
  | Readonly<{
      kind: "CREATE";
      input: ReturnType<typeof addressFormToCreateInput> & {
        coordinates: Readonly<{ latitude: string; longitude: string }>;
      };
    }>
  | Readonly<{
      kind: "UPDATE";
      addressId: string;
      input: ReturnType<typeof addressFormToUpdateInput>;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
    }>
  | Readonly<{
      kind: "RECONFIRM_COORDINATES";
      addressId: string;
      coordinates: Readonly<{ latitude: string; longitude: string }>;
    }>;

function formatNormalizedLocationSummary(location: NormalizedCommerceLocation): string {
  const stateName = location.stateCode
    ? (getIndiaSubdivisionName(location.stateCode) ?? location.stateCode)
    : null;
  const cityName = location.administrativeArea ?? location.locality;
  const cityLine = [cityName, stateName, location.postalCode].filter(Boolean).join(", ");
  const lines = [location.locality, cityLine].filter(
    (line): line is string => typeof line === "string" && line.trim().length > 0,
  );
  return lines.length > 0 ? lines.join("\n") : location.displayAddress;
}

function formatLocationSummaryFromForm(values: AddressFormValues): string {
  const stateName = values.stateCode
    ? (getIndiaSubdivisionName(values.stateCode) ?? values.stateCode)
    : null;
  const cityLine = [values.city, stateName, values.postalCode].filter(Boolean).join(", ");
  const lines = [values.locality, cityLine].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "Confirmed from your map selection";
}

function initialStep(mode: CustomerDeliveryAddressFlowMode): FlowStep {
  if (mode.kind === "edit" && mode.address.coordinates && isMapsJsConfigured()) {
    return "map";
  }
  if (mode.kind === "reconfirm") {
    return mode.address.coordinates && isMapsJsConfigured() ? "map" : "location";
  }
  return "location";
}

function initialLocation(mode: CustomerDeliveryAddressFlowMode): NormalizedCommerceLocation | null {
  if (mode.kind === "add") return null;
  return commerceAddressToNormalizedLocation(mode.address);
}

function initialForm(mode: CustomerDeliveryAddressFlowMode): AddressFormValues {
  if (mode.kind === "add") return EMPTY_ADDRESS_FORM;
  return addressFormFromCommerceAddress(mode.address);
}

export function CustomerDeliveryAddressFlow(props: {
  brandId: string;
  mode: CustomerDeliveryAddressFlowMode;
  pending?: boolean;
  onComplete: (result: CustomerDeliveryAddressFlowResult) => void;
  onCancel: () => void;
  testIdPrefix?: string;
}) {
  const { brandId, mode, pending = false, onComplete, onCancel, testIdPrefix = "customer-address-flow" } =
    props;

  const [step, setStep] = useState<FlowStep>(() => initialStep(mode));
  const [flowPending, setFlowPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(() =>
    mode.kind === "reconfirm" ? savedAddressReconfirmationCopy() : null,
  );
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [providerStatusLoaded, setProviderStatusLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<readonly LocationSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingLocation, setPendingLocation] = useState<NormalizedCommerceLocation | null>(() =>
    initialStep(mode) === "map" ? initialLocation(mode) : null,
  );
  const [confirmedLocation, setConfirmedLocation] = useState<NormalizedCommerceLocation | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormValues>(() => initialForm(mode));
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSessionRef = useRef<LocationSearchSession | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const providerConfiguredRef = useRef(false);
  const queryRef = useRef("");
  const listboxId = useId();
  const comboboxId = useId();

  const busy = pending || flowPending;
  const mapsConfigured = isMapsJsConfigured();

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

  function returnToLocationSearch(): void {
    setStep("location");
    setPendingLocation(null);
    setConfirmedLocation(null);
    setStatusMessage(mode.kind === "reconfirm" ? savedAddressReconfirmationCopy() : null);
    resetSearchState();
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

  async function openLocationOnMap(location: NormalizedCommerceLocation): Promise<void> {
    setPendingLocation(location);
    setStatusMessage(null);
    const coordinates = locationCoordinates(location);
    if (!coordinates) {
      setStatusMessage("We couldn't confirm this location. Try another search.");
      return;
    }
    if (mapsConfigured) {
      setStep("map");
      return;
    }
    setStatusMessage(locationProviderUnavailableCopy());
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
    await openLocationOnMap(resolved.data.location);
  }

  async function handleDeviceLocation(): Promise<void> {
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
    await openLocationOnMap(location);
  }

  async function handleMapConfirm(location: NormalizedCommerceLocation): Promise<void> {
    const coordinates = locationCoordinates(location);
    if (!coordinates) return;

    setConfirmedLocation(location);

    if (mode.kind === "reconfirm") {
      onComplete({
        kind: "RECONFIRM_COORDINATES",
        addressId: mode.address.id,
        coordinates,
      });
      return;
    }

    const nextForm =
      mode.kind === "edit"
        ? { ...locationToAddressForm(location), ...pickContactFields(addressForm) }
        : locationToAddressForm(location);

    setAddressForm(nextForm);
    setStep("details");
  }

  function pickContactFields(values: AddressFormValues): Partial<AddressFormValues> {
    return {
      recipientName: values.recipientName,
      recipientPhone: values.recipientPhone,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      landmark: values.landmark,
      label: values.label,
    };
  }

  function handleDetailsSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (busy) return;
    const location = confirmedLocation ?? pendingLocation;
    const coordinates = location ? locationCoordinates(location) : null;
    if (!coordinates) {
      setStatusMessage("We couldn't confirm this location. Try again.");
      return;
    }

    if (mode.kind === "edit") {
      onComplete({
        kind: "UPDATE",
        addressId: mode.address.id,
        input: addressFormToUpdateInput(addressForm),
        coordinates,
      });
      return;
    }

    onComplete({
      kind: "CREATE",
      input: { ...addressFormToCreateInput(addressForm), coordinates },
    });
  }

  const searchUnavailable = providerStatusLoaded && !providerConfigured;
  const locationSummary = confirmedLocation
    ? formatNormalizedLocationSummary(confirmedLocation)
    : pendingLocation
      ? formatNormalizedLocationSummary(pendingLocation)
      : formatLocationSummaryFromForm(addressForm);

  if (step === "map" && pendingLocation) {
    return (
      <div
        className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-[var(--border-strong)]"
        data-testid={`${testIdPrefix}-map`}
      >
        <DeliveryLocationMapConfirmation
          brandId={brandId}
          initialLocation={pendingLocation}
          pending={busy}
          onBack={returnToLocationSearch}
          onChooseAnother={returnToLocationSearch}
          onConfirm={(location, _decision) => void handleMapConfirm(location)}
        />
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="flex flex-col gap-4" data-testid={`${testIdPrefix}-details`}>
        <h2 className="font-display text-[22px] text-[var(--text-primary)]">Add address details</h2>
        {locationSummary ? (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)] p-3">
            <p className="font-body text-[13px] text-[var(--text-secondary)]">Delivery location</p>
            <p className="whitespace-pre-line font-body text-[15px] font-semibold text-[var(--text-primary)]">
              {locationSummary}
            </p>
          </div>
        ) : null}
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
          <AddressForm
            values={addressForm}
            onChange={setAddressForm}
            disabled={busy}
            idPrefix={testIdPrefix}
            hideAdministrativeFields
            mapFirstMode
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={busy}>
              {mode.kind === "edit" ? "Save address" : "Save address"}
            </Button>
            {mode.kind === "edit" ? (
              <Button type="button" variant="outline" disabled={busy} onClick={returnToLocationSearch}>
                Change location
              </Button>
            ) : null}
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
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
    <div className="flex flex-col gap-4" data-testid={`${testIdPrefix}-location`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] text-[var(--text-primary)]">Select delivery location</h2>
        <button
          type="button"
          className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body text-[13px] font-semibold" htmlFor={comboboxId}>
          Search area, street or nearby landmark
          <input
            id={comboboxId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={listboxId}
            className="mt-1 h-11 w-full rounded-md border border-[var(--border-strong)] bg-transparent px-3"
            value={query}
            placeholder="Search area, street or nearby landmark"
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

      <Button type="button" variant="outline" disabled={busy} onClick={() => void handleDeviceLocation()}>
        Use current location
      </Button>

      {statusMessage ? (
        <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
