/**
 * Permission-driven workforce hub destinations (IMP-036A).
 *
 * Only real, implemented surfaces are registered. Future IMP-036D/E/F/G
 * destinations must be added here only when their capabilities exist.
 */

export type WorkforceDestinationId = "operations" | "administration";

export type WorkforceDestination = Readonly<{
  id: WorkforceDestinationId;
  label: string;
  description: string;
  href: string;
  requiredAnyPermission: readonly string[];
}>;

/** Permissions that grant entry to the Administration surface. */
export const ADMINISTRATION_ENTRY_PERMISSIONS = [
  "brand.read",
  "organization.read",
  "territory.read",
  "legal_entity.read",
  "outlet.read",
  "access.membership.read",
  "access.membership.manage",
  "access.role_assignment.read",
  "access.role_assignment.grant",
  "access.role_assignment.revoke",
  "access.effective_permissions.read",
  "access.audit.read",
] as const;

export const WORKFORCE_DESTINATIONS: readonly WorkforceDestination[] = [
  {
    id: "operations",
    label: "Operations",
    description: "Order queue, fulfilment, and delivery coordination.",
    href: "/workforce/operations/",
    requiredAnyPermission: ["order.read"],
  },
  {
    id: "administration",
    label: "Administration",
    description: "Resources, memberships, roles, and access audit.",
    href: "/workforce/admin/",
    requiredAnyPermission: ADMINISTRATION_ENTRY_PERMISSIONS,
  },
];

export function hasAnyCapability(
  capabilities: Readonly<Record<string, boolean>>,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => capabilities[permission] === true);
}

export function resolveAuthorizedDestinations(
  capabilities: Readonly<Record<string, boolean>>,
): readonly WorkforceDestination[] {
  return WORKFORCE_DESTINATIONS.filter((destination) =>
    hasAnyCapability(capabilities, destination.requiredAnyPermission),
  );
}

export function resolveDefaultDestinationHref(
  capabilities: Readonly<Record<string, boolean>>,
): string | null {
  const destinations = resolveAuthorizedDestinations(capabilities);
  if (destinations.length === 1) return destinations[0]!.href;
  if (destinations.length > 1) return "/workforce/";
  return null;
}

/** Neutral login (no returnTo): 0 apps → hub empty state; 1 → that app; 2+ → hub chooser. */
export function resolveNeutralPostLoginHref(
  capabilities: Readonly<Record<string, boolean>>,
): string {
  return resolveDefaultDestinationHref(capabilities) ?? "/workforce/";
}

export type ApplicationNavItem = Readonly<{
  href: string;
  label: string;
  current?: boolean;
}>;

export function normalizeWorkforcePath(pathname: string): string {
  if (!pathname) return "/workforce/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/**
 * Cross-application items derived from {@link WORKFORCE_DESTINATIONS}.
 * Administration already has in-surface Overview; do not duplicate that destination there.
 */
export function applicationNavItems(
  pathname: string,
  capabilities: Readonly<Record<string, boolean>>,
  surface: "workforce" | "administration",
): readonly ApplicationNavItem[] {
  const normalized = normalizeWorkforcePath(pathname);
  const destinations = resolveAuthorizedDestinations(capabilities);
  const items: ApplicationNavItem[] = [
    { href: "/workforce/", label: "Applications", current: normalized === "/workforce/" },
  ];
  for (const destination of destinations) {
    if (surface === "administration" && destination.id === "administration") continue;
    items.push({
      href: destination.href,
      label: destination.label,
      current: normalized.startsWith(destination.href),
    });
  }
  return items;
}
