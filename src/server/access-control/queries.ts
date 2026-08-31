/**
 * Access-control read helpers for authorized administration projections (IMP-035).
 */
import { desc, eq } from "drizzle-orm";

import type { AccessAuditAction, AccessScopeType } from "../../shared/access-control";
import {
  accessControlAuditEventsTable,
  accessMembershipsTable,
  accessRoleAssignmentsTable,
} from "../../platform/database/schema/access-control";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import type { AccessMembership, AccessRoleAssignment } from "./types";

function membershipFromRow(row: typeof accessMembershipsTable.$inferSelect): AccessMembership {
  return {
    id: row.id,
    workforceUserId: row.workforceUserId,
    scopeType: row.scopeType as AccessScopeType,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    status: row.status as AccessMembership["status"],
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function assignmentFromRow(
  row: typeof accessRoleAssignmentsTable.$inferSelect,
): AccessRoleAssignment {
  return {
    id: row.id,
    membershipId: row.membershipId,
    roleKey: row.roleKey as AccessRoleAssignment["roleKey"],
    startsAt: new Date(row.startsAt),
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
    grantedByWorkforceUserId: row.grantedByWorkforceUserId,
    revokedByWorkforceUserId: row.revokedByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export type AccessAuditEvent = Readonly<{
  id: string;
  occurredAt: Date;
  actorWorkforceUserId: string | null;
  action: AccessAuditAction;
  targetType: string;
  targetId: string;
  scopeType: AccessScopeType | null;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;

export async function listMemberships(
  context: PersistenceQueryContext,
): Promise<AccessMembership[]> {
  assertApplicationRole(context, "listMemberships");
  const rows = await context.db
    .select()
    .from(accessMembershipsTable)
    .orderBy(desc(accessMembershipsTable.createdAt));
  return rows.map(membershipFromRow);
}

export async function listRoleAssignmentsForMembership(
  context: PersistenceQueryContext,
  membershipId: string,
): Promise<AccessRoleAssignment[]> {
  assertApplicationRole(context, "listRoleAssignmentsForMembership");
  const rows = await context.db
    .select()
    .from(accessRoleAssignmentsTable)
    .where(eq(accessRoleAssignmentsTable.membershipId, membershipId))
    .orderBy(desc(accessRoleAssignmentsTable.createdAt));
  return rows.map(assignmentFromRow);
}

export async function listAccessAuditEvents(
  context: PersistenceQueryContext,
): Promise<AccessAuditEvent[]> {
  assertApplicationRole(context, "listAccessAuditEvents");
  const rows = await context.db
    .select()
    .from(accessControlAuditEventsTable)
    .orderBy(desc(accessControlAuditEventsTable.occurredAt));
  return rows.map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action as AccessAuditAction,
    targetType: row.targetType,
    targetId: row.targetId,
    scopeType: row.scopeType as AccessScopeType | null,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    metadata: row.metadata as Readonly<Record<string, unknown>>,
  }));
}
