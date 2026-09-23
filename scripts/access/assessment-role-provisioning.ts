/**
 * Staging assessment hierarchy resolution + idempotent role provisioning helpers.
 *
 * Stable business codes match `scripts/access/bootstrap-dehradun-business.ts`.
 * UUIDs are never configuration authority — resolve by code under Administration.
 */
import { normalizeWorkforceEmail } from "../../src/shared/workforce-auth/email";
import {
  AccessControlConflictError,
  type AccessRoleAssignment,
  type WorkforcePrincipal,
} from "../../src/server/access-control";
import {
  adminCreateMembership,
  adminGetBrand,
  adminGrantRole,
  adminListAllMemberships,
  adminListAllOrganizations,
  adminListAllOutlets,
  adminListAllTerritories,
  adminListRoleAssignments,
  type AdministrationMembershipProjection,
} from "../../src/server/administration/use-cases";
import { findWorkforceUserByEmail } from "../../src/server/auth/workforce/operator/lifecycle";
import type { Persistence } from "../../src/server/persistence/types";

export const CANONICAL_BRAND_ID = "56ff7724-d511-5ef4-b5d5-d629cbfb2388";

export const ASSESSMENT_ORG = Object.freeze({ code: "boba-bear", name: "Boba Bear" });
export const ASSESSMENT_TERRITORY = Object.freeze({ code: "dehradun", name: "Dehradun" });
export const ASSESSMENT_OUTLET = Object.freeze({
  code: "boba-bear-dehradun",
  name: "Boba Bear, Dehradun",
});

export type AssessmentHierarchy = Readonly<{
  brandId: string;
  organizationId: string;
  territoryId: string;
  outletId: string;
}>;

export type AssessmentGrantSpec = Readonly<{
  email: string;
  scopeType: "outlet" | "brand";
  roleKey: "outlet_manager" | "brand_admin" | "support_refund_operator";
}>;

export const ASSESSMENT_GRANTS: readonly AssessmentGrantSpec[] = Object.freeze([
  {
    email: "assessor.ops@bobabear.assessment.test",
    scopeType: "outlet" as const,
    roleKey: "outlet_manager" as const,
  },
  {
    email: "assessor.admin@bobabear.assessment.test",
    scopeType: "brand" as const,
    roleKey: "brand_admin" as const,
  },
  {
    email: "assessor.refund@bobabear.assessment.test",
    scopeType: "outlet" as const,
    roleKey: "support_refund_operator" as const,
  },
]);

const NON_TERMINAL = new Set(["invited", "active", "suspended"]);

function exactlyOne<T>(items: readonly T[], label: string): T {
  if (items.length === 0) {
    throw new Error(`Assessment hierarchy missing: ${label}`);
  }
  if (items.length > 1) {
    throw new Error(`Assessment hierarchy ambiguous: ${label} matched ${items.length} rows`);
  }
  return items[0]!;
}

/** Resolve Dehradun staging hierarchy by stable codes (fail closed). */
export async function resolveAssessmentHierarchy(
  persistence: Persistence,
  actor: WorkforcePrincipal,
): Promise<AssessmentHierarchy> {
  const brand = await adminGetBrand(persistence, actor, CANONICAL_BRAND_ID);
  if (brand.code !== "boba-bear" || brand.name !== "BOBA Bear") {
    throw new Error("Canonical BOBA Bear brand identity mismatch.");
  }

  const organizations = await adminListAllOrganizations(persistence, actor);
  const organization = exactlyOne(
    organizations.filter((o) => o.brandId === CANONICAL_BRAND_ID && o.code === ASSESSMENT_ORG.code),
    `organization code=${ASSESSMENT_ORG.code}`,
  );
  if (organization.name !== ASSESSMENT_ORG.name) {
    throw new Error(`Organization ${ASSESSMENT_ORG.code} exists with unexpected name.`);
  }

  const territories = await adminListAllTerritories(persistence, actor);
  const territory = exactlyOne(
    territories.filter(
      (t) => t.brandId === CANONICAL_BRAND_ID && t.code === ASSESSMENT_TERRITORY.code,
    ),
    `territory code=${ASSESSMENT_TERRITORY.code}`,
  );
  if (territory.name !== ASSESSMENT_TERRITORY.name) {
    throw new Error(`Territory ${ASSESSMENT_TERRITORY.code} exists with unexpected name.`);
  }

  const outlets = await adminListAllOutlets(persistence, actor);
  const outlet = exactlyOne(
    outlets.filter((o) => o.brandId === CANONICAL_BRAND_ID && o.code === ASSESSMENT_OUTLET.code),
    `outlet code=${ASSESSMENT_OUTLET.code}`,
  );
  if (outlet.name !== ASSESSMENT_OUTLET.name) {
    throw new Error(`Outlet ${ASSESSMENT_OUTLET.code} exists with unexpected name.`);
  }
  if (outlet.organizationId !== organization.id || outlet.territoryId !== territory.id) {
    throw new Error(`Outlet ${ASSESSMENT_OUTLET.code} ancestry does not match approved hierarchy.`);
  }

  return Object.freeze({
    brandId: CANONICAL_BRAND_ID,
    organizationId: organization.id,
    territoryId: territory.id,
    outletId: outlet.id,
  });
}

