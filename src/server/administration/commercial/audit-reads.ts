/**
 * Authorized catalog / menu / assortment / pricing audit list adapters (F6A).
 * Append-only reads only — no new audit authority.
 */
import "server-only";

import { desc, eq } from "drizzle-orm";

import { catalogMutationAuditEventsTable } from "../../../platform/database/schema/catalog";
import { menuMutationAuditEventsTable } from "../../../platform/database/schema/menu";
import { assortmentAvailabilityAuditEventsTable } from "../../../platform/database/schema/assortment";
import { pricingTaxAuditEventsTable } from "../../../platform/database/schema/pricing";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../../catalog/assert-role";
import { assertUuid } from "../../catalog/lifecycle";
import { requireCatalogRead } from "../../catalog/authorize-catalog";
import { requireMenuRead } from "../../catalog/menu/authorize-menu";
import { requireAssortmentAuditRead } from "../../assortment/authorize-assortment";
import { requirePricingAuditRead } from "../../pricing/authorize-pricing";

export type BrandAuditEventRow = Readonly<{
  id: string;
  occurredAt: Date;
  actorWorkforceUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  brandId: string | null;
  outletId: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;

export async function listBrandCatalogAuditEvents(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; limit?: number }>,
): Promise<readonly BrandAuditEventRow[]> {
  assertApplicationRole(context, "listBrandCatalogAuditEvents");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireCatalogRead(context, input.actor, brandId);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await context.db
    .select()
    .from(catalogMutationAuditEventsTable)
    .where(eq(catalogMutationAuditEventsTable.brandId, brandId))
    .orderBy(desc(catalogMutationAuditEventsTable.occurredAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action,
    resourceType: row.targetType,
    resourceId: row.targetId,
    brandId: row.brandId,
    outletId: null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function listBrandMenuAuditEvents(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; limit?: number }>,
): Promise<readonly BrandAuditEventRow[]> {
  assertApplicationRole(context, "listBrandMenuAuditEvents");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireMenuRead(context, input.actor, brandId);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await context.db
    .select()
    .from(menuMutationAuditEventsTable)
    .where(eq(menuMutationAuditEventsTable.brandId, brandId))
    .orderBy(desc(menuMutationAuditEventsTable.occurredAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action,
    resourceType: row.targetType,
    resourceId: row.targetId,
    brandId: row.brandId,
    outletId: null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function listBrandAssortmentAuditEvents(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; limit?: number }>,
): Promise<readonly BrandAuditEventRow[]> {
  assertApplicationRole(context, "listBrandAssortmentAuditEvents");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentAuditRead(context, input.actor, brandId);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await context.db
    .select()
    .from(assortmentAvailabilityAuditEventsTable)
    .where(eq(assortmentAvailabilityAuditEventsTable.brandId, brandId))
    .orderBy(desc(assortmentAvailabilityAuditEventsTable.occurredAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action,
    resourceType: row.targetType,
    resourceId: row.targetId,
    brandId: row.brandId,
    outletId: row.outletId,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function listBrandPricingAuditEvents(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; limit?: number }>,
): Promise<readonly BrandAuditEventRow[]> {
  assertApplicationRole(context, "listBrandPricingAuditEvents");
  const brandId = assertUuid(input.brandId, "brandId");
  await requirePricingAuditRead(context, input.actor, brandId);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await context.db
    .select()
    .from(pricingTaxAuditEventsTable)
    .where(eq(pricingTaxAuditEventsTable.brandId, brandId))
    .orderBy(desc(pricingTaxAuditEventsTable.occurredAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action,
    resourceType: row.targetType,
    resourceId: row.targetId,
    brandId: row.brandId,
    outletId: row.outletId,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}
