/**
 * Drizzle schema for Pricing, Charges and Tax (IMP-015).
 *
 * Exactly twelve `app.*` tables. Money is always INR integer paise stored as
 * PostgreSQL `bigint` — never `numeric`, never a decimal-rupee column.
 * Promotions, cart/checkout/order/invoice, serviceability, and aggregator
 * pricing are out of scope.
 *
 * Brand-aware composite foreign keys make cross-brand / cross-organization
 * ancestry mismatch impossible at the database boundary, mirroring IMP-014.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
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
  catalogBundleGroupOptionsTable,
  catalogModifierGroupOptionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "./catalog";
import { appSchema } from "./index";
import {
  brandsTable,
  legalEntitiesTable,
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "./organizations";
import { workforceAuthUsers } from "./workforce-auth";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

function scopeShapeChecks(
  tableName: string,
  scopeType: AnyPgColumn,
  territoryId: AnyPgColumn,
  organizationId: AnyPgColumn,
  outletId: AnyPgColumn,
) {
  return [
    check(
      `${tableName}_scope_type_check`,
      sql`${scopeType} in ('brand', 'territory', 'organization', 'outlet')`,
    ),
    check(
      `${tableName}_scope_brand_shape_check`,
      sql`${scopeType} <> 'brand' or (
        ${territoryId} is null
        and ${organizationId} is null
        and ${outletId} is null
      )`,
    ),
    check(
      `${tableName}_scope_territory_shape_check`,
      sql`${scopeType} <> 'territory' or (
        ${territoryId} is not null
        and ${organizationId} is null
        and ${outletId} is null
      )`,
    ),
    check(
      `${tableName}_scope_organization_shape_check`,
      sql`${scopeType} <> 'organization' or (
        ${organizationId} is not null
        and ${territoryId} is null
        and ${outletId} is null
      )`,
    ),
    check(
      `${tableName}_scope_outlet_shape_check`,
      sql`${scopeType} <> 'outlet' or (
        ${outletId} is not null
        and ${territoryId} is not null
        and ${organizationId} is not null
      )`,
    ),
  ];
}

export const taxCategoriesTable = appSchema.table(
  "tax_categories",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** Only `outlet_performance_location` exists in V1. */
    placeOfSupplyMethod: text("place_of_supply_method").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tax_categories_code_uidx").on(table.code),
    check(
      "tax_categories_place_of_supply_method_check",
      sql`${table.placeOfSupplyMethod} in ('outlet_performance_location')`,
    ),
    check(
      "tax_categories_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('active', 'retired')`,
    ),
    check(
      "tax_categories_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "tax_categories_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or ${table.retiredAt} is null`,
    ),
    check("tax_categories_code_nonempty_check", sql`length(trim(${table.code})) > 0`),
    check("tax_categories_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
    check(
      "tax_categories_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const taxPoliciesTable = appSchema.table(
  "tax_policies",
  {
    id: uuid("id").primaryKey(),
    taxCategoryId: uuid("tax_category_id").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    salesChannel: text("sales_channel").notNull().default("direct"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    totalRateBps: integer("total_rate_bps").notNull(),
    itcAllowed: boolean("itc_allowed").notNull().default(false),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    legalReference: text("legal_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "tax_policies_tax_category_fk",
      columns: [table.taxCategoryId],
      foreignColumns: [taxCategoriesTable.id],
    }).onDelete("restrict"),
    check(
      "tax_policies_sales_channel_check",
      sql`${table.salesChannel} = 'direct'`,
    ),
    check(
      "tax_policies_jurisdiction_nonempty_check",
      sql`length(trim(${table.jurisdiction})) > 0`,
    ),
    check(
      "tax_policies_total_rate_bps_check",
      sql`${table.totalRateBps} >= 0 and ${table.totalRateBps} <= 10000`,
    ),
    check(
      "tax_policies_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    check(
      "tax_policies_draft_state_check",
      sql`${table.lifecycleStatus} <> 'draft' or (${table.activatedAt} is null and ${table.retiredAt} is null)`,
    ),
    check(
      "tax_policies_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or (${table.activatedAt} is not null and ${table.retiredAt} is null)`,
    ),
    check(
      "tax_policies_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "tax_policies_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    check(
      "tax_policies_legal_reference_length_check",
      sql`${table.legalReference} is null or char_length(${table.legalReference}) <= 500`,
    ),
    check(
      "tax_policies_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("tax_policies_category_channel_idx").on(
      table.taxCategoryId,
      table.jurisdiction,
      table.salesChannel,
      table.lifecycleStatus,
    ),
  ],
);

