/**
 * Brand promotion governance policy (IMP-016).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { brandPromotionPoliciesTable } from "../../platform/database/schema/promotions";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, assertUuid } from "./assert-role";
import { insertPromotionAuditEvent } from "./audit";
import {
  getBrandPromotionPolicyFlags,
  requirePromotionManageForScope,
} from "./authorize-promotions";

export async function getBrandPromotionPolicy(
  context: PersistenceQueryContext,
  brandId: string,
) {
  return getBrandPromotionPolicyFlags(context, assertUuid(brandId, "brandId"));
}

export async function updateBrandPromotionPolicy(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    brandId: string;
    allowTerritoryPromotions: boolean;
    allowOrganizationPromotions: boolean;
    allowOutletPromotions: boolean;
  },
): Promise<void> {
  assertTransactionContext(context, "updateBrandPromotionPolicy");
  const brandId = assertUuid(input.brandId, "brandId");
  await requirePromotionManageForScope(context, input.actor, {
    brandId,
    scopeType: "brand",
  });
  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  const existing = await context.db
    .select()
    .from(brandPromotionPoliciesTable)
    .where(eq(brandPromotionPoliciesTable.brandId, brandId))
    .limit(1);

  if (existing[0]) {
    await context.db
      .update(brandPromotionPoliciesTable)
      .set({
        allowTerritoryPromotions: input.allowTerritoryPromotions,
        allowOrganizationPromotions: input.allowOrganizationPromotions,
        allowOutletPromotions: input.allowOutletPromotions,
        updatedAt: now,
      })
      .where(eq(brandPromotionPoliciesTable.id, existing[0].id));
  } else {
    await context.db.insert(brandPromotionPoliciesTable).values({
      id: randomUUID(),
      brandId,
      allowTerritoryPromotions: input.allowTerritoryPromotions,
      allowOrganizationPromotions: input.allowOrganizationPromotions,
      allowOutletPromotions: input.allowOutletPromotions,
      createdAt: now,
      updatedAt: now,
    });
  }

  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.manage",
    action: "brand_promotion_policy.updated",
    resourceType: "brand_promotion_policy",
    resourceId: brandId,
    brandId,
    metadata: {
      allowTerritoryPromotions: input.allowTerritoryPromotions,
      allowOrganizationPromotions: input.allowOrganizationPromotions,
      allowOutletPromotions: input.allowOutletPromotions,
    },
  });
}
