"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  geolocationFailureCopy,
  serviceabilityRecoveryHint,
  serviceabilityStatusCopy,
} from "@/components/location/serviceability-copy";
import { Button } from "@/components/ui/Button";
import {
  evaluateDeliveryServiceability,
  type CommerceServiceabilityDecision,
} from "@/lib/customer-commerce";
import {
  reverseGeocodeLocation,
  type NormalizedCommerceLocation,
} from "@/lib/customer-commerce/location";
import { getDeviceCoordinates } from "@/lib/customer-location/geolocation";
import { isMapsJsConfigured } from "@/lib/customer-location/maps-js-config";
import { loadGoogleMapsJs } from "@/lib/customer-location/maps-js-loader";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";
import { cn } from "@/lib/utils";

const REVERSE_GEOCODE_DEBOUNCE_MS = 450;
const DEFAULT_ZOOM = 17;

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(location: NormalizedCommerceLocation): boolean {
  return parseCoordinate(location.latitude) !== null && parseCoordinate(location.longitude) !== null;
}

function locationCoordinates(
  location: NormalizedCommerceLocation,
): Readonly<{ latitude: string; longitude: string }> | null {
  if (!hasCoordinates(location)) return null;
  return Object.freeze({
    latitude: location.latitude!,
    longitude: location.longitude!,
  });
}

function formatAddressCard(location: NormalizedCommerceLocation): Readonly<{
  primary: string;
  secondary: string;
}> {
  const parts = location.displayAddress.split(",").map((part) => part.trim()).filter(Boolean);
  const primary = parts[0] ?? location.locality ?? "Selected location";
  const city = location.locality;
  const secondaryParts = [
    city && city !== primary ? city : null,
    location.administrativeArea && location.administrativeArea !== city ? null : null,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);
  if (city && city !== primary && !secondaryParts.includes(city)) {
    secondaryParts.unshift(city);
  }
  return Object.freeze({
    primary,
    secondary: secondaryParts.length > 0 ? secondaryParts.join(", ") : (city ?? ""),
  });
}

