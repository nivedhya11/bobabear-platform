import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CustomerDeliveryAddressFlow,
  type CustomerDeliveryAddressFlowResult,
} from "@/components/location/CustomerDeliveryAddressFlow";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

const getLocationProviderStatus = vi.fn<(...args: unknown[]) => unknown>();
const autocompleteLocation = vi.fn<(...args: unknown[]) => unknown>();
const resolveLocationPlace = vi.fn<(...args: unknown[]) => unknown>();
const reverseGeocodeLocation = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/customer-commerce/location", () => ({
  getLocationProviderStatus: (...args: unknown[]) => getLocationProviderStatus(...args),
  autocompleteLocation: (...args: unknown[]) => autocompleteLocation(...args),
  resolveLocationPlace: (...args: unknown[]) => resolveLocationPlace(...args),
  reverseGeocodeLocation: (...args: unknown[]) => reverseGeocodeLocation(...args),
}));

vi.mock("@/lib/customer-location/geolocation", () => ({
  getDeviceCoordinates: vi.fn(),
}));

vi.mock("@/lib/customer-location/maps-js-config", () => ({
  isMapsJsConfigured: vi.fn(() => true),
}));

vi.mock("@/components/location/DeliveryLocationMapConfirmation", () => ({
  DeliveryLocationMapConfirmation: ({
    onConfirm,
    onChooseAnother,
  }: {
    onConfirm: (
      location: {
        latitude: string;
        longitude: string;
        locality: string;
        city?: string;
        stateCode: string;
        postalCode: string;
      },
      decision: { status: string },
    ) => void;
    onChooseAnother: () => void;
  }) => (
    <div data-testid="delivery-location-map-confirmation">
      <button
        type="button"
        onClick={() =>
          onConfirm(
            {
              latitude: "30.3256000",
              longitude: "78.0436000",
              locality: "Rajpur",
              stateCode: "IN-UT",
              postalCode: "248001",
            } as never,
            { status: "SERVICEABLE" },
          )
        }
      >
        Confirm location
      </button>
      <button type="button" onClick={onChooseAnother}>
        Choose another location
      </button>
    </div>
  ),
}));

const resolvedLocation = {
  displayAddress: "Rajpur Road, Dehradun",
  postalCode: "248001",
  pinConfirmed: true,
  locality: "Rajpur",
  administrativeArea: "Dehradun",
  stateCode: "IN-UT",
  country: "India" as const,
  countryCode: "IN" as const,
  latitude: "30.3256000",
  longitude: "78.0436000",
};

beforeEach(() => {
  getLocationProviderStatus.mockResolvedValue({
    ok: true,
    status: 200,
    data: { configured: true, provider: "google_maps", status: "CONFIGURED" },
  });
  autocompleteLocation.mockResolvedValue({
    ok: true,
    status: 200,
    data: { suggestions: [{ placeId: "place-1", label: "Rajpur Road, Dehradun" }] },
  });
  resolveLocationPlace.mockResolvedValue({ ok: true, status: 200, data: { location: resolvedLocation } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CustomerDeliveryAddressFlow", () => {
  it("starts on location search for add mode", async () => {
    render(
      <CustomerDeliveryAddressFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        mode={{ kind: "add" }}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Select delivery location")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search area, street or nearby landmark/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use current location/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
  });

  it("moves search suggestion to map then details for add mode", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn<(result: CustomerDeliveryAddressFlowResult) => void>();
    render(
      <CustomerDeliveryAddressFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        mode={{ kind: "add" }}
        onCancel={vi.fn()}
        onComplete={onComplete}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByText(/Location search isn't available/i)).not.toBeInTheDocument(),
    );

    const search = screen.getByPlaceholderText(/Search area, street or nearby landmark/i);
    await user.type(search, "Rajpur");
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Rajpur Road, Dehradun/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("option", { name: /Rajpur Road, Dehradun/i }));

    await waitFor(() => expect(screen.getByTestId("customer-address-flow-map")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Confirm location" }));

    expect(screen.getByTestId("customer-address-flow-details")).toBeInTheDocument();
    expect(screen.getByLabelText(/Flat \/ House \/ Building/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^City$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^State$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
    expect(screen.getByText("Save this address as")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Flat \/ House \/ Building/i), "C-802");
    await user.type(screen.getByLabelText(/Recipient name/i), "Asha");
    await user.type(screen.getByLabelText(/Mobile number/i), "+919876543210");
    await user.click(screen.getByRole("button", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Save address" }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CREATE",
        input: expect.objectContaining({
          addressLine1: "C-802",
          recipientName: "Asha",
          coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
        }),
      }),
    );
  });

  it("starts on map for edit mode when coordinates exist", async () => {
    render(
      <CustomerDeliveryAddressFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        mode={{
          kind: "edit",
          address: {
            id: "addr-1",
            recipientName: "Asha",
            recipientPhone: "+919876543210",
            addressLine1: "C-802",
            addressLine2: null,
            landmark: null,
            locality: "Rajpur",
            city: "Dehradun",
            stateCode: "IN-UT",
            postalCode: "248001",
            coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
            label: "Home",
            isDefault: true,
            createdAt: "2026-08-13T00:00:00.000Z",
            updatedAt: "2026-08-13T00:00:00.000Z",
          },
        }}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByTestId("customer-address-flow-map")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search area/i)).not.toBeInTheDocument();
  });

  it("completes reconfirm mode from map without details form", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn<(result: CustomerDeliveryAddressFlowResult) => void>();
    render(
      <CustomerDeliveryAddressFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        mode={{
          kind: "reconfirm",
          address: {
            id: "addr-legacy",
            recipientName: "Asha",
            recipientPhone: "+919876543210",
            addressLine1: "12 Rajpur Road",
            addressLine2: null,
            landmark: null,
            locality: "Rajpur",
            city: "Dehradun",
            stateCode: "IN-UT",
            postalCode: "248001",
            coordinates: null,
            label: "Home",
            isDefault: true,
            createdAt: "2026-08-13T00:00:00.000Z",
            updatedAt: "2026-08-13T00:00:00.000Z",
          },
        }}
        onCancel={vi.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByText("Select delivery location")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/Location search isn't available/i)).not.toBeInTheDocument(),
    );
    await user.type(screen.getByPlaceholderText(/Search area/i), "Rajpur");
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Rajpur Road, Dehradun/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("option", { name: /Rajpur Road, Dehradun/i }));
    await waitFor(() => expect(screen.getByTestId("customer-address-flow-map")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Confirm location" }));

    expect(onComplete).toHaveBeenCalledWith({
      kind: "RECONFIRM_COORDINATES",
      addressId: "addr-legacy",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
    });
    expect(screen.queryByTestId("customer-address-flow-details")).not.toBeInTheDocument();
  });
});
