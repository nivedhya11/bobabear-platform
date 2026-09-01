import { describe, expect, it } from "vitest";

import {
  ADMINISTRATION_ENTRY_PERMISSIONS,
  resolveAuthorizedDestinations,
  resolveDefaultDestinationHref,
  WORKFORCE_DESTINATIONS,
} from "../../src/lib/workforce-hub/destinations";

describe("workforce hub destinations", () => {
  it("registers only implemented destinations", () => {
    expect(WORKFORCE_DESTINATIONS.map((destination) => destination.id)).toEqual([
      "operations",
      "administration",
    ]);
    expect(WORKFORCE_DESTINATIONS.some((destination) => /store|commercial|menu/i.test(destination.label))).toBe(
      false,
    );
  });

  it("exposes operations only when order.read is effective", () => {
    const destinations = resolveAuthorizedDestinations({ "order.read": true });
    expect(destinations.map((destination) => destination.id)).toEqual(["operations"]);
  });

  it("exposes administration only when an administration entry permission is effective", () => {
    const capabilities = Object.fromEntries(
      ADMINISTRATION_ENTRY_PERMISSIONS.map((permission) => [permission, false]),
    ) as Record<string, boolean>;
    capabilities["access.membership.read"] = true;
    const destinations = resolveAuthorizedDestinations(capabilities);
    expect(destinations.map((destination) => destination.id)).toEqual(["administration"]);
  });

  it("does not expose administration for operations-only principals", () => {
    const destinations = resolveAuthorizedDestinations({ "order.read": true });
    expect(destinations.some((destination) => destination.id === "administration")).toBe(false);
  });

  it("resolves a single authorized destination as the default href", () => {
    expect(resolveDefaultDestinationHref({ "order.read": true })).toBe("/workforce/operations/");
    expect(resolveDefaultDestinationHref({ "access.audit.read": true })).toBe("/workforce/admin/");
    expect(
      resolveDefaultDestinationHref({ "order.read": true, "access.audit.read": true }),
    ).toBe("/workforce/");
  });
});
