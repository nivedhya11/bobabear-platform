import { render, screen, waitFor, within } from "@testing-library/react";
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
  coordinates: null,
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

  it("creates a new address from the add form", async () => {
    const user = userEvent.setup();
    listOwnAddresses
      .mockResolvedValueOnce({ ok: true, status: 200, data: { addresses: [] } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: { addresses: [sampleAddress] } });
    createOwnAddress.mockResolvedValue({ ok: true, status: 201, data: { address: sampleAddress } });

    render(<AddressesClient />);
    await waitFor(() => expect(screen.getByTestId("addresses-empty")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add address" }));
    await user.type(screen.getByLabelText(/Recipient name/i), "Asha");
    await user.type(screen.getByLabelText(/Mobile number/i), "+919876543210");
    await user.type(screen.getByLabelText(/Address line 1/i), "12 Rajpur Road");
    await user.type(screen.getByLabelText(/^City/i), "Dehradun");
    await user.selectOptions(screen.getByLabelText(/^State/i), "IN-UT");
    await user.type(screen.getByLabelText(/PIN code/i), "248001");
    await user.click(screen.getByRole("button", { name: "Save address" }));

    await waitFor(() => expect(createOwnAddress).toHaveBeenCalled());
    expect(createOwnAddress.mock.calls[0]?.[0]).toMatchObject({
      recipientName: "Asha",
      postalCode: "248001",
      makeDefault: true,
    });
  });
});
