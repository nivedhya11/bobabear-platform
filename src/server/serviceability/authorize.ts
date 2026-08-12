/**
 * Serviceability RBAC helpers (IMP-019).
 *
 * Target resource is Outlet. No role-name checks, no Super Admin bypass.
 */
import type { PermissionKey } from "../../shared/access-control";
import { ServiceabilityError } from "../../shared/serviceability";
import { requireAuthorization } from "../access-control/authorize";
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

export function requireServiceabilityWorkforceActor(
  actor: unknown,
): WorkforcePrincipal {
  try {
    return requireWorkforcePrincipal(actor);
  } catch (error) {
    if (error instanceof WorkforcePrincipalError) {
      throw new ServiceabilityError(
        "SERVICEABILITY_UNAUTHENTICATED",
        "Workforce authentication is required.",
      );
    }
    throw error;
  }
}

async function requireOutletPermission(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
  permission: PermissionKey,
  operation: string,
): Promise<Outlet> {
  assertApplicationRole(context, operation);
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    // Match workforce unknown-vs-unauthorized convention used by assortment.
    throw new ServiceabilityError(
      "SERVICEABILITY_OUTLET_NOT_FOUND",
      "Outlet not found.",
    );
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
      throw new ServiceabilityError(
        "SERVICEABILITY_UNAUTHORIZED",
        "Not authorized for this outlet serviceability operation.",
      );
    }
    throw error;
  }
  return outlet;
}

export async function requireServiceabilityRead(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
): Promise<Outlet> {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "serviceability.read",
    "requireServiceabilityRead",
  );
}

export async function requireServiceabilityManage(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outletId: string,
): Promise<Outlet> {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "serviceability.manage",
    "requireServiceabilityManage",
  );
}
