/**
 * Drizzle schema for Organization module tables (IMP-011).
 *
 * Brand, Organization, Territory, Legal Entity, Outlet — soft lifecycle only.
 * Composite unique keys support composite FKs that make cross-brand /
 * cross-organization outlet ancestry impossible at the database level.
 */
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";

export const brandsTable = appSchema.table(
  "brands",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("brands_code_uidx").on(table.code),
    check("brands_status_check", sql`${table.status} in ('active', 'inactive')`),
    check("brands_updated_at_after_created_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    check("brands_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("brands_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
  ],
);

export const organizationsTable = appSchema.table(
  "organizations",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brandsTable.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("organizations_brand_code_uidx").on(table.brandId, table.code),
    unique("organizations_id_brand_id_key").on(table.id, table.brandId),
    check("organizations_status_check", sql`${table.status} in ('active', 'inactive')`),
    check(
      "organizations_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check("organizations_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("organizations_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
  ],
);

export const territoriesTable = appSchema.table(
  "territories",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brandsTable.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("territories_brand_code_uidx").on(table.brandId, table.code),
    unique("territories_id_brand_id_key").on(table.id, table.brandId),
    check("territories_status_check", sql`${table.status} in ('active', 'inactive')`),
    check(
      "territories_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check("territories_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("territories_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
  ],
);

export const legalEntitiesTable = appSchema.table(
  "legal_entities",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("legal_entities_organization_code_uidx").on(table.organizationId, table.code),
    unique("legal_entities_id_brand_org_key").on(table.id, table.brandId, table.organizationId),
    unique("legal_entities_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "legal_entities_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }),
    check("legal_entities_status_check", sql`${table.status} in ('active', 'inactive')`),
    check(
      "legal_entities_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check("legal_entities_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("legal_entities_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
  ],
);

export const outletsTable = appSchema.table(
  "outlets",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("outlets_brand_code_uidx").on(table.brandId, table.code),
    unique("outlets_id_brand_id_key").on(table.id, table.brandId),
    unique("outlets_id_scope_ancestry_key").on(
      table.id,
      table.brandId,
      table.organizationId,
      table.territoryId,
    ),
    unique("outlets_id_full_ancestry_key").on(
      table.id,
      table.brandId,
      table.organizationId,
      table.territoryId,
      table.legalEntityId,
    ),
    foreignKey({
      name: "outlets_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "outlets_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }),
    foreignKey({
      name: "outlets_territory_brand_fk",
      columns: [table.territoryId, table.brandId],
      foreignColumns: [territoriesTable.id, territoriesTable.brandId],
    }),
    foreignKey({
      name: "outlets_legal_entity_brand_org_fk",
      columns: [table.legalEntityId, table.brandId, table.organizationId],
      foreignColumns: [
        legalEntitiesTable.id,
        legalEntitiesTable.brandId,
        legalEntitiesTable.organizationId,
      ],
    }),
    check("outlets_status_check", sql`${table.status} in ('active', 'inactive')`),
    check("outlets_updated_at_after_created_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    check("outlets_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("outlets_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
  ],
);
