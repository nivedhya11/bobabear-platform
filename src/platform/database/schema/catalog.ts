/**
 * Drizzle schema for the Brand-owned canonical food catalog (IMP-012).
 *
 * Exactly eleven `app.catalog_*` tables. Catalog lifecycle is draft|active|retired.
 * Assortment, availability, menu presentation, and pricing are out of scope.
 *
 * Variants denormalize immutable `product_kind` from the parent product so
 * composite FKs can enforce Bundle-parent / Standard-component rules at the
 * database boundary.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
  integer,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { brandsTable } from "./organizations";
import { appSchema } from "./index";

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

export const catalogProductsTable = appSchema.table(
  "catalog_products",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    productKind: text("product_kind").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_products_brand_code_uidx").on(table.brandId, table.code),
    unique("catalog_products_id_brand_id_key").on(table.id, table.brandId),
    unique("catalog_products_id_brand_kind_key").on(
      table.id,
      table.brandId,
      table.productKind,
    ),
    foreignKey({
      name: "catalog_products_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    check(
      "catalog_products_product_kind_check",
      sql`${table.productKind} in ('standard', 'bundle')`,
    ),
    check(
      "catalog_products_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "catalog_products_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "catalog_products_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_products", table.code),
    ...lifecycleStatusChecks(
      "catalog_products",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogVariantsTable = appSchema.table(
  "catalog_variants",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    productId: uuid("product_id").notNull(),
    /** Immutable copy of parent product kind — enables bundle FK integrity. */
    productKind: text("product_kind").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    isSelectorVisible: boolean("is_selector_visible").notNull().default(true),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_variants_product_code_uidx").on(table.productId, table.code),
    unique("catalog_variants_id_brand_id_key").on(table.id, table.brandId),
    unique("catalog_variants_id_brand_kind_key").on(
      table.id,
      table.brandId,
      table.productKind,
    ),
    uniqueIndex("catalog_variants_product_default_nonretired_uidx")
      .on(table.productId)
      .where(sql`${table.isDefault} = true and ${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "catalog_variants_product_brand_fk",
      columns: [table.productId, table.brandId],
      foreignColumns: [catalogProductsTable.id, catalogProductsTable.brandId],
    }),
    foreignKey({
      name: "catalog_variants_product_brand_kind_fk",
      columns: [table.productId, table.brandId, table.productKind],
      foreignColumns: [
        catalogProductsTable.id,
        catalogProductsTable.brandId,
        catalogProductsTable.productKind,
      ],
    }),
    check(
      "catalog_variants_product_kind_check",
      sql`${table.productKind} in ('standard', 'bundle')`,
    ),
    check(
      "catalog_variants_name_length_check",
      sql`char_length(${table.name}) between 1 and 120`,
    ),
    check(
      "catalog_variants_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 1000`,
    ),
    check(
      "catalog_variants_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_variants", table.code),
    ...lifecycleStatusChecks(
      "catalog_variants",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogModifierGroupsTable = appSchema.table(
  "catalog_modifier_groups",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_modifier_groups_brand_code_uidx").on(table.brandId, table.code),
    unique("catalog_modifier_groups_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "catalog_modifier_groups_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    check(
      "catalog_modifier_groups_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "catalog_modifier_groups_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "catalog_modifier_groups_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_modifier_groups", table.code),
    ...lifecycleStatusChecks(
      "catalog_modifier_groups",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogModifierOptionsTable = appSchema.table(
  "catalog_modifier_options",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_modifier_options_brand_code_uidx").on(table.brandId, table.code),
    unique("catalog_modifier_options_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "catalog_modifier_options_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    check(
      "catalog_modifier_options_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "catalog_modifier_options_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check(
      "catalog_modifier_options_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_modifier_options", table.code),
    ...lifecycleStatusChecks(
      "catalog_modifier_options",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogModifierGroupOptionsTable = appSchema.table(
  "catalog_modifier_group_options",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    modifierGroupId: uuid("modifier_group_id").notNull(),
    modifierOptionId: uuid("modifier_option_id").notNull(),
    minQuantity: integer("min_quantity").notNull().default(0),
    maxQuantity: integer("max_quantity").notNull(),
    defaultQuantity: integer("default_quantity").notNull().default(0),
    position: integer("position").notNull().default(0),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("catalog_modifier_group_options_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("catalog_modifier_group_options_nonretired_uidx")
      .on(table.modifierGroupId, table.modifierOptionId)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "catalog_modifier_group_options_group_brand_fk",
      columns: [table.modifierGroupId, table.brandId],
      foreignColumns: [catalogModifierGroupsTable.id, catalogModifierGroupsTable.brandId],
    }),
    foreignKey({
      name: "catalog_modifier_group_options_option_brand_fk",
      columns: [table.modifierOptionId, table.brandId],
      foreignColumns: [catalogModifierOptionsTable.id, catalogModifierOptionsTable.brandId],
    }),
    check(
      "catalog_modifier_group_options_min_quantity_check",
      sql`${table.minQuantity} >= 0`,
    ),
    check(
      "catalog_modifier_group_options_max_quantity_check",
      sql`${table.maxQuantity} >= 1 and ${table.maxQuantity} <= 99`,
    ),
    check(
      "catalog_modifier_group_options_quantity_range_check",
      sql`${table.minQuantity} <= ${table.maxQuantity}`,
    ),
    check(
      "catalog_modifier_group_options_default_quantity_check",
      sql`${table.defaultQuantity} >= ${table.minQuantity} and ${table.defaultQuantity} <= ${table.maxQuantity}`,
    ),
    check(
      "catalog_modifier_group_options_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "catalog_modifier_group_options_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    ...lifecycleStatusChecks(
      "catalog_modifier_group_options",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogVariantModifierGroupsTable = appSchema.table(
  "catalog_variant_modifier_groups",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    modifierGroupId: uuid("modifier_group_id").notNull(),
    minTotalQuantity: integer("min_total_quantity").notNull().default(0),
    maxTotalQuantity: integer("max_total_quantity").notNull(),
    position: integer("position").notNull().default(0),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("catalog_variant_modifier_groups_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("catalog_variant_modifier_groups_nonretired_uidx")
      .on(table.variantId, table.modifierGroupId)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "catalog_variant_modifier_groups_variant_brand_fk",
      columns: [table.variantId, table.brandId],
      foreignColumns: [catalogVariantsTable.id, catalogVariantsTable.brandId],
    }),
    foreignKey({
      name: "catalog_variant_modifier_groups_group_brand_fk",
      columns: [table.modifierGroupId, table.brandId],
      foreignColumns: [catalogModifierGroupsTable.id, catalogModifierGroupsTable.brandId],
    }),
    check(
      "catalog_variant_modifier_groups_min_total_check",
      sql`${table.minTotalQuantity} >= 0`,
    ),
    check(
      "catalog_variant_modifier_groups_max_total_check",
      sql`${table.maxTotalQuantity} >= 1 and ${table.maxTotalQuantity} <= 99`,
    ),
    check(
      "catalog_variant_modifier_groups_total_range_check",
      sql`${table.minTotalQuantity} <= ${table.maxTotalQuantity}`,
    ),
    check(
      "catalog_variant_modifier_groups_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "catalog_variant_modifier_groups_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    ...lifecycleStatusChecks(
      "catalog_variant_modifier_groups",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogBundleGroupsTable = appSchema.table(
  "catalog_bundle_groups",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    bundleVariantId: uuid("bundle_variant_id").notNull(),
    /** Always 'bundle' — composite FK forces parent variant product_kind. */
    parentProductKind: text("parent_product_kind").notNull().default("bundle"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    minSelections: integer("min_selections").notNull().default(0),
    maxSelections: integer("max_selections").notNull(),
    position: integer("position").notNull().default(0),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_bundle_groups_variant_code_uidx").on(
      table.bundleVariantId,
      table.code,
    ),
    unique("catalog_bundle_groups_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "catalog_bundle_groups_variant_brand_kind_fk",
      columns: [table.bundleVariantId, table.brandId, table.parentProductKind],
      foreignColumns: [
        catalogVariantsTable.id,
        catalogVariantsTable.brandId,
        catalogVariantsTable.productKind,
      ],
    }),
    check(
      "catalog_bundle_groups_parent_kind_check",
      sql`${table.parentProductKind} = 'bundle'`,
    ),
    check(
      "catalog_bundle_groups_min_selections_check",
      sql`${table.minSelections} >= 0`,
    ),
    check(
      "catalog_bundle_groups_max_selections_check",
      sql`${table.maxSelections} >= 1 and ${table.maxSelections} <= 99`,
    ),
    check(
      "catalog_bundle_groups_selections_range_check",
      sql`${table.minSelections} <= ${table.maxSelections}`,
    ),
    check(
      "catalog_bundle_groups_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "catalog_bundle_groups_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "catalog_bundle_groups_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_bundle_groups", table.code),
    ...lifecycleStatusChecks(
      "catalog_bundle_groups",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogBundleGroupOptionsTable = appSchema.table(
  "catalog_bundle_group_options",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    bundleGroupId: uuid("bundle_group_id").notNull(),
    componentVariantId: uuid("component_variant_id").notNull(),
    /** Always 'standard' — composite FK forces Standard-only components. */
    componentProductKind: text("component_product_kind").notNull().default("standard"),
    quantity: integer("quantity").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("catalog_bundle_group_options_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("catalog_bundle_group_options_nonretired_uidx")
      .on(table.bundleGroupId, table.componentVariantId)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "catalog_bundle_group_options_group_brand_fk",
      columns: [table.bundleGroupId, table.brandId],
      foreignColumns: [catalogBundleGroupsTable.id, catalogBundleGroupsTable.brandId],
    }),
    foreignKey({
      name: "catalog_bundle_group_options_component_brand_kind_fk",
      columns: [table.componentVariantId, table.brandId, table.componentProductKind],
      foreignColumns: [
        catalogVariantsTable.id,
        catalogVariantsTable.brandId,
        catalogVariantsTable.productKind,
      ],
    }),
    check(
      "catalog_bundle_group_options_component_kind_check",
      sql`${table.componentProductKind} = 'standard'`,
    ),
    check(
      "catalog_bundle_group_options_quantity_check",
      sql`${table.quantity} >= 1 and ${table.quantity} <= 99`,
    ),
    check(
      "catalog_bundle_group_options_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "catalog_bundle_group_options_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    ...lifecycleStatusChecks(
      "catalog_bundle_group_options",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogDietaryTagsTable = appSchema.table(
  "catalog_dietary_tags",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_dietary_tags_brand_code_uidx").on(table.brandId, table.code),
    unique("catalog_dietary_tags_id_brand_id_key").on(table.id, table.brandId),
    foreignKey({
      name: "catalog_dietary_tags_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    check(
      "catalog_dietary_tags_kind_check",
      sql`${table.kind} in ('dietary', 'allergen')`,
    ),
    check(
      "catalog_dietary_tags_name_length_check",
      sql`char_length(${table.name}) between 1 and 160`,
    ),
    check(
      "catalog_dietary_tags_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    codeFormatCheck("catalog_dietary_tags", table.code),
    ...lifecycleStatusChecks(
      "catalog_dietary_tags",
      table.lifecycleStatus,
      table.activatedAt,
      table.retiredAt,
    ),
  ],
);

export const catalogVariantDietaryTagsTable = appSchema.table(
  "catalog_variant_dietary_tags",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    targetId: uuid("target_id").notNull(),
    dietaryTagId: uuid("dietary_tag_id").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_variant_dietary_tags_active_uidx")
      .on(table.targetId, table.dietaryTagId)
      .where(sql`${table.retiredAt} is null`),
    foreignKey({
      name: "catalog_variant_dietary_tags_variant_brand_fk",
      columns: [table.targetId, table.brandId],
      foreignColumns: [catalogVariantsTable.id, catalogVariantsTable.brandId],
    }),
    foreignKey({
      name: "catalog_variant_dietary_tags_tag_brand_fk",
      columns: [table.dietaryTagId, table.brandId],
      foreignColumns: [catalogDietaryTagsTable.id, catalogDietaryTagsTable.brandId],
    }),
  ],
);

export const catalogModifierOptionDietaryTagsTable = appSchema.table(
  "catalog_modifier_option_dietary_tags",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    targetId: uuid("target_id").notNull(),
    dietaryTagId: uuid("dietary_tag_id").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("catalog_modifier_option_dietary_tags_active_uidx")
      .on(table.targetId, table.dietaryTagId)
      .where(sql`${table.retiredAt} is null`),
    foreignKey({
      name: "catalog_modifier_option_dietary_tags_option_brand_fk",
      columns: [table.targetId, table.brandId],
      foreignColumns: [catalogModifierOptionsTable.id, catalogModifierOptionsTable.brandId],
    }),
    foreignKey({
      name: "catalog_modifier_option_dietary_tags_tag_brand_fk",
      columns: [table.dietaryTagId, table.brandId],
      foreignColumns: [catalogDietaryTagsTable.id, catalogDietaryTagsTable.brandId],
    }),
  ],
);
