import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";
import { isMapsJsConfigured } from "@/lib/customer-location/maps-js-config";

const evaluateDeliveryServiceability = vi.fn<(...args: unknown[]) => unknown>();
const reverseGeocodeLocation = vi.fn<(...args: unknown[]) => unknown>();
const loadGoogleMapsJs = vi.fn<() => Promise<typeof google.maps | null>>();

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    evaluateDeliveryServiceability: (...args: unknown[]) => evaluateDeliveryServiceability(...args),
  };
});

vi.mock("@/lib/customer-commerce/location", () => ({
  reverseGeocodeLocation: (...args: unknown[]) => reverseGeocodeLocation(...args),
}));

vi.mock("@/lib/customer-location/maps-js-config", () => ({
  isMapsJsConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/customer-location/map-container-ready", () => ({
  waitForMapContainerReady: vi.fn(async () => true),
}));

vi.mock("@/lib/customer-location/maps-js-loader", () => ({
  loadGoogleMapsJs: () => loadGoogleMapsJs(),
}));

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

beforeEach(() => {
  vi.mocked(isMapsJsConfigured).mockReturnValue(true);
  evaluateDeliveryServiceability.mockResolvedValue({
    ok: true,
    status: 200,
    data: { decision: { status: "SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
  });
  loadGoogleMapsJs.mockResolvedValue(null);
});

afterEach(() => {
  evaluateDeliveryServiceability.mockClear();
  reverseGeocodeLocation.mockClear();
  loadGoogleMapsJs.mockClear();
});

describe("DeliveryLocationMapConfirmation", () => {
  it("initializes Google Map against the mounted container when Maps JS is configured", async () => {
    const mapInstances: Array<{ container: HTMLElement; center: google.maps.LatLngLiteral }> = [];
    const listeners: Record<string, Array<() => void>> = {};
    loadGoogleMapsJs.mockResolvedValue({
      Map: vi.fn(function MapMock(
        this: google.maps.Map,
        container: HTMLElement,
        options: google.maps.MapOptions,
      ) {
        mapInstances.push({
          container,
          center: options.center as google.maps.LatLngLiteral,
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
            lat: () => (options.center as google.maps.LatLngLiteral).lat,
            lng: () => (options.center as google.maps.LatLngLiteral).lng,
          }),
          setCenter: vi.fn(),
          addListener: vi.fn((event: string, handler: () => void) => {
            listeners[event] = listeners[event] ?? [];
            listeners[event]!.push(handler);
          }),
        } as unknown as google.maps.Map;
      }),
      event: {
        trigger: vi.fn(),
      },
    } as unknown as typeof google.maps);

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
    vi.mocked(isMapsJsConfigured).mockReturnValue(false);
    loadGoogleMapsJs.mockResolvedValue(null);
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
      expect(evaluateDeliveryServiceability).toHaveBeenCalledWith(
        expect.anything(),
        { latitude: "30.3256000", longitude: "78.0436000" },
        null,
      ),
    );
    expect(screen.getByRole("button", { name: "Confirm location" })).toBeEnabled();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
  });

  it("does not expose raw serviceability enum text", async () => {
    evaluateDeliveryServiceability.mockResolvedValue({
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
    await waitFor(() => expect(evaluateDeliveryServiceability).toHaveBeenCalled());
    expect(screen.queryByText(/couldn't confirm its PIN/i)).not.toBeInTheDocument();
  });
});
