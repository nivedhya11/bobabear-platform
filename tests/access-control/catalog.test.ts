/**
 * Pure unit tests for the IMP-011 permission/role catalog consistency.
 */
import { describe, expect, it } from "vitest";

import {
  PERMISSION_KEYS,
  PERMISSION_TARGET_KIND,
  ROLE_ALLOWED_SCOPES,
  ROLE_DISPLAY_NAMES,
  ROLE_KEYS,
  ROLE_PERMISSION_MAPPINGS,
  isPermissionKey,
  isRoleKey,
  permissionsForRole,
} from "../../src/shared/access-control";

describe("access-control catalog", () => {
  it("declares exactly 68 permissions and 7 roles", () => {
    expect(PERMISSION_KEYS).toHaveLength(68);
    expect(ROLE_KEYS).toHaveLength(7);
    expect(new Set(PERMISSION_KEYS).size).toBe(68);
    expect(new Set(ROLE_KEYS).size).toBe(7);
  });

  it("has display names and allowed scopes for every role", () => {
    for (const role of ROLE_KEYS) {
      expect(ROLE_DISPLAY_NAMES[role].length).toBeGreaterThan(0);
      expect(ROLE_ALLOWED_SCOPES[role].length).toBeGreaterThan(0);
    }
  });

  it("maps every permission to a target kind", () => {
    for (const key of PERMISSION_KEYS) {
      expect(PERMISSION_TARGET_KIND[key]).toBeDefined();
    }
  });

  it("keeps role-permission mappings internally consistent", () => {
    for (const mapping of ROLE_PERMISSION_MAPPINGS) {
      expect(isRoleKey(mapping.roleKey)).toBe(true);
      expect(isPermissionKey(mapping.permissionKey)).toBe(true);
      expect(["exact", "descendants"]).toContain(mapping.inheritanceMode);
    }

    const platformPerms = permissionsForRole("platform_super_admin");
    expect(platformPerms).toHaveLength(68);
    expect(new Set(platformPerms)).toEqual(new Set(PERMISSION_KEYS));

    expect(permissionsForRole("kitchen_operator")).toEqual([
      "outlet.read",
      "assortment.read",
      "availability.read",
      "availability.manage",
      "outlet.operating_state.read",
      "outlet.operating_state.pause",
      "outlet.operating_schedule.read",
      "order.read",
      "order.accept",
      "order.fulfil",
    ]);
    expect(permissionsForRole("delivery_coordinator")).toEqual([
      "outlet.read",
      "availability.read",
      "outlet.operating_state.read",
      "outlet.operating_schedule.read",
      "charges.read",
      "order.read",
      "order.fulfil",
      "delivery.read",
      "delivery.dispatch",
      "delivery.book",
      "delivery.assign",
      "delivery.pickup",
      "delivery.complete",
      "delivery.cancel",
      "delivery.fail",
      "delivery.return",
      "delivery.cost.record",
    ]);
    expect(permissionsForRole("outlet_manager")).not.toContain("brand.create");
    expect(permissionsForRole("outlet_manager")).not.toContain("catalog.manage");
    expect(permissionsForRole("outlet_manager")).not.toContain("menu.manage");
    expect(permissionsForRole("outlet_manager")).not.toContain("outlet.operating_state.suspend");
    expect(permissionsForRole("outlet_manager")).not.toContain("tax.manage");
    expect(permissionsForRole("outlet_manager")).toContain("pricing.manage");
    expect(permissionsForRole("outlet_manager")).toContain("tax.read");
    expect(permissionsForRole("outlet_manager")).toContain("promotions.manage");
    expect(permissionsForRole("outlet_manager")).toContain("coupons.manage");
    expect(permissionsForRole("outlet_manager")).not.toContain("promotions.activate");
    expect(permissionsForRole("outlet_manager")).toContain("serviceability.read");
    expect(permissionsForRole("outlet_manager")).toContain("serviceability.manage");
    expect(permissionsForRole("brand_admin")).not.toContain("brand.create");
    expect(permissionsForRole("brand_admin")).toContain("organization.create");
    expect(permissionsForRole("brand_admin")).toContain("catalog.read");
    expect(permissionsForRole("brand_admin")).toContain("catalog.manage");
    expect(permissionsForRole("brand_admin")).toContain("menu.read");
    expect(permissionsForRole("brand_admin")).toContain("menu.manage");
    expect(permissionsForRole("brand_admin")).toContain("assortment.manage");
    expect(permissionsForRole("brand_admin")).toContain("pricing.manage");
    expect(permissionsForRole("brand_admin")).toContain("tax.manage");
    expect(permissionsForRole("brand_admin")).toContain("promotions.activate");
    expect(permissionsForRole("brand_admin")).toContain("coupons.manage");
    expect(permissionsForRole("brand_admin")).toContain("serviceability.read");
    expect(permissionsForRole("brand_admin")).toContain("serviceability.manage");
    expect(permissionsForRole("brand_admin")).toContain("order.read");
    expect(permissionsForRole("brand_admin")).toContain("order.accept");
    expect(permissionsForRole("brand_admin")).toContain("order.fulfil");
    expect(permissionsForRole("brand_admin")).toContain("order.cancel");
    expect(permissionsForRole("outlet_manager")).toContain("delivery.read");
    expect(permissionsForRole("outlet_manager")).not.toContain("delivery.book");
    expect(permissionsForRole("outlet_manager")).toContain("order.read");
    expect(permissionsForRole("outlet_manager")).toContain("order.accept");
    expect(permissionsForRole("outlet_manager")).toContain("order.fulfil");
    expect(permissionsForRole("outlet_manager")).toContain("order.cancel");
    expect(permissionsForRole("finance_viewer")).toContain("pricing.read");
    expect(permissionsForRole("finance_viewer")).toContain("tax.read");
    expect(permissionsForRole("finance_viewer")).toContain("promotions.read");
    expect(permissionsForRole("finance_viewer")).toContain("coupons.read");
    expect(permissionsForRole("finance_viewer")).toContain("promotions.audit.read");
    expect(permissionsForRole("finance_viewer")).toContain("order.read");
    expect(permissionsForRole("finance_viewer")).not.toContain("order.cancel");
    expect(permissionsForRole("finance_viewer")).not.toContain("pricing.manage");
    expect(permissionsForRole("support_refund_operator")).toContain("pricing.read");
    expect(permissionsForRole("support_refund_operator")).toContain("promotions.read");
    expect(permissionsForRole("support_refund_operator")).toContain("order.read");
    expect(permissionsForRole("support_refund_operator")).toContain("order.cancel");
    expect(permissionsForRole("support_refund_operator")).toContain("payment.refund");
    expect(permissionsForRole("support_refund_operator")).toContain("payment.refund.read");
    expect(permissionsForRole("support_refund_operator")).toContain("notification.resend");
    expect(permissionsForRole("platform_super_admin")).toContain("notification.resend");
    expect(permissionsForRole("finance_viewer")).not.toContain("notification.resend");
    expect(permissionsForRole("outlet_manager")).not.toContain("notification.resend");
    expect(permissionsForRole("delivery_coordinator")).not.toContain("notification.resend");
    expect(permissionsForRole("finance_viewer")).toContain("payment.refund.read");
    expect(permissionsForRole("finance_viewer")).not.toContain("payment.refund");
    expect(permissionsForRole("outlet_manager")).not.toContain("payment.refund");
    expect(permissionsForRole("support_refund_operator")).not.toContain("order.accept");
    expect(permissionsForRole("support_refund_operator")).not.toContain("pricing.manage");
    expect(permissionsForRole("platform_super_admin")).toContain("menu.read");
    expect(permissionsForRole("platform_super_admin")).toContain("menu.manage");
    expect(permissionsForRole("platform_super_admin")).toContain("assortment.manage");
    expect(permissionsForRole("platform_super_admin")).toContain("pricing.manage");
    expect(permissionsForRole("platform_super_admin")).toContain("promotions.activate");
    expect(permissionsForRole("platform_super_admin")).toContain("serviceability.manage");
    expect(permissionsForRole("platform_super_admin")).toContain("order.cancel");
    expect(PERMISSION_KEYS).toContain("catalog.read");
    expect(PERMISSION_KEYS).toContain("serviceability.read");
    expect(PERMISSION_KEYS).toContain("serviceability.manage");
    expect(PERMISSION_KEYS).toContain("order.read");
    expect(PERMISSION_KEYS).toContain("order.accept");
    expect(PERMISSION_KEYS).toContain("order.fulfil");
    expect(PERMISSION_KEYS).toContain("order.cancel");
    expect(PERMISSION_KEYS).toContain("catalog.manage");
    expect(PERMISSION_KEYS).toContain("menu.read");
    expect(PERMISSION_KEYS).toContain("menu.manage");
    expect(PERMISSION_KEYS).toContain("promotions.read");
    expect(PERMISSION_KEYS).toContain("promotions.manage");
    expect(PERMISSION_KEYS).toContain("promotions.activate");
    expect(PERMISSION_KEYS).toContain("coupons.read");
    expect(PERMISSION_KEYS).toContain("coupons.manage");
    expect(PERMISSION_KEYS).toContain("promotions.audit.read");
    expect(PERMISSION_KEYS).toContain("assortment.read");
    expect(PERMISSION_KEYS).toContain("availability.manage");
    expect(PERMISSION_KEYS).toContain("pricing.read");
    expect(PERMISSION_KEYS).toContain("pricing.manage");
    expect(PERMISSION_KEYS).toContain("charges.read");
    expect(PERMISSION_KEYS).toContain("charges.manage");
    expect(PERMISSION_KEYS).toContain("tax.read");
    expect(PERMISSION_KEYS).toContain("tax.manage");
    expect(PERMISSION_KEYS).toContain("pricing.audit.read");
    expect(PERMISSION_KEYS).toContain("payment.refund");
    expect(PERMISSION_KEYS).toContain("payment.refund.read");
    expect(PERMISSION_KEYS).toContain("notification.resend");
  });

  it("locks platform_super_admin to platform scope only", () => {
    expect(ROLE_ALLOWED_SCOPES.platform_super_admin).toEqual(["platform"]);
    expect(ROLE_ALLOWED_SCOPES.brand_admin).toEqual(["brand"]);
    expect(ROLE_ALLOWED_SCOPES.outlet_manager).toEqual(["outlet"]);
  });
});
