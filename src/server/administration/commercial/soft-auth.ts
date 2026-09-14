/**
 * Soft authorization helpers for F6A commercial composition.
 *
 * Never invents a super-permission. Each datum stays gated by its existing
 * permission. Failures become composition labels — values are never leaked.
 */
import "server-only";

import type { PermissionKey } from "../../../shared/access-control";
import { authorize } from "../../access-control/authorize";
import { requireWorkforcePrincipal, type WorkforcePrincipal } from "../../access-control/principal";
import { findBrandById } from "../../organization/brands";
import { findOutletById } from "../../organization/outlets";
import type { PersistenceQueryContext } from "../../persistence/types";
import { AdministrationError } from "../errors";
import type { CompositionProjectionState } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertCommercialUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", `${field} must be a UUID.`, {
      field,
    });
  }
  return value;
}

export async function requireExistingBrand(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<{ id: string }> {
  const brand = await findBrandById(context, brandId);
  if (!brand) {
    throw new AdministrationError("ADMIN_NOT_FOUND", "Brand not found.");
  }
  return { id: brand.id };
}

export async function requireOutletInBrand(
  context: PersistenceQueryContext,
  brandId: string,
  outletId: string,
): Promise<{
  id: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
}> {
  const outlet = await findOutletById(context, outletId);
  if (!outlet || outlet.brandId !== brandId) {
    throw new AdministrationError("ADMIN_NOT_FOUND", "Outlet not found.");
  }
  return {
    id: outlet.id,
    brandId: outlet.brandId,
    organizationId: outlet.organizationId,
    territoryId: outlet.territoryId,
  };
}

export async function softAuthorizeBrandPermission(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  brandId: string,
  permission: PermissionKey,
): Promise<boolean> {
  const decision = await authorize(context, {
    actor,
    permission,
    resource: { type: "brand", brandId },
  });
  return decision.allowed;
}

export async function softAuthorizeOutletPermission(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  outlet: Readonly<{
    brandId: string;
    organizationId: string;
    territoryId: string;
    outletId: string;
  }>,
  permission: PermissionKey,
): Promise<boolean> {
  const decision = await authorize(context, {
    actor,
    permission,
    resource: {
      type: "outlet",
      brandId: outlet.brandId,
      organizationId: outlet.organizationId,
      territoryId: outlet.territoryId,
      outletId: outlet.outletId,
    },
  });
  return decision.allowed;
}

/** Brand-scope commercial reads used as composition entry gate (OR, not a new permission). */
const BRAND_COMMERCIAL_READS: readonly PermissionKey[] = [
  "catalog.read",
  "menu.read",
  "assortment.read",
  "pricing.read",
  "promotions.read",
  "coupons.read",
  "charges.read",
  "tax.read",
  "assortment.audit.read",
  "pricing.audit.read",
  "promotions.audit.read",
];

export async function requireAnyBrandCommercialRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<WorkforcePrincipal> {
  const principal = requireWorkforcePrincipal(actor);
  await requireExistingBrand(context, brandId);
  for (const permission of BRAND_COMMERCIAL_READS) {
    if (await softAuthorizeBrandPermission(context, principal, brandId, permission)) {
      return principal;
    }
  }
  throw new AdministrationError("ADMIN_UNAUTHORIZED", "Not authorized for commercial inspection.");
}

export function unavailableSection(
  permission: string,
  reason: CompositionProjectionState = "unavailable_to_inspect",
): {
  state: CompositionProjectionState;
  permission: string;
  data: null;
  explanation: string;
} {
  const explanation =
    reason === "insufficient_authorized_context"
      ? "Insufficient authorized context to evaluate this section."
      : reason === "not_applicable"
        ? "Section is not applicable for the supplied scope."
        : "Caller lacks permission to inspect this authority.";
  return { state: reason, permission, data: null, explanation };
}
