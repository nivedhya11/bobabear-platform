import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StoreSchedulingProfileClient } from "./StoreSchedulingProfileClient";

const getStoreSchedulingProfile = vi.fn();
const setStoreSchedulingProfile = vi.fn();
const announce = vi.fn();

const outletState = vi.hoisted(() => ({
  canManage: true,
}));

vi.mock("@/lib/operations/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/store")>(
    "@/lib/operations/store",
  );
  return {
    ...actual,
    getStoreSchedulingProfile: (...args: unknown[]) => getStoreSchedulingProfile(...args),
    setStoreSchedulingProfile: (...args: unknown[]) => setStoreSchedulingProfile(...args),
  };
});

vi.mock("./StoreOutletContext", () => ({
  useStoreOutlet: () => ({
    outletId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    capabilities: {
      "outlet.operating_schedule.read": true,
      "outlet.operating_schedule.manage": outletState.canManage,
    },
    announce,
    staleOutletId: null,
  }),
}));

const OUTLET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function unconfigured() {
  getStoreSchedulingProfile.mockResolvedValue({
    ok: true,
    status: 200,
    data: { ok: true, configured: false, profile: null },
  });
}

function configuredProfile(
  pickupMinLeadMinutes: number,
  deliveryMinLeadMinutes: number,
  revision: string,
) {
  return {
    ok: true,
    status: 200,
    data: {
      ok: true,
      configured: true,
      profile: {
        outletId: OUTLET_ID,
        pickupMinLeadMinutes,
        deliveryMinLeadMinutes,
        revision,
      },
    },
  };
}

beforeEach(() => {
  outletState.canManage = true;
  getStoreSchedulingProfile.mockReset();
  setStoreSchedulingProfile.mockReset();
  announce.mockReset();
});

