/**
 * Scope matching for authorization (IMP-011).
 *
 * Exact: assignment scope must equal the resource's home assignment scope.
 * Descendants: assignment scope is an ancestor of (or equal to) the resource
 * in the scope graph. Sibling organizations/territories/outlets never match.
 */
import type { AccessScopeType, InheritanceMode } from "../../shared/access-control";
import type { AccessScope, ProtectedResource } from "./types";

export type AssignmentScopeRef = Readonly<{
  scopeType: AccessScopeType;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
}>;

export function membershipToAccessScope(membership: AssignmentScopeRef): AccessScope | null {
  switch (membership.scopeType) {
    case "platform":
      if (
        membership.brandId != null ||
        membership.organizationId != null ||
        membership.territoryId != null ||
        membership.outletId != null
      ) {
        return null;
      }
      return { scopeType: "platform" };
    case "brand":
      if (
        membership.brandId == null ||
        membership.organizationId != null ||
        membership.territoryId != null ||
        membership.outletId != null
      ) {
        return null;
      }
      return { scopeType: "brand", brandId: membership.brandId };
    case "organization":
      if (
        membership.brandId == null ||
        membership.organizationId == null ||
        membership.territoryId != null ||
        membership.outletId != null
      ) {
        return null;
      }
      return {
        scopeType: "organization",
        brandId: membership.brandId,
        organizationId: membership.organizationId,
      };
    case "territory":
      if (
        membership.brandId == null ||
        membership.organizationId != null ||
        membership.territoryId == null ||
        membership.outletId != null
      ) {
        return null;
      }
      return {
        scopeType: "territory",
        brandId: membership.brandId,
        territoryId: membership.territoryId,
      };
    case "outlet":
      if (
        membership.brandId == null ||
        membership.organizationId == null ||
        membership.territoryId == null ||
        membership.outletId == null
      ) {
        return null;
      }
      return {
        scopeType: "outlet",
        brandId: membership.brandId,
        organizationId: membership.organizationId,
        territoryId: membership.territoryId,
        outletId: membership.outletId,
      };
    default:
      return null;
  }
}

export function accessScopeToProtectedResource(scope: AccessScope): ProtectedResource {
  switch (scope.scopeType) {
    case "platform":
      return { type: "platform" };
    case "brand":
      return { type: "brand", brandId: scope.brandId };
    case "organization":
      return {
        type: "organization",
        brandId: scope.brandId,
        organizationId: scope.organizationId,
      };
    case "territory":
      return {
        type: "territory",
        brandId: scope.brandId,
        territoryId: scope.territoryId,
      };
    case "outlet":
      return {
        type: "outlet",
        brandId: scope.brandId,
        organizationId: scope.organizationId,
        territoryId: scope.territoryId,
        outletId: scope.outletId,
      };
  }
}

/** Home assignment scope for a protected resource (legal_entity → organization). */
export function resourceHomeScope(resource: ProtectedResource): AccessScope {
  switch (resource.type) {
    case "platform":
      return { scopeType: "platform" };
    case "brand":
      return { scopeType: "brand", brandId: resource.brandId };
    case "organization":
      return {
        scopeType: "organization",
        brandId: resource.brandId,
        organizationId: resource.organizationId,
      };
    case "territory":
      return {
        scopeType: "territory",
        brandId: resource.brandId,
        territoryId: resource.territoryId,
      };
    case "legal_entity":
      return {
        scopeType: "organization",
        brandId: resource.brandId,
        organizationId: resource.organizationId,
      };
    case "outlet":
      return {
        scopeType: "outlet",
        brandId: resource.brandId,
        organizationId: resource.organizationId,
        territoryId: resource.territoryId,
        outletId: resource.outletId,
      };
  }
}

function scopesEqual(a: AccessScope, b: AccessScope): boolean {
  if (a.scopeType !== b.scopeType) return false;
  switch (a.scopeType) {
    case "platform":
      return true;
    case "brand":
      return b.scopeType === "brand" && a.brandId === b.brandId;
    case "organization":
      return (
        b.scopeType === "organization" &&
        a.brandId === b.brandId &&
        a.organizationId === b.organizationId
      );
    case "territory":
      return (
        b.scopeType === "territory" &&
        a.brandId === b.brandId &&
        a.territoryId === b.territoryId
      );
    case "outlet":
      return (
        b.scopeType === "outlet" &&
        a.brandId === b.brandId &&
        a.organizationId === b.organizationId &&
        a.territoryId === b.territoryId &&
        a.outletId === b.outletId
      );
  }
}

/**
 * Whether assignmentScope is an ancestor of (or equal to) resource in the
 * scope graph, including legal_entity ancestry (platform→brand→organization)
 * and outlet ancestry (platform→brand→organization, territory, outlet).
 */
export function scopeIsAncestorOrEqual(
  assignmentScope: AccessScope,
  resource: ProtectedResource,
): boolean {
  switch (assignmentScope.scopeType) {
    case "platform":
      return true;
    case "brand":
      return resource.type !== "platform" && "brandId" in resource
        ? resource.brandId === assignmentScope.brandId
        : false;
    case "organization":
      if (resource.type === "organization") {
        return (
          resource.brandId === assignmentScope.brandId &&
          resource.organizationId === assignmentScope.organizationId
        );
      }
      if (resource.type === "legal_entity" || resource.type === "outlet") {
        return (
          resource.brandId === assignmentScope.brandId &&
          resource.organizationId === assignmentScope.organizationId
        );
      }
      return false;
    case "territory":
      if (resource.type === "territory") {
        return (
          resource.brandId === assignmentScope.brandId &&
          resource.territoryId === assignmentScope.territoryId
        );
      }
      if (resource.type === "outlet") {
        return (
          resource.brandId === assignmentScope.brandId &&
          resource.territoryId === assignmentScope.territoryId
        );
      }
      return false;
    case "outlet":
      return (
        resource.type === "outlet" &&
        resource.brandId === assignmentScope.brandId &&
        resource.organizationId === assignmentScope.organizationId &&
        resource.territoryId === assignmentScope.territoryId &&
        resource.outletId === assignmentScope.outletId
      );
  }
}

export function assignmentCoversResource(
  assignmentScope: AccessScope,
  inheritanceMode: InheritanceMode,
  resource: ProtectedResource,
): boolean {
  if (inheritanceMode === "exact") {
    return scopesEqual(assignmentScope, resourceHomeScope(resource));
  }
  if (inheritanceMode === "descendants") {
    return scopeIsAncestorOrEqual(assignmentScope, resource);
  }
  return false;
}