export const taxPolicyComponentsTable = appSchema.table(
  "tax_policy_components",
  {
    id: uuid("id").primaryKey(),
    taxPolicyId: uuid("tax_policy_id").notNull(),
    applicability: text("applicability").notNull(),
    taxType: text("tax_type").notNull(),
    rateBps: integer("rate_bps").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("tax_policy_components_policy_applicability_type_key").on(
      table.taxPolicyId,
      table.applicability,
      table.taxType,
    ),
    foreignKey({
      name: "tax_policy_components_policy_fk",
      columns: [table.taxPolicyId],
      foreignColumns: [taxPoliciesTable.id],
    }).onDelete("restrict"),
    check(
      "tax_policy_components_applicability_check",
      sql`${table.applicability} in ('intra_state', 'inter_state')`,
    ),
    check(
      "tax_policy_components_tax_type_check",
      sql`${table.taxType} in ('cgst', 'sgst', 'utgst', 'igst')`,
    ),
    check(
      "tax_policy_components_rate_bps_check",
      sql`${table.rateBps} >= 0 and ${table.rateBps} <= 10000`,
    ),
    check(
      "tax_policy_components_intra_state_type_check",
      sql`${table.applicability} <> 'intra_state' or ${table.taxType} in ('cgst', 'sgst', 'utgst')`,
    ),
    check(
      "tax_policy_components_inter_state_type_check",
      sql`${table.applicability} <> 'inter_state' or ${table.taxType} = 'igst'`,
    ),
    index("tax_policy_components_policy_idx").on(table.taxPolicyId, table.applicability),
  ],
);

