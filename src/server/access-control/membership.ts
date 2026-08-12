/**
 * Workforce membership commands (IMP-011).
 *
 * Membership is affiliation only — it does not grant permissions by itself.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import type { AccessScopeType, MembershipStatus } from "../../shared/access-control";
import { accessMembershipsTable } from "../../platform/database/schema/access-control";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertApplicationRole, assertTransactionContext, isUniqueViolation } from "./assert-role";
import { insertAccessAuditEvent } from "./audit";
import {
  countEffectivePlatformSuperAdmins,
  lockPlatformSuperAdminRoleRow,
  requireAuthorization,
} from "./authorize";
import {
  AccessControlConflictError,
  AccessControlInvalidTransitionError,
  AccessControlNotFoundError,
  AccessControlValidationError,
  LastPlatformAdminError,
  SelfElevationError,
} from "./errors";
import { isWorkforcePrincipal, type WorkforcePrincipal } from "./principal";
import { accessScopeToProtectedResource, membershipToAccessScope } from "./scope";
import type { AccessMembership, AccessScope, MembershipTransitionTarget } from "./types";

const ALLOWED_TRANSITIONS: Readonly<
  Record<MembershipStatus, readonly MembershipTransitionTarget[]>
> = {
  invited: ["active", "revoked", "expired"],
  active: ["suspended", "revoked"],
  suspended: ["active", "revoked"],
  revoked: [],
  expired: [],
};

const TRANSITION_AUDIT_ACTION: Readonly<
  Record<MembershipTransitionTarget, "membership.activated" | "membership.suspended" | "membership.revoked" | "membership.expired">
> = {
  active: "membership.activated",
  suspended: "membership.suspended",
  revoked: "membership.revoked",
  expired: "membership.expired",
};

function rowToMembership(row: typeof accessMembershipsTable.$inferSelect): AccessMembership {
  return {
    id: row.id,
    workforceUserId: row.workforceUserId,
    scopeType: row.scopeType as AccessScopeType,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    status: row.status as MembershipStatus,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function scopeColumns(scope: AccessScope): {
  scopeType: AccessScopeType;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
} {
  switch (scope.scopeType) {
    case "platform":
      return {
        scopeType: "platform",
        brandId: null,
        organizationId: null,
        territoryId: null,
        outletId: null,
      };
    case "brand":
      return {
        scopeType: "brand",
        brandId: scope.brandId,
        organizationId: null,
        territoryId: null,
        outletId: null,
      };
    case "organization":
      return {
        scopeType: "organization",
        brandId: scope.brandId,
        organizationId: scope.organizationId,
        territoryId: null,
        outletId: null,
      };
    case "territory":
      return {
        scopeType: "territory",
        brandId: scope.brandId,
        organizationId: null,
        territoryId: scope.territoryId,
        outletId: null,
      };
    case "outlet":
      return {
        scopeType: "outlet",
        brandId: scope.brandId,
        organizationId: scope.organizationId,
        territoryId: scope.territoryId,
        outletId: scope.outletId,
      };
  }
}

export async function findMembershipById(
  context: PersistenceQueryContext,
  membershipId: string,
): Promise<AccessMembership | null> {
  assertApplicationRole(context, "findMembershipById");
  if (typeof membershipId !== "string" || membershipId.length === 0) {
    throw new AccessControlValidationError({ message: "membershipId must be a non-empty string." });
  }
  const rows = await context.db
    .select()
    .from(accessMembershipsTable)
    .where(eq(accessMembershipsTable.id, membershipId))
    .limit(1);
  const row = rows[0];
  return row ? rowToMembership(row) : null;
}

export type CreateMembershipInput = Readonly<{
  actor?: WorkforcePrincipal;
  workforceUserId: string;
  scope: AccessScope;
  status?: "invited" | "active";
  expiresAt?: Date | null;
}>;

export async function createMembership(
  context: PersistenceTransactionContext,
  input: CreateMembershipInput,
): Promise<AccessMembership> {
  assertTransactionContext(context, "createMembership");

  if (typeof input.workforceUserId !== "string" || input.workforceUserId.length === 0) {
    throw new AccessControlValidationError({
      message: "workforceUserId must be a non-empty string.",
    });
  }

  const status = input.status ?? "invited";
  if (status !== "invited" && status !== "active") {
    throw new AccessControlValidationError({
      message: "createMembership status must be invited or active.",
    });
  }

  if (input.actor !== undefined) {
    if (!isWorkforcePrincipal(input.actor)) {
      throw new AccessControlValidationError({ message: "actor must be a trusted WorkforcePrincipal." });
    }
    if (input.actor.workforceUserId === input.workforceUserId) {
      throw new SelfElevationError({
        message: "Actors cannot create memberships for themselves.",
      });
    }
    await requireAuthorization(context, {
      actor: input.actor,
      permission: "access.membership.manage",
      resource: accessScopeToProtectedResource(input.scope),
    });
  }

  const columns = scopeColumns(input.scope);
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(accessMembershipsTable).values({
      id,
      workforceUserId: input.workforceUserId,
      ...columns,
      status,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AccessControlConflictError({
        message: "A non-terminal membership already exists for this user and scope.",
      });
    }
    throw error;
  }

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actor?.workforceUserId ?? null,
    action: "membership.created",
    targetType: "membership",
    targetId: id,
    scopeType: columns.scopeType,
    brandId: columns.brandId,
    organizationId: columns.organizationId,
    territoryId: columns.territoryId,
    outletId: columns.outletId,
    metadata: { status },
  });

  const created = await findMembershipById(context, id);
  if (!created) {
    throw new AccessControlValidationError({ message: "Membership create failed to persist." });
  }
  return created;
}

export type TransitionMembershipInput = Readonly<{
  actor?: WorkforcePrincipal;
  membershipId: string;
  toStatus: MembershipTransitionTarget;
}>;

export async function transitionMembership(
  context: PersistenceTransactionContext,
  input: TransitionMembershipInput,
): Promise<AccessMembership> {
  assertTransactionContext(context, "transitionMembership");

  const existing = await findMembershipById(context, input.membershipId);
  if (!existing) {
    throw new AccessControlNotFoundError("membership");
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(input.toStatus)) {
    throw new AccessControlInvalidTransitionError({
      message: `Cannot transition membership from ${existing.status} to ${input.toStatus}.`,
    });
  }

  // Expiration check: active/invited/suspended past expires_at cannot be
  // activated or kept effective — transitioning to expired is always allowed
  // from invited; from active/suspended use revoked/suspended paths explicitly.
  const now = new Date();
  if (
    existing.expiresAt !== null &&
    existing.expiresAt.getTime() <= now.getTime() &&
    input.toStatus === "active"
  ) {
    throw new AccessControlInvalidTransitionError({
      message: "Cannot activate an expired membership.",
    });
  }

  const scope = membershipToAccessScope(existing);
  if (!scope) {
    throw new AccessControlValidationError({ message: "Membership scope shape is invalid." });
  }

  if (input.actor !== undefined) {
    if (!isWorkforcePrincipal(input.actor)) {
      throw new AccessControlValidationError({ message: "actor must be a trusted WorkforcePrincipal." });
    }
    if (input.actor.workforceUserId === existing.workforceUserId) {
      throw new SelfElevationError({
        message: "Actors cannot transition their own membership.",
      });
    }
    await requireAuthorization(context, {
      actor: input.actor,
      permission: "access.membership.manage",
      resource: accessScopeToProtectedResource(scope),
    });
  }

  // Last Platform Super Admin protection when suspending/revoking platform membership.
  if (
    existing.scopeType === "platform" &&
    (input.toStatus === "suspended" || input.toStatus === "revoked")
  ) {
    await lockPlatformSuperAdminRoleRow(context);
    const remaining = await countEffectivePlatformSuperAdmins(context, now, {
      excludeMembershipId: existing.id,
    });
    // If this membership currently holds an effective PSA and removing it
    // would leave zero, deny.
    const wouldRemain = remaining;
    const currentCount = await countEffectivePlatformSuperAdmins(context, now);
    if (currentCount > 0 && wouldRemain === 0) {
      throw new LastPlatformAdminError();
    }
  }

  await context.db
    .update(accessMembershipsTable)
    .set({ status: input.toStatus, updatedAt: now })
    .where(eq(accessMembershipsTable.id, existing.id));

  await insertAccessAuditEvent(context, {
    actorWorkforceUserId: input.actor?.workforceUserId ?? null,
    action: TRANSITION_AUDIT_ACTION[input.toStatus],
    targetType: "membership",
    targetId: existing.id,
    scopeType: existing.scopeType,
    brandId: existing.brandId,
    organizationId: existing.organizationId,
    territoryId: existing.territoryId,
    outletId: existing.outletId,
    metadata: { fromStatus: existing.status, toStatus: input.toStatus },
  });

  const updated = await findMembershipById(context, existing.id);
  if (!updated) {
    throw new AccessControlNotFoundError("membership");
  }
  return updated;
}
