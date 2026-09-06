import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StoreShell } from "./StoreShell";
import { StoreAssortmentClient } from "./StoreAssortmentClient";
import { StoreAvailabilityClient } from "./StoreAvailabilityClient";
import { StoreOperatingStatusClient } from "./StoreOperatingStatusClient";
import { StoreHoursClient } from "./StoreHoursClient";
import { StoreServiceabilityClient } from "./StoreServiceabilityClient";
import { StoreTeamMembersClient } from "./StoreTeamMembersClient";

const listAdminOutlets = vi.fn();
const listAdminMembershipsFiltered = vi.fn();
const getStoreCapabilities = vi.fn();
const listStoreAvailability = vi.fn();
const setVariantAvailability = vi.fn();
const getStoreAssortment = vi.fn();
const getStoreOperatingState = vi.fn();
const getStoreOperatingProfile = vi.fn();
const getStoreOperatingSchedule = vi.fn();
const getStoreServiceability = vi.fn();
const setStoreDistancePolicy = vi.fn();

vi.mock("@/lib/administration/api", () => ({
  listAdminOutlets: (...args: unknown[]) => listAdminOutlets(...args),
  listAdminMembershipsFiltered: (...args: unknown[]) => listAdminMembershipsFiltered(...args),
  createAdminMembership: vi.fn(),
  transitionMembership: vi.fn(),
}));

vi.mock("@/lib/operations/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations/store")>(
    "@/lib/operations/store",
  );
  return {
    ...actual,
    getStoreCapabilities: (...args: unknown[]) => getStoreCapabilities(...args),
    listStoreAvailability: (...args: unknown[]) => listStoreAvailability(...args),
    setVariantAvailability: (...args: unknown[]) => setVariantAvailability(...args),
    setModifierOptionAvailability: vi.fn(),
    getStoreAssortment: (...args: unknown[]) => getStoreAssortment(...args),
    getStoreOperatingState: (...args: unknown[]) => getStoreOperatingState(...args),
    pauseStoreOutlet: vi.fn(),
    resumeStoreOutlet: vi.fn(),
    suspendStoreOutlet: vi.fn(),
    unsuspendStoreOutlet: vi.fn(),
    getStoreOperatingProfile: (...args: unknown[]) => getStoreOperatingProfile(...args),
    getStoreOperatingSchedule: (...args: unknown[]) => getStoreOperatingSchedule(...args),
    setStoreOperatingProfile: vi.fn(),
    setStoreOperatingSchedule: vi.fn(),
    getStoreServiceability: (...args: unknown[]) => getStoreServiceability(...args),
    setStoreDistancePolicy: (...args: unknown[]) => setStoreDistancePolicy(...args),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/workforce/operations/store/",
}));

const outletA = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  code: "ALPHA",
  name: "Alpha Store",
  status: "active",
  brandId: "brand-1",
  organizationId: "org-1",
  territoryId: "terr-1",
};

const outletB = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  code: "BETA",
  name: "Beta Store",
  status: "active",
  brandId: "brand-1",
  organizationId: "org-1",
  territoryId: "terr-1",
};

beforeEach(() => {
  listAdminOutlets.mockReset();
  listAdminMembershipsFiltered.mockReset();
  getStoreCapabilities.mockReset();
  listStoreAvailability.mockReset();
  setVariantAvailability.mockReset();
  getStoreAssortment.mockReset();
  getStoreOperatingState.mockReset();
  getStoreOperatingProfile.mockReset();
  getStoreOperatingSchedule.mockReset();
  getStoreServiceability.mockReset();
  setStoreDistancePolicy.mockReset();
  window.history.replaceState({}, "", "/workforce/operations/store/");
});

describe("StoreOutletContext / StoreShell", () => {
  it("defaults to deterministic first outlet and preserves selection in query", async () => {
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletB, outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "outlet.read": true, "availability.read": true },
      },
    });

    render(
      <StoreShell>
        <p>child</p>
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-outlet-select")).toHaveValue(outletA.id));
    expect(window.location.search).toContain(`outletId=${outletA.id}`);
    await waitFor(() =>
      expect(screen.getByTestId("store-subnav-overview")).toHaveAttribute(
        "href",
        expect.stringContaining(`outletId=${outletA.id}`),
      ),
    );
  });

  it("does not silently accept a stale unauthorized outletId", async () => {
    window.history.replaceState({}, "", "/workforce/operations/store/?outletId=unknown-outlet");
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, capabilities: { "outlet.read": true } },
    });

    render(
      <StoreShell>
        <p>child</p>
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-outlet-stale")).toBeInTheDocument());
    expect(screen.getByTestId("store-outlet-select")).toHaveValue("");
  });
});

describe("resource-scoped control visibility", () => {
  it("hides suspend when pause-only capability and never gates by role name", async () => {
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: {
          "outlet.operating_state.read": true,
          "outlet.operating_state.pause": true,
          "outlet.operating_state.suspend": false,
        },
      },
    });
    getStoreOperatingState.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        controlState: "accepting",
        effectiveState: "accepting",
        timezone: "Asia/Kolkata",
        pausedUntil: null,
      },
    });

    render(
      <StoreShell>
        <StoreOperatingStatusClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-operating-pause")).toBeInTheDocument());
    expect(screen.queryByTestId("store-operating-suspend")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/OUTLET_MANAGER|role ===/i);
  });

  it("never shows assortment manage controls", async () => {
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "assortment.read": true, "assortment.manage": true },
      },
    });
    getStoreAssortment.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        outletId: outletA.id,
        items: [
          {
            variantId: "v1",
            productId: "p1",
            productName: "Tea",
            variantName: "Large",
            code: "TEA-L",
            eligible: true,
            eligibilityCode: "AVAILABLE",
          },
        ],
      },
    });

    render(
      <StoreShell>
        <StoreAssortmentClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-assortment")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /manage|save|edit assortment/i })).toBeNull();
  });
});

