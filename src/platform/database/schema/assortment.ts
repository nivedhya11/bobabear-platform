/**
 * Drizzle schema for Assortment and Operational Availability (IMP-014).
 *
 * Exactly six `app.*` tables. Soft rule lifecycle active|retired.
 * Pricing, serviceability, inventory, and provider sync are out of scope.
 */
import { sql } from "drizzle-orm";
import {
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

import {
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantsTable,
} from "./catalog";
import { appSchema } from "./index";
import {
  brandsTable,
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "./organizations";
import { workforceAuthUsers } from "./workforce-auth";

export const assortmentRulesTable = appSchema.table(
  "assortment_rules",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    scopeType: text("scope_type").notNull(),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    targetType: text("target_type").notNull(),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    modifierOptionId: uuid("modifier_option_id"),
    decision: text("decision").notNull(),
    status: text("status").notNull().default("active"),
    reasonCode: text("reason_code"),
    createdByWorkforceUserId: text("created_by_workforce_user_id"),
    retiredByWorkforceUserId: text("retired_by_workforce_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "assortment_rules_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "assortment_rules_territory_brand_fk",
      columns: [table.territoryId, table.brandId],
      foreignColumns: [territoriesTable.id, territoriesTable.brandId],
    }),
    foreignKey({
      name: "assortment_rules_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }),
    foreignKey({
      name: "assortment_rules_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    foreignKey({
      name: "assortment_rules_product_brand_fk",
      columns: [table.productId, table.brandId],
      foreignColumns: [catalogProductsTable.id, catalogProductsTable.brandId],
    }),
    foreignKey({
      name: "assortment_rules_variant_brand_fk",
      columns: [table.variantId, table.brandId],
      foreignColumns: [catalogVariantsTable.id, catalogVariantsTable.brandId],
    }),
    foreignKey({
      name: "assortment_rules_modifier_option_brand_fk",
      columns: [table.modifierOptionId, table.brandId],
      foreignColumns: [catalogModifierOptionsTable.id, catalogModifierOptionsTable.brandId],
    }),
    foreignKey({
      name: "assortment_rules_created_by_workforce_user_fk",
      columns: [table.createdByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    foreignKey({
      name: "assortment_rules_retired_by_workforce_user_fk",
      columns: [table.retiredByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "assortment_rules_scope_type_check",
      sql`${table.scopeType} in ('brand', 'territory', 'organization', 'outlet')`,
    ),
    check(
      "assortment_rules_target_type_check",
      sql`${table.targetType} in ('product', 'variant', 'modifier_option')`,
    ),
    check(
      "assortment_rules_decision_check",
      sql`${table.decision} in ('include', 'exclude')`,
    ),
    check(
      "assortment_rules_status_check",
      sql`${table.status} in ('active', 'retired')`,
    ),
    check(
      "assortment_rules_active_state_check",
      sql`${table.status} <> 'active' or ${table.retiredAt} is null`,
    ),
    check(
      "assortment_rules_retired_state_check",
      sql`${table.status} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "assortment_rules_include_shape_check",
      sql`${table.decision} <> 'include' or (${table.scopeType} = 'brand' and ${table.targetType} = 'variant')`,
    ),
    check(
      "assortment_rules_scope_brand_shape_check",
      sql`${table.scopeType} <> 'brand' or (
        ${table.territoryId} is null
        and ${table.organizationId} is null
        and ${table.outletId} is null
      )`,
    ),
    check(
      "assortment_rules_scope_territory_shape_check",
      sql`${table.scopeType} <> 'territory' or (
        ${table.territoryId} is not null
        and ${table.organizationId} is null
        and ${table.outletId} is null
      )`,
    ),
    check(
      "assortment_rules_scope_organization_shape_check",
      sql`${table.scopeType} <> 'organization' or (
        ${table.organizationId} is not null
        and ${table.territoryId} is null
        and ${table.outletId} is null
      )`,
    ),
    check(
      "assortment_rules_scope_outlet_shape_check",
      sql`${table.scopeType} <> 'outlet' or (
        ${table.outletId} is not null
        and ${table.territoryId} is not null
        and ${table.organizationId} is not null
      )`,
    ),
    check(
      "assortment_rules_target_product_shape_check",
      sql`${table.targetType} <> 'product' or (
        ${table.productId} is not null
        and ${table.variantId} is null
        and ${table.modifierOptionId} is null
      )`,
    ),
    check(
      "assortment_rules_target_variant_shape_check",
      sql`${table.targetType} <> 'variant' or (
        ${table.variantId} is not null
        and ${table.productId} is null
        and ${table.modifierOptionId} is null
      )`,
    ),
    check(
      "assortment_rules_target_modifier_option_shape_check",
      sql`${table.targetType} <> 'modifier_option' or (
        ${table.modifierOptionId} is not null
        and ${table.productId} is null
        and ${table.variantId} is null
      )`,
    ),
    check(
      "assortment_rules_reason_code_length_check",
      sql`${table.reasonCode} is null or char_length(${table.reasonCode}) between 1 and 64`,
    ),
    // Active uniqueness for brand-scope rules (territory/org/outlet null).
    uniqueIndex("assortment_rules_active_brand_product_uidx")
      .on(table.brandId, table.scopeType, table.targetType, table.productId, table.decision)
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'brand' and ${table.targetType} = 'product'`,
      ),
    uniqueIndex("assortment_rules_active_brand_variant_uidx")
      .on(table.brandId, table.scopeType, table.targetType, table.variantId, table.decision)
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'brand' and ${table.targetType} = 'variant'`,
      ),
    uniqueIndex("assortment_rules_active_brand_modifier_option_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.targetType,
        table.modifierOptionId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'brand' and ${table.targetType} = 'modifier_option'`,
      ),
    uniqueIndex("assortment_rules_active_territory_product_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.territoryId,
        table.targetType,
        table.productId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'territory' and ${table.targetType} = 'product'`,
      ),
    uniqueIndex("assortment_rules_active_territory_variant_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.territoryId,
        table.targetType,
        table.variantId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'territory' and ${table.targetType} = 'variant'`,
      ),
    uniqueIndex("assortment_rules_active_territory_modifier_option_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.territoryId,
        table.targetType,
        table.modifierOptionId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'territory' and ${table.targetType} = 'modifier_option'`,
      ),
    uniqueIndex("assortment_rules_active_organization_product_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.organizationId,
        table.targetType,
        table.productId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'organization' and ${table.targetType} = 'product'`,
      ),
    uniqueIndex("assortment_rules_active_organization_variant_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.organizationId,
        table.targetType,
        table.variantId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'organization' and ${table.targetType} = 'variant'`,
      ),
    uniqueIndex("assortment_rules_active_organization_modifier_option_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.organizationId,
        table.targetType,
        table.modifierOptionId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'organization' and ${table.targetType} = 'modifier_option'`,
      ),
    uniqueIndex("assortment_rules_active_outlet_product_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.outletId,
        table.targetType,
        table.productId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'outlet' and ${table.targetType} = 'product'`,
      ),
    uniqueIndex("assortment_rules_active_outlet_variant_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.outletId,
        table.targetType,
        table.variantId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'outlet' and ${table.targetType} = 'variant'`,
      ),
    uniqueIndex("assortment_rules_active_outlet_modifier_option_uidx")
      .on(
        table.brandId,
        table.scopeType,
        table.outletId,
        table.targetType,
        table.modifierOptionId,
        table.decision,
      )
      .where(
        sql`${table.status} = 'active' and ${table.scopeType} = 'outlet' and ${table.targetType} = 'modifier_option'`,
      ),
    index("assortment_rules_brand_status_idx").on(table.brandId, table.status),
    index("assortment_rules_outlet_status_idx").on(table.outletId, table.status),
  ],
);

export const outletVariantAvailabilityTable = appSchema.table(
  "outlet_variant_availability",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    state: text("state").notNull(),
    unavailableUntil: timestamp("unavailable_until", { withTimezone: true }),
    reasonCode: text("reason_code"),
    note: text("note"),
    updatedByWorkforceUserId: text("updated_by_workforce_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("outlet_variant_availability_outlet_variant_key").on(
      table.outletId,
      table.variantId,
    ),
    foreignKey({
      name: "outlet_variant_availability_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    foreignKey({
      name: "outlet_variant_availability_variant_brand_fk",
      columns: [table.variantId, table.brandId],
      foreignColumns: [catalogVariantsTable.id, catalogVariantsTable.brandId],
    }),
    foreignKey({
      name: "outlet_variant_availability_updated_by_workforce_user_fk",
      columns: [table.updatedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "outlet_variant_availability_state_check",
      sql`${table.state} in ('available', 'temporarily_unavailable', 'sold_out')`,
    ),
    check(
      "outlet_variant_availability_available_expiry_check",
      sql`${table.state} <> 'available' or ${table.unavailableUntil} is null`,
    ),
    check(
      "outlet_variant_availability_sold_out_expiry_check",
      sql`${table.state} <> 'sold_out' or ${table.unavailableUntil} is null`,
    ),
    check(
      "outlet_variant_availability_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "outlet_variant_availability_reason_code_length_check",
      sql`${table.reasonCode} is null or char_length(${table.reasonCode}) between 1 and 64`,
    ),
    check(
      "outlet_variant_availability_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
    index("outlet_variant_availability_outlet_state_idx").on(table.outletId, table.state),
  ],
);

export const outletModifierOptionAvailabilityTable = appSchema.table(
  "outlet_modifier_option_availability",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    modifierOptionId: uuid("modifier_option_id").notNull(),
    state: text("state").notNull(),
    unavailableUntil: timestamp("unavailable_until", { withTimezone: true }),
    reasonCode: text("reason_code"),
    note: text("note"),
    updatedByWorkforceUserId: text("updated_by_workforce_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("outlet_modifier_option_availability_outlet_option_key").on(
      table.outletId,
      table.modifierOptionId,
    ),
    foreignKey({
      name: "outlet_modifier_option_availability_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    foreignKey({
      name: "outlet_modifier_option_availability_option_brand_fk",
      columns: [table.modifierOptionId, table.brandId],
      foreignColumns: [catalogModifierOptionsTable.id, catalogModifierOptionsTable.brandId],
    }),
    foreignKey({
      name: "outlet_modifier_option_availability_updated_by_workforce_user_fk",
      columns: [table.updatedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "outlet_modifier_option_availability_state_check",
      sql`${table.state} in ('available', 'temporarily_unavailable', 'sold_out')`,
    ),
    check(
      "outlet_modifier_option_availability_available_expiry_check",
      sql`${table.state} <> 'available' or ${table.unavailableUntil} is null`,
    ),
    check(
      "outlet_modifier_option_availability_sold_out_expiry_check",
      sql`${table.state} <> 'sold_out' or ${table.unavailableUntil} is null`,
    ),
    check(
      "outlet_modifier_option_availability_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "outlet_modifier_option_availability_reason_code_length_check",
      sql`${table.reasonCode} is null or char_length(${table.reasonCode}) between 1 and 64`,
    ),
    check(
      "outlet_modifier_option_availability_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
    index("outlet_modifier_option_availability_outlet_state_idx").on(
      table.outletId,
      table.state,
    ),
  ],
);

export const outletOperatingProfilesTable = appSchema.table(
  "outlet_operating_profiles",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    timezone: text("timezone").notNull(),
    controlState: text("control_state").notNull(),
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
    reasonCode: text("reason_code"),
    note: text("note"),
    updatedByWorkforceUserId: text("updated_by_workforce_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("outlet_operating_profiles_outlet_key").on(table.outletId),
    foreignKey({
      name: "outlet_operating_profiles_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    foreignKey({
      name: "outlet_operating_profiles_updated_by_workforce_user_fk",
      columns: [table.updatedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "outlet_operating_profiles_control_state_check",
      sql`${table.controlState} in ('accepting', 'paused', 'suspended')`,
    ),
    check(
      "outlet_operating_profiles_accepting_pause_check",
      sql`${table.controlState} <> 'accepting' or ${table.pausedUntil} is null`,
    ),
    check(
      "outlet_operating_profiles_suspended_pause_check",
      sql`${table.controlState} <> 'suspended' or ${table.pausedUntil} is null`,
    ),
    check(
      "outlet_operating_profiles_timezone_nonempty_check",
      sql`length(trim(${table.timezone})) > 0`,
    ),
    check(
      "outlet_operating_profiles_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "outlet_operating_profiles_reason_code_length_check",
      sql`${table.reasonCode} is null or char_length(${table.reasonCode}) between 1 and 64`,
    ),
    check(
      "outlet_operating_profiles_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
  ],
);

export const outletOperatingIntervalsTable = appSchema.table(
  "outlet_operating_intervals",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "outlet_operating_intervals_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }),
    check(
      "outlet_operating_intervals_day_of_week_check",
      sql`${table.dayOfWeek} between 0 and 6`,
    ),
    check(
      "outlet_operating_intervals_start_minute_check",
      sql`${table.startMinute} >= 0 and ${table.startMinute} < 1440`,
    ),
    check(
      "outlet_operating_intervals_end_minute_check",
      sql`${table.endMinute} > 0 and ${table.endMinute} <= 1440`,
    ),
    check(
      "outlet_operating_intervals_start_before_end_check",
      sql`${table.startMinute} < ${table.endMinute}`,
    ),
    check(
      "outlet_operating_intervals_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("outlet_operating_intervals_outlet_day_idx").on(table.outletId, table.dayOfWeek),
  ],
);

export const assortmentAvailabilityAuditEventsTable = appSchema.table(
  "assortment_availability_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorWorkforceUserId: text("actor_workforce_user_id"),
    action: text("action").notNull(),
    brandId: uuid("brand_id").notNull(),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: "assortment_availability_audit_events_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "assortment_availability_audit_events_actor_workforce_user_fk",
      columns: [table.actorWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "assortment_availability_audit_events_action_nonempty_check",
      sql`length(trim(${table.action})) > 0`,
    ),
    check(
      "assortment_availability_audit_events_target_type_nonempty_check",
      sql`length(trim(${table.targetType})) > 0`,
    ),
    index("assortment_availability_audit_events_brand_occurred_idx").on(
      table.brandId,
      table.occurredAt,
    ),
    index("assortment_availability_audit_events_outlet_occurred_idx").on(
      table.outletId,
      table.occurredAt,
    ),
  ],
);
