/**
 * AUTHORIZED_SET_CURSOR_CONTINUATION helpers (IMP-036G).
 *
 * Derive the actor's authoritative eligible set from effective grants once,
 * then query/page over that set. Never DB-LIMIT then authorize-skip, and never
 * re-load grants per row via authorize().
 */
import type { InheritanceMode, PermissionKey } from "../../shared/access-control";
import type { AccessScope, ProtectedResource } from "../access-control";
import { assignmentCoversResource } from "../access-control";
import type { EffectiveGrant } from "../access-control/authorize";

export type EligibleScopePlan =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "unrestricted" }>
  | Readonly<{
      kind: "scoped";
      brandIds: readonly string[];
      organizationIds: readonly string[];
      territoryIds: readonly string[];
      outletIds: readonly string[];
      exactBrandIds: readonly string[];
      exactOrganizationIds: readonly string[];
      exactTerritoryIds: readonly string[];
      /** Exact platform home-scope coverage (platform memberships / platform audit). */
      exactPlatform: boolean;
    }>;

function unique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].filter(Boolean);
}

/** Grants that carry the list permission. */
export function grantsForPermission(
  grants: readonly EffectiveGrant[],
  permission: PermissionKey,
): EffectiveGrant[] {
  return grants.filter((grant) => grant.permissionKey === permission);
}

/**
 * Compile grant scopes into an eligible-set plan for hierarchy / membership / audit rows.
 * Reuses assignmentCoversResource semantics without inventing RBAC.
 */
export function compileEligibleScopePlan(
  grants: readonly EffectiveGrant[],
  permission: PermissionKey,
): EligibleScopePlan {
  const relevant = grantsForPermission(grants, permission);
  if (relevant.length === 0) return { kind: "none" };

  const brandIds: string[] = [];
  const organizationIds: string[] = [];
  const territoryIds: string[] = [];
  const outletIds: string[] = [];
  const exactBrandIds: string[] = [];
  const exactOrganizationIds: string[] = [];
  const exactTerritoryIds: string[] = [];
  let exactPlatform = false;

  for (const grant of relevant) {
    if (grant.scope.scopeType === "platform" && grant.inheritanceMode === "descendants") {
      return { kind: "unrestricted" };
    }
    if (grant.scope.scopeType === "platform" && grant.inheritanceMode === "exact") {
      exactPlatform = true;
      continue;
    }
    pushGrantScope(grant.scope, grant.inheritanceMode, {
      brandIds,
      organizationIds,
      territoryIds,
      outletIds,
      exactBrandIds,
      exactOrganizationIds,
      exactTerritoryIds,
    });
  }

  const scoped = {
    kind: "scoped" as const,
    brandIds: unique(brandIds),
    organizationIds: unique(organizationIds),
    territoryIds: unique(territoryIds),
    outletIds: unique(outletIds),
    exactBrandIds: unique(exactBrandIds),
    exactOrganizationIds: unique(exactOrganizationIds),
    exactTerritoryIds: unique(exactTerritoryIds),
    exactPlatform,
  };

  if (
    !scoped.exactPlatform &&
    scoped.brandIds.length === 0 &&
    scoped.organizationIds.length === 0 &&
    scoped.territoryIds.length === 0 &&
    scoped.outletIds.length === 0 &&
    scoped.exactBrandIds.length === 0 &&
    scoped.exactOrganizationIds.length === 0 &&
    scoped.exactTerritoryIds.length === 0
  ) {
    return { kind: "none" };
  }
  return scoped;
}

function pushGrantScope(
  scope: AccessScope,
  inheritanceMode: InheritanceMode,
  bags: {
    brandIds: string[];
    organizationIds: string[];
    territoryIds: string[];
    outletIds: string[];
    exactBrandIds: string[];
    exactOrganizationIds: string[];
    exactTerritoryIds: string[];
  },
): void {
  switch (scope.scopeType) {
    case "brand":
      if (inheritanceMode === "descendants") bags.brandIds.push(scope.brandId);
      else bags.exactBrandIds.push(scope.brandId);
      break;
    case "organization":
      if (inheritanceMode === "descendants") bags.organizationIds.push(scope.organizationId);
      else bags.exactOrganizationIds.push(scope.organizationId);
      break;
    case "territory":
      if (inheritanceMode === "descendants") bags.territoryIds.push(scope.territoryId);
      else bags.exactTerritoryIds.push(scope.territoryId);
      break;
    case "outlet":
      bags.outletIds.push(scope.outletId);
      break;
    case "platform":
      break;
  }
}

/** True when a loaded row is covered by at least one grant for the permission. */
export function grantsCoverResource(
  grants: readonly EffectiveGrant[],
  permission: PermissionKey,
  resource: ProtectedResource | null,
): boolean {
  if (!resource) return false;
  return grantsForPermission(grants, permission).some((grant) =>
    assignmentCoversResource(grant.scope, grant.inheritanceMode, resource),
  );
}

/** Filter an already-loaded candidate set using one grant snapshot (no authorize()). */
export function filterEligibleByGrants<T>(
  grants: readonly EffectiveGrant[],
  permission: PermissionKey,
  items: readonly T[],
  resourceOf: (item: T) => ProtectedResource | null,
): T[] {
  const relevant = grantsForPermission(grants, permission);
  if (relevant.length === 0) return [];
  if (relevant.some((g) => g.scope.scopeType === "platform" && g.inheritanceMode === "descendants")) {
    return items.filter((item) => resourceOf(item) !== null);
  }
  return items.filter((item) => {
    const resource = resourceOf(item);
    if (!resource) return false;
    return relevant.some((grant) =>
      assignmentCoversResource(grant.scope, grant.inheritanceMode, resource),
    );
  });
}