describe("assortment escalation", () => {
  it("shows escalation when assortment.read is false", async () => {
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "outlet.read": true, "assortment.read": false },
      },
    });

    render(
      <StoreShell>
        <StoreAssortmentClient />
      </StoreShell>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("store-assortment-escalation")).toBeInTheDocument(),
    );
  });
});

describe("availability mutations", () => {
  it("shows pending then success and failure states", async () => {
    const user = userEvent.setup();
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "availability.read": true, "availability.manage": true },
      },
    });
    listStoreAvailability.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        outletId: outletA.id,
        items: [
          {
            kind: "variant",
            id: "var-1",
            productName: "Milk Tea",
            variantName: "Regular",
            code: "MT-R",
            effectiveState: "available",
            persistedState: "available",
            unavailableUntil: null,
          },
        ],
      },
    });

    let resolveMutation: (value: unknown) => void = () => undefined;
    setVariantAvailability.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    render(
      <StoreShell>
        <StoreAvailabilityClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-availability-list")).toBeInTheDocument());
    await user.selectOptions(screen.getByTestId("store-availability-select-var-1"), "sold_out");
    expect(screen.getByTestId("store-availability-pending")).toBeInTheDocument();

    resolveMutation({ ok: true, status: 200, data: { ok: true, availability: {} } });
    await waitFor(() => expect(screen.getByTestId("store-availability-success")).toBeInTheDocument());

    setVariantAvailability.mockResolvedValueOnce({
      ok: false,
      status: 500,
      code: "INTERNAL_ERROR",
    });
    await user.selectOptions(
      screen.getByTestId("store-availability-select-var-1"),
      "temporarily_unavailable",
    );
    await waitFor(() => expect(screen.getByTestId("store-availability-failure")).toBeInTheDocument());
  });
});

describe("hours validation", () => {
  it("keeps edits and shows validation messaging", async () => {
    const user = userEvent.setup();
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: {
          "outlet.operating_schedule.read": true,
          "outlet.operating_schedule.manage": true,
        },
      },
    });
    getStoreOperatingProfile.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, profile: { timezone: "Asia/Kolkata" } },
    });
    getStoreOperatingSchedule.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        intervals: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1260 }],
      },
    });

    render(
      <StoreShell>
        <StoreHoursClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-hours-save")).toBeInTheDocument());
    await user.clear(screen.getByTestId("store-hours-end-0"));
    await user.type(screen.getByTestId("store-hours-end-0"), "08:00");
    await user.click(screen.getByTestId("store-hours-save"));
    await waitFor(() => expect(screen.getByTestId("store-hours-validation")).toBeInTheDocument());
    expect(screen.getByTestId("store-hours-end-0")).toHaveValue("08:00");
  });
});

describe("serviceability stale revision recovery", () => {
  it("refreshes fields on configuration conflict", async () => {
    const user = userEvent.setup();
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "serviceability.read": true, "serviceability.manage": true },
      },
    });
    getStoreServiceability
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          ok: true,
          serviceability: {
            serviceOriginLatitude: "30.3",
            serviceOriginLongitude: "78.0",
            maxServiceDistanceMeters: 5000,
            revision: "1",
            configured: true,
            routingPriorityConfigured: true,
          },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          ok: true,
          serviceability: {
            serviceOriginLatitude: "30.4",
            serviceOriginLongitude: "78.1",
            maxServiceDistanceMeters: 6000,
            revision: "2",
            configured: true,
            routingPriorityConfigured: true,
          },
        },
      });
    setStoreDistancePolicy.mockResolvedValue({
      ok: false,
      status: 409,
      code: "SERVICEABILITY_CONFIGURATION_CONFLICT",
    });

    render(
      <StoreShell>
        <StoreServiceabilityClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-serviceability-save")).toBeInTheDocument());
    await user.click(screen.getByTestId("store-serviceability-save"));
    await waitFor(() =>
      expect(screen.getByTestId("store-serviceability-error-msg")).toHaveTextContent(/changed elsewhere/i),
    );
    expect(screen.getByTestId("store-serviceability-lat")).toHaveValue("30.4");
    expect(screen.getByTestId("store-serviceability-revision")).toHaveTextContent("2");
  });
});

describe("team visibility", () => {
  it("lists filtered memberships for the selected outlet", async () => {
    listAdminOutlets.mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, items: [outletA] },
    });
    getStoreCapabilities.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        capabilities: { "access.membership.read": true, "access.membership.manage": false },
      },
    });
    listAdminMembershipsFiltered.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        ok: true,
        items: [
          {
            id: "m1",
            workforceUserId: "user-1",
            scopeType: "outlet",
            status: "active",
            brandId: "brand-1",
            organizationId: "org-1",
            territoryId: "terr-1",
            outletId: outletA.id,
          },
        ],
      },
    });

    render(
      <StoreShell>
        <StoreTeamMembersClient />
      </StoreShell>,
    );

    await waitFor(() => expect(screen.getByTestId("store-team-members")).toBeInTheDocument());
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.queryByTestId("store-team-create")).not.toBeInTheDocument();
    expect(listAdminMembershipsFiltered).toHaveBeenCalledWith(outletA.id);
  });
});
