import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddressesClient } from "@/components/account/AddressesClient";

const fetchCustomerSession = vi.fn<(...args: unknown[]) => unknown>();
const listOwnAddresses = vi.fn<(...args: unknown[]) => unknown>();
const createOwnAddress = vi.fn<(...args: unknown[]) => unknown>();
const updateOwnAddress = vi.fn<(...args: unknown[]) => unknown>();
const deleteOwnAddress = vi.fn<(...args: unknown[]) => unknown>();
const setDefaultOwnAddress = vi.fn<(...args: unknown[]) => unknown>();
const usePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/lib/customer-auth/chrome-session", () => ({
  useCustomerChromeSession: () => ({ session: "authenticated", signOut: vi.fn() }),
}));

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
    createOwnAddress: (...args: unknown[]) => createOwnAddress(...args),
    updateOwnAddress: (...args: unknown[]) => updateOwnAddress(...args),
    deleteOwnAddress: (...args: unknown[]) => deleteOwnAddress(...args),
    setDefaultOwnAddress: (...args: unknown[]) => setDefaultOwnAddress(...args),
  };
});

vi.mock("@/components/location/CustomerDeliveryAddressFlow", () => ({
  CustomerDeliveryAddressFlow: ({
    mode,
    onCancel,
    onComplete,
    testIdPrefix,
  }: {
    mode: { kind: string };
    onCancel: () => void;
    onComplete: (result: unknown) => void;
    testIdPrefix?: string;
  }) => (
    <div data-testid={`${testIdPrefix ?? "customer-address-flow"}-location`}>
      Shared flow ({mode.kind})
      <button type="button" onClick={onCancel}>
        Cancel shared flow
      </button>
      <button
        type="button"
        onClick={() =>
          onComplete({
            kind: "CREATE",
            input: {
              recipientName: "Asha",
              recipientPhone: "+919876543210",
              addressLine1: "C-802",
              addressLine2: null,
              landmark: null,
              locality: "Rajpur",
              city: "Dehradun",
              stateCode: "IN-UT",
              postalCode: "248001",
              label: "Home",
              coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
            },
          })
        }
      >
        Complete shared flow
      </button>
    </div>
  ),
}));

const sampleAddress = {
  id: "addr-1",
  recipientName: "Asha",
  recipientPhone: "+919876543210",
  addressLine1: "12 Rajpur Road",
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
};

beforeEach(() => {
  usePathname.mockReturnValue("/account/addresses/");
  fetchCustomerSession.mockResolvedValue({ ok: true, data: { authenticated: true } });
  listOwnAddresses.mockResolvedValue({ ok: true, status: 200, data: { addresses: [sampleAddress] } });
});

describe("AddressesClient", () => {
  it("lists saved addresses", async () => {
    render(<AddressesClient />);
    await waitFor(() => expect(screen.getByTestId("addresses-list")).toBeInTheDocument());
    expect(screen.getByText(/12 Rajpur Road/i)).toBeInTheDocument();
  });

  it("opens shared map-first flow for add", async () => {
    const user = userEvent.setup();
    listOwnAddresses.mockResolvedValueOnce({ ok: true, status: 200, data: { addresses: [] } });
    render(<AddressesClient />);
    await waitFor(() => expect(screen.getByTestId("addresses-empty")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add address" }));
    expect(screen.getByTestId("account-address-location")).toBeInTheDocument();
    expect(screen.getByText("Shared flow (add)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/PIN code/i)).not.toBeInTheDocument();
  });

  it("opens shared map-first flow for edit", async () => {
    const user = userEvent.setup();
    render(<AddressesClient />);
    await waitFor(() => expect(screen.getByTestId("addresses-list")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("account-address-location")).toBeInTheDocument();
    expect(screen.getByText("Shared flow (edit)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^City$/i)).not.toBeInTheDocument();
  });

  it("persists create through shared flow completion", async () => {
    const user = userEvent.setup();
    listOwnAddresses
      .mockResolvedValueOnce({ ok: true, status: 200, data: { addresses: [] } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { addresses: [sampleAddress] } });
    createOwnAddress.mockResolvedValue({ ok: true, status: 201, data: { address: sampleAddress } });

    render(<AddressesClient />);
    await waitFor(() => expect(screen.getByTestId("addresses-empty")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add address" }));
    await user.click(screen.getByRole("button", { name: "Complete shared flow" }));

    await waitFor(() => expect(createOwnAddress).toHaveBeenCalled());
    expect(createOwnAddress.mock.calls[0]?.[0]).toMatchObject({
      recipientName: "Asha",
      coordinates: { latitude: "30.3256000", longitude: "78.0436000" },
      makeDefault: true,
    });
  });
});
