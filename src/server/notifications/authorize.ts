/**
 * Notification RBAC helpers (IMP-033 / IMP-036D).
 *
 * Uses the existing IMP-011 permission model. No new role is introduced:
 * `notification.resend` is granted to `support_refund_operator` (and, through
 * ALL_DESCENDANTS, to `platform_super_admin`).
 *
 * IMP-036D Operations transport requires resource-specific Outlet authorization
 * in addition to the capability membership check.
 */
import "server-only";

import type { PermissionKey } from "../../shared/access-control";
import { NotificationError } from "../../shared/notifications";
import {
  getEffectivePermissions,
  requireAuthorization,
} from "../access-control/authorize";
import { AuthorizationError } from "../access-control/errors";
import {
  requireWorkforcePrincipal,
  WorkforcePrincipalError,
  type WorkforcePrincipal,
} from "../access-control/principal";
import { findOutletById } from "../organization/outlets";
import type { Outlet } from "../organization/types";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";

export type NotificationWorkforceActor = WorkforcePrincipal;

export function requireNotificationWorkforceActor(
  actor: unknown,
): NotificationWorkforceActor {
  try {
    return requireWorkforcePrincipal(actor);
  } catch (error) {
    if (error instanceof WorkforcePrincipalError) {
      throw new NotificationError(
        "WORKFORCE_AUTH_REQUIRED",
        "Workforce authentication is required.",
      );
    }
    throw error;
  }
}

export async function actorHasNotificationCapability(
  context: PersistenceQueryContext,
  actor: NotificationWorkforceActor,
  permission: PermissionKey,
): Promise<boolean> {
  assertApplicationRole(context, "actorHasNotificationCapability");
  const grants = await getEffectivePermissions(context, { actor });
  return grants.includes(permission);
}

export async function requireNotificationCapability(
  context: PersistenceQueryContext,
  actor: NotificationWorkforceActor,
  permission: PermissionKey,
): Promise<void> {
  const ok = await actorHasNotificationCapability(context, actor, permission);
  if (!ok) {
    throw new NotificationError(
      "NOTIFICATION_UNAUTHORIZED",
      "Not authorized for this Notification operation.",
    );
  }
}

/**
 * Capability-first then Outlet-scoped authorization for Notification support.
 * Capability miss → NOTIFICATION_UNAUTHORIZED.
 * Missing / outside-scope → NOTIFICATION_NOT_FOUND (no existence disclosure).
 */
export async function authorizeNotificationOutletAccess(
  context: PersistenceQueryContext,
  actor: NotificationWorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  await requireNotificationCapability(context, actor, permission);
  assertApplicationRole(context, "authorizeNotificationOutletAccess");
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
  }
  try {
    await requireAuthorization(context, {
      actor,
      permission,
      resource: {
        type: "outlet",
        brandId: outlet.brandId,
        organizationId: outlet.organizationId,
        territoryId: outlet.territoryId,
        outletId: outlet.id,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    throw error;
  }
  return outlet;
}
