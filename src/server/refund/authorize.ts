/**
 * Refund RBAC (IMP-027).
 *
 * Capability failure → REFUND_UNAUTHORIZED (no existence disclosure).
 * Missing / outside-scope → REFUND_NOT_FOUND after capability auth.
 * Target kind: outlet.
 */
import type { PermissionKey } from "../../shared/access-control";
import { RefundError } from "../../shared/refund";
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

export type RefundWorkforceActor = WorkforcePrincipal;

export function requireRefundWorkforceActor(actor: unknown): RefundWorkforceActor {
  try {
    return requireWorkforcePrincipal(actor);
  } catch (error) {
    if (error instanceof WorkforcePrincipalError) {
      throw new RefundError(
        "WORKFORCE_AUTH_REQUIRED",
        "Workforce authentication is required.",
      );
    }
    throw error;
  }
}

export async function actorHasRefundCapability(
  context: PersistenceQueryContext,
  actor: RefundWorkforceActor,
  permission: PermissionKey,
): Promise<boolean> {
  assertApplicationRole(context, "actorHasRefundCapability");
  const grants = await getEffectivePermissions(context, { actor });
  return grants.includes(permission);
}

export async function requireRefundCapability(
  context: PersistenceQueryContext,
  actor: RefundWorkforceActor,
  permission: PermissionKey,
): Promise<void> {
  const ok = await actorHasRefundCapability(context, actor, permission);
  if (!ok) {
    throw new RefundError(
      "REFUND_UNAUTHORIZED",
      "Not authorized for this Refund operation.",
    );
  }
}

export async function authorizeRefundOutletAccess(
  context: PersistenceQueryContext,
  actor: RefundWorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  await requireRefundCapability(context, actor, permission);
  assertApplicationRole(context, "authorizeRefundOutletAccess");
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
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
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    throw error;
  }
  return outlet;
}
