/**
 * Drizzle schema for Brand-owned menu presentation (IMP-013 / IMP-036F F3A).
 *
 * Stable Menu identity remains `menus` with aggregate lifecycle draft|active|retired.
 * IMP-036F F3A adds VERSIONED_MENU_GRAPH / MENU_REVISION:
 *   - menus.revision (authoritative expectedMenuRevision CAS target)
 *   - menus.effective_menu_version_id / draft_menu_version_id
 *   - menu_versions + section/entry version child tables
 *   - menu_mutation_audit_events
 *
 * Legacy `menu_sections` / `menu_entries` are retained for forensics/rollback.
 * Customer truth resolves ACTIVE Menu → effective MenuVersion graph only.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { catalogProductsTable } from "./catalog";
import { appSchema } from "./index";
import { brandsTable } from "./organizations";
import { workforceAuthUsers } from "./workforce-auth";

function menuRevisionColumn(name: string) {
  return bigint(name, { mode: "bigint" });
}

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
    revision: menuRevisionColumn("revision").notNull().default(sql`1`),
    effectiveMenuVersionId: uuid("effective_menu_version_id"),
    draftMenuVersionId: uuid("draft_menu_version_id"),
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
    check("menus_revision_positive_check", sql`${table.revision} > 0`),
    codeFormatCheck("menus", table.code),
    ...lifecycleStatusChecks(
      "menus",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const menuVersionsTable = appSchema.table(
  "menu_versions",
  {
    id: uuid("id").primaryKey(),
    menuId: uuid("menu_id").notNull(),
    brandId: uuid("brand_id").notNull(),
    revision: menuRevisionColumn("revision").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    createdBy: text("created_by"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    unique("menu_versions_menu_revision_key").on(table.menuId, table.revision),
    unique("menu_versions_id_menu_id_key").on(table.id, table.menuId),
    unique("menu_versions_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "menu_versions_menu_brand_fk",
      columns: [table.menuId, table.brandId],
      foreignColumns: [menusTable.id, menusTable.brandId],
    }),
    foreignKey({
      name: "menu_versions_created_by_fk",
      columns: [table.createdBy],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "menu_versions_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('DRAFT', 'EFFECTIVE', 'SUPERSEDED')`,
    ),
    check("menu_versions_revision_positive_check", sql`${table.revision} > 0`),
    check(
      "menu_versions_draft_state_check",
      sql`${table.lifecycleStatus} <> 'DRAFT' or (${table.effectiveAt} is null and ${table.supersededAt} is null)`,
    ),
    check(
      "menu_versions_effective_state_check",
      sql`${table.lifecycleStatus} <> 'EFFECTIVE' or (${table.effectiveAt} is not null and ${table.supersededAt} is null)`,
    ),
    check(
      "menu_versions_superseded_state_check",
      sql`${table.lifecycleStatus} <> 'SUPERSEDED' or ${table.supersededAt} is not null`,
    ),
    index("menu_versions_menu_lifecycle_idx").on(table.menuId, table.lifecycleStatus),
  ],
);

export const menuSectionVersionsTable = appSchema.table(
  "menu_section_versions",
  {
    id: uuid("id").primaryKey(),
    menuVersionId: uuid("menu_version_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    brandId: uuid("brand_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    parentSectionId: uuid("parent_section_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
  },
  (table) => [
    unique("menu_section_versions_version_section_key").on(
      table.menuVersionId,
      table.sectionId,
    ),
    uniqueIndex("menu_section_versions_version_code_uidx").on(
      table.menuVersionId,
      table.code,
    ),
    foreignKey({
      name: "menu_section_versions_version_menu_fk",
      columns: [table.menuVersionId, table.menuId],
      foreignColumns: [menuVersionsTable.id, menuVersionsTable.menuId],
    }),
    foreignKey({
      name: "menu_section_versions_menu_brand_fk",
      columns: [table.menuId, table.brandId],
      foreignColumns: [menusTable.id, menusTable.brandId],
    }),
    check(
      "menu_section_versions_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "menu_section_versions_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "menu_section_versions_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "menu_section_versions_no_self_parent_check",
      sql`${table.parentSectionId} is null or ${table.parentSectionId} <> ${table.sectionId}`,
    ),
    check(
      "menu_section_versions_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    codeFormatCheck("menu_section_versions", table.code),
    index("menu_section_versions_menu_version_idx").on(table.menuVersionId),
  ],
);

export const menuEntryVersionsTable = appSchema.table(
  "menu_entry_versions",
  {
    id: uuid("id").primaryKey(),
    menuVersionId: uuid("menu_version_id").notNull(),
    entryId: uuid("entry_id").notNull(),
    brandId: uuid("brand_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    productId: uuid("product_id").notNull(),
    displayName: text("display_name"),
    displayDescription: text("display_description"),
    imagePath: text("image_path"),
    position: integer("position").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
  },
  (table) => [
    unique("menu_entry_versions_version_entry_key").on(table.menuVersionId, table.entryId),
    uniqueIndex("menu_entry_versions_version_section_product_nonretired_uidx")
      .on(table.menuVersionId, table.sectionId, table.productId)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "menu_entry_versions_version_menu_fk",
      columns: [table.menuVersionId, table.menuId],
      foreignColumns: [menuVersionsTable.id, menuVersionsTable.menuId],
    }),
    foreignKey({
      name: "menu_entry_versions_menu_brand_fk",
      columns: [table.menuId, table.brandId],
      foreignColumns: [menusTable.id, menusTable.brandId],
    }),
    foreignKey({
      name: "menu_entry_versions_product_brand_fk",
      columns: [table.productId, table.brandId],
      foreignColumns: [catalogProductsTable.id, catalogProductsTable.brandId],
    }),
    check(
      "menu_entry_versions_display_name_length_check",
      sql`${table.displayName} is null or char_length(${table.displayName}) between 1 and 160`,
    ),
    check(
      "menu_entry_versions_display_description_length_check",
      sql`${table.displayDescription} is null or char_length(${table.displayDescription}) <= 2000`,
    ),
    check(
      "menu_entry_versions_position_nonnegative_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "menu_entry_versions_image_path_local_check",
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
      "menu_entry_versions_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    index("menu_entry_versions_menu_version_idx").on(table.menuVersionId),
  ],
);

export const menuMutationAuditEventsTable = appSchema.table(
  "menu_mutation_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorWorkforceUserId: text("actor_workforce_user_id"),
    action: text("action").notNull(),
    brandId: uuid("brand_id").notNull(),
    menuId: uuid("menu_id"),
    menuVersionId: uuid("menu_version_id"),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    previousMenuRevision: menuRevisionColumn("previous_menu_revision"),
    newMenuRevision: menuRevisionColumn("new_menu_revision"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    foreignKey({
      name: "menu_mutation_audit_events_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "menu_mutation_audit_events_actor_workforce_user_fk",
      columns: [table.actorWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "menu_mutation_audit_events_action_nonempty_check",
      sql`length(trim(${table.action})) > 0`,
    ),
    check(
      "menu_mutation_audit_events_target_type_nonempty_check",
      sql`length(trim(${table.targetType})) > 0`,
    ),
    check(
      "menu_mutation_audit_events_previous_menu_revision_positive_check",
      sql`${table.previousMenuRevision} is null or ${table.previousMenuRevision} > 0`,
    ),
    check(
      "menu_mutation_audit_events_new_menu_revision_positive_check",
      sql`${table.newMenuRevision} is null or ${table.newMenuRevision} > 0`,
    ),
    index("menu_mutation_audit_events_brand_occurred_idx").on(
      table.brandId,
      table.occurredAt,
    ),
    index("menu_mutation_audit_events_menu_occurred_idx").on(table.menuId, table.occurredAt),
    index("menu_mutation_audit_events_target_idx").on(table.targetType, table.targetId),
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
      foreignColumns: [table.id, table.brandId, table.menuId],
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
