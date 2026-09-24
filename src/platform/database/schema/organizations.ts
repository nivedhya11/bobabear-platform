/**
 * Drizzle schema for Organization module tables (IMP-011).
 *
 * Brand, Organization, Territory, Legal Entity, Outlet — soft lifecycle only.
 * Composite unique keys support composite FKs that make cross-brand /
 * cross-organization outlet ancestry impossible at the database level.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
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
    revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`1`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("brands_code_uidx").on(table.code),
    check("brands_status_check", sql`${table.status} in ('active', 'inactive')`),
    check("brands_updated_at_after_created_at_check", sql`${table.updatedAt} >= ${table.createdAt}`),
    check("brands_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("brands_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
    check("brands_revision_positive_check", sql`${table.revision} > 0`),
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
    revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`1`),
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
    check("organizations_revision_positive_check", sql`${table.revision} > 0`),
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
    revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`1`),
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
    check("territories_revision_positive_check", sql`${table.revision} > 0`),
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
    revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`1`),
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
    check("legal_entities_revision_positive_check", sql`${table.revision} > 0`),
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
    revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`1`),
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
    check("outlets_revision_positive_check", sql`${table.revision} > 0`),
  ],
);

/**
 * IMP-036H — customer-facing Pickup configuration authority (1:1 Outlet).
 * No profile or enabled=false → PICKUP_NOT_AVAILABLE.
 */
export const outletPickupProfilesTable = appSchema.table(
  "outlet_pickup_profiles",
  {
    outletId: uuid("outlet_id").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    displayName: text("display_name").notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    locality: text("locality"),
    city: text("city").notNull(),
    stateCode: text("state_code").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    instructions: text("instructions").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "outlet_pickup_profiles_outlet_fk",
      columns: [table.outletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    check(
      "outlet_pickup_profiles_display_name_length_check",
      sql`char_length(${table.displayName}) between 1 and 200`,
    ),
    check(
      "outlet_pickup_profiles_address_line_1_length_check",
      sql`char_length(${table.addressLine1}) between 1 and 200`,
    ),
    check(
      "outlet_pickup_profiles_address_line_2_length_check",
      sql`${table.addressLine2} is null or char_length(${table.addressLine2}) between 1 and 200`,
    ),
    check(
      "outlet_pickup_profiles_locality_length_check",
      sql`${table.locality} is null or char_length(${table.locality}) between 1 and 120`,
    ),
    check(
      "outlet_pickup_profiles_city_length_check",
      sql`char_length(${table.city}) between 1 and 100`,
    ),
    check(
      "outlet_pickup_profiles_state_code_nonempty_check",
      sql`length(trim(${table.stateCode})) > 0`,
    ),
    check(
      "outlet_pickup_profiles_postal_code_check",
      sql`${table.postalCode} ~ '^[1-9][0-9]{5}$'`,
    ),
    check(
      "outlet_pickup_profiles_instructions_nonempty_check",
      sql`length(trim(${table.instructions})) > 0`,
    ),
    check(
      "outlet_pickup_profiles_coordinates_pair_check",
      sql`(${table.latitude} is null) = (${table.longitude} is null)`,
    ),
    check(
      "outlet_pickup_profiles_latitude_range_check",
      sql`${table.latitude} is null or (${table.latitude} >= -90 and ${table.latitude} <= 90)`,
    ),
    check(
      "outlet_pickup_profiles_longitude_range_check",
      sql`${table.longitude} is null or (${table.longitude} >= -180 and ${table.longitude} <= 180)`,
    ),
    check(
      "outlet_pickup_profiles_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "outlet_pickup_profiles_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);
