/**
 * Permission-derived Operations workspace navigation (IMP-036D).
 *
 * Never hard-code role names. Franchise is a business persona, not an RBAC role.
 */

export type OperationsNavId =
  | "today"
  | "orders"
  | "delivery"
  | "store"
  | "operational-status";

export type OperationsNavItem = Readonly<{
  id: OperationsNavId;
  label: string;
  href: string;
  requiredAnyPermission: readonly string[];
}>;

export const OPERATIONS_NAV_ITEMS: readonly OperationsNavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/workforce/operations/",
    requiredAnyPermission: ["order.read"],
  },
  {
    id: "orders",
    label: "Orders",
    href: "/workforce/operations/orders/",
    requiredAnyPermission: ["order.read"],
  },
  {
    id: "delivery",
    label: "Delivery",
    href: "/workforce/operations/delivery/",
    requiredAnyPermission: ["delivery.read"],
  },
  {
    id: "store",
    label: "Store",
    href: "/workforce/operations/store/",
    requiredAnyPermission: ["outlet.read", "order.read"],
  },
  {
    id: "operational-status",
    label: "Operational Status",
    href: "/workforce/operations/status/",
    requiredAnyPermission: ["order.read"],
  },
];

export function hasAnyCapability(
  capabilities: Readonly<Record<string, boolean>>,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => capabilities[permission] === true);
}

export function resolveOperationsNavItems(
  capabilities: Readonly<Record<string, boolean>>,
  pathname: string,
): readonly Readonly<{ href: string; label: string; current?: boolean }>[] {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return OPERATIONS_NAV_ITEMS.filter((item) =>
    hasAnyCapability(capabilities, item.requiredAnyPermission),
  ).map((item) => {
    const current =
      item.id === "today"
        ? normalized === "/workforce/operations/"
        : normalized.startsWith(item.href);
    return { href: item.href, label: item.label, current };
  });
}
