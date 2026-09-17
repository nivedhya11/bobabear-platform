/**
 * Set-oriented eligible listing queries for AUTHORIZED_SET_CURSOR_CONTINUATION.
 *
 * Predicates are compiled from effective grants; pages use SQL keyset limits so
 * work does not scale with the global unauthorized collection.
 */
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type Column,
  type SQL,
} from "drizzle-orm";

import {
  accessControlAuditEventsTable,
  accessMembershipsTable,
} from "../../platform/database/schema/access-control";
import {
  brandsTable,
  legalEntitiesTable,
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "../../platform/database/schema/organizations";
import type { AccessAuditEvent } from "../access-control/queries";
import type { AccessMembership } from "../access-control/types";
import { assertApplicationRole } from "../organization/assert-role";
import type {
  Brand,
  LegalEntity,
  Organization,
  Outlet,
  Territory,
} from "../organization/types";
import type { PersistenceQueryContext } from "../persistence/types";
import type { EligibleScopePlan } from "./eligible-set";

function mapBrand(row: typeof brandsTable.$inferSelect): Brand {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status as Brand["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapOrganization(row: typeof organizationsTable.$inferSelect): Organization {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    status: row.status as Organization["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapTerritory(row: typeof territoriesTable.$inferSelect): Territory {
  return {
    id: row.id,
    brandId: row.brandId,
    code: row.code,
    name: row.name,
    status: row.status as Territory["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapLegalEntity(row: typeof legalEntitiesTable.$inferSelect): LegalEntity {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    status: row.status as LegalEntity["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function mapOutlet(row: typeof outletsTable.$inferSelect): Outlet {
  return {
    id: row.id,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    legalEntityId: row.legalEntityId,
    code: row.code,
    name: row.name,
    status: row.status as Outlet["status"],
    revision: row.revision,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function membershipFromRow(row: typeof accessMembershipsTable.$inferSelect): AccessMembership {
  return {
    id: row.id,
    workforceUserId: row.workforceUserId,
    scopeType: row.scopeType as AccessMembership["scopeType"],
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    status: row.status as AccessMembership["status"],
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function auditFromRow(row: typeof accessControlAuditEventsTable.$inferSelect): AccessAuditEvent {
  return {
    id: row.id,
    occurredAt: new Date(row.occurredAt),
    actorWorkforceUserId: row.actorWorkforceUserId,
    action: row.action as AccessAuditEvent["action"],
    targetType: row.targetType,
    targetId: row.targetId,
    scopeType: row.scopeType as AccessAuditEvent["scopeType"],
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    outletId: row.outletId,
    metadata: (row.metadata ?? {}) as Readonly<Record<string, unknown>>,
  };
}

function brandsWhere(plan: EligibleScopePlan): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const ids = [...new Set([...plan.brandIds, ...plan.exactBrandIds])];
  if (ids.length === 0) return sql`false`;
  return inArray(brandsTable.id, ids);
}

function organizationsWhere(plan: EligibleScopePlan): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const parts: SQL[] = [];
  if (plan.brandIds.length > 0) parts.push(inArray(organizationsTable.brandId, [...plan.brandIds]));
  const orgIds = [...new Set([...plan.organizationIds, ...plan.exactOrganizationIds])];
  if (orgIds.length > 0) parts.push(inArray(organizationsTable.id, orgIds));
  if (parts.length === 0) return sql`false`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

function territoriesWhere(plan: EligibleScopePlan): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const parts: SQL[] = [];
  if (plan.brandIds.length > 0) parts.push(inArray(territoriesTable.brandId, [...plan.brandIds]));
  const territoryIds = [...new Set([...plan.territoryIds, ...plan.exactTerritoryIds])];
  if (territoryIds.length > 0) parts.push(inArray(territoriesTable.id, territoryIds));
  if (parts.length === 0) return sql`false`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

function legalEntitiesWhere(plan: EligibleScopePlan): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const parts: SQL[] = [];
  if (plan.brandIds.length > 0) parts.push(inArray(legalEntitiesTable.brandId, [...plan.brandIds]));
  const orgIds = [...new Set([...plan.organizationIds, ...plan.exactOrganizationIds])];
  if (orgIds.length > 0) parts.push(inArray(legalEntitiesTable.organizationId, orgIds));
  if (parts.length === 0) return sql`false`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

function outletsWhere(plan: EligibleScopePlan): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const parts: SQL[] = [];
  if (plan.brandIds.length > 0) parts.push(inArray(outletsTable.brandId, [...plan.brandIds]));
  if (plan.organizationIds.length > 0) {
    parts.push(inArray(outletsTable.organizationId, [...plan.organizationIds]));
  }
  if (plan.territoryIds.length > 0) parts.push(inArray(outletsTable.territoryId, [...plan.territoryIds]));
  if (plan.outletIds.length > 0) parts.push(inArray(outletsTable.id, [...plan.outletIds]));
  if (parts.length === 0) return sql`false`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

type ScopedRowColumns = Readonly<{
  scopeType: Column;
  brandId: Column;
  organizationId: Column;
  territoryId: Column;
  outletId: Column;
}>;

/**
 * Audit rows may carry a NULL scope_type, which the domain reads as the platform
 * scope; membership rows always carry a concrete scope_type.
 */
function scopedRowWhere(
  plan: EligibleScopePlan,
  cols: ScopedRowColumns,
  options: Readonly<{ nullScopeIsPlatform?: boolean }> = {},
): SQL | undefined {
  if (plan.kind === "none") return sql`false`;
  if (plan.kind === "unrestricted") return undefined;
  const parts: SQL[] = [];
  if (plan.exactPlatform) {
    parts.push(
      options.nullScopeIsPlatform
        ? or(eq(cols.scopeType, "platform"), isNull(cols.scopeType))!
        : eq(cols.scopeType, "platform"),
    );
  }
  if (plan.brandIds.length > 0) {
    parts.push(and(inArray(cols.brandId, [...plan.brandIds]), sql`${cols.scopeType} <> 'platform'`)!);
  }
  if (plan.exactBrandIds.length > 0) {
    parts.push(and(eq(cols.scopeType, "brand"), inArray(cols.brandId, [...plan.exactBrandIds]))!);
  }
  if (plan.organizationIds.length > 0) {
    parts.push(
      and(
        inArray(cols.organizationId, [...plan.organizationIds]),
        inArray(cols.scopeType, ["organization", "outlet"]),
      )!,
    );
  }
  if (plan.exactOrganizationIds.length > 0) {
    parts.push(
      and(eq(cols.scopeType, "organization"), inArray(cols.organizationId, [...plan.exactOrganizationIds]))!,
    );
  }
  if (plan.territoryIds.length > 0) {
    parts.push(
      and(
        inArray(cols.territoryId, [...plan.territoryIds]),
        inArray(cols.scopeType, ["territory", "outlet"]),
      )!,
    );
  }
  if (plan.exactTerritoryIds.length > 0) {
    parts.push(
      and(eq(cols.scopeType, "territory"), inArray(cols.territoryId, [...plan.exactTerritoryIds]))!,
    );
  }
  if (plan.outletIds.length > 0) {
    parts.push(and(eq(cols.scopeType, "outlet"), inArray(cols.outletId, [...plan.outletIds]))!);
  }
  if (parts.length === 0) return sql`false`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

function nameIdAfter(nameCol: Column, idCol: Column, name: string, id: string): SQL {
  return or(gt(nameCol, name), and(eq(nameCol, name), gt(idCol, id)))!;
}

export type NameIdPageQuery = Readonly<{
  plan: EligibleScopePlan;
  after?: Readonly<{ name: string; id: string }>;
  limit: number;
}>;

export type TimeIdPageQuery = Readonly<{
  plan: EligibleScopePlan;
  after?: Readonly<{ at: Date; id: string }>;
  limit: number;
  actorWorkforceUserId?: string;
  action?: string;
  occurredFrom?: Date;
  occurredTo?: Date;
  outletId?: string;
  statuses?: readonly AccessMembership["status"][];
}>;

export async function listEligibleBrandsPage(
  context: PersistenceQueryContext,
  query: NameIdPageQuery,
): Promise<Brand[]> {
  assertApplicationRole(context, "listEligibleBrandsPage");
  const wherePlan = brandsWhere(query.plan);
  const whereCursor = query.after
    ? nameIdAfter(brandsTable.name, brandsTable.id, query.after.name, query.after.id)
    : undefined;
  const where = and(wherePlan, whereCursor);
  const rows = await context.db
    .select()
    .from(brandsTable)
    .where(where)
    .orderBy(asc(brandsTable.name), asc(brandsTable.id))
    .limit(query.limit);
  return rows.map(mapBrand);
}

export async function countEligibleBrands(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleBrands");
  const wherePlan = brandsWhere(plan);
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(brandsTable)
    .where(wherePlan);
  return Number(rows[0]?.count ?? 0);
}

export async function listEligibleOrganizationsPage(
  context: PersistenceQueryContext,
  query: NameIdPageQuery,
): Promise<Organization[]> {
  assertApplicationRole(context, "listEligibleOrganizationsPage");
  const wherePlan = organizationsWhere(query.plan);
  const whereCursor = query.after
    ? nameIdAfter(organizationsTable.name, organizationsTable.id, query.after.name, query.after.id)
    : undefined;
  const rows = await context.db
    .select()
    .from(organizationsTable)
    .where(and(wherePlan, whereCursor))
    .orderBy(asc(organizationsTable.name), asc(organizationsTable.id))
    .limit(query.limit);
  return rows.map(mapOrganization);
}

export async function countEligibleOrganizations(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleOrganizations");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizationsTable)
    .where(organizationsWhere(plan));
  return Number(rows[0]?.count ?? 0);
}

export async function listEligibleTerritoriesPage(
  context: PersistenceQueryContext,
  query: NameIdPageQuery,
): Promise<Territory[]> {
  assertApplicationRole(context, "listEligibleTerritoriesPage");
  const wherePlan = territoriesWhere(query.plan);
  const whereCursor = query.after
    ? nameIdAfter(territoriesTable.name, territoriesTable.id, query.after.name, query.after.id)
    : undefined;
  const rows = await context.db
    .select()
    .from(territoriesTable)
    .where(and(wherePlan, whereCursor))
    .orderBy(asc(territoriesTable.name), asc(territoriesTable.id))
    .limit(query.limit);
  return rows.map(mapTerritory);
}

export async function countEligibleTerritories(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleTerritories");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(territoriesTable)
    .where(territoriesWhere(plan));
  return Number(rows[0]?.count ?? 0);
}

export async function listEligibleLegalEntitiesPage(
  context: PersistenceQueryContext,
  query: NameIdPageQuery,
): Promise<LegalEntity[]> {
  assertApplicationRole(context, "listEligibleLegalEntitiesPage");
  const wherePlan = legalEntitiesWhere(query.plan);
  const whereCursor = query.after
    ? nameIdAfter(legalEntitiesTable.name, legalEntitiesTable.id, query.after.name, query.after.id)
    : undefined;
  const rows = await context.db
    .select()
    .from(legalEntitiesTable)
    .where(and(wherePlan, whereCursor))
    .orderBy(asc(legalEntitiesTable.name), asc(legalEntitiesTable.id))
    .limit(query.limit);
  return rows.map(mapLegalEntity);
}

export async function countEligibleLegalEntities(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleLegalEntities");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(legalEntitiesTable)
    .where(legalEntitiesWhere(plan));
  return Number(rows[0]?.count ?? 0);
}

export async function listEligibleOutletsPage(
  context: PersistenceQueryContext,
  query: NameIdPageQuery,
): Promise<Outlet[]> {
  assertApplicationRole(context, "listEligibleOutletsPage");
  const wherePlan = outletsWhere(query.plan);
  const whereCursor = query.after
    ? nameIdAfter(outletsTable.name, outletsTable.id, query.after.name, query.after.id)
    : undefined;
  const rows = await context.db
    .select()
    .from(outletsTable)
    .where(and(wherePlan, whereCursor))
    .orderBy(asc(outletsTable.name), asc(outletsTable.id))
    .limit(query.limit);
  return rows.map(mapOutlet);
}

export async function countEligibleOutlets(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleOutlets");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(outletsTable)
    .where(outletsWhere(plan));
  return Number(rows[0]?.count ?? 0);
}

export async function listEligibleMembershipsPage(
  context: PersistenceQueryContext,
  query: TimeIdPageQuery,
): Promise<AccessMembership[]> {
  assertApplicationRole(context, "listEligibleMembershipsPage");
  const wherePlan = scopedRowWhere(query.plan, accessMembershipsTable);
  const whereOutlet =
    query.outletId !== undefined
      ? and(eq(accessMembershipsTable.scopeType, "outlet"), eq(accessMembershipsTable.outletId, query.outletId))
      : undefined;
  const whereStatus =
    query.statuses && query.statuses.length > 0
      ? inArray(accessMembershipsTable.status, [...query.statuses])
      : undefined;
  const whereCursor = query.after
    ? or(
        lt(accessMembershipsTable.createdAt, query.after.at),
        and(eq(accessMembershipsTable.createdAt, query.after.at), lt(accessMembershipsTable.id, query.after.id)),
      )
    : undefined;
  const rows = await context.db
    .select()
    .from(accessMembershipsTable)
    .where(and(wherePlan, whereOutlet, whereStatus, whereCursor))
    .orderBy(desc(accessMembershipsTable.createdAt), desc(accessMembershipsTable.id))
    .limit(query.limit);
  return rows.map(membershipFromRow);
}

export async function countEligibleMemberships(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleMemberships");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(accessMembershipsTable)
    .where(scopedRowWhere(plan, accessMembershipsTable));
  return Number(rows[0]?.count ?? 0);
}

export type EligibleMembershipStatusCounts = Readonly<
  Record<AccessMembership["status"], number>
>;

/** Count eligible memberships grouped by lifecycle status (overview attention). */
export async function countEligibleMembershipsByStatus(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<EligibleMembershipStatusCounts> {
  assertApplicationRole(context, "countEligibleMembershipsByStatus");
  const counts: Record<AccessMembership["status"], number> = {
    invited: 0,
    active: 0,
    suspended: 0,
    revoked: 0,
    expired: 0,
  };
  const rows = await context.db
    .select({ status: accessMembershipsTable.status, count: sql<number>`count(*)::int` })
    .from(accessMembershipsTable)
    .where(scopedRowWhere(plan, accessMembershipsTable))
    .groupBy(accessMembershipsTable.status);
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as AccessMembership["status"]] = Number(row.count ?? 0);
    }
  }
  return counts;
}

export async function listEligibleAuditEventsPage(
  context: PersistenceQueryContext,
  query: TimeIdPageQuery,
): Promise<AccessAuditEvent[]> {
  assertApplicationRole(context, "listEligibleAuditEventsPage");
  const wherePlan = scopedRowWhere(query.plan, accessControlAuditEventsTable, {
    nullScopeIsPlatform: true,
  });
  const filters: (SQL | undefined)[] = [
    wherePlan,
    query.actorWorkforceUserId
      ? eq(accessControlAuditEventsTable.actorWorkforceUserId, query.actorWorkforceUserId)
      : undefined,
    query.action ? eq(accessControlAuditEventsTable.action, query.action) : undefined,
    query.occurredFrom
      ? sql`${accessControlAuditEventsTable.occurredAt} >= ${query.occurredFrom}`
      : undefined,
    query.occurredTo
      ? sql`${accessControlAuditEventsTable.occurredAt} <= ${query.occurredTo}`
      : undefined,
  ];
  const whereCursor = query.after
    ? or(
        lt(accessControlAuditEventsTable.occurredAt, query.after.at),
        and(
          eq(accessControlAuditEventsTable.occurredAt, query.after.at),
          lt(accessControlAuditEventsTable.id, query.after.id),
        ),
      )
    : undefined;
  const rows = await context.db
    .select()
    .from(accessControlAuditEventsTable)
    .where(and(...filters, whereCursor))
    .orderBy(desc(accessControlAuditEventsTable.occurredAt), desc(accessControlAuditEventsTable.id))
    .limit(query.limit);
  return rows.map(auditFromRow);
}

export async function countEligibleAuditEvents(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
): Promise<number> {
  assertApplicationRole(context, "countEligibleAuditEvents");
  const rows = await context.db
    .select({ count: sql<number>`count(*)::int` })
    .from(accessControlAuditEventsTable)
    .where(scopedRowWhere(plan, accessControlAuditEventsTable, { nullScopeIsPlatform: true }));
  return Number(rows[0]?.count ?? 0);
}

/** Sample first N name-ordered eligible brands (overview). */
export async function sampleEligibleBrands(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
  limit: number,
): Promise<Brand[]> {
  return listEligibleBrandsPage(context, { plan, limit });
}

export async function sampleEligibleOrganizations(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
  limit: number,
): Promise<Organization[]> {
  return listEligibleOrganizationsPage(context, { plan, limit });
}

export async function sampleEligibleTerritories(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
  limit: number,
): Promise<Territory[]> {
  return listEligibleTerritoriesPage(context, { plan, limit });
}

export async function sampleEligibleLegalEntities(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
  limit: number,
): Promise<LegalEntity[]> {
  return listEligibleLegalEntitiesPage(context, { plan, limit });
}

export async function sampleEligibleOutlets(
  context: PersistenceQueryContext,
  plan: EligibleScopePlan,
  limit: number,
): Promise<Outlet[]> {
  return listEligibleOutletsPage(context, { plan, limit });
}
