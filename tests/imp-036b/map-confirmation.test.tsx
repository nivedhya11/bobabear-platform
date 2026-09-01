import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryLocationMapConfirmation } from "@/components/location/DeliveryLocationMapConfirmation";

const evaluateDeliveryServiceability = vi.fn<(...args: unknown[]) => unknown>();
const reverseGeocodeLocation = vi.fn<(...args: unknown[]) => unknown>();

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
  isMapsJsConfigured: () => false,
}));

vi.mock("@/lib/customer-location/maps-js-loader", () => ({
  loadGoogleMapsJs: vi.fn(async () => null),
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
  evaluateDeliveryServiceability.mockResolvedValue({
    ok: true,
    status: 200,
    data: { decision: { status: "SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
  });
});

afterEach(() => {
  evaluateDeliveryServiceability.mockClear();
  reverseGeocodeLocation.mockClear();
});

describe("DeliveryLocationMapConfirmation", () => {
  it("falls back to text confirmation when maps JS is unavailable", async () => {
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