export const priceBooksTable = appSchema.table(
  "price_books",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    scopeType: text("scope_type").notNull(),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    salesChannel: text("sales_channel").notNull().default("direct"),
    currency: text("currency").notNull().default("INR"),
    taxInclusionMode: text("tax_inclusion_mode").notNull().default("exclusive"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
    createdByWorkforceUserId: text("created_by_workforce_user_id"),
    activatedByWorkforceUserId: text("activated_by_workforce_user_id"),
    retiredByWorkforceUserId: text("retired_by_workforce_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("price_books_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("price_books_brand_code_nonretired_uidx")
      .on(table.brandId, table.code)
      .where(sql`${table.lifecycleStatus} <> 'retired'`),
    foreignKey({
      name: "price_books_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_books_territory_brand_fk",
      columns: [table.territoryId, table.brandId],
      foreignColumns: [territoriesTable.id, territoriesTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_books_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_books_outlet_ancestry_fk",
      columns: [table.outletId, table.brandId, table.organizationId, table.territoryId],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_books_created_by_workforce_user_fk",
      columns: [table.createdByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    foreignKey({
      name: "price_books_activated_by_workforce_user_fk",
      columns: [table.activatedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    foreignKey({
      name: "price_books_retired_by_workforce_user_fk",
      columns: [table.retiredByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    ...scopeShapeChecks(
      "price_books",
      table.scopeType,
      table.territoryId,
      table.organizationId,
      table.outletId,
    ),
    check("price_books_sales_channel_check", sql`${table.salesChannel} = 'direct'`),
    check("price_books_currency_check", sql`${table.currency} = 'INR'`),
    check(
      "price_books_tax_inclusion_mode_check",
      sql`${table.taxInclusionMode} in ('exclusive', 'inclusive')`,
    ),
    check(
      "price_books_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'active', 'retired')`,
    ),
    check(
      "price_books_draft_state_check",
      sql`${table.lifecycleStatus} <> 'draft' or (${table.activatedAt} is null and ${table.retiredAt} is null)`,
    ),
    check(
      "price_books_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or (${table.activatedAt} is not null and ${table.retiredAt} is null)`,
    ),
    check(
      "price_books_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "price_books_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    check(
      "price_books_code_format_check",
      sql`${table.code} ~ '^[a-z0-9][a-z0-9_-]*$' and char_length(${table.code}) between 1 and 64`,
    ),
    check("price_books_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
    check(
      "price_books_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("price_books_brand_scope_status_idx").on(
      table.brandId,
      table.scopeType,
      table.lifecycleStatus,
    ),
    index("price_books_outlet_status_idx").on(table.outletId, table.lifecycleStatus),
  ],
);

export const priceBookVariantPricesTable = appSchema.table(
  "price_book_variant_prices",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    priceBookId: uuid("price_book_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    allowTerritoryOverride: boolean("allow_territory_override").notNull().default(false),
    allowOrganizationOverride: boolean("allow_organization_override")
      .notNull()
      .default(false),
    allowOutletOverride: boolean("allow_outlet_override").notNull().default(false),
    floorPaise: paise("floor_paise"),
    ceilingPaise: paise("ceiling_paise"),
    taxCategoryId: uuid("tax_category_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("price_book_variant_prices_book_variant_key").on(
      table.priceBookId,
      table.variantId,
    ),
    foreignKey({
      name: "price_book_variant_prices_book_brand_fk",
      columns: [table.priceBookId, table.brandId],
      foreignColumns: [priceBooksTable.id, priceBooksTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_variant_prices_variant_brand_fk",
      columns: [table.variantId, table.brandId],
      foreignColumns: [catalogVariantsTable.id, catalogVariantsTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_variant_prices_tax_category_fk",
      columns: [table.taxCategoryId],
      foreignColumns: [taxCategoriesTable.id],
    }).onDelete("restrict"),
    check(
      "price_book_variant_prices_amount_nonnegative_check",
      sql`${table.amountPaise} >= 0`,
    ),
    check(
      "price_book_variant_prices_floor_nonnegative_check",
      sql`${table.floorPaise} is null or ${table.floorPaise} >= 0`,
    ),
    check(
      "price_book_variant_prices_ceiling_nonnegative_check",
      sql`${table.ceilingPaise} is null or ${table.ceilingPaise} >= 0`,
    ),
    check(
      "price_book_variant_prices_floor_bound_check",
      sql`${table.floorPaise} is null or ${table.amountPaise} >= ${table.floorPaise}`,
    ),
    check(
      "price_book_variant_prices_ceiling_bound_check",
      sql`${table.ceilingPaise} is null or ${table.amountPaise} <= ${table.ceilingPaise}`,
    ),
    check(
      "price_book_variant_prices_floor_ceiling_order_check",
      sql`${table.floorPaise} is null or ${table.ceilingPaise} is null or ${table.floorPaise} <= ${table.ceilingPaise}`,
    ),
    index("price_book_variant_prices_variant_idx").on(table.variantId),
  ],
);

export const priceBookModifierPricesTable = appSchema.table(
  "price_book_modifier_prices",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    priceBookId: uuid("price_book_id").notNull(),
    variantModifierGroupId: uuid("variant_modifier_group_id").notNull(),
    modifierGroupOptionId: uuid("modifier_group_option_id").notNull(),
    priceDeltaPaise: paise("price_delta_paise").notNull(),
    allowTerritoryOverride: boolean("allow_territory_override").notNull().default(false),
    allowOrganizationOverride: boolean("allow_organization_override")
      .notNull()
      .default(false),
    allowOutletOverride: boolean("allow_outlet_override").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("price_book_modifier_prices_book_binding_key").on(
      table.priceBookId,
      table.variantModifierGroupId,
      table.modifierGroupOptionId,
    ),
    foreignKey({
      name: "price_book_modifier_prices_book_brand_fk",
      columns: [table.priceBookId, table.brandId],
      foreignColumns: [priceBooksTable.id, priceBooksTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_modifier_prices_variant_group_brand_fk",
      columns: [table.variantModifierGroupId, table.brandId],
      foreignColumns: [
        catalogVariantModifierGroupsTable.id,
        catalogVariantModifierGroupsTable.brandId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_modifier_prices_group_option_brand_fk",
      columns: [table.modifierGroupOptionId, table.brandId],
      foreignColumns: [
        catalogModifierGroupOptionsTable.id,
        catalogModifierGroupOptionsTable.brandId,
      ],
    }).onDelete("restrict"),
    check(
      "price_book_modifier_prices_delta_nonnegative_check",
      sql`${table.priceDeltaPaise} >= 0`,
    ),
    index("price_book_modifier_prices_binding_idx").on(
      table.variantModifierGroupId,
      table.modifierGroupOptionId,
    ),
  ],
);

export const priceBookBundleOptionPricesTable = appSchema.table(
  "price_book_bundle_option_prices",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    priceBookId: uuid("price_book_id").notNull(),
    bundleGroupOptionId: uuid("bundle_group_option_id").notNull(),
    priceDeltaPaise: paise("price_delta_paise").notNull(),
    allowTerritoryOverride: boolean("allow_territory_override").notNull().default(false),
    allowOrganizationOverride: boolean("allow_organization_override")
      .notNull()
      .default(false),
    allowOutletOverride: boolean("allow_outlet_override").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("price_book_bundle_option_prices_book_option_key").on(
      table.priceBookId,
      table.bundleGroupOptionId,
    ),
    foreignKey({
      name: "price_book_bundle_option_prices_book_brand_fk",
      columns: [table.priceBookId, table.brandId],
      foreignColumns: [priceBooksTable.id, priceBooksTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_bundle_option_prices_option_brand_fk",
      columns: [table.bundleGroupOptionId, table.brandId],
      foreignColumns: [
        catalogBundleGroupOptionsTable.id,
        catalogBundleGroupOptionsTable.brandId,
      ],
    }).onDelete("restrict"),
    check(
      "price_book_bundle_option_prices_delta_nonnegative_check",
      sql`${table.priceDeltaPaise} >= 0`,
    ),
    index("price_book_bundle_option_prices_option_idx").on(table.bundleGroupOptionId),
  ],
);

export const chargeDefinitionsTable = appSchema.table(
  "charge_definitions",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("charge_definitions_code_uidx").on(table.code),
    check(
      "charge_definitions_code_check",
      sql`${table.code} in ('packaging', 'delivery')`,
    ),
    check(
      "charge_definitions_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('active', 'retired')`,
    ),
    check(
      "charge_definitions_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or ${table.retiredAt} is null`,
    ),
    check(
      "charge_definitions_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check("charge_definitions_name_nonempty_check", sql`length(trim(${table.name})) > 0`),
    check(
      "charge_definitions_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const priceBookChargePricesTable = appSchema.table(
  "price_book_charge_prices",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    priceBookId: uuid("price_book_id").notNull(),
    chargeDefinitionId: uuid("charge_definition_id").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    calculationMode: text("calculation_mode").notNull(),
    allowTerritoryOverride: boolean("allow_territory_override").notNull().default(false),
    allowOrganizationOverride: boolean("allow_organization_override")
      .notNull()
      .default(false),
    allowOutletOverride: boolean("allow_outlet_override").notNull().default(false),
    taxCategoryId: uuid("tax_category_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("price_book_charge_prices_book_charge_key").on(
      table.priceBookId,
      table.chargeDefinitionId,
    ),
    foreignKey({
      name: "price_book_charge_prices_book_brand_fk",
      columns: [table.priceBookId, table.brandId],
      foreignColumns: [priceBooksTable.id, priceBooksTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_charge_prices_charge_definition_fk",
      columns: [table.chargeDefinitionId],
      foreignColumns: [chargeDefinitionsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "price_book_charge_prices_tax_category_fk",
      columns: [table.taxCategoryId],
      foreignColumns: [taxCategoriesTable.id],
    }).onDelete("restrict"),
    check(
      "price_book_charge_prices_amount_nonnegative_check",
      sql`${table.amountPaise} >= 0`,
    ),
    check(
      "price_book_charge_prices_calculation_mode_check",
      sql`${table.calculationMode} in ('fixed_per_order', 'per_item_quantity')`,
    ),
  ],
);

export const legalEntityTaxProfilesTable = appSchema.table(
  "legal_entity_tax_profiles",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    stateCode: text("state_code").notNull(),
    registrationStatus: text("registration_status").notNull(),
    gstin: text("gstin"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    createdByWorkforceUserId: text("created_by_workforce_user_id"),
    retiredByWorkforceUserId: text("retired_by_workforce_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    unique("legal_entity_tax_profiles_id_legal_entity_key").on(
      table.id,
      table.legalEntityId,
    ),
    foreignKey({
      name: "legal_entity_tax_profiles_legal_entity_ancestry_fk",
      columns: [table.legalEntityId, table.brandId, table.organizationId],
      foreignColumns: [
        legalEntitiesTable.id,
        legalEntitiesTable.brandId,
        legalEntitiesTable.organizationId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "legal_entity_tax_profiles_created_by_workforce_user_fk",
      columns: [table.createdByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    foreignKey({
      name: "legal_entity_tax_profiles_retired_by_workforce_user_fk",
      columns: [table.retiredByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "legal_entity_tax_profiles_registration_status_check",
      sql`${table.registrationStatus} in ('registered', 'unregistered')`,
    ),
    check(
      "legal_entity_tax_profiles_registered_gstin_check",
      sql`${table.registrationStatus} <> 'registered' or (
        ${table.gstin} is not null
        and ${table.gstin} ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'
      )`,
    ),
    check(
      "legal_entity_tax_profiles_unregistered_gstin_check",
      sql`${table.registrationStatus} <> 'unregistered' or ${table.gstin} is null`,
    ),
    check(
      "legal_entity_tax_profiles_state_code_check",
      sql`${table.stateCode} ~ '^[0-9]{2}$'`,
    ),
    check(
      "legal_entity_tax_profiles_gstin_state_prefix_check",
      sql`${table.gstin} is null or substring(${table.gstin} from 1 for 2) = ${table.stateCode}`,
    ),
    check(
      "legal_entity_tax_profiles_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('active', 'retired')`,
    ),
    check(
      "legal_entity_tax_profiles_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or ${table.retiredAt} is null`,
    ),
    check(
      "legal_entity_tax_profiles_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "legal_entity_tax_profiles_valid_range_check",
      sql`${table.validTo} is null or ${table.validTo} > ${table.validFrom}`,
    ),
    check(
      "legal_entity_tax_profiles_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("legal_entity_tax_profiles_legal_entity_status_idx").on(
      table.legalEntityId,
      table.lifecycleStatus,
    ),
  ],
);

export const outletTaxProfilesTable = appSchema.table(
  "outlet_tax_profiles",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    legalEntityTaxProfileId: uuid("legal_entity_tax_profile_id").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    assignedByWorkforceUserId: text("assigned_by_workforce_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "outlet_tax_profiles_outlet_full_ancestry_fk",
      columns: [
        table.outletId,
        table.brandId,
        table.organizationId,
        table.territoryId,
        table.legalEntityId,
      ],
      foreignColumns: [
        outletsTable.id,
        outletsTable.brandId,
        outletsTable.organizationId,
        outletsTable.territoryId,
        outletsTable.legalEntityId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "outlet_tax_profiles_profile_legal_entity_fk",
      columns: [table.legalEntityTaxProfileId, table.legalEntityId],
      foreignColumns: [
        legalEntityTaxProfilesTable.id,
        legalEntityTaxProfilesTable.legalEntityId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "outlet_tax_profiles_assigned_by_workforce_user_fk",
      columns: [table.assignedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    uniqueIndex("outlet_tax_profiles_outlet_active_from_uidx")
      .on(table.outletId, table.effectiveFrom)
      .where(sql`${table.lifecycleStatus} = 'active'`),
    check(
      "outlet_tax_profiles_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('active', 'retired')`,
    ),
    check(
      "outlet_tax_profiles_active_state_check",
      sql`${table.lifecycleStatus} <> 'active' or ${table.retiredAt} is null`,
    ),
    check(
      "outlet_tax_profiles_retired_state_check",
      sql`${table.lifecycleStatus} <> 'retired' or ${table.retiredAt} is not null`,
    ),
    check(
      "outlet_tax_profiles_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    check(
      "outlet_tax_profiles_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("outlet_tax_profiles_outlet_status_idx").on(
      table.outletId,
      table.lifecycleStatus,
    ),
  ],
);

export const pricingTaxAuditEventsTable = appSchema.table(
  "pricing_tax_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorWorkforceUserId: text("actor_workforce_user_id"),
    action: text("action").notNull(),
    brandId: uuid("brand_id"),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: "pricing_tax_audit_events_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "pricing_tax_audit_events_actor_workforce_user_fk",
      columns: [table.actorWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "pricing_tax_audit_events_action_nonempty_check",
      sql`length(trim(${table.action})) > 0`,
    ),
    check(
      "pricing_tax_audit_events_target_type_nonempty_check",
      sql`length(trim(${table.targetType})) > 0`,
    ),
    index("pricing_tax_audit_events_brand_occurred_idx").on(
      table.brandId,
      table.occurredAt,
    ),
    index("pricing_tax_audit_events_action_occurred_idx").on(
      table.action,
      table.occurredAt,
    ),
  ],
);
