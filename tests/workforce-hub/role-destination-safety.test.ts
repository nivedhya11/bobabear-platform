import { describe, expect, it } from "vitest";

import { permissionsForRole } from "../../src/shared/access-control";
import {
  ADMINISTRATION_ENTRY_PERMISSIONS,
  hasAnyCapability,
  resolveAuthorizedDestinations,
} from "../../src/lib/workforce-hub/destinations";

function capabilitiesForRole(roleKey: Parameters<typeof permissionsForRole>[0]): Record<string, boolean> {
  return Object.fromEntries(permissionsForRole(roleKey).map((permission) => [permission, true]));
}

describe("canonical role destination safety", () => {
  it("resolves both Operations and Administration for platform_super_admin", () => {
    const destinations = resolveAuthorizedDestinations(capabilitiesForRole("platform_super_admin"));
    expect(destinations.map((destination) => destination.id)).toEqual(["operations", "administration"]);
  });

  it("keeps outlet_manager canonical access permissions and multi-application entry", () => {
    const permissions = permissionsForRole("outlet_manager");
    expect(permissions).toEqual(expect.arrayContaining([
      "order.read",
      "access.membership.read",
      "access.membership.manage",
      "access.role_assignment.read",
      "access.role_assignment.grant",
      "access.role_assignment.revoke",
      "access.effective_permissions.read",
      "access.audit.read",
    ]));
    const destinations = resolveAuthorizedDestinations(capabilitiesForRole("outlet_manager"));
    expect(destinations.map((destination) => destination.id)).toEqual(["operations", "administration"]);
  });

  it("keeps kitchen_operator Operations access without stripping canonical outlet.read", () => {
    const capabilities = capabilitiesForRole("kitchen_operator");
    expect(capabilities["order.read"]).toBe(true);
    expect(capabilities["outlet.read"]).toBe(true);
    expect(capabilities["access.membership.manage"]).toBeUndefined();
    expect(resolveAuthorizedDestinations(capabilities).some((destination) => destination.id === "operations")).toBe(
      true,
    );
    expect(hasAnyCapability(capabilities, ADMINISTRATION_ENTRY_PERMISSIONS)).toBe(true);
  });
});
