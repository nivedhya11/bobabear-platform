import { render, screen, waitFor } from "@testing-library/react";
import ReactDOMServer from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocationSelector } from "@/components/location/LocationSelector";
import { writeDeliveryContext, resetDeliveryContextSnapshotForTests } from "@/lib/customer-location/delivery-context";

const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const listOwnAddresses = vi.fn<(...args: unknown[]) => unknown>();
const evaluateDeliveryServiceability = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("@/lib/customer-auth/client", () => ({
  fetchCustomerSession: (...args: unknown[]) => fetchCustomerSession(...args),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    listOwnAddresses: (...args: unknown[]) => listOwnAddresses(...args),
    evaluateDeliveryServiceability: (...args: unknown[]) => evaluateDeliveryServiceability(...args),
  };
});

vi.mock("@/lib/customer-commerce/location", () => ({
  getLocationProviderStatus: vi.fn(async () => ({
    ok: true,
    status: 200,
    data: { configured: false, provider: "google_maps", status: "NOT_CONFIGURED" },
  })),
  autocompleteLocation: vi.fn(),
  resolveLocationPlace: vi.fn(),
  reverseGeocodeLocation: vi.fn(),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  resetDeliveryContextSnapshotForTests();
  fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: false } });
  listOwnAddresses.mockResolvedValue({ ok: true, status: 200, data: { addresses: [] } });
});

describe("LocationSelector hydration", () => {
  it("server render stays on default context even when sessionStorage has a saved location", () => {
    writeDeliveryContext({
      displayLabel: "Rajpur Road, Dehradun",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
      source: "location_search",
    });

    const html = ReactDOMServer.renderToString(<LocationSelector />);
    expect(html).toContain("Dehradun");
    expect(html).not.toContain("Rajpur Road");
  });

  it("reads persisted delivery context on the client", async () => {
    writeDeliveryContext({
      displayLabel: "Rajpur Road, Dehradun",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
      source: "location_search",
    });

    render(<LocationSelector />);
    expect(screen.getByTestId("deliver-to-orientation")).toHaveTextContent("Rajpur Road");
  });

  it("keeps empty sessionStorage markup stable on the client", async () => {
    render(<LocationSelector />);
    expect(screen.getByTestId("deliver-to-orientation")).toHaveTextContent("Dehradun");
    await waitFor(() =>
      expect(screen.getByTestId("deliver-to-orientation")).toHaveTextContent("Dehradun"),
    );
  });
});
