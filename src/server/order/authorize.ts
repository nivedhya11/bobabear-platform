/**
 * Order RBAC helpers (IMP-023).
 *
 * Capability failure → ORDER_UNAUTHORIZED (no existence disclosure).
 * Missing / outside-scope → ORDER_NOT_FOUND after capability auth.
 * Target kind: outlet. No role-name checks.
 */

import type { PermissionKey } from "../../shared/access-control";
import { OrderError } from "../../shared/order";
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

export type WorkforceActor = WorkforcePrincipal;

export function requireOrderWorkforceActor(actor: unknown): WorkforceActor {
  try {
    return requireWorkforcePrincipal(actor);
  } catch (error) {
    if (error instanceof WorkforcePrincipalError) {
      throw new OrderError(
        "WORKFORCE_AUTH_REQUIRED",
        "Workforce authentication is required.",
      );
    }
    throw error;
  }
}

export async function actorHasOrderCapability(
  context: PersistenceQueryContext,
  actor: WorkforceActor,
  permission: PermissionKey,
): Promise<boolean> {
  assertApplicationRole(context, "actorHasOrderCapability");
  const grants = await getEffectivePermissions(context, { actor });
  return grants.includes(permission);
}

export async function requireOrderCapability(
  context: PersistenceQueryContext,
  actor: WorkforceActor,
  permission: PermissionKey,
): Promise<void> {
  const ok = await actorHasOrderCapability(context, actor, permission);
  if (!ok) {
    throw new OrderError(
      "ORDER_UNAUTHORIZED",
      "Not authorized for this Order operation.",
    );
  }
}

export async function requireOrderOutletPermission(
  context: PersistenceQueryContext,
  actor: WorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  assertApplicationRole(context, "requireOrderOutletPermission");
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
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
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    throw error;
  }
  return outlet;
}

/**
 * Capability-first then scope: unauthorized capability does not disclose
 * whether the Order exists; missing/outside-scope converge to NOT_FOUND.
 */
export async function authorizeOrderOutletAccess(
  context: PersistenceQueryContext,
  actor: WorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  await requireOrderCapability(context, actor, permission);
  return requireOrderOutletPermission(context, actor, outletId, permission);
}
