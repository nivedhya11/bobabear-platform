/**
 * Assortment / availability / operating-state RBAC helpers (IMP-014).
 */
import type { PermissionKey } from "../../shared/access-control";
import { requireAuthorization } from "../access-control/authorize";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findBrandById } from "../organization/brands";
import { findOutletById } from "../organization/outlets";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { AssortmentNotFoundError } from "./errors";

async function requireBrandPermission(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
  permission: PermissionKey,
  operation: string,
): Promise<void> {
  assertApplicationRole(context, operation);
  const principal = requireWorkforcePrincipal(actor);
  const brand = await findBrandById(context, brandId);
  if (!brand) {
    throw new AssortmentNotFoundError("brand");
  }
  await requireAuthorization(context, {
    actor: principal,
    permission,
    resource: { type: "brand", brandId: brand.id },
  });
}

async function requireOutletPermission(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
  permission: PermissionKey,
  operation: string,
): Promise<Awaited<ReturnType<typeof findOutletById>>> {
  assertApplicationRole(context, operation);
  const principal = requireWorkforcePrincipal(actor);
  const outlet = await findOutletById(context, outletId);
  if (!outlet) {
    throw new AssortmentNotFoundError("outlet");
  }
  await requireAuthorization(context, {
    actor: principal,
    permission,
    resource: {
      type: "outlet",
      brandId: outlet.brandId,
      organizationId: outlet.organizationId,
      territoryId: outlet.territoryId,
      outletId: outlet.id,
    },
  });
  return outlet;
}

export async function requireAssortmentManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(
    context,
    actor,
    brandId,
    "assortment.manage",
    "requireAssortmentManage",
  );
}

export async function requireAssortmentRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(
    context,
    actor,
    brandId,
    "assortment.read",
    "requireAssortmentRead",
  );
}

export async function requireAvailabilityManage(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "availability.manage",
    "requireAvailabilityManage",
  );
}

export async function requireAvailabilityRead(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "availability.read",
    "requireAvailabilityRead",
  );
}

export async function requireOperatingStatePause(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "outlet.operating_state.pause",
    "requireOperatingStatePause",
  );
}

export async function requireOperatingStateSuspend(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "outlet.operating_state.suspend",
    "requireOperatingStateSuspend",
  );
}

export async function requireOperatingStateRead(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "outlet.operating_state.read",
    "requireOperatingStateRead",
  );
}

export async function requireOperatingScheduleManage(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "outlet.operating_schedule.manage",
    "requireOperatingScheduleManage",
  );
}

export async function requireOperatingScheduleRead(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "outlet.operating_schedule.read",
    "requireOperatingScheduleRead",
  );
}
