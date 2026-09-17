/** Organization hierarchy list helpers for administration (IMP-035 / IMP-036G). */
import { asc } from "drizzle-orm";

import {
  brandsTable,
  legalEntitiesTable,
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "../../platform/database/schema/organizations";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import type { Brand, LegalEntity, Organization, Outlet, Territory } from "./types";

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

export async function listBrands(context: PersistenceQueryContext): Promise<Brand[]> {
  assertApplicationRole(context, "listBrands");
  const rows = await context.db
    .select()
    .from(brandsTable)
    .orderBy(asc(brandsTable.name), asc(brandsTable.id));
  return rows.map(mapBrand);
}

export async function listOrganizations(context: PersistenceQueryContext): Promise<Organization[]> {
  assertApplicationRole(context, "listOrganizations");
  const rows = await context.db
    .select()
    .from(organizationsTable)
    .orderBy(asc(organizationsTable.name), asc(organizationsTable.id));
  return rows.map(mapOrganization);
}

export async function listTerritories(context: PersistenceQueryContext): Promise<Territory[]> {
  assertApplicationRole(context, "listTerritories");
  const rows = await context.db
    .select()
    .from(territoriesTable)
    .orderBy(asc(territoriesTable.name), asc(territoriesTable.id));
  return rows.map(mapTerritory);
}

export async function listLegalEntities(context: PersistenceQueryContext): Promise<LegalEntity[]> {
  assertApplicationRole(context, "listLegalEntities");
  const rows = await context.db
    .select()
    .from(legalEntitiesTable)
    .orderBy(asc(legalEntitiesTable.name), asc(legalEntitiesTable.id));
  return rows.map(mapLegalEntity);
}

export async function listOutlets(context: PersistenceQueryContext): Promise<Outlet[]> {
  assertApplicationRole(context, "listOutlets");
  const rows = await context.db
    .select()
    .from(outletsTable)
    .orderBy(asc(outletsTable.name), asc(outletsTable.id));
  return rows.map(mapOutlet);
}