describe("StoreSchedulingProfileClient", () => {
  it("renders the unconfigured state without seeding lead times", async () => {
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    expect(screen.getByTestId("store-scheduling-loading")).toHaveTextContent(
      "Loading scheduled fulfilment…",
    );
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-unconfigured")).toHaveTextContent(
        "Scheduled fulfilment isn't configured for this outlet.",
      ),
    );
    expect(screen.getByTestId("store-scheduling-unconfigured")).toHaveTextContent(
      "Set minimum lead times for Pickup and Delivery to make scheduled windows available.",
    );
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("");
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("");
    expect(setStoreSchedulingProfile).not.toHaveBeenCalled();
    expect(screen.queryByTestId("store-scheduling-configured")).not.toBeInTheDocument();
  });

  it("rejects empty, zero, negative, decimal, and non-numeric lead times", async () => {
    const user = userEvent.setup();
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    await screen.findByTestId("store-scheduling-save");

    const cases = ["", "0", "-5", "1.5", "30.0", "abc", "1e2", "030", "+30"];
    for (const value of cases) {
      await user.clear(screen.getByTestId("store-scheduling-pickup"));
      if (value.length > 0) {
        await user.type(screen.getByTestId("store-scheduling-pickup"), value);
      }
      await user.clear(screen.getByTestId("store-scheduling-delivery"));
      await user.type(screen.getByTestId("store-scheduling-delivery"), "60");
      await user.click(screen.getByTestId("store-scheduling-save"));
      expect(screen.getByTestId("store-scheduling-pickup-error")).toHaveTextContent(
        "Enter a whole number of minutes greater than 0.",
      );
      expect(setStoreSchedulingProfile).not.toHaveBeenCalled();
    }

    await user.clear(screen.getByTestId("store-scheduling-pickup"));
    await user.type(screen.getByTestId("store-scheduling-pickup"), "30");
    await user.clear(screen.getByTestId("store-scheduling-delivery"));
    await user.click(screen.getByTestId("store-scheduling-save"));
    expect(screen.getByTestId("store-scheduling-delivery-error")).toHaveTextContent(
      "Enter a whole number of minutes greater than 0.",
    );
    expect(
      screen.getByTestId("store-scheduling-pickup").getAttribute("aria-describedby"),
    ).toBeNull();
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveAttribute("aria-invalid", "true");
  });

  it("creates with expectedRevision 0 and shows the saved configured profile", async () => {
    const user = userEvent.setup();
    unconfigured();
    setStoreSchedulingProfile.mockResolvedValue(configuredProfile(30, 60, "1"));
    render(<StoreSchedulingProfileClient />);
    await screen.findByTestId("store-scheduling-save");
    await user.type(screen.getByLabelText(/pickup minimum lead time/i), "30");
    await user.type(screen.getByLabelText(/delivery minimum lead time/i), "60");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(setStoreSchedulingProfile).toHaveBeenCalledWith(OUTLET_ID, {
        pickupMinLeadMinutes: 30,
        deliveryMinLeadMinutes: 60,
        expectedRevision: 0,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-success")).toHaveTextContent(
        "Scheduled fulfilment saved.",
      ),
    );
    expect(screen.getByTestId("store-scheduling-configured")).toHaveTextContent(
      "Scheduled fulfilment is configured.",
    );
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("30");
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("60");
    expect(screen.queryByTestId("store-scheduling-unconfigured")).not.toBeInTheDocument();
    expect(announce).toHaveBeenCalledWith("Scheduled fulfilment saved.");
  });

  it("displays persisted values and sends the current revision on update", async () => {
    const user = userEvent.setup();
    getStoreSchedulingProfile.mockResolvedValue(configuredProfile(30, 60, "2"));
    setStoreSchedulingProfile.mockResolvedValue(configuredProfile(45, 90, "3"));
    render(<StoreSchedulingProfileClient />);
    await waitFor(() => expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("30"));
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("60");

    await user.clear(screen.getByTestId("store-scheduling-pickup"));
    await user.type(screen.getByTestId("store-scheduling-pickup"), "45");
    await user.clear(screen.getByTestId("store-scheduling-delivery"));
    await user.type(screen.getByTestId("store-scheduling-delivery"), "90");
    await user.click(screen.getByTestId("store-scheduling-save"));

    await waitFor(() =>
      expect(setStoreSchedulingProfile).toHaveBeenCalledWith(OUTLET_ID, {
        pickupMinLeadMinutes: 45,
        deliveryMinLeadMinutes: 90,
        expectedRevision: 2,
      }),
    );
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("45");
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("90");
  });

  it("keeps pickup and delivery values independent", async () => {
    const user = userEvent.setup();
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    await screen.findByTestId("store-scheduling-pickup");
    await user.type(screen.getByTestId("store-scheduling-pickup"), "25");
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("");
    await user.type(screen.getByTestId("store-scheduling-delivery"), "80");
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("25");
  });

  it("reloads authoritative values on a stale revision and does not keep the rejected edit", async () => {
    const user = userEvent.setup();
    getStoreSchedulingProfile
      .mockResolvedValueOnce(configuredProfile(30, 60, "1"))
      .mockResolvedValueOnce(configuredProfile(40, 80, "2"));
    setStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 409,
      code: "STORE_CONFLICT",
    });
    render(<StoreSchedulingProfileClient />);
    await waitFor(() => expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("30"));
    await user.clear(screen.getByTestId("store-scheduling-pickup"));
    await user.type(screen.getByTestId("store-scheduling-pickup"), "99");
    await user.clear(screen.getByTestId("store-scheduling-delivery"));
    await user.type(screen.getByTestId("store-scheduling-delivery"), "99");
    await user.click(screen.getByTestId("store-scheduling-save"));

    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-error")).toHaveTextContent(
        "This configuration changed. Saved lead times were reloaded. Review them before saving again.",
      ),
    );
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("40");
    expect(screen.getByTestId("store-scheduling-delivery")).toHaveValue("80");
    expect(screen.queryByTestId("store-scheduling-success")).not.toBeInTheDocument();
    expect(setStoreSchedulingProfile).toHaveBeenCalledWith(OUTLET_ID, {
      pickupMinLeadMinutes: 99,
      deliveryMinLeadMinutes: 99,
      expectedRevision: 1,
    });
  });

  it("does not offer a save path to a read-only actor and surfaces server denial", async () => {
    outletState.canManage = false;
    getStoreSchedulingProfile.mockResolvedValue(configuredProfile(30, 60, "1"));
    const { unmount } = render(<StoreSchedulingProfileClient />);
    await waitFor(() => expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("30"));
    expect(screen.getByTestId("store-scheduling-pickup")).toBeDisabled();
    expect(screen.getByTestId("store-scheduling-delivery")).toBeDisabled();
    expect(screen.queryByTestId("store-scheduling-save")).not.toBeInTheDocument();
    expect(screen.getByTestId("store-scheduling-readonly")).toHaveTextContent(
      "You can view these lead times but cannot change them.",
    );
    expect(setStoreSchedulingProfile).not.toHaveBeenCalled();
    unmount();

    outletState.canManage = true;
    getStoreSchedulingProfile.mockResolvedValue(configuredProfile(30, 60, "1"));
    setStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 403,
      code: "STORE_UNAUTHORIZED",
    });
    render(<StoreSchedulingProfileClient />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByTestId("store-scheduling-save")).toBeInTheDocument());
    await user.clear(screen.getByTestId("store-scheduling-pickup"));
    await user.type(screen.getByTestId("store-scheduling-pickup"), "20");
    await user.click(screen.getByTestId("store-scheduling-save"));
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-error")).toHaveTextContent(
        "You do not have permission to save scheduled fulfilment for this outlet.",
      ),
    );
    expect(screen.queryByTestId("store-scheduling-success")).not.toBeInTheDocument();
    expect(screen.getByTestId("store-scheduling-pickup")).toHaveValue("20");
  });

  it("keeps cancellation cutoff controls off this surface", async () => {
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    await screen.findByTestId("store-scheduling-profile");
    expect(screen.queryByText(/cancellation cutoff/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cancellation/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/scheduled fulfilment enabled/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /pickupCancellationCutoffMinutes|deliveryCancellationCutoffMinutes|scheduledCancellationPolicy/,
    );
  });

  it("exposes labelled keyboard fields, associated errors, and status text", async () => {
    const user = userEvent.setup();
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    const pickup = await screen.findByRole("textbox", { name: /pickup minimum lead time \(minutes\)/i });
    const delivery = screen.getByRole("textbox", { name: /delivery minimum lead time \(minutes\)/i });
    const save = screen.getByRole("button", { name: "Save" });
    pickup.focus();
    expect(pickup).toHaveFocus();
    await user.tab();
    expect(delivery).toHaveFocus();
    await user.tab();
    expect(save).toHaveFocus();
    expect(pickup.className).toContain("focus-visible:ring-2");
    await user.click(save);
    const pickupError = screen.getByTestId("store-scheduling-pickup-error");
    expect(pickup).toHaveAttribute("aria-describedby", pickupError.id);
    expect(pickup).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByTestId("store-scheduling-loading")).not.toBeInTheDocument();
  });

  it("shows load, validation-server, and unexpected errors without a stack trace", async () => {
    getStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 500,
      code: "INTERNAL_ERROR",
    });
    const { unmount } = render(<StoreSchedulingProfileClient />);
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-load-error")).toHaveTextContent(
        "Scheduled fulfilment could not be loaded.",
      ),
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/stack|TypeError|at StoreScheduling/i);
    unmount();

    unconfigured();
    setStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 400,
      code: "STORE_REQUEST_INVALID",
      field: "pickupMinLeadMinutes",
    });
    render(<StoreSchedulingProfileClient />);
    const user = userEvent.setup();
    await screen.findByTestId("store-scheduling-save");
    await user.type(screen.getByTestId("store-scheduling-pickup"), "30");
    await user.type(screen.getByTestId("store-scheduling-delivery"), "60");
    await user.click(screen.getByTestId("store-scheduling-save"));
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-pickup-error")).toHaveTextContent(
        "Lead times must be whole minutes greater than 0.",
      ),
    );
    expect(screen.queryByTestId("store-scheduling-delivery-error")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/at \//);
  });

  it("shows sign-in and forbidden states", async () => {
    getStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 401,
      code: "WORKFORCE_AUTH_REQUIRED",
    });
    const { unmount } = render(<StoreSchedulingProfileClient />);
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-unauthorized")).toHaveTextContent("Sign in required"),
    );
    unmount();

    getStoreSchedulingProfile.mockResolvedValue({
      ok: false,
      status: 403,
      code: "STORE_UNAUTHORIZED",
    });
    render(<StoreSchedulingProfileClient />);
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-forbidden")).toHaveTextContent(
        "You do not have permission to view scheduled fulfilment for this outlet.",
      ),
    );
  });

  it("shows a saving state until the profile request settles", async () => {
    const user = userEvent.setup();
    unconfigured();
    let resolveSave: (value: unknown) => void = () => undefined;
    setStoreSchedulingProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    render(<StoreSchedulingProfileClient />);
    await screen.findByTestId("store-scheduling-save");
    await user.type(screen.getByTestId("store-scheduling-pickup"), "30");
    await user.type(screen.getByTestId("store-scheduling-delivery"), "60");
    await user.click(screen.getByTestId("store-scheduling-save"));
    expect(screen.getByTestId("store-scheduling-save")).toHaveTextContent("Saving…");
    expect(screen.getByTestId("store-scheduling-save")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("store-scheduling-pickup")).toBeDisabled();
    resolveSave(configuredProfile(30, 60, "1"));
    await waitFor(() =>
      expect(screen.getByTestId("store-scheduling-success")).toBeInTheDocument(),
    );
  });

  it("keeps both lead times, labels, and save stacked for a mobile-width surface", async () => {
    unconfigured();
    render(<StoreSchedulingProfileClient />);
    const section = await screen.findByTestId("store-scheduling-profile");
    expect(section.className).toContain("flex-col");
    expect(section.className).toContain("max-w-full");
    const pickup = screen.getByTestId("store-scheduling-pickup");
    const delivery = screen.getByTestId("store-scheduling-delivery");
    expect(pickup.className).toContain("w-full");
    expect(delivery.className).toContain("w-full");
    expect(pickup.className).toContain("min-w-0");
    expect(screen.getByText("Pickup minimum lead time (minutes)")).toBeVisible();
    expect(screen.getByText("Delivery minimum lead time (minutes)")).toBeVisible();
    expect(screen.getByTestId("store-scheduling-save")).toBeVisible();
    expect(section.style.minWidth).toBe("");
  });
});