function scopeMatches(
  membership: AdministrationMembershipProjection,
  grant: AssessmentGrantSpec,
  hierarchy: AssessmentHierarchy,
): boolean {
  if (membership.scopeType !== grant.scopeType) return false;
  if (membership.brandId !== hierarchy.brandId) return false;
  if (grant.scopeType === "brand") {
    return (
      membership.organizationId === null &&
      membership.territoryId === null &&
      membership.outletId === null
    );
  }
  return (
    membership.organizationId === hierarchy.organizationId &&
    membership.territoryId === hierarchy.territoryId &&
    membership.outletId === hierarchy.outletId
  );
}

function isActiveAssignment(assignment: AccessRoleAssignment): boolean {
  if (assignment.revokedAt !== null) return false;
  if (assignment.expiresAt !== null && assignment.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

export type EnsureGrantResult = Readonly<{
  email: string;
  membershipId: string;
  membershipStatus: string;
  membershipReused: boolean;
  roleKey: string;
  assignmentId: string;
  assignmentReused: boolean;
}>;

/**
 * Idempotent assessment grant: reuse matching active membership + role; create only
 * missing state; fail closed on incompatible existing scope/role.
 */
export async function ensureAssessmentGrant(
  persistence: Persistence,
  actor: WorkforcePrincipal,
  hierarchy: AssessmentHierarchy,
  grant: AssessmentGrantSpec,
): Promise<EnsureGrantResult> {
  const normalized = normalizeWorkforceEmail(grant.email);
  if (!normalized.ok) {
    throw new Error(`Invalid assessment email: ${grant.email}`);
  }

  const workforceUser = await persistence.withContext((ctx) =>
    findWorkforceUserByEmail(ctx, normalized.email),
  );
  if (!workforceUser || workforceUser.disabledAt) {
    throw new Error(`Workforce user not found for ${grant.email}`);
  }

  const membershipFilter =
    grant.scopeType === "outlet" ? { outletId: hierarchy.outletId } : undefined;
  const listed = await adminListAllMemberships(persistence, actor, membershipFilter);
  const candidates = listed.filter(
    (m) =>
      m.workforceUserId === workforceUser.id &&
      NON_TERMINAL.has(m.status) &&
      scopeMatches(m, grant, hierarchy),
  );

  let membership: AdministrationMembershipProjection;
  let membershipReused = false;

  if (candidates.length > 1) {
    throw new Error(
      `Incompatible assessment state: multiple non-terminal memberships for ${grant.email} at target scope.`,
    );
  }

  if (candidates.length === 1) {
    membership = candidates[0]!;
    membershipReused = true;
    if (membership.status !== "active" && membership.status !== "invited") {
      throw new Error(
        `Incompatible assessment state: membership ${membership.id} status=${membership.status} for ${grant.email}.`,
      );
    }
  } else {
    const conflicting = listed.filter(
      (m) =>
        m.workforceUserId === workforceUser.id &&
        NON_TERMINAL.has(m.status) &&
        !scopeMatches(m, grant, hierarchy) &&
        m.scopeType === grant.scopeType,
    );
    if (conflicting.length > 0) {
      throw new Error(
        `Incompatible assessment state: ${grant.email} already has ${grant.scopeType} membership with different hierarchy scope.`,
      );
    }

    const body: Record<string, unknown> = {
      workforceEmail: grant.email,
      scopeType: grant.scopeType,
      status: "active",
      brandId: hierarchy.brandId,
    };
    if (grant.scopeType === "outlet") {
      body.organizationId = hierarchy.organizationId;
      body.territoryId = hierarchy.territoryId;
      body.outletId = hierarchy.outletId;
    }

    try {
      membership = await adminCreateMembership(persistence, actor, body);
    } catch (error) {
      if (!(error instanceof AccessControlConflictError)) throw error;
      const again = await adminListAllMemberships(persistence, actor, membershipFilter);
      const recovered = again.filter(
        (m) =>
          m.workforceUserId === workforceUser.id &&
          NON_TERMINAL.has(m.status) &&
          scopeMatches(m, grant, hierarchy),
      );
      if (recovered.length !== 1) {
        throw new Error(
          `Membership conflict for ${grant.email} but could not recover a unique matching membership.`,
        );
      }
      membership = recovered[0]!;
      membershipReused = true;
    }
  }

  const assignments = await adminListRoleAssignments(persistence, actor, membership.id);
  const matchingActive = assignments.filter(
    (a) => a.roleKey === grant.roleKey && isActiveAssignment(a),
  );
  if (matchingActive.length > 1) {
    throw new Error(
      `Incompatible assessment state: multiple active ${grant.roleKey} assignments on membership ${membership.id}.`,
    );
  }

  let assignment: AccessRoleAssignment;
  let assignmentReused = false;
  if (matchingActive.length === 1) {
    assignment = matchingActive[0]!;
    assignmentReused = true;
  } else {
    assignment = await adminGrantRole(persistence, actor, membership.id, {
      roleKey: grant.roleKey,
    });
  }

  return Object.freeze({
    email: grant.email,
    membershipId: membership.id,
    membershipStatus: membership.status,
    membershipReused,
    roleKey: assignment.roleKey,
    assignmentId: assignment.id,
    assignmentReused,
  });
}
