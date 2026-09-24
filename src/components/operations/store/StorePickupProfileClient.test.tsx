import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StorePickupProfileClient } from "./StorePickupProfileClient";

const getStorePickupProfile = vi.fn();
const setStorePickupProfile = vi.fn();
const announce = vi.fn();

vi.mock("@/lib/operations/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/store")>(
    "@/lib/operations/store",
  );
  return {
    ...actual,
    getStorePickupProfile: (...args: unknown[]) => getStorePickupProfile(...args),
    setStorePickupProfile: (...args: unknown[]) => setStorePickupProfile(...args),
  };
});

vi.mock("./StoreOutletContext", () => ({
  useStoreOutlet: () => ({
    outletId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    capabilities: { "outlet.read": true, "outlet.update": true },
    announce,
    staleOutletId: null,
  }),
}));

beforeEach(() => {
  getStorePickupProfile.mockReset();
  setStorePickupProfile.mockReset();
  announce.mockReset();
});

describe("StorePickupProfileClient", () => {
  it("loads empty profile and saves with accessible labelled controls", async () => {
    const user = userEvent.setup();
    getStorePickupProfile.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, profile: null },
    });
    setStorePickupProfile.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        profile: {
          outletId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          enabled: true,
          displayName: "BOBA Bear Mall Road",
          addressLine1: "12 Mall Road",
          addressLine2: null,
          locality: null,
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: "248001",
          latitude: null,
          longitude: null,
          instructions: "Collect from counter 2",
          revision: 1,
          createdAt: "2026-09-24T00:00:00.000Z",
          updatedAt: "2026-09-24T00:00:00.000Z",
        },
      },
    });

    render(<StorePickupProfileClient />);
    await waitFor(() =>
      expect(screen.getByTestId("store-pickup-profile-save")).toBeInTheDocument(),
    );

    const displayName = screen.getByTestId("store-pickup-profile-display-name");
    expect(displayName).toBeVisible();
    await user.clear(displayName);
    await user.type(displayName, "BOBA Bear Mall Road");
    await user.type(screen.getByTestId("store-pickup-profile-address-1"), "12 Mall Road");
    await user.type(screen.getByTestId("store-pickup-profile-city"), "Dehradun");
    await user.type(screen.getByTestId("store-pickup-profile-state"), "IN-UT");
    await user.type(screen.getByTestId("store-pickup-profile-postal"), "248001");
    await user.type(screen.getByTestId("store-pickup-profile-instructions"), "Collect from counter 2");
    await user.click(screen.getByTestId("store-pickup-profile-enabled"));

    const save = screen.getByRole("button", { name: /save pickup profile/i });
    expect(save).toHaveAccessibleName(/save pickup profile/i);
    await user.click(save);

    await waitFor(() => expect(setStorePickupProfile).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("store-pickup-profile-success")).toHaveTextContent(/saved/i),
    );
  });

  it("announces conflict errors with role=alert", async () => {
    const user = userEvent.setup();
    getStorePickupProfile.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        profile: {
          outletId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          enabled: true,
          displayName: "Existing",
          addressLine1: "1 Road",
          addressLine2: null,
          locality: null,
          city: "Dehradun",
          stateCode: "IN-UT",
          postalCode: "248001",
          latitude: null,
          longitude: null,
          instructions: "Desk",
          revision: 2,
          createdAt: "2026-09-24T00:00:00.000Z",
          updatedAt: "2026-09-24T00:00:00.000Z",
        },
      },
    });
    setStorePickupProfile.mockResolvedValue({
      ok: false,
      status: 409,
      code: "STORE_CONFLICT",
    });

    render(<StorePickupProfileClient />);
    await waitFor(() =>
      expect(screen.getByTestId("store-pickup-profile-save")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("store-pickup-profile-save"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/changed elsewhere/i),
    );
  });
});
