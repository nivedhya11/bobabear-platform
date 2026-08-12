/**
 * Promotion / coupon RBAC helpers (IMP-016).
 */
import type { PermissionKey } from "../../shared/access-control";
import type { PromotionScopeType } from "../../shared/promotions";
import { authorize, requireAuthorization } from "../access-control/authorize";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findBrandById } from "../organization/brands";
import { findOutletById } from "../organization/outlets";
import type { PersistenceQueryContext } from "../persistence/types";
import { brandPromotionPoliciesTable } from "../../platform/database/schema/promotions";
import { eq } from "drizzle-orm";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { PromotionAdminError, PromotionNotFoundError } from "./errors";

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
  if (!brand) throw new PromotionNotFoundError("brand");
  await requireAuthorization(context, {
    actor: principal,
    permission,
    resource: { type: "brand", brandId: brand.id },
  });
}

export async function getBrandPromotionPolicyFlags(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<{
  allowTerritoryPromotions: boolean;
  allowOrganizationPromotions: boolean;
  allowOutletPromotions: boolean;
}> {
  const rows = await context.db
    .select()
    .from(brandPromotionPoliciesTable)
    .where(eq(brandPromotionPoliciesTable.brandId, brandId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      allowTerritoryPromotions: false,
      allowOrganizationPromotions: false,
      allowOutletPromotions: false,
    };
  }
  return {
    allowTerritoryPromotions: row.allowTerritoryPromotions,
    allowOrganizationPromotions: row.allowOrganizationPromotions,
    allowOutletPromotions: row.allowOutletPromotions,
  };
}

/**
 * Brand-level manage/activate always OK for Brand Admin / Super Admin.
 * Lower-scope actors need RBAC on the specific resource + Brand delegation.
 */
export async function requirePromotionManageForScope(
  context: PersistenceQueryContext,
  actor: unknown,
  input: {
    brandId: string;
    scopeType: PromotionScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
  },
  permission: PermissionKey = "promotions.manage",
): Promise<void> {
  assertApplicationRole(context, "requirePromotionManageForScope");
  const principal = requireWorkforcePrincipal(actor);
  const brandId = assertUuid(input.brandId, "brandId");
  const brand = await findBrandById(context, brandId);
  if (!brand) throw new PromotionNotFoundError("brand");

  const brandDecision = await authorize(context, {
    actor: principal,
    permission,
    resource: { type: "brand", brandId },
  });
  if (brandDecision.allowed) return;

  if (input.scopeType === "brand") {
    await requireAuthorization(context, {
      actor: principal,
      permission,
      resource: { type: "brand", brandId },
    });
    return;
  }

  const flags = await getBrandPromotionPolicyFlags(context, brandId);
  if (input.scopeType === "territory") {
    if (!flags.allowTerritoryPromotions) {
      throw new PromotionAdminError(
        "PROMOTION_SCOPE_NOT_DELEGATED",
        "Territory promotions are not delegated by Brand policy.",
      );
    }
    const territoryId = assertUuid(input.territoryId, "territoryId");
    await requireAuthorization(context, {
      actor: principal,
      permission,
      resource: { type: "territory", brandId, territoryId },
    });
    return;
  }
  if (input.scopeType === "organization") {
    if (!flags.allowOrganizationPromotions) {
      throw new PromotionAdminError(
        "PROMOTION_SCOPE_NOT_DELEGATED",
        "Organization promotions are not delegated by Brand policy.",
      );
    }
    const organizationId = assertUuid(input.organizationId, "organizationId");
    await requireAuthorization(context, {
      actor: principal,
      permission,
      resource: { type: "organization", brandId, organizationId },
    });
    return;
  }
  if (input.scopeType === "outlet") {
    if (!flags.allowOutletPromotions) {
      throw new PromotionAdminError(
        "PROMOTION_SCOPE_NOT_DELEGATED",
        "Outlet promotions are not delegated by Brand policy.",
      );
    }
    const outletId = assertUuid(input.outletId, "outletId");
    const outlet = await findOutletById(context, outletId);
    if (!outlet || outlet.brandId !== brandId) throw new PromotionNotFoundError("outlet");
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
    return;
  }

  throw new PromotionAdminError("PROMOTION_SCOPE_INVALID", "Unknown promotion scope.");
}

export async function requirePromotionsRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(context, actor, brandId, "promotions.read", "requirePromotionsRead");
}

export async function requirePromotionsActivate(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(
    context,
    actor,
    brandId,
    "promotions.activate",
    "requirePromotionsActivate",
  );
}

export async function requireCouponsManageForPromotionScope(
  context: PersistenceQueryContext,
  actor: unknown,
  input: {
    brandId: string;
    scopeType: PromotionScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
  },
): Promise<void> {
  await requirePromotionManageForScope(context, actor, input, "coupons.manage");
}

export async function requirePromotionsAuditRead(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
): Promise<void> {
  await requireBrandPermission(
    context,
    actor,
    brandId,
    "promotions.audit.read",
    "requirePromotionsAuditRead",
  );
}
