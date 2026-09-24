/**
 * AC-036H-021 / 022 / 023 — customer fulfilment panel presentation.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerOrderFulfilmentPanel } from "@/components/ordering/CustomerOrderFulfilmentPanel";

describe("CustomerOrderFulfilmentPanel", () => {
  it("AC-036H-021/022: Pickup shows mode + location; hides delivery tracking", () => {
    render(
      <CustomerOrderFulfilmentPanel
        order={{
          fulfilmentMode: "PICKUP",
          destination: null,
          pickupLocation: {
            displayName: "Mall Road Counter",
            addressLine1: "12 Mall Road",
            addressLine2: null,
            locality: "Rajpur",
            city: "Dehradun",
            stateCode: "IN-UT",
            postalCode: "248001",
            instructions: "Ask at counter",
          },
          delivery: {
            statusLabel: "Out for delivery",
            providerDisplayName: "Fake Rider",
            trackingUrl: "https://example.test/track",
            lastUpdatedAt: "2026-09-24T00:00:00.000Z",
          },
        }}
      />,
    );
    expect(screen.getByTestId("order-fulfilment-mode")).toHaveTextContent(/pickup/i);
    expect(screen.getByTestId("order-pickup-location")).toHaveTextContent("Mall Road Counter");
    expect(screen.getByText(/ask at counter/i)).toBeInTheDocument();
    expect(screen.queryByTestId("order-delivery")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order-delivery-track")).not.toBeInTheDocument();
    expect(screen.queryByText(/fake rider/i)).not.toBeInTheDocument();
  });

  it("AC-036H-023: Delivery still shows destination + optional tracking", () => {
    render(
      <CustomerOrderFulfilmentPanel
        order={{
          fulfilmentMode: "DELIVERY",
          destination: {
            recipientName: "Guest",
            recipientPhone: "+919876543210",
            addressLine1: "12 Mall Road",
            addressLine2: null,
            landmark: null,
            locality: null,
            city: "Dehradun",
            stateCode: "IN-UT",
            postalCode: "248001",
            label: null,
          },
          pickupLocation: null,
          delivery: {
            statusLabel: "Out for delivery",
            providerDisplayName: "Courier Co",
            trackingUrl: "https://example.test/track",
            lastUpdatedAt: "2026-09-24T00:00:00.000Z",
          },
        }}
      />,
    );
    expect(screen.getByTestId("order-fulfilment-mode")).toHaveTextContent(/delivery/i);
    expect(screen.getByTestId("order-delivery-destination")).toHaveTextContent("Guest");
    expect(screen.getByTestId("order-delivery")).toBeInTheDocument();
    expect(screen.getByTestId("order-delivery-track")).toHaveAttribute(
      "href",
      "https://example.test/track",
    );
  });
});
