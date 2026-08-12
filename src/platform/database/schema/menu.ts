/**
 * Drizzle schema for Brand-owned menu presentation (IMP-013).
 *
 * Exactly three `app.menu*` tables. Soft lifecycle draft|active|retired.
 * Assortment, availability, and pricing are out of scope.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  foreignKey,
  integer,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { catalogProductsTable } from "./catalog";
import { appSchema } from "./index";
import { brandsTable } from "./organizations";

function lifecycleStatusChecks(
  tableName: string,
  statusCol: AnyPgColumn,
  activatedAt: AnyPgColumn,
  retiredAt: AnyPgColumn,
) {
  return [
    check(
      `${tableName}_lifecycle_status_check`,
      sql`${statusCol} in ('draft', 'active', 'retired')`,
    ),
    check(
      `${tableName}_draft_state_check`,
      sql`${statusCol} <> 'draft' or (${activatedAt} is null and ${retiredAt} is null)`,
    ),
    check(
      `${tableName}_active_state_check`,
      sql`${statusCol} <> 'active' or (${activatedAt} is not null and ${retiredAt} is null)`,
    ),
    check(
      `${tableName}_retired_state_check`,
      sql`${statusCol} <> 'retired' or ${retiredAt} is not null`,
    ),
  ];
}

function codeFormatCheck(tableName: string, codeCol: AnyPgColumn) {
  return check(
    `${tableName}_code_format_check`,
    sql`${codeCol} ~ '^[a-z0-9][a-z0-9_-]*$' and char_length(${codeCol}) between 1 and 64`,
  );
}

export const menusTable = appSchema.table(
  "menus",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("menus_brand_code_uidx").on(table.brandId, table.code),
    unique("menus_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "menus_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    check(
      "menus_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "menus_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("menus", table.code),
    ...lifecycleStatusChecks(
      "menus",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const menuSectionsTable = appSchema.table(
  "menu_sections",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    parentSectionId: uuid("parent_section_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("menu_sections_menu_code_uidx").on(table.menuId, table.code),
    unique("menu_sections_id_brand_id_key").on(table.id, table.brandId),
    unique("menu_sections_id_brand_menu_key").on(table.id, table.brandId, table.menuId),
    foreignKey({
      name: "menu_sections_menu_brand_fk",
      columns: [table.menuId, table.brandId],
      foreignColumns: [menusTable.id, menusTable.brandId],
    }),
    foreignKey({
      name: "menu_sections_parent_brand_menu_fk",
      columns: [table.parentSectionId, table.brandId, table.menuId],
      foreignColumns: [
        table.id,
        table.brandId,
        table.menuId,
      ],
    }),
    check(
      "menu_sections_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "menu_sections_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "menu_sections_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "menu_sections_no_self_parent_check",
      sql`${table.parentSectionId} is null or ${table.parentSectionId} <> ${table.id}`,
    ),
    check(
      "menu_sections_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("menu_sections", table.code),
    ...lifecycleStatusChecks(
      "menu_sections",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const menuEntriesTable = appSchema.table(
  "menu_entries",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    productId: uuid("product_id").notNull(),
    displayName: text("display_name"),
    displayDescription: text("display_description"),
    imagePath: text("image_path"),
    position: integer("position").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("menu_entries_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("menu_entries_section_product_nonretired_uidx")
      .on(table.sectionId, table.productId)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "menu_entries_menu_brand_fk",
      columns: [table.menuId, table.brandId],
      foreignColumns: [menusTable.id, menusTable.brandId],
    }),
    foreignKey({
      name: "menu_entries_section_brand_menu_fk",
      columns: [table.sectionId, table.brandId, table.menuId],
      foreignColumns: [
        menuSectionsTable.id,
        menuSectionsTable.brandId,
        menuSectionsTable.menuId,
      ],
    }),
    foreignKey({
      name: "menu_entries_product_brand_fk",
      columns: [table.productId, table.brandId],
      foreignColumns: [catalogProductsTable.id, catalogProductsTable.brandId],
    }),
    check(
      "menu_entries_display_name_length_check",
      sql`${table.displayName} is null or char_length(${table.displayName}) between 1 and 160`,
    ),
    check(
      "menu_entries_display_description_length_check",
      sql`${table.displayDescription} is null or char_length(${table.displayDescription}) <= 2000`,
    ),
    check(
      "menu_entries_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "menu_entries_image_path_local_check",
      sql`${table.imagePath} is null or (
        char_length(${table.imagePath}) between 1 and 512
        and ${table.imagePath} like '/%'
        and ${table.imagePath} not like '%..%'
        and ${table.imagePath} not like 'http://%'
        and ${table.imagePath} not like 'https://%'
        and ${table.imagePath} not like 'data:%'
      )`,
    ),
    check(
      "menu_entries_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    ...lifecycleStatusChecks(
      "menu_entries",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);
