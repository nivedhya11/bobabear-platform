/**
 * Authorization evaluation (IMP-011).
 *
 * Fail closed / DENY by default. Never role-name checks — only permission
 * keys loaded from PostgreSQL role_permissions mappings.
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  isPermissionKey,
  type InheritanceMode,
  type PermissionKey,
  type RoleKey,
} from "../../shared/access-control";
import {
  accessMembershipsTable,
  accessRoleAllowedScopesTable,
  accessRoleAssignmentsTable,
  accessRolePermissionsTable,
} from "../../platform/database/schema/access-control";
import { findBrandById } from "../organization/brands";
import { findLegalEntityById } from "../organization/legal-entities";
import { findOrganizationById } from "../organization/organizations";
import { findOutletById } from "../organization/outlets";
import { findTerritoryById } from "../organization/territories";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { AuthorizationError } from "./errors";
import { isWorkforcePrincipal, requireWorkforcePrincipal, type WorkforcePrincipal } from "./principal";
import {
  assignmentCoversResource,
  membershipToAccessScope,
  type AssignmentScopeRef,
} from "./scope";
import type {
  AuthorizationDecision,
  AuthorizeInput,
  GetEffectivePermissionsInput,
  ProtectedResource,
} from "./types";

const DENY: AuthorizationDecision = Object.freeze({ allowed: false, code: "DENIED" });
const ALLOW: AuthorizationDecision = Object.freeze({ allowed: true, code: "AUTHORIZED" });

type EffectiveGrant = Readonly<{
  permissionKey: PermissionKey;
  inheritanceMode: InheritanceMode;
  roleKey: RoleKey;
  scope: NonNullable<ReturnType<typeof membershipToAccessScope>>;
  membershipId: string;
  assignmentId: string;
}>;

async function validateProtectedResource(
  context: PersistenceQueryContext,
  resource: ProtectedResource,
): Promise<boolean> {
  try {
    switch (resource.type) {
      case "platform":
        return true;
      case "brand": {
        const brand = await findBrandById(context, resource.brandId);
        return brand !== null;
      }
      case "organization": {
        const org = await findOrganizationById(context, resource.organizationId);
        return org !== null && org.brandId === resource.brandId;
      }
      case "territory": {
        const territory = await findTerritoryById(context, resource.territoryId);
        return territory !== null && territory.brandId === resource.brandId;
      }
      case "legal_entity": {
        const entity = await findLegalEntityById(context, resource.legalEntityId);
        return (
          entity !== null &&
          entity.brandId === resource.brandId &&
          entity.organizationId === resource.organizationId
        );
      }
      case "outlet": {
        const outlet = await findOutletById(context, resource.outletId);
        return (
          outlet !== null &&
          outlet.brandId === resource.brandId &&
          outlet.organizationId === resource.organizationId &&
          outlet.territoryId === resource.territoryId
        );
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function isMembershipEffective(
  status: string,
  expiresAt: Date | null,
  now: Date,
): boolean {
  if (status !== "active") return false;
  if (expiresAt !== null && expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

function isAssignmentEffective(
  startsAt: Date,
  expiresAt: Date | null,
  revokedAt: Date | null,
  now: Date,
): boolean {
  if (revokedAt !== null) return false;
  if (startsAt.getTime() > now.getTime()) return false;
  if (expiresAt !== null && expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * Load every currently effective permission grant for the actor.
 * Fail closed on any unexpected shape.
 */
