/**
 * Role assignment grant/revoke commands (IMP-011).
 *
 * Delegation ceiling, self-elevation DENY, allowed-scope validation, and
 * last Platform Super Admin protection run inside the same transaction as
 * the mutation when an actor is provided.
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  isRoleKey,
  ROLE_ALLOWED_SCOPES,
  type PermissionKey,
  type RoleKey,
} from "../../shared/access-control";
import {
  accessRoleAllowedScopesTable,
  accessRoleAssignmentsTable,
  accessRolePermissionsTable,
} from "../../platform/database/schema/access-control";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";
import { insertAccessAuditEvent } from "./audit";
import {
  countEffectivePlatformSuperAdmins,
  getEffectivePermissions,
  lockPlatformSuperAdminRoleRow,
  requireAuthorization,
} from "./authorize";
import {
  AccessControlNotFoundError,
  AccessControlValidationError,
  DelegationCeilingError,
  LastPlatformAdminError,
  SelfElevationError,
} from "./errors";
import { findMembershipById } from "./membership";
import { isWorkforcePrincipal, type WorkforcePrincipal } from "./principal";
import { accessScopeToProtectedResource, membershipToAccessScope } from "./scope";
import type { AccessRoleAssignment } from "./types";

function rowToAssignment(
  row: typeof accessRoleAssignmentsTable.$inferSelect,
): AccessRoleAssignment {
  return {
    id: row.id,
    membershipId: row.membershipId,
    roleKey: row.roleKey as RoleKey,
    startsAt: new Date(row.startsAt),
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
    grantedByWorkforceUserId: row.grantedByWorkforceUserId,
    revokedByWorkforceUserId: row.revokedByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function findRoleAssignmentById(
  context: PersistenceQueryContext,
  assignmentId: string,
): Promise<AccessRoleAssignment | null> {
  assertApplicationRole(context, "findRoleAssignmentById");
  if (typeof assignmentId !== "string" || assignmentId.length === 0) {
    throw new AccessControlValidationError({
      message: "assignmentId must be a non-empty string.",
    });
  }
  const rows = await context.db
    .select()
    .from(accessRoleAssignmentsTable)
    .where(eq(accessRoleAssignmentsTable.id, assignmentId))
    .limit(1);
  const row = rows[0];
  return row ? rowToAssignment(row) : null;
}

async function loadRolePermissionKeys(
  context: PersistenceQueryContext,
  roleKey: RoleKey,
): Promise<PermissionKey[]> {
  const rows = await context.db
    .select({ permissionKey: accessRolePermissionsTable.permissionKey })
    .from(accessRolePermissionsTable)
    .where(eq(accessRolePermissionsTable.roleKey, roleKey));
  return rows.map((r) => r.permissionKey as PermissionKey);
}

async function assertRoleAllowedAtScope(
  context: PersistenceQueryContext,
  roleKey: RoleKey,
  scopeType: string,
): Promise<void> {
  const catalog = ROLE_ALLOWED_SCOPES[roleKey];
  if (!(catalog as readonly string[]).includes(scopeType)) {
    throw new AccessControlValidationError({
      message: "Role is not allowed at this membership scope.",
    });
  }
  const rows = await context.db
    .select({ scopeType: accessRoleAllowedScopesTable.scopeType })
    .from(accessRoleAllowedScopesTable)
    .where(
      and(
        eq(accessRoleAllowedScopesTable.roleKey, roleKey),
        eq(accessRoleAllowedScopesTable.scopeType, scopeType),
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    throw new AccessControlValidationError({
      message: "Role is not allowed at this membership scope.",
    });
  }
}

export type GrantRoleInput = Readonly<{
  actor?: WorkforcePrincipal;
  membershipId: string;
  roleKey: RoleKey;
  startsAt?: Date;
  expiresAt?: Date | null;
}>;

export async function grantRole(
  context: PersistenceTransactionContext,
  input: GrantRoleInput,
): Promise<AccessRoleAssignment> {
  assertTransactionContext(context, "grantRole");

  if (!isRoleKey(input.roleKey)) {
    throw new AccessControlValidationError({ message: "Unknown role key." });
  }

  const membership = await findMembershipById(context, input.membershipId);
  if (!membership) {
    throw new AccessControlNotFoundError("membership");
  }

  const scope = membershipToAccessScope(membership);
  if (!scope) {
    throw new AccessControlValidationError({ message: "Membership scope shape is invalid." });
  }

  await assertRoleAllowedAtScope(context, input.roleKey, membership.scopeType);

  const startsAt = input.startsAt ?? new Date();
  const expiresAt = input.expiresAt ?? null;
  if (expiresAt !== null && expiresAt.getTime() < startsAt.getTime()) {
    throw new AccessControlValidationError({
      message: "expiresAt must be greater than or equal to startsAt.",
    });
  }

  if (input.actor !== undefined) {
    if (!isWorkforcePrincipal(input.actor)) {
      throw new AccessControlValidationError({ message: "actor must be a trusted WorkforcePrincipal." });
    }
    if (input.actor.workforceUserId === membership.workforceUserId) {
      throw new SelfElevationError({
        message: "Actors cannot grant roles to themselves.",
      });
    }

    const resource = accessScopeToProtectedResource(scope);
    await requireAuthorization(context, {
      actor: input.actor,
      permission: "access.role_assignment.grant",
      resource,
    });

    // Delegation ceiling: permissions(R at S) ⊆ actor effective permissions at S.
    const targetPermissions = await loadRolePermissionKeys(context, input.roleKey);
    const actorPermissions = await getEffectivePermissions(context, {
      actor: input.actor,
      resource,
    });
    const actorSet = new Set(actorPermissions);
    for (const permission of targetPermissions) {
      if (!actorSet.has(permission)) {
        throw new DelegationCeilingError();
      }
    }
  }

  const now = new Date();
  const id = randomUUID();

  await context.db.insert(accessRoleAssignmentsTable).values({
    id,
    membershipId: membership.id,
    roleKey: input.roleKey,
    startsAt,
    expiresAt,
    revokedAt: null,
    grantedByWorkforceUserId: input.actor?.workforceUserId ?? null,
    revokedByWorkforceUserId: null,
    createdAt: now,
    updatedAt: now,
  });

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actor?.workforceUserId ?? null,
    action: "role_assignment.granted",
    targetType: "role_assignment",
    targetId: id,
    scopeType: membership.scopeType,
    brandId: membership.brandId,
    organizationId: membership.organizationId,
    territoryId: membership.territoryId,
    outletId: membership.outletId,
    metadata: { roleKey: input.roleKey, membershipId: membership.id },
  });

  const created = await findRoleAssignmentById(context, id);
  if (!created) {
    throw new AccessControlValidationError({ message: "Role assignment create failed to persist." });
  }
  return created;
}

export type RevokeRoleInput = Readonly<{
  actor?: WorkforcePrincipal;
  assignmentId: string;
}>;

export async function revokeRole(
  context: PersistenceTransactionContext,
  input: RevokeRoleInput,
): Promise<AccessRoleAssignment> {
  assertTransactionContext(context, "revokeRole");

  const existing = await findRoleAssignmentById(context, input.assignmentId);
  if (!existing) {
    throw new AccessControlNotFoundError("role_assignment");
  }
  if (existing.revokedAt !== null) {
    throw new AccessControlValidationError({ message: "Role assignment is already revoked." });
  }

  const membership = await findMembershipById(context, existing.membershipId);
  if (!membership) {
    throw new AccessControlNotFoundError("membership");
  }

  const scope = membershipToAccessScope(membership);
  if (!scope) {
    throw new AccessControlValidationError({ message: "Membership scope shape is invalid." });
  }

  if (input.actor !== undefined) {
    if (!isWorkforcePrincipal(input.actor)) {
      throw new AccessControlValidationError({ message: "actor must be a trusted WorkforcePrincipal." });
    }
    if (input.actor.workforceUserId === membership.workforceUserId) {
      throw new SelfElevationError({
        message: "Actors cannot revoke their own role assignments.",
      });
    }
    await requireAuthorization(context, {
      actor: input.actor,
      permission: "access.role_assignment.revoke",
      resource: accessScopeToProtectedResource(scope),
    });
  }

  const now = new Date();

  if (existing.roleKey === "platform_super_admin" && membership.scopeType === "platform") {
    await lockPlatformSuperAdminRoleRow(context);
    const remaining = await countEffectivePlatformSuperAdmins(context, now, {
      excludeAssignmentId: existing.id,
    });
    const currentCount = await countEffectivePlatformSuperAdmins(context, now);
    if (currentCount > 0 && remaining === 0) {
      throw new LastPlatformAdminError();
    }
  }

  await context.db
    .update(accessRoleAssignmentsTable)
    .set({
      revokedAt: now,
      revokedByWorkforceUserId: input.actor?.workforceUserId ?? null,
      updatedAt: now,
    })
    .where(eq(accessRoleAssignmentsTable.id, existing.id));

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actor?.workforceUserId ?? null,
    action: "role_assignment.revoked",
    targetType: "role_assignment",
    targetId: existing.id,
    scopeType: membership.scopeType,
    brandId: membership.brandId,
    organizationId: membership.organizationId,
    territoryId: membership.territoryId,
    outletId: membership.outletId,
    metadata: { roleKey: existing.roleKey, membershipId: membership.id },
  });

  const updated = await findRoleAssignmentById(context, existing.id);
  if (!updated) {
    throw new AccessControlNotFoundError("role_assignment");
  }
  return updated;
}
