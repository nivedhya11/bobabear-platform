import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocationSelector } from "@/components/location/LocationSelector";
import { writeDeliveryContextPin } from "@/lib/customer-location/delivery-context";

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

  it("opens the selector dialog and applies a manual PIN", async () => {
    const user = userEvent.setup();
    writeDeliveryContextPin("248001");
    render(<LocationSelector />);
    await user.click(screen.getByTestId("deliver-to-orientation"));
    expect(screen.getByTestId("location-selector-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Where should we deliver/i })).toBeInTheDocument();
    expect(screen.getByText(/Location search isn't available right now/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Enter PIN manually/i));
    await user.type(screen.getByLabelText(/Enter PIN manually/i), "248001");
    await user.click(screen.getByRole("button", { name: "Use this PIN" }));
    await waitFor(() => expect(evaluateDeliveryServiceability).toHaveBeenCalled());
  });
});