export async function loadEffectiveGrants(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  now: Date = new Date(),
): Promise<EffectiveGrant[]> {
  assertApplicationRole(context, "loadEffectiveGrants");

  const membershipRows = await context.db
    .select({
      id: accessMembershipsTable.id,
      workforceUserId: accessMembershipsTable.workforceUserId,
      scopeType: accessMembershipsTable.scopeType,
      brandId: accessMembershipsTable.brandId,
      organizationId: accessMembershipsTable.organizationId,
      territoryId: accessMembershipsTable.territoryId,
      outletId: accessMembershipsTable.outletId,
      status: accessMembershipsTable.status,
      expiresAt: accessMembershipsTable.expiresAt,
    })
    .from(accessMembershipsTable)
    .where(eq(accessMembershipsTable.workforceUserId, actor.workforceUserId));

  const activeMemberships = membershipRows.filter((row) =>
    isMembershipEffective(row.status, row.expiresAt ? new Date(row.expiresAt) : null, now),
  );
  if (activeMemberships.length === 0) {
    return [];
  }

  const membershipIds = activeMemberships.map((m) => m.id);
  const membershipById = new Map(activeMemberships.map((m) => [m.id, m]));

  const assignmentRows = await context.db
    .select({
      id: accessRoleAssignmentsTable.id,
      membershipId: accessRoleAssignmentsTable.membershipId,
      roleKey: accessRoleAssignmentsTable.roleKey,
      startsAt: accessRoleAssignmentsTable.startsAt,
      expiresAt: accessRoleAssignmentsTable.expiresAt,
      revokedAt: accessRoleAssignmentsTable.revokedAt,
    })
    .from(accessRoleAssignmentsTable)
    .where(
      and(
        inArray(accessRoleAssignmentsTable.membershipId, membershipIds),
        isNull(accessRoleAssignmentsTable.revokedAt),
      ),
    );

  const effectiveAssignments = assignmentRows.filter((row) =>
    isAssignmentEffective(
      new Date(row.startsAt),
      row.expiresAt ? new Date(row.expiresAt) : null,
      row.revokedAt ? new Date(row.revokedAt) : null,
      now,
    ),
  );
  if (effectiveAssignments.length === 0) {
    return [];
  }

  const roleKeys = [...new Set(effectiveAssignments.map((a) => a.roleKey))];

  const allowedScopeRows = await context.db
    .select({
      roleKey: accessRoleAllowedScopesTable.roleKey,
      scopeType: accessRoleAllowedScopesTable.scopeType,
    })
    .from(accessRoleAllowedScopesTable)
    .where(inArray(accessRoleAllowedScopesTable.roleKey, roleKeys));

  const allowedScopes = new Set(
    allowedScopeRows.map((r) => `${r.roleKey}::${r.scopeType}`),
  );

  const permissionRows = await context.db
    .select({
      roleKey: accessRolePermissionsTable.roleKey,
      permissionKey: accessRolePermissionsTable.permissionKey,
      inheritanceMode: accessRolePermissionsTable.inheritanceMode,
    })
    .from(accessRolePermissionsTable)
    .where(inArray(accessRolePermissionsTable.roleKey, roleKeys));

  const permissionsByRole = new Map<string, typeof permissionRows>();
  for (const row of permissionRows) {
    const list = permissionsByRole.get(row.roleKey) ?? [];
    list.push(row);
    permissionsByRole.set(row.roleKey, list);
  }

  const grants: EffectiveGrant[] = [];
  for (const assignment of effectiveAssignments) {
    const membership = membershipById.get(assignment.membershipId);
    if (!membership) continue;

    if (!allowedScopes.has(`${assignment.roleKey}::${membership.scopeType}`)) {
      continue;
    }

    const scope = membershipToAccessScope(membership as AssignmentScopeRef);
    if (!scope) continue;

    const rolePermissions = permissionsByRole.get(assignment.roleKey) ?? [];
    for (const mapping of rolePermissions) {
      if (!isPermissionKey(mapping.permissionKey)) continue;
      if (mapping.inheritanceMode !== "exact" && mapping.inheritanceMode !== "descendants") {
        continue;
      }
      grants.push({
        permissionKey: mapping.permissionKey,
        inheritanceMode: mapping.inheritanceMode,
        roleKey: assignment.roleKey as RoleKey,
        scope,
        membershipId: membership.id,
        assignmentId: assignment.id,
      });
    }
  }

  return grants;
}

