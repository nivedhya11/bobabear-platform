/**
 * Notification RBAC helpers (IMP-033).
 *
 * Uses the existing IMP-011 permission model. No new role is introduced:
 * `notification.resend` is granted to `support_refund_operator` (and, through
 * ALL_DESCENDANTS, to `platform_super_admin`).
 */
import "server-only";

import type { PermissionKey } from "../../shared/access-control";
import { NotificationError } from "../../shared/notifications";
import { getEffectivePermissions } from "../access-control/authorize";
import {
  requireWorkforcePrincipal,
  WorkforcePrincipalError,
  type WorkforcePrincipal,
} from "../access-control/principal";
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
