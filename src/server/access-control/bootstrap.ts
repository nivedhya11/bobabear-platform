/**
 * One-time Platform Super Admin bootstrap (IMP-011).
 *
 * No actor. Idempotent for the same workforce user. BOOTSTRAP_CLOSED when
 * another effective Platform Super Admin already exists.
 */
import { and, eq, isNull } from "drizzle-orm";

import {
  accessMembershipsTable,
  accessRoleAssignmentsTable,
} from "../../platform/database/schema/access-control";
import { workforceAuthUsers } from "../../platform/database/schema/workforce-auth";
import type { Persistence, PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { findRoleAssignmentById, grantRole } from "./assignments";
import { insertAccessAuditEvent } from "./audit";
import {
  countEffectivePlatformSuperAdmins,
  lockPlatformSuperAdminRoleRow,
} from "./authorize";
import {
  AccessControlNotFoundError,
  AccessControlValidationError,
  BootstrapClosedError,
  BootstrapIneligibleError,
} from "./errors";
import { createMembership, findMembershipById } from "./membership";
import type { AccessMembership, AccessRoleAssignment } from "./types";

export type BootstrapPlatformSuperAdminInput = Readonly<{
  persistence: Persistence;
  workforceUserId: string;
}>;

export type BootstrapPlatformSuperAdminResult = Readonly<{
  outcome: "bootstrapped" | "already_bootstrapped";
  membership: AccessMembership;
  assignment: AccessRoleAssignment;
}>;

async function assertEligibleWorkforceUser(
  context: PersistenceQueryContext,
  workforceUserId: string,
): Promise<void> {
  const rows = await context.db
    .select({
      id: workforceAuthUsers.id,
      disabledAt: workforceAuthUsers.disabledAt,
      passwordChangeRequired: workforceAuthUsers.passwordChangeRequired,
      twoFactorEnabled: workforceAuthUsers.twoFactorEnabled,
    })
    .from(workforceAuthUsers)
    .where(eq(workforceAuthUsers.id, workforceUserId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new AccessControlNotFoundError("workforce_user");
  }
  if (row.disabledAt !== null) {
    throw new BootstrapIneligibleError({ message: "Workforce user is disabled." });
  }
  if (row.passwordChangeRequired !== false) {
    throw new BootstrapIneligibleError({
      message: "Workforce user must change password before bootstrap.",
    });
  }
  if (row.twoFactorEnabled !== true) {
    throw new BootstrapIneligibleError({
      message: "Workforce user must have MFA enabled before bootstrap.",
    });
  }
}

/**
 * Bootstrap the first Platform Super Admin.
 *
 * 1. Lock PSA role catalog row
 * 2. Count effective PSA assignments
 * 3. None → create platform membership + PSA assignment + audit
 * 4. Same user already bootstrapped → idempotent success
 * 5. Other admin exists → BOOTSTRAP_CLOSED
 */
export async function bootstrapPlatformSuperAdmin(
  input: BootstrapPlatformSuperAdminInput,
): Promise<BootstrapPlatformSuperAdminResult> {
  if (typeof input.workforceUserId !== "string" || input.workforceUserId.length === 0) {
    throw new AccessControlValidationError({
      message: "workforceUserId must be a non-empty string.",
    });
  }
  if (input.persistence.role !== "application") {
    throw new AccessControlValidationError({
      message: "bootstrapPlatformSuperAdmin requires application-role persistence.",
    });
  }

  return input.persistence.transaction(async (context) => {
    assertApplicationRole(context, "bootstrapPlatformSuperAdmin");

    await assertEligibleWorkforceUser(context, input.workforceUserId);
    await lockPlatformSuperAdminRoleRow(context);

    const now = new Date();
    const effectiveCount = await countEffectivePlatformSuperAdmins(context, now);

    if (effectiveCount > 0) {
      const existing = await context.db
        .select({
          assignmentId: accessRoleAssignmentsTable.id,
          membershipId: accessMembershipsTable.id,
          workforceUserId: accessMembershipsTable.workforceUserId,
        })
        .from(accessRoleAssignmentsTable)
        .innerJoin(
          accessMembershipsTable,
          eq(accessMembershipsTable.id, accessRoleAssignmentsTable.membershipId),
        )
        .where(
          and(
            eq(accessRoleAssignmentsTable.roleKey, "platform_super_admin"),
            isNull(accessRoleAssignmentsTable.revokedAt),
            eq(accessMembershipsTable.status, "active"),
            eq(accessMembershipsTable.scopeType, "platform"),
          ),
        );

      const sameUser = existing.find((row) => row.workforceUserId === input.workforceUserId);
      if (!sameUser) {
        throw new BootstrapClosedError();
      }

      const membership = await findMembershipById(context, sameUser.membershipId);
      if (!membership) {
        throw new AccessControlNotFoundError("membership");
      }
      const assignment = await findRoleAssignmentById(context, sameUser.assignmentId);
      if (!assignment) {
        throw new AccessControlNotFoundError("role_assignment");
      }
      return {
        outcome: "already_bootstrapped",
        membership,
        assignment,
      };
    }

    const membership = await createMembership(context, {
      workforceUserId: input.workforceUserId,
      scope: { scopeType: "platform" },
      status: "active",
    });

    const assignment = await grantRole(context, {
      membershipId: membership.id,
      roleKey: "platform_super_admin",
      startsAt: now,
    });

    await insertAccessAuditEvent(context, {
      actorWorkforceUserId: null,
      action: "platform_admin.bootstrapped",
      targetType: "workforce_user",
      targetId: input.workforceUserId,
      scopeType: "platform",
      metadata: {
        membershipId: membership.id,
        assignmentId: assignment.id,
      },
    });

    return {
      outcome: "bootstrapped",
      membership,
      assignment,
    };
  });
}