function grantsCoveringResource(
  grants: EffectiveGrant[],
  resource: ProtectedResource,
  permission?: PermissionKey,
): EffectiveGrant[] {
  return grants.filter((grant) => {
    if (permission !== undefined && grant.permissionKey !== permission) return false;
    return assignmentCoversResource(grant.scope, grant.inheritanceMode, resource);
  });
}

export async function authorize(
  context: PersistenceQueryContext,
  input: AuthorizeInput,
): Promise<AuthorizationDecision> {
  try {
    assertApplicationRole(context, "authorize");

    if (!isWorkforcePrincipal(input.actor)) {
      return DENY;
    }
    const actor = input.actor;

    // Re-check principal security snapshot (already enforced at creation).
    if (
      actor.disabledAt !== null ||
      actor.passwordChangeRequired !== false ||
      actor.twoFactorEnabled !== true
    ) {
      return DENY;
    }

    if (!isPermissionKey(input.permission)) {
      return DENY;
    }

    if (!input.resource || typeof input.resource !== "object" || !("type" in input.resource)) {
      return DENY;
    }

    const resourceOk = await validateProtectedResource(context, input.resource);
    if (!resourceOk) {
      return DENY;
    }

    const grants = await loadEffectiveGrants(context, actor);
    const matching = grantsCoveringResource(grants, input.resource, input.permission);
    return matching.length > 0 ? ALLOW : DENY;
  } catch {
    return DENY;
  }
}

export async function requireAuthorization(
  context: PersistenceQueryContext,
  input: AuthorizeInput,
): Promise<void> {
  const decision = await authorize(context, input);
  if (!decision.allowed) {
    throw new AuthorizationError();
  }
}

export async function getEffectivePermissions(
  context: PersistenceQueryContext,
  input: GetEffectivePermissionsInput,
): Promise<PermissionKey[]> {
  assertApplicationRole(context, "getEffectivePermissions");
  const actor = requireWorkforcePrincipal(input.actor);

  const grants = await loadEffectiveGrants(context, actor);
  if (!input.resource) {
    return [...new Set(grants.map((g) => g.permissionKey))].sort();
  }

  const resourceOk = await validateProtectedResource(context, input.resource);
  if (!resourceOk) {
    return [];
  }

  return [
    ...new Set(grantsCoveringResource(grants, input.resource).map((g) => g.permissionKey)),
  ].sort();
}

/** Count currently effective Platform Super Admin assignments (for last-admin checks). */
export async function countEffectivePlatformSuperAdmins(
  context: PersistenceQueryContext,
  now: Date = new Date(),
  options: { excludeAssignmentId?: string; excludeMembershipId?: string } = {},
): Promise<number> {
  assertApplicationRole(context, "countEffectivePlatformSuperAdmins");

  const excludeAssignmentId = options.excludeAssignmentId ?? null;
  const excludeMembershipId = options.excludeMembershipId ?? null;

  const result = await context.db.execute<{ count: string }>(sql`
    select count(*)::text as count
    from ${accessRoleAssignmentsTable} a
    inner join ${accessMembershipsTable} m on m.id = a.membership_id
    where a.role_key = 'platform_super_admin'
      and a.revoked_at is null
      and a.starts_at <= ${now}
      and (a.expires_at is null or a.expires_at > ${now})
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > ${now})
      and m.scope_type = 'platform'
      and (${excludeAssignmentId}::uuid is null or a.id <> ${excludeAssignmentId}::uuid)
      and (${excludeMembershipId}::uuid is null or m.id <> ${excludeMembershipId}::uuid)
  `);

  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

/** Lock the PSA role catalog row for concurrency-safe last-admin / bootstrap. */
export async function lockPlatformSuperAdminRoleRow(
  context: PersistenceQueryContext,
): Promise<void> {
  assertApplicationRole(context, "lockPlatformSuperAdminRoleRow");
  await context.db.execute(sql`
    select key from app.access_roles
    where key = 'platform_super_admin'
    for update
  `);
}
