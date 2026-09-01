import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocationSelector } from "@/components/location/LocationSelector";
import { writeDeliveryContext } from "@/lib/customer-location/delivery-context";

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

beforeEach(() => {
  window.sessionStorage.clear();
  fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: false } });
  listOwnAddresses.mockResolvedValue({ ok: true, status: 200, data: { addresses: [] } });
  evaluateDeliveryServiceability.mockResolvedValue({
    ok: true,
    status: 200,
    data: { decision: { status: "SERVICEABLE", evaluatedAt: "2026-08-13T00:00:00.000Z" } },
  });
  getLocationProviderStatus.mockResolvedValue({
    ok: true,
    status: 200,
    data: { configured: false, provider: "google_maps", status: "NOT_CONFIGURED" },
  });
});

describe("LocationSelector", () => {
  it("shows Delivering to trigger with locality fallback", () => {
    render(<LocationSelector />);
    expect(screen.getByTestId("deliver-to-orientation")).toHaveTextContent("Delivering to");
    expect(screen.getByTestId("deliver-to-orientation")).toHaveTextContent("Dehradun");
  });

  it("opens the selector dialog without manual PIN entry", async () => {
    const user = userEvent.setup();
    writeDeliveryContext({
      displayLabel: "Rajpur Road, Dehradun",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
      source: "location_search",
    });
    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    expect(screen.getByTestId("location-selector-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Select delivery location/i })).toBeInTheDocument();
    expect(screen.queryByText("Enter PIN manually")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
  });

  it("re-runs autocomplete when provider status resolves after early typing", async () => {
    const user = userEvent.setup();
    let resolveStatus: (value: unknown) => void = () => {};
    getLocationProviderStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve;
        }),
    );
    autocompleteLocation.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        suggestions: [{ placeId: "place-isbt", label: "ISBT, Dehradun, Uttarakhand, India" }],
      },
    });

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    const input = screen.getByPlaceholderText("Search area, street or landmark");
    await user.type(input, "ISBT");
    expect(autocompleteLocation).not.toHaveBeenCalled();

    resolveStatus({
      ok: true,
      status: 200,
      data: { configured: true, provider: "google_maps", status: "CONFIGURED" },
    });

    await waitFor(() =>
      expect(autocompleteLocation).toHaveBeenCalledWith(
        expect.objectContaining({ query: "ISBT" }),
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByTestId("location-search-results")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ISBT/i })).toBeInTheDocument();
  });
});
