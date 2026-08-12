/**
 * IMP-011 system permission and role catalogs — typed TypeScript source of
 * truth. Migration `0005` seeds must match exactly (enforced by tests/audit).
 */

export const ACCESS_SCOPE_TYPES = [
  "platform",
  "brand",
  "organization",
  "territory",
  "outlet",
] as const;

export type AccessScopeType = (typeof ACCESS_SCOPE_TYPES)[number];

export const RESOURCE_LIFECYCLE_STATUSES = ["active", "inactive"] as const;
export type ResourceLifecycleStatus = (typeof RESOURCE_LIFECYCLE_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  "invited",
  "active",
  "suspended",
  "revoked",
  "expired",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const NON_TERMINAL_MEMBERSHIP_STATUSES = [
  "invited",
  "active",
  "suspended",
] as const;

export const INHERITANCE_MODES = ["exact", "descendants"] as const;
export type InheritanceMode = (typeof INHERITANCE_MODES)[number];

export const PERMISSION_KEYS = [
  "brand.create",
  "brand.read",
  "brand.update",
  "organization.create",
  "organization.read",
  "organization.update",
  "territory.create",
  "territory.read",
  "territory.update",
  "legal_entity.create",
  "legal_entity.read",
  "legal_entity.update",
  "outlet.create",
  "outlet.read",
  "outlet.update",
  "access.membership.read",
  "access.membership.manage",
  "access.role_assignment.read",
  "access.role_assignment.grant",
  "access.role_assignment.revoke",
  "access.effective_permissions.read",
  "access.audit.read",
  "catalog.read",
  "catalog.manage",
  "menu.read",
  "menu.manage",
  "assortment.read",
  "assortment.manage",
  "availability.read",
  "availability.manage",
  "outlet.operating_state.read",
  "outlet.operating_state.pause",
  "outlet.operating_state.suspend",
  "outlet.operating_schedule.read",
  "outlet.operating_schedule.manage",
  "assortment.audit.read",
  "pricing.read",
  "pricing.manage",
  "charges.read",
  "charges.manage",
  "tax.read",
  "tax.manage",
  "pricing.audit.read",
  "promotions.read",
  "promotions.manage",
  "promotions.activate",
  "coupons.read",
  "coupons.manage",
  "promotions.audit.read",
  "serviceability.read",
  "serviceability.manage",
  "order.read",
  "order.accept",
  "order.fulfil",
  "order.cancel",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_KEYS = [
  "platform_super_admin",
  "brand_admin",
  "outlet_manager",
  "kitchen_operator",
  "delivery_coordinator",
  "support_refund_operator",
  "finance_viewer",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_DISPLAY_NAMES: Readonly<Record<RoleKey, string>> = {
  platform_super_admin: "Platform Super Admin",
  brand_admin: "Brand Admin",
  outlet_manager: "Outlet Manager",
  kitchen_operator: "Kitchen Operator",
  delivery_coordinator: "Delivery Coordinator",
  support_refund_operator: "Support/Refund Operator",
  finance_viewer: "Finance Viewer",
};

export const ROLE_ALLOWED_SCOPES: Readonly<Record<RoleKey, readonly AccessScopeType[]>> = {
  platform_super_admin: ["platform"],
  brand_admin: ["brand"],
  outlet_manager: ["outlet"],
  kitchen_operator: ["outlet"],
  delivery_coordinator: ["outlet"],
  support_refund_operator: ["brand", "organization", "territory", "outlet"],
  finance_viewer: ["brand", "organization"],
};

export type RolePermissionMapping = Readonly<{
  roleKey: RoleKey;
  permissionKey: PermissionKey;
  inheritanceMode: InheritanceMode;
}>;

const ALL_DESCENDANTS: RolePermissionMapping[] = PERMISSION_KEYS.map((permissionKey) => ({
  roleKey: "platform_super_admin",
  permissionKey,
  inheritanceMode: "descendants",
}));

const BRAND_ADMIN_PERMISSIONS: RolePermissionMapping[] = (
  [
    ["brand.read", "exact"],
    ["brand.update", "exact"],
    ["organization.create", "exact"],
    ["organization.read", "descendants"],
    ["organization.update", "descendants"],
    ["territory.create", "exact"],
    ["territory.read", "descendants"],
    ["territory.update", "descendants"],
    ["legal_entity.create", "descendants"],
    ["legal_entity.read", "descendants"],
    ["legal_entity.update", "descendants"],
    ["outlet.create", "exact"],
    ["outlet.read", "descendants"],
    ["outlet.update", "descendants"],
    ["access.membership.read", "descendants"],
    ["access.membership.manage", "descendants"],
    ["access.role_assignment.read", "descendants"],
    ["access.role_assignment.grant", "descendants"],
    ["access.role_assignment.revoke", "descendants"],
    ["access.effective_permissions.read", "descendants"],
    ["access.audit.read", "descendants"],
    ["catalog.read", "exact"],
    ["catalog.manage", "exact"],
    ["menu.read", "exact"],
    ["menu.manage", "exact"],
    ["assortment.read", "descendants"],
    ["assortment.manage", "descendants"],
    ["availability.read", "descendants"],
    ["availability.manage", "descendants"],
    ["outlet.operating_state.read", "descendants"],
    ["outlet.operating_state.pause", "descendants"],
    ["outlet.operating_state.suspend", "descendants"],
    ["outlet.operating_schedule.read", "descendants"],
    ["outlet.operating_schedule.manage", "descendants"],
    ["assortment.audit.read", "descendants"],
    ["pricing.read", "descendants"],
    ["pricing.manage", "descendants"],
    ["charges.read", "descendants"],
    ["charges.manage", "descendants"],
    ["tax.read", "descendants"],
    ["tax.manage", "descendants"],
    ["pricing.audit.read", "descendants"],
    ["promotions.read", "descendants"],
    ["promotions.manage", "descendants"],
    ["promotions.activate", "descendants"],
    ["coupons.read", "descendants"],
    ["coupons.manage", "descendants"],
    ["promotions.audit.read", "descendants"],
    ["serviceability.read", "descendants"],
    ["serviceability.manage", "descendants"],
    ["order.read", "descendants"],
    ["order.accept", "descendants"],
    ["order.fulfil", "descendants"],
    ["order.cancel", "descendants"],
  ] as const
).map(([permissionKey, inheritanceMode]) => ({
  roleKey: "brand_admin" as const,
  permissionKey,
  inheritanceMode,
}));

const OUTLET_MANAGER_PERMISSIONS: RolePermissionMapping[] = (
  [
    "outlet.read",
    "outlet.update",
    "access.membership.read",
    "access.membership.manage",
    "access.role_assignment.read",
    "access.role_assignment.grant",
    "access.role_assignment.revoke",
    "access.effective_permissions.read",
    "access.audit.read",
    "assortment.read",
    "assortment.manage",
    "availability.read",
    "availability.manage",
    "outlet.operating_state.read",
    "outlet.operating_state.pause",
    "outlet.operating_schedule.read",
    "outlet.operating_schedule.manage",
    "assortment.audit.read",
    "pricing.read",
    "pricing.manage",
    "charges.read",
    "charges.manage",
    "tax.read",
    "pricing.audit.read",
    "promotions.read",
    "promotions.manage",
    "coupons.read",
    "coupons.manage",
    "promotions.audit.read",
    "serviceability.read",
    "serviceability.manage",
    "order.read",
    "order.accept",
    "order.fulfil",
    "order.cancel",
  ] as const
).map((permissionKey) => ({
  roleKey: "outlet_manager" as const,
  permissionKey,
  inheritanceMode: "exact" as const,
}));

const KITCHEN_OPERATOR_PERMISSIONS: RolePermissionMapping[] = (
  [
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
  ] as const
).map((permissionKey) => ({
  roleKey: "kitchen_operator" as const,
  permissionKey,
  inheritanceMode: "exact" as const,
}));

const DELIVERY_COORDINATOR_PERMISSIONS: RolePermissionMapping[] = (
  [
    "outlet.read",
    "availability.read",
    "outlet.operating_state.read",
    "outlet.operating_schedule.read",
    "charges.read",
    "order.read",
    "order.fulfil",
  ] as const
).map((permissionKey) => ({
  roleKey: "delivery_coordinator" as const,
  permissionKey,
  inheritanceMode: "exact" as const,
}));

const SUPPORT_PERMISSIONS: RolePermissionMapping[] = (
  [
    "brand.read",
    "organization.read",
    "territory.read",
    "outlet.read",
    "assortment.read",
    "availability.read",
    "outlet.operating_state.read",
    "outlet.operating_schedule.read",
    "assortment.audit.read",
    "pricing.read",
    "charges.read",
    "tax.read",
    "pricing.audit.read",
    "promotions.read",
    "coupons.read",
    "promotions.audit.read",
    "order.read",
    "order.cancel",
  ] as const
).map((permissionKey) => ({
  roleKey: "support_refund_operator" as const,
  permissionKey,
  inheritanceMode: "descendants" as const,
}));

const FINANCE_PERMISSIONS: RolePermissionMapping[] = (
  [
    "brand.read",
    "organization.read",
    "territory.read",
    "legal_entity.read",
    "outlet.read",
    "pricing.read",
    "charges.read",
    "tax.read",
    "pricing.audit.read",
    "promotions.read",
    "coupons.read",
    "promotions.audit.read",
    "order.read",
  ] as const
).map((permissionKey) => ({
  roleKey: "finance_viewer" as const,
  permissionKey,
  inheritanceMode: "descendants" as const,
}));

export const ROLE_PERMISSION_MAPPINGS: readonly RolePermissionMapping[] = [
  ...ALL_DESCENDANTS,
  ...BRAND_ADMIN_PERMISSIONS,
  ...OUTLET_MANAGER_PERMISSIONS,
  ...KITCHEN_OPERATOR_PERMISSIONS,
  ...DELIVERY_COORDINATOR_PERMISSIONS,
  ...SUPPORT_PERMISSIONS,
  ...FINANCE_PERMISSIONS,
];

/** Permission → target resource/scope type for authorization evaluation. */
export const PERMISSION_TARGET_KIND: Readonly<
  Record<PermissionKey, "platform" | "brand" | "organization" | "territory" | "legal_entity" | "outlet" | "access">
> = {
  "brand.create": "platform",
  "brand.read": "brand",
  "brand.update": "brand",
  "organization.create": "brand",
  "organization.read": "organization",
  "organization.update": "organization",
  "territory.create": "brand",
  "territory.read": "territory",
  "territory.update": "territory",
  "legal_entity.create": "organization",
  "legal_entity.read": "legal_entity",
  "legal_entity.update": "legal_entity",
  "outlet.create": "brand",
  "outlet.read": "outlet",
  "outlet.update": "outlet",
  "access.membership.read": "access",
  "access.membership.manage": "access",
  "access.role_assignment.read": "access",
  "access.role_assignment.grant": "access",
  "access.role_assignment.revoke": "access",
  "access.effective_permissions.read": "access",
  "access.audit.read": "access",
  "catalog.read": "brand",
  "catalog.manage": "brand",
  "menu.read": "brand",
  "menu.manage": "brand",
  "assortment.read": "brand",
  "assortment.manage": "brand",
  "availability.read": "outlet",
  "availability.manage": "outlet",
  "outlet.operating_state.read": "outlet",
  "outlet.operating_state.pause": "outlet",
  "outlet.operating_state.suspend": "outlet",
  "outlet.operating_schedule.read": "outlet",
  "outlet.operating_schedule.manage": "outlet",
  "assortment.audit.read": "brand",
  "pricing.read": "brand",
  "pricing.manage": "brand",
  "charges.read": "brand",
  "charges.manage": "brand",
  "tax.read": "brand",
  "tax.manage": "brand",
  "pricing.audit.read": "brand",
  "promotions.read": "brand",
  "promotions.manage": "brand",
  "promotions.activate": "brand",
  "coupons.read": "brand",
  "coupons.manage": "brand",
  "promotions.audit.read": "brand",
  "serviceability.read": "outlet",
  "serviceability.manage": "outlet",
  "order.read": "outlet",
  "order.accept": "outlet",
  "order.fulfil": "outlet",
  "order.cancel": "outlet",
};

export const SAFE_AUTHORIZATION_DECISION_CODES = ["AUTHORIZED", "DENIED"] as const;
export type SafeAuthorizationDecisionCode =
  (typeof SAFE_AUTHORIZATION_DECISION_CODES)[number];

export const ACCESS_AUDIT_ACTIONS = [
  "platform_admin.bootstrapped",
  "membership.created",
  "membership.activated",
  "membership.suspended",
  "membership.revoked",
  "membership.expired",
  "role_assignment.granted",
  "role_assignment.revoked",
  "brand.created",
  "brand.updated",
  "organization.created",
  "organization.updated",
  "territory.created",
  "territory.updated",
  "legal_entity.created",
  "legal_entity.updated",
  "outlet.created",
  "outlet.updated",
] as const;

export type AccessAuditAction = (typeof ACCESS_AUDIT_ACTIONS)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export function permissionsForRole(roleKey: RoleKey): readonly PermissionKey[] {
  return ROLE_PERMISSION_MAPPINGS.filter((m) => m.roleKey === roleKey).map(
    (m) => m.permissionKey,
  );
}
