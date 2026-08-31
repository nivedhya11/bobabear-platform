/** Organization hierarchy list helpers for administration (IMP-035). */
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

export async function listBrands(context: PersistenceQueryContext): Promise<Brand[]> {
  assertApplicationRole(context, "listBrands");
  const rows = await context.db.select().from(brandsTable).orderBy(asc(brandsTable.name));
  return rows.map((row) => ({ ...row, status: row.status as Brand["status"], createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
}

export async function listOrganizations(context: PersistenceQueryContext): Promise<Organization[]> {
  assertApplicationRole(context, "listOrganizations");
  const rows = await context.db.select().from(organizationsTable).orderBy(asc(organizationsTable.name));
  return rows.map((row) => ({ ...row, status: row.status as Organization["status"], createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
}

export async function listTerritories(context: PersistenceQueryContext): Promise<Territory[]> {
  assertApplicationRole(context, "listTerritories");
  const rows = await context.db.select().from(territoriesTable).orderBy(asc(territoriesTable.name));
  return rows.map((row) => ({ ...row, status: row.status as Territory["status"], createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
}

export async function listLegalEntities(context: PersistenceQueryContext): Promise<LegalEntity[]> {
  assertApplicationRole(context, "listLegalEntities");
  const rows = await context.db.select().from(legalEntitiesTable).orderBy(asc(legalEntitiesTable.name));
  return rows.map((row) => ({ ...row, status: row.status as LegalEntity["status"], createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
}

export async function listOutlets(context: PersistenceQueryContext): Promise<Outlet[]> {
  assertApplicationRole(context, "listOutlets");
  const rows = await context.db.select().from(outletsTable).orderBy(asc(outletsTable.name));
  return rows.map((row) => ({ ...row, status: row.status as Outlet["status"], createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }));
}
