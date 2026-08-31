/**
 * Delivery RBAC helpers (IMP-032).
 */
import "server-only";

import type { PermissionKey } from "../../shared/access-control";
import { DeliveryError } from "../../shared/delivery";
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

export type DeliveryWorkforceActor = WorkforcePrincipal;

export function requireDeliveryWorkforceActor(actor: unknown): DeliveryWorkforceActor {
  try {
    return requireWorkforcePrincipal(actor);
  } catch (error) {
    if (error instanceof WorkforcePrincipalError) {
      throw new DeliveryError(
        "WORKFORCE_AUTH_REQUIRED",
        "Workforce authentication is required.",
      );
    }
    throw error;
  }
}

export async function actorHasDeliveryCapability(
  context: PersistenceQueryContext,
  actor: DeliveryWorkforceActor,
  permission: PermissionKey,
): Promise<boolean> {
  assertApplicationRole(context, "actorHasDeliveryCapability");
  const grants = await getEffectivePermissions(context, { actor });
  return grants.includes(permission);
}

export async function requireDeliveryCapability(
  context: PersistenceQueryContext,
  actor: DeliveryWorkforceActor,
  permission: PermissionKey,
): Promise<void> {
  const ok = await actorHasDeliveryCapability(context, actor, permission);
  if (!ok) {
    throw new DeliveryError(
      "DELIVERY_UNAUTHORIZED",
      "Not authorized for this Delivery operation.",
    );
  }
}

export async function requireDeliveryOutletPermission(
  context: PersistenceQueryContext,
  actor: DeliveryWorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  assertApplicationRole(context, "requireDeliveryOutletPermission");
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
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
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    throw error;
  }
  return outlet;
}

export async function authorizeDeliveryOutletAccess(
  context: PersistenceQueryContext,
  actor: DeliveryWorkforceActor,
  outletId: string,
  permission: PermissionKey,
): Promise<Outlet> {
  await requireDeliveryCapability(context, actor, permission);
  return requireDeliveryOutletPermission(context, actor, outletId, permission);
}
