import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutDestinationFlow } from "@/components/ordering/CheckoutDestinationFlow";
import { DIRECT_ORDERING_BRAND_ID } from "@/shared/customer-menu/constants";

const evaluateDeliveryServiceability = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    evaluateDeliveryServiceability: (...args: unknown[]) => evaluateDeliveryServiceability(...args),
  };
});

vi.mock("@/components/location/CustomerDeliveryAddressFlow", () => ({
  CustomerDeliveryAddressFlow: ({
    onCancel,
    testIdPrefix,
  }: {
    onCancel: () => void;
    testIdPrefix?: string;
  }) => (
    <div data-testid={`${testIdPrefix ?? "customer-address-flow"}-location`}>
      Shared map-first flow
      <button type="button" onClick={onCancel}>
        Cancel shared flow
      </button>
    </div>
  ),
}));

const savedWithCoords = {
  id: "addr-1",
  recipientName: "Asha",
  recipientPhone: "+919876543210",
  addressLine1: "C-802, Tower C",
  addressLine2: "9th Floor",
  landmark: null,
  locality: "ISBT",
  city: "Dehradun",
  stateCode: "IN-UT",
  postalCode: "248002",
  coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
  label: "Home",
  isDefault: true,
  createdAt: "2026-08-13T00:00:00.000Z",
  updatedAt: "2026-08-13T00:00:00.000Z",
};

const savedWithoutCoords = {
  ...savedWithCoords,
  id: "addr-2",
  coordinates: null,
};

beforeEach(() => {
  evaluateDeliveryServiceability.mockResolvedValue({
    ok: true,
    status: 200,
    data: { decision: { status: "SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CheckoutDestinationFlow", () => {
  it("shows saved addresses and Add new address without competing top-level actions", async () => {
    render(
      <CheckoutDestinationFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        addresses={[savedWithCoords]}
        pending={false}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Choose a delivery address")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-saved-addresses")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add new address" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search area/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use current location/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /One-time destination/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/map coordinates/i)).not.toBeInTheDocument();
  });

  it("selects a coordinate-backed saved address after serviceability", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <CheckoutDestinationFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        addresses={[savedWithCoords]}
        pending={false}
        onComplete={onComplete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /C-802, Tower C/i }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({ kind: "SAVED_ADDRESS", savedAddressId: "addr-1" }),
    );
  });

  it("opens shared flow for Add new address", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutDestinationFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        addresses={[savedWithCoords]}
        pending={false}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add new address" }));
    expect(screen.getByTestId("checkout-destination-location")).toBeInTheDocument();
    expect(screen.getByText("Shared map-first flow")).toBeInTheDocument();
  });

  it("opens shared reconfirm flow for legacy saved addresses", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutDestinationFlow
        brandId={DIRECT_ORDERING_BRAND_ID}
        addresses={[savedWithoutCoords]}
        pending={false}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /C-802, Tower C/i }));
    expect(screen.getByTestId("checkout-destination-location")).toBeInTheDocument();
  });
});