export function DeliveryLocationMapConfirmation(props: {
  initialLocation: NormalizedCommerceLocation;
  onConfirm: (location: NormalizedCommerceLocation, decision: CommerceServiceabilityDecision) => void;
  onBack: () => void;
  onChooseAnother: () => void;
  onUseCurrentLocation?: () => void;
  pending?: boolean;
}) {
  const { initialLocation, onConfirm, onBack, onChooseAnother, pending = false } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const serviceabilitySeqRef = useRef(0);
  const titleId = useId();
  const statusId = useId();

  const initialLat = parseCoordinate(initialLocation.latitude);
  const initialLng = parseCoordinate(initialLocation.longitude);
  const hasInitialCoordinates = initialLat !== null && initialLng !== null;
  const mapsConfigured = isMapsJsConfigured();

  const [mapsLoading, setMapsLoading] = useState(hasInitialCoordinates && mapsConfigured);
  const [mapsAvailable, setMapsAvailable] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [decision, setDecision] = useState<CommerceServiceabilityDecision | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const addressCard = formatAddressCard(location);
  const recoveryHint = decision ? serviceabilityRecoveryHint(decision.status) : null;
  const coordinates = locationCoordinates(location);
  const confirmEnabled =
    !pending &&
    !checkingServiceability &&
    !resolvingAddress &&
    decision?.status === "SERVICEABLE" &&
    coordinates !== null;

  const evaluateForLocation = useCallback(async (next: NormalizedCommerceLocation) => {
    const nextCoordinates = locationCoordinates(next);
    if (!nextCoordinates) {
      setDecision(null);
      setStatusMessage("We couldn't confirm this location. Try another search.");
      return;
    }
    const seq = ++serviceabilitySeqRef.current;
    setCheckingServiceability(true);
    setStatusMessage(null);
    setDecision(null);
    const evaluated = await evaluateDeliveryServiceability(
      DIRECT_ORDERING_BRAND_ID,
      nextCoordinates,
      next.postalCode,
    );
    if (seq !== serviceabilitySeqRef.current) return;
    setCheckingServiceability(false);
    if (!evaluated.ok) {
      setStatusMessage("We couldn't confirm delivery right now.");
      return;
    }
    const nextDecision = evaluated.data.decision;
    setDecision(nextDecision);
    setStatusMessage(serviceabilityStatusCopy(nextDecision.status));
  }, []);

  const reverseGeocodeCenter = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;
    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;
    setResolvingAddress(true);
    const result = await reverseGeocodeLocation(
      { latitude: center.lat(), longitude: center.lng() },
      controller.signal,
    );
    if (controller.signal.aborted) return;
    setResolvingAddress(false);
    if (!result.ok) {
      const fallback = Object.freeze({
        ...location,
        latitude: center.lat().toFixed(7),
        longitude: center.lng().toFixed(7),
      });
      setLocation(fallback);
      await evaluateForLocation(fallback);
      return;
    }
    const next = result.data.location;
    setLocation(next);
    await evaluateForLocation(next);
  }, [evaluateForLocation, location]);

  const scheduleReverseGeocode = useCallback(() => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      void reverseGeocodeCenter();
    }, REVERSE_GEOCODE_DEBOUNCE_MS);
  }, [reverseGeocodeCenter]);

  useEffect(() => {
    let cancelled = false;

    function runInitialServiceability(): void {
      window.setTimeout(() => {
        if (!cancelled) void evaluateForLocation(initialLocation);
      }, 0);
    }

    if (initialLat === null || initialLng === null) {
      runInitialServiceability();
      return () => {
        cancelled = true;
      };
    }

    if (!mapsConfigured) {
      runInitialServiceability();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const maps = await loadGoogleMapsJs();
      if (cancelled) return;
      setMapsLoading(false);
      if (!maps || !mapContainerRef.current) {
        setMapsAvailable(false);
        runInitialServiceability();
        return;
      }
      setMapsAvailable(true);
      const map = new maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: DEFAULT_ZOOM,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      map.addListener("dragstart", () => {
        setResolvingAddress(true);
      });
      map.addListener("idle", scheduleReverseGeocode);
      runInitialServiceability();
    })();

    return () => {
      cancelled = true;
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      reverseAbortRef.current?.abort();
    };
  }, [initialLocation, initialLat, initialLng, evaluateForLocation, scheduleReverseGeocode, mapsConfigured]);

  async function handleUseCurrentLocation(): Promise<void> {
    setStatusMessage(null);
    const geo = await getDeviceCoordinates();
    if (!geo.ok) {
      setStatusMessage(geolocationFailureCopy(geo.reason));
      return;
    }
    const reverse = await reverseGeocodeLocation({
      latitude: Number.parseFloat(geo.coordinates.latitude),
      longitude: Number.parseFloat(geo.coordinates.longitude),
    });
    const next = reverse.ok
      ? reverse.data.location
      : Object.freeze({
          displayAddress: "Current location",
          postalCode: null,
          pinConfirmed: false,
          locality: null,
          administrativeArea: null,
          stateCode: null,
          country: "India" as const,
          countryCode: "IN" as const,
          latitude: geo.coordinates.latitude,
          longitude: geo.coordinates.longitude,
        });
    setLocation(next);
    const lat = parseCoordinate(next.latitude);
    const lng = parseCoordinate(next.longitude);
    if (mapRef.current && lat !== null && lng !== null) {
      mapRef.current.setCenter({ lat, lng });
    }
    await evaluateForLocation(next);
  }

  function handleConfirm(): void {
    if (!confirmEnabled || !decision || !coordinates) return;
    onConfirm(location, decision);
  }

  return (
    <div
      className="flex flex-col gap-0 w-full h-full min-h-[70vh] sm:min-h-0"
      data-testid="delivery-location-map-confirmation"
      role="region"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
          onClick={onBack}
        >
          Back
        </button>
        <h2 id={titleId} className="font-display text-[22px] text-[var(--text-primary)]">
          Confirm location
        </h2>
        <button
          type="button"
          aria-label="Close"
          className="font-body text-[14px] text-[var(--text-secondary)] focus-ring rounded-sm px-2 py-1"
          onClick={onChooseAnother}
        >
          Close
        </button>
      </div>

      <div className="relative flex-1 min-h-[240px] bg-[var(--bg-section)]">
        {mapsAvailable ? (
          <>
            <div ref={mapContainerRef} className="absolute inset-0" data-testid="delivery-map-container" />
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
              aria-hidden="true"
            >
              <div
                className="relative -mt-8 flex flex-col items-center"
                data-testid="delivery-map-center-pin"
              >
                <div className="h-10 w-10 rounded-full border-2 border-[var(--interactive-primary)] bg-[var(--interactive-primary)]/20 shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
                <div className="h-3 w-0.5 bg-[var(--interactive-primary)]" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-body text-[15px] text-[var(--text-primary)]">{addressCard.primary}</p>
            <p className="font-body text-[14px] text-[var(--text-secondary)]">{addressCard.secondary}</p>
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              Map preview isn&apos;t available. You can still confirm using the address below.
            </p>
          </div>
        )}
        {mapsLoading ? (
          <p role="status" className="absolute top-3 left-3 rounded-md bg-[var(--bg-page)]/90 px-3 py-1 font-body text-[13px]">
            Loading map…
          </p>
        ) : null}
        {resolvingAddress ? (
          <p role="status" className="absolute top-3 right-3 rounded-md bg-[var(--bg-page)]/90 px-3 py-1 font-body text-[13px]">
            Finding address…
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-page)] p-4 flex flex-col gap-3">
        <div aria-live="polite" aria-atomic="true" id={statusId}>
          <p className="font-body text-[15px] font-semibold text-[var(--text-primary)]">{addressCard.primary}</p>
          <p className="font-body text-[14px] text-[var(--text-secondary)]">{addressCard.secondary}</p>
        </div>

        {mapsAvailable ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void handleUseCurrentLocation()}>
            Use current location
          </Button>
        ) : null}

        {checkingServiceability ? (
          <p role="status" className="font-body text-[13px] text-[var(--text-secondary)]">
            Checking delivery…
          </p>
        ) : null}

        {statusMessage ? (
          <p role="status" className={cn("font-body text-[14px]", decision?.status === "SERVICEABLE" ? "text-[var(--interactive-primary)]" : "text-[var(--text-secondary)]")}>
            {statusMessage}
          </p>
        ) : null}
        {recoveryHint ? (
          <p className="font-body text-[13px] text-[var(--text-secondary)]">{recoveryHint}</p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {decision?.status === "NOT_SERVICEABLE" || decision?.status === "TEMPORARILY_UNAVAILABLE" ? (
            <Button type="button" variant="primary" className="flex-1" onClick={onChooseAnother}>
              Choose another location
            </Button>
          ) : decision?.status === "INDETERMINATE" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={checkingServiceability}
                onClick={() => void evaluateForLocation(location)}
              >
                Retry
              </Button>
              <Button type="button" variant="primary" className="flex-1" onClick={onChooseAnother}>
                Choose another location
              </Button>
            </>
          ) : (
            <Button type="button" variant="primary" className="flex-1" disabled={!confirmEnabled} onClick={handleConfirm}>
              Confirm location
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
