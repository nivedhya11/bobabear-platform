/**
 * Store Operations sub-navigation (IMP-036E).
 *
 * Section visibility uses resource-scoped capabilities for the selected outlet.
 * Global session caps are not used here.
 */

export type StoreSubnavId =
  | "overview"
  | "availability"
  | "assortment"
  | "operating-status"
  | "hours"
  | "serviceability"
  | "team-members"
  | "team-access";

export type StoreSubnavItem = Readonly<{
  id: StoreSubnavId;
  label: string;
  href: string;
  /** When true, visible if any listed capability is true. Empty = always candidate for Overview. */
  requiredAnyCapability: readonly string[];
}>;

export const STORE_SUBNAV_ITEMS: readonly StoreSubnavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/workforce/operations/store/",
    requiredAnyCapability: [
      "outlet.read",
      "availability.read",
      "outlet.operating_state.read",
      "outlet.operating_schedule.read",
      "serviceability.read",
      "assortment.read",
      "access.membership.read",
    ],
  },
  {
    id: "availability",
    label: "Availability",
    href: "/workforce/operations/store/availability/",
    requiredAnyCapability: ["availability.read"],
  },
  {
    id: "assortment",
    label: "Assortment",
    href: "/workforce/operations/store/assortment/",
    // Always offer Assortment when Store is usable — escalation UX when brand read is false.
    requiredAnyCapability: [
      "outlet.read",
      "availability.read",
      "outlet.operating_state.read",
      "outlet.operating_schedule.read",
      "serviceability.read",
      "assortment.read",
      "access.membership.read",
    ],
  },
  {
    id: "operating-status",
    label: "Operating Status",
    href: "/workforce/operations/store/operating-status/",
    requiredAnyCapability: ["outlet.operating_state.read"],
  },
  {
    id: "hours",
    label: "Hours",
    href: "/workforce/operations/store/hours/",
    requiredAnyCapability: ["outlet.operating_schedule.read"],
  },
  {
    id: "serviceability",
    label: "Serviceability",
    href: "/workforce/operations/store/serviceability/",
    requiredAnyCapability: ["serviceability.read"],
  },
  {
    id: "team-members",
    label: "Team Members",
    href: "/workforce/operations/store/team/",
    requiredAnyCapability: ["access.membership.read"],
  },
  {
    id: "team-access",
    label: "Team Access",
    href: "/workforce/operations/store/team/access/",
    requiredAnyCapability: [
      "access.membership.read",
      "access.role_assignment.read",
      "access.role_assignment.grant",
      "access.role_assignment.revoke",
    ],
  },
];

/** Coarse top-level Store nav keys (global session projection only). */
export const STORE_COARSE_NAV_PERMISSIONS = [
  "outlet.read",
  "availability.read",
  "outlet.operating_state.read",
  "outlet.operating_schedule.read",
  "serviceability.read",
  "assortment.read",
  "access.membership.read",
] as const;

export function appendOutletId(href: string, outletId: string | null | undefined): string {
  if (!outletId) return href;
  const url = new URL(href, "https://boba.local");
  url.searchParams.set("outletId", outletId);
  return `${url.pathname}${url.search}`;
}

export function hasAnyStoreCapability(
  capabilities: Readonly<Record<string, boolean>> | null | undefined,
  permissions: readonly string[],
): boolean {
  if (!capabilities) return false;
  return permissions.some((permission) => capabilities[permission] === true);
}

export function resolveStoreSubnavItems(
  capabilities: Readonly<Record<string, boolean>> | null | undefined,
  pathname: string,
  outletId: string | null,
): readonly Readonly<{ id: StoreSubnavId; href: string; label: string; current?: boolean }>[] {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return STORE_SUBNAV_ITEMS.filter((item) =>
    hasAnyStoreCapability(capabilities, item.requiredAnyCapability),
  ).map((item) => {
    const current =
      item.id === "overview"
        ? normalized === "/workforce/operations/store/"
        : item.id === "team-members"
          ? normalized === "/workforce/operations/store/team/"
          : normalized.startsWith(item.href);
    return {
      id: item.id,
      href: appendOutletId(item.href, outletId),
      label: item.label,
      current,
    };
  });
}

export function sortOutletsByCodeThenId<T extends Readonly<{ id: string; code: string }>>(
  outlets: readonly T[],
): T[] {
  return [...outlets].sort((a, b) => {
    const byCode = a.code.localeCompare(b.code);
    if (byCode !== 0) return byCode;
    return a.id.localeCompare(b.id);
  });
}
