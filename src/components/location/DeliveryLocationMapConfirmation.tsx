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
import { compactNormalizedLocationLabel } from "@/lib/customer-location/display-label";
import { isMapsJsConfigured } from "@/lib/customer-location/maps-js-config";
import { loadGoogleMapsJs } from "@/lib/customer-location/maps-js-loader";
import { waitForMapContainerReady } from "@/lib/customer-location/map-container-ready";
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
  const compact = compactNormalizedLocationLabel(location);
  const [primary, ...rest] = compact.split(",").map((part) => part.trim()).filter(Boolean);
  return Object.freeze({
    primary: primary ?? "Selected location",
    secondary: rest.join(", "),
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
  const mapInitRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const serviceabilitySeqRef = useRef(0);
  const titleId = useId();
  const statusId = useId();

  const initialLat = parseCoordinate(initialLocation.latitude);
  const initialLng = parseCoordinate(initialLocation.longitude);
  const hasInitialCoordinates = initialLat !== null && initialLng !== null;
  const mapsConfigured = isMapsJsConfigured();
  const wantsMap = hasInitialCoordinates && mapsConfigured;

  const [mapsLoading, setMapsLoading] = useState(hasInitialCoordinates && mapsConfigured);
  const [mapsAvailable, setMapsAvailable] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
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
    if (initialLat === null || initialLng === null) return;
    const timer = window.setTimeout(() => {
      void evaluateForLocation(initialLocation);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLat, initialLng, initialLocation, evaluateForLocation]);

  useEffect(() => {
    if (!wantsMap) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const abortController = new AbortController();

    void (async () => {
      const container = mapContainerRef.current;
      if (!container) {
        setMapsLoading(false);
        setMapsAvailable(false);
        return;
      }

      const ready = await waitForMapContainerReady(container, abortController.signal);
      if (cancelled || !ready || !mapContainerRef.current) {
        setMapsLoading(false);
        setMapsAvailable(false);
        if (!ready && !cancelled) {
          setMapInitError("Map container did not become visible.");
        }
        return;
      }

      const maps = await loadGoogleMapsJs();
      if (cancelled || !maps || !mapContainerRef.current) {
        setMapsLoading(false);
        setMapsAvailable(false);
        if (!maps && !cancelled) {
          setMapInitError("Maps JavaScript API did not load.");
        }
        return;
      }

      if (mapInitRef.current && mapRef.current) {
        setMapsLoading(false);
        setMapsAvailable(true);
        return;
      }

      const map = new maps.Map(mapContainerRef.current, {
        center: { lat: initialLat!, lng: initialLng! },
        zoom: DEFAULT_ZOOM,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapInitRef.current = true;
      mapRef.current = map;

      const triggerResize = (): void => {
        maps.event.trigger(map, "resize");
        map.setCenter({ lat: initialLat!, lng: initialLng! });
      };

      window.requestAnimationFrame(() => {
        if (cancelled) return;
        triggerResize();
      });

      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (cancelled || !mapRef.current) return;
          maps.event.trigger(mapRef.current, "resize");
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      map.addListener("dragstart", () => {
        setResolvingAddress(true);
      });
      map.addListener("idle", scheduleReverseGeocode);

      window.setTimeout(() => {
        if (cancelled || !mapContainerRef.current) return;

        const startedAt = Date.now();
        const verifyMapCanvas = (): void => {
          if (cancelled || !mapContainerRef.current) return;
          const hasGmStyle = mapContainerRef.current.querySelector(".gm-style") !== null;
          const hasAuthError = mapContainerRef.current.querySelector(".gm-err-container") !== null;
          if (hasAuthError) {
            setMapInitError("Google Maps authorization failed.");
            setMapsAvailable(false);
            setMapsLoading(false);
            return;
          }
          if (hasGmStyle) {
            setMapsAvailable(true);
            setMapsLoading(false);
            return;
          }
          if (Date.now() - startedAt > 8_000) {
            setMapInitError("Google map canvas did not initialize.");
            setMapsAvailable(false);
            setMapsLoading(false);
            return;
          }
          window.setTimeout(verifyMapCanvas, 250);
        };
        verifyMapCanvas();
      }, 100);
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      resizeObserver?.disconnect();
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      reverseAbortRef.current?.abort();
      mapInitRef.current = false;
      mapRef.current = null;
    };
  }, [initialLat, initialLng, scheduleReverseGeocode, wantsMap]);

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
      className="flex flex-col gap-0 w-full h-full min-h-0 sm:min-h-0"
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

      <div
        className={cn(
          "relative flex-1 min-h-[240px] sm:min-h-[280px]",
          mapsAvailable ? "bg-transparent" : "bg-[var(--bg-section)]",
        )}
      >
        {wantsMap ? (
          <>
            <div
              ref={mapContainerRef}
              className="absolute inset-0 z-0"
              data-testid="delivery-map-container"
            />
            {mapsAvailable ? (
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
            ) : null}
          </>
        ) : null}
        {!wantsMap || (!mapsAvailable && !mapsLoading) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-body text-[15px] text-[var(--text-primary)]">{addressCard.primary}</p>
            <p className="font-body text-[14px] text-[var(--text-secondary)]">{addressCard.secondary}</p>
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              Map preview isn&apos;t available. You can still confirm using the address below.
            </p>
          </div>
        ) : null}
        {mapsLoading ? (
          <p role="status" className="absolute top-3 left-3 z-20 rounded-md bg-[var(--bg-page)]/90 px-3 py-1 font-body text-[13px]">
            Loading map…
          </p>
        ) : null}
        {resolvingAddress ? (
          <p role="status" className="absolute top-3 right-3 z-20 rounded-md bg-[var(--bg-page)]/90 px-3 py-1 font-body text-[13px]">
            Finding address…
          </p>
        ) : null}
        {mapInitError ? (
          <p
            role="status"
            className="sr-only"
            data-testid="delivery-map-init-error"
          >
            {mapInitError}
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
