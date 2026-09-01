import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";
import * as customerCommerce from "@/lib/customer-commerce";
import * as customerLocation from "@/lib/customer-commerce/location";
import * as mapsJsConfig from "@/lib/customer-location/maps-js-config";
import * as mapsJsLoader from "@/lib/customer-location/maps-js-loader";
import * as mapContainerReady from "@/lib/customer-location/map-container-ready";

const baseLocation = {
  displayAddress: "Rajpur Road, Dehradun, Uttarakhand, India",
  postalCode: null,
  pinConfirmed: false,
  locality: "Dehradun",
  administrativeArea: "Uttarakhand",
  stateCode: "IN-UT",
  country: "India" as const,
  countryCode: "IN" as const,
  latitude: "30.3256000",
  longitude: "78.0436000",
};

function createMapsLibraryMock(config?: { trackListeners?: boolean }) {
  const mapInstances: Array<{ container: HTMLElement; center: google.maps.LatLngLiteral }> = [];
  const listeners: Record<string, Array<() => void>> = {};

  return {
    mapInstances,
    listeners,
    library: {
      Map: vi.fn(function MapMock(
        this: google.maps.Map,
        container: HTMLElement,
        mapOptions: google.maps.MapOptions,
      ) {
        mapInstances.push({
          container,
          center: mapOptions.center as google.maps.LatLngLiteral,
        });
        const inner = document.createElement("div");
        inner.className = "gm-style";
        container.appendChild(inner);
        Object.defineProperty(container, "getBoundingClientRect", {
          configurable: true,
          value: () => ({
            width: 480,
            height: 320,
            top: 0,
            left: 0,
            right: 480,
            bottom: 320,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          }),
        });
        return {
          getCenter: () => ({
            lat: () =>
              (mapOptions.center as google.maps.LatLngLiteral).lat + (config?.trackListeners ? 0.001 : 0),
            lng: () =>
              (mapOptions.center as google.maps.LatLngLiteral).lng + (config?.trackListeners ? 0.001 : 0),
          }),
          setCenter: vi.fn(),
          addListener: vi.fn((event: string, handler: () => void) => {
            if (config?.trackListeners) {
              listeners[event] = listeners[event] ?? [];
              listeners[event]!.push(handler);
            }
            return { remove: vi.fn() };
          }),
        } as unknown as google.maps.Map;
      }),
      event: {
        trigger: vi.fn(),
      },
    },
  };
}

beforeEach(() => {
  vi.spyOn(mapsJsConfig, "isMapsJsConfigured").mockReturnValue(true);
  vi.spyOn(mapContainerReady, "waitForMapContainerReady").mockResolvedValue(true);
  vi.spyOn(mapsJsLoader, "getMapsLoaderFailureReason").mockReturnValue("MAP_LIBRARY_NOT_READY");
  vi.spyOn(mapsJsLoader, "loadGoogleMapsJs").mockResolvedValue(null);
  vi.spyOn(customerCommerce, "evaluateDeliveryServiceability").mockResolvedValue({
    ok: true,
    status: 200,
    data: { decision: { status: "SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
  });
  vi.spyOn(customerLocation, "reverseGeocodeLocation").mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      location: {
        ...baseLocation,
        displayAddress: "Updated Street, Dehradun, Uttarakhand, India",
        latitude: "30.3266000",
        longitude: "78.0446000",
      },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("DeliveryLocationMapConfirmation", () => {
  it("initializes Google Map against the mounted container when Maps JS is configured", async () => {
    const { library, mapInstances } = createMapsLibraryMock();
    vi.mocked(mapsJsLoader.loadGoogleMapsJs).mockResolvedValue(library);

    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapInstances.length).toBe(1));
    expect(mapInstances[0]?.container).toHaveAttribute("data-testid", "delivery-map-container");
    expect(mapInstances[0]?.center).toEqual({ lat: 30.3256, lng: 78.0436 });
    await waitFor(
      () => expect(screen.getByTestId("delivery-map-center-pin")).toBeInTheDocument(),
      { timeout: 3_000 },
    );
  });

  it("falls back to text confirmation when maps JS is unavailable", async () => {
    vi.mocked(mapsJsConfig.isMapsJsConfigured).mockReturnValue(false);
    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );
    expect(screen.getByTestId("delivery-location-map-confirmation")).toBeInTheDocument();
    expect(screen.getByText(/Map preview isn't available/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(customerCommerce.evaluateDeliveryServiceability).toHaveBeenCalledWith(
        expect.anything(),
        { latitude: "30.3256000", longitude: "78.0436000" },
        null,
      ),
    );
    expect(screen.getByRole("button", { name: "Confirm location" })).toBeEnabled();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
  });

  it("does not expose raw serviceability enum text", async () => {
    vi.mocked(customerCommerce.evaluateDeliveryServiceability).mockResolvedValue({
      ok: true,
      status: 200,
      data: { decision: { status: "NOT_SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
    });
    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText(/don't deliver/i)).toBeInTheDocument());
    expect(screen.queryByText(/SERVICEABLE/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose another location" })).toBeInTheDocument();
  });

  it("evaluates serviceability without requiring postal code", async () => {
    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );
    await waitFor(() => expect(customerCommerce.evaluateDeliveryServiceability).toHaveBeenCalled());
    expect(screen.queryByText(/couldn't confirm its PIN/i)).not.toBeInTheDocument();
  });

  it("constructs Map once through serviceability and reverse-geocode location updates", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { library, mapInstances, listeners } = createMapsLibraryMock({ trackListeners: true });
    vi.mocked(mapsJsLoader.loadGoogleMapsJs).mockResolvedValue(library);

    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapInstances.length).toBe(1));
    await waitFor(() => expect(customerCommerce.evaluateDeliveryServiceability).toHaveBeenCalledTimes(1));

    await act(async () => {
      listeners.dragstart?.[0]?.();
      listeners.idle?.[0]?.();
      await vi.advanceTimersByTimeAsync(500);
    });

    await waitFor(() => expect(customerLocation.reverseGeocodeLocation).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(customerCommerce.evaluateDeliveryServiceability).mock.calls.length).toBeGreaterThan(1),
    );
    expect(mapInstances.length).toBe(1);
  });

  it("does not reverse-geocode on the initial programmatic idle", async () => {
    const { library, listeners } = createMapsLibraryMock({ trackListeners: true });
    vi.mocked(mapsJsLoader.loadGoogleMapsJs).mockResolvedValue(library);

    render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapsJsLoader.loadGoogleMapsJs).toHaveBeenCalled());

    await act(async () => {
      listeners.idle?.[0]?.();
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    });

    expect(customerLocation.reverseGeocodeLocation).not.toHaveBeenCalled();
  });

  it("creates a new Map only when the map session coordinates change", async () => {
    const { library, mapInstances } = createMapsLibraryMock();
    vi.mocked(mapsJsLoader.loadGoogleMapsJs).mockResolvedValue(library);

    const { rerender } = render(
      <DeliveryLocationMapConfirmation
        initialLocation={baseLocation}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapInstances.length).toBe(1));

    rerender(
      <DeliveryLocationMapConfirmation
        initialLocation={{
          ...baseLocation,
          latitude: "30.4000000",
          longitude: "78.1000000",
        }}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onChooseAnother={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapInstances.length).toBe(2));
  });
});
