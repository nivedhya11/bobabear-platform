/**
 * Pricing / charges / tax RBAC helpers (IMP-015).
 */
import type { PermissionKey } from "../../shared/access-control";
import { requireAuthorization } from "../access-control/authorize";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findBrandById } from "../organization/brands";
import { findOutletById } from "../organization/outlets";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { PricingNotFoundError } from "./errors";

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
    throw new PricingNotFoundError("brand");
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
    throw new PricingNotFoundError("outlet");
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

export async function requirePricingManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "pricing.manage", "requirePricingManage");
}

export async function requirePricingRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "pricing.read", "requirePricingRead");
}

export async function requireOutletPricingManage(
  context: PersistenceQueryContext,
  actor: unknown,
  outletId: string,
) {
  return requireOutletPermission(
    context,
    actor,
    outletId,
    "pricing.manage",
    "requireOutletPricingManage",
  );
}

export async function requireChargesManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "charges.manage", "requireChargesManage");
}

export async function requireChargesRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "charges.read", "requireChargesRead");
}

export async function requireTaxManage(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "tax.manage", "requireTaxManage");
}

export async function requireTaxRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "tax.read", "requireTaxRead");
}

export async function requirePricingAuditRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(
    context,
    actor,
    brandId,
    "pricing.audit.read",
    "requirePricingAuditRead",
  );
}
