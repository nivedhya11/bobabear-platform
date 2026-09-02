import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/customer-location/maps-js-config", () => ({
  isMapsJsConfigured: vi.fn(() => true),
}));

vi.mock("@/components/location/DeliveryLocationMapConfirmation", () => ({
  DeliveryLocationMapConfirmation: ({
    onBack,
    onChooseAnother,
  }: {
    onBack: () => void;
    onChooseAnother: () => void;
  }) => (
    <div data-testid="delivery-location-map-confirmation">
      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={onChooseAnother}>
        Choose another location
      </button>
    </div>
  ),
}));

const resolvedLocation = {
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

function configuredProvider(): void {
  getLocationProviderStatus.mockResolvedValue({
    ok: true,
    status: 200,
    data: { configured: true, provider: "google_maps", status: "CONFIGURED" },
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetDeliveryContextSnapshotForTests();
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
  resolveLocationPlace.mockResolvedValue({
    ok: true,
    status: 200,
    data: { location: resolvedLocation },
  });
  autocompleteLocation.mockReset();
  resolveLocationPlace.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("Back from map clears stale suggestions and reruns autocomplete with a new session token", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    configuredProvider();

    const autocompleteTokens: string[] = [];
    autocompleteLocation.mockImplementation((...args: unknown[]) => {
      const input = args[0] as { query: string; sessionToken: string };
      autocompleteTokens.push(input.sessionToken);
        const suggestions =
          autocompleteTokens.length === 1
            ? [{ placeId: "place-delhi-a", label: "Delhi, India A" }]
            : [{ placeId: "place-delhi-b", label: "Delhi, India B" }];
        return Promise.resolve({ ok: true, status: 200, data: { suggestions } });
    });

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    const input = screen.getByPlaceholderText("Search area, street or landmark");
    await user.type(input, "delhi");
    await vi.advanceTimersByTimeAsync(300);

    expect(await screen.findByRole("option", { name: "Delhi, India A" })).toBeInTheDocument();
    const firstToken = autocompleteTokens[0]!;
    expect(firstToken).toBeTruthy();

    await user.click(screen.getByRole("option", { name: "Delhi, India A" }));
    await waitFor(() => expect(screen.getByTestId("delivery-location-map-confirmation")).toBeInTheDocument());
    expect(resolveLocationPlace).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: "place-delhi-a", sessionToken: firstToken }),
    );

    expect(screen.queryByTestId("location-search-results")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(input).toHaveValue("delhi");
    expect(screen.queryByRole("option", { name: "Delhi, India A" })).not.toBeInTheDocument();
    expect(screen.getByText("Finding locations…")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalledTimes(2));
    const secondToken = autocompleteTokens[1]!;
    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);

    expect(await screen.findByRole("option", { name: "Delhi, India B" })).toBeInTheDocument();
    resolveLocationPlace.mockClear();
    await user.click(screen.getByRole("option", { name: "Delhi, India B" }));
    await waitFor(() => expect(screen.getByTestId("delivery-location-map-confirmation")).toBeInTheDocument());
    expect(resolveLocationPlace).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: "place-delhi-b", sessionToken: secondToken }),
    );
  });

  it("Choose another location from map reruns autocomplete like Back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    configuredProvider();
    autocompleteLocation.mockResolvedValue({
      ok: true,
      status: 200,
      data: { suggestions: [{ placeId: "place-delhi-a", label: "Delhi, India A" }] },
    });

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    const input = screen.getByPlaceholderText("Search area, street or landmark");
    await user.type(input, "delhi");
    await vi.advanceTimersByTimeAsync(300);
    await user.click(await screen.findByRole("option", { name: "Delhi, India A" }));
    await waitFor(() => expect(screen.getByTestId("delivery-location-map-confirmation")).toBeInTheDocument());

    autocompleteLocation.mockClear();
    await user.click(screen.getByRole("button", { name: "Choose another location" }));
    expect(input).toHaveValue("delhi");
    expect(screen.queryByTestId("location-search-results")).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalledTimes(1));
  });

  it("query below minimum length does not trigger autocomplete", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    configuredProvider();

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    await user.type(screen.getByPlaceholderText("Search area, street or landmark"), "de");
    await vi.advanceTimersByTimeAsync(300);
    expect(autocompleteLocation).not.toHaveBeenCalled();
  });

  it("Close still clears query and search state", async () => {
    const user = userEvent.setup();
    configuredProvider();
    autocompleteLocation.mockResolvedValue({
      ok: true,
      status: 200,
      data: { suggestions: [{ placeId: "place-delhi-a", label: "Delhi, India A" }] },
    });

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    const input = screen.getByPlaceholderText("Search area, street or landmark");
    await user.type(input, "delhi");
    await waitFor(() => expect(screen.getByTestId("location-search-results")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("location-selector-dialog")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("deliver-to-orientation"));
    expect(screen.getByPlaceholderText("Search area, street or landmark")).toHaveValue("");
    expect(screen.queryByTestId("location-search-results")).not.toBeInTheDocument();
  });

  it("Back from map does not duplicate autocomplete with provider readiness effect", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    configuredProvider();
    autocompleteLocation.mockResolvedValue({
      ok: true,
      status: 200,
      data: { suggestions: [{ placeId: "place-delhi-a", label: "Delhi, India A" }] },
    });

    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    await user.type(screen.getByPlaceholderText("Search area, street or landmark"), "delhi");
    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalledTimes(1));

    await user.click(await screen.findByRole("option", { name: "Delhi, India A" }));
    await waitFor(() => expect(screen.getByTestId("delivery-location-map-confirmation")).toBeInTheDocument());

    autocompleteLocation.mockClear();
    await user.click(screen.getByRole("button", { name: "Back" }));
    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(autocompleteLocation).toHaveBeenCalledTimes(1));
  });
});
