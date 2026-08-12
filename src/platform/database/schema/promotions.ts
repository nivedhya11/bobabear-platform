/**
 * Drizzle schema for Promotions, Coupons, Allocation infrastructure (IMP-016)
 * plus Payment-orchestrated redemption claims (IMP-022).
 *
 * IMP-016 tables: six. IMP-022 adds `promotion_redemption_claims` only.
 * Money is always INR integer paise (`bigint`). Public APIs remain out of scope.
 *
 * Promotion outlet scope differs from price-book outlet scope: outlet promotions
 * store only `outlet_id` (territory_id and organization_id remain null).
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
  catalogProductsTable,
  catalogVariantsTable,
} from "./catalog";
import { checkoutSnapshotsTable } from "./checkout";
import {
  paymentAttemptIdForClaimsColumn,
  paymentAttemptPaymentIdForClaimsColumn,
  paymentCheckoutSnapshotIdForClaimsColumn,
  paymentIdForClaimsColumn,
} from "./payment";
import { appSchema } from "./index";
import {
  brandsTable,
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "./organizations";
import { chargeDefinitionsTable } from "./pricing";
import { workforceAuthUsers } from "./workforce-auth";

function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

/** IMP-016 promotion scope shapes (outlet = outlet_id only). */
function promotionScopeShapeChecks(
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
        and ${territoryId} is null
        and ${organizationId} is null
      )`,
    ),
  ];
}

export const brandPromotionPoliciesTable = appSchema.table(
  "brand_promotion_policies",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    allowTerritoryPromotions: boolean("allow_territory_promotions").notNull().default(false),
    allowOrganizationPromotions: boolean("allow_organization_promotions")
      .notNull()
      .default(false),
    allowOutletPromotions: boolean("allow_outlet_promotions").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("brand_promotion_policies_brand_uidx").on(table.brandId),
    foreignKey({
      name: "brand_promotion_policies_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    check(
      "brand_promotion_policies_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const promotionsTable = appSchema.table(
  "promotions",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    code: text("code").notNull(),
    displayName: text("display_name").notNull(),
    scopeType: text("scope_type").notNull(),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    salesChannel: text("sales_channel").notNull().default("direct"),
    status: text("status").notNull().default("draft"),
    triggerType: text("trigger_type").notNull(),
    stackingPolicy: text("stacking_policy").notNull().default("exclusive"),
    priority: integer("priority").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    minimumQualifyingAmountPaise: paise("minimum_qualifying_amount_paise"),
    minimumItemQuantity: integer("minimum_item_quantity"),
    configurationFingerprint: text("configuration_fingerprint"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    activatedByWorkforceUserId: text("activated_by_workforce_user_id"),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retiredByWorkforceUserId: text("retired_by_workforce_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("promotions_id_brand_id_key").on(table.id, table.brandId),
    uniqueIndex("promotions_brand_code_uidx").on(table.brandId, table.code),
    foreignKey({
      name: "promotions_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotions_territory_brand_fk",
      columns: [table.territoryId, table.brandId],
      foreignColumns: [territoriesTable.id, territoriesTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotions_organization_brand_fk",
      columns: [table.organizationId, table.brandId],
      foreignColumns: [organizationsTable.id, organizationsTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotions_outlet_brand_fk",
      columns: [table.outletId, table.brandId],
      foreignColumns: [outletsTable.id, outletsTable.brandId],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotions_activated_by_workforce_user_fk",
      columns: [table.activatedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    foreignKey({
      name: "promotions_retired_by_workforce_user_fk",
      columns: [table.retiredByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    ...promotionScopeShapeChecks(
      "promotions",
      table.scopeType,
      table.territoryId,
      table.organizationId,
      table.outletId,
    ),
    check("promotions_sales_channel_check", sql`${table.salesChannel} = 'direct'`),
    check(
      "promotions_status_check",
      sql`${table.status} in ('draft', 'active', 'retired')`,
    ),
    check(
      "promotions_trigger_type_check",
      sql`${table.triggerType} in ('automatic', 'coupon')`,
    ),
    check(
      "promotions_stacking_policy_check",
      sql`${table.stackingPolicy} in ('exclusive', 'combinable')`,
    ),
    check(
      "promotions_draft_state_check",
      sql`${table.status} <> 'draft' or (${table.activatedAt} is null and ${table.retiredAt} is null and ${table.configurationFingerprint} is null)`,
    ),
    check(
      "promotions_active_state_check",
      sql`${table.status} <> 'active' or (${table.activatedAt} is not null and ${table.retiredAt} is null and ${table.configurationFingerprint} is not null)`,
    ),
    check(
      "promotions_retired_state_check",
      sql`${table.status} <> 'retired' or (${table.retiredAt} is not null and ${table.configurationFingerprint} is not null)`,
    ),
    check(
      "promotions_time_window_check",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "promotions_minimum_qualifying_amount_check",
      sql`${table.minimumQualifyingAmountPaise} is null or ${table.minimumQualifyingAmountPaise} > 0`,
    ),
    check(
      "promotions_minimum_item_quantity_check",
      sql`${table.minimumItemQuantity} is null or ${table.minimumItemQuantity} > 0`,
    ),
    check(
      "promotions_code_format_check",
      sql`${table.code} ~ '^[a-z0-9][a-z0-9_-]*$' and char_length(${table.code}) between 1 and 64`,
    ),
    check(
      "promotions_display_name_nonempty_check",
      sql`length(trim(${table.displayName})) > 0`,
    ),
    check(
      "promotions_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("promotions_brand_status_channel_idx").on(
      table.brandId,
      table.status,
      table.salesChannel,
    ),
    index("promotions_scope_status_idx").on(
      table.scopeType,
      table.status,
      table.startsAt,
    ),
    index("promotions_outlet_status_idx").on(table.outletId, table.status),
  ],
);

export const promotionBenefitsTable = appSchema.table(
  "promotion_benefits",
  {
    id: uuid("id").primaryKey(),
    promotionId: uuid("promotion_id").notNull(),
    benefitType: text("benefit_type").notNull(),
    percentageBps: integer("percentage_bps"),
    fixedAmountPaise: paise("fixed_amount_paise"),
    maximumDiscountPaise: paise("maximum_discount_paise"),
    buyQuantity: integer("buy_quantity"),
    getQuantity: integer("get_quantity"),
    repeatable: boolean("repeatable"),
    maximumRewardQuantity: integer("maximum_reward_quantity"),
    includeModifiers: boolean("include_modifiers").notNull().default(false),
    includeBundleDeltas: boolean("include_bundle_deltas").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("promotion_benefits_promotion_uidx").on(table.promotionId),
    foreignKey({
      name: "promotion_benefits_promotion_fk",
      columns: [table.promotionId],
      foreignColumns: [promotionsTable.id],
    }).onDelete("cascade"),
    check(
      "promotion_benefits_type_check",
      sql`${table.benefitType} in ('percentage_discount', 'fixed_amount_discount', 'buy_x_get_y')`,
    ),
    check(
      "promotion_benefits_percentage_shape_check",
      sql`${table.benefitType} <> 'percentage_discount' or (
        ${table.percentageBps} is not null
        and ${table.percentageBps} > 0
        and ${table.percentageBps} <= 10000
        and ${table.fixedAmountPaise} is null
        and ${table.buyQuantity} is null
        and ${table.getQuantity} is null
        and ${table.repeatable} is null
        and ${table.maximumRewardQuantity} is null
      )`,
    ),
    check(
      "promotion_benefits_fixed_shape_check",
      sql`${table.benefitType} <> 'fixed_amount_discount' or (
        ${table.fixedAmountPaise} is not null
        and ${table.fixedAmountPaise} > 0
        and ${table.percentageBps} is null
        and ${table.buyQuantity} is null
        and ${table.getQuantity} is null
        and ${table.repeatable} is null
        and ${table.maximumRewardQuantity} is null
      )`,
    ),
    check(
      "promotion_benefits_bogo_shape_check",
      sql`${table.benefitType} <> 'buy_x_get_y' or (
        ${table.buyQuantity} is not null
        and ${table.buyQuantity} > 0
        and ${table.getQuantity} is not null
        and ${table.getQuantity} > 0
        and ${table.repeatable} is not null
        and ${table.percentageBps} is null
        and ${table.fixedAmountPaise} is null
        and ${table.maximumDiscountPaise} is null
        and ${table.includeModifiers} = false
        and ${table.includeBundleDeltas} = false
        and (
          ${table.maximumRewardQuantity} is null
          or (
            ${table.maximumRewardQuantity} > 0
            and ${table.maximumRewardQuantity} % ${table.getQuantity} = 0
          )
        )
        and (
          ${table.repeatable} = true
          or ${table.maximumRewardQuantity} is null
        )
      )`,
    ),
    check(
      "promotion_benefits_maximum_discount_check",
      sql`${table.maximumDiscountPaise} is null or ${table.maximumDiscountPaise} > 0`,
    ),
    check(
      "promotion_benefits_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const promotionTargetsTable = appSchema.table(
  "promotion_targets",
  {
    id: uuid("id").primaryKey(),
    promotionId: uuid("promotion_id").notNull(),
    targetRole: text("target_role").notNull(),
    targetType: text("target_type").notNull(),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    chargeDefinitionId: uuid("charge_definition_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "promotion_targets_promotion_fk",
      columns: [table.promotionId],
      foreignColumns: [promotionsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "promotion_targets_product_fk",
      columns: [table.productId],
      foreignColumns: [catalogProductsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotion_targets_variant_fk",
      columns: [table.variantId],
      foreignColumns: [catalogVariantsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotion_targets_charge_definition_fk",
      columns: [table.chargeDefinitionId],
      foreignColumns: [chargeDefinitionsTable.id],
    }).onDelete("restrict"),
    check(
      "promotion_targets_role_check",
      sql`${table.targetRole} in ('qualifier', 'benefit')`,
    ),
    check(
      "promotion_targets_type_check",
      sql`${table.targetType} in ('all_merchandise', 'product', 'variant', 'charge')`,
    ),
    check(
      "promotion_targets_all_merchandise_shape_check",
      sql`${table.targetType} <> 'all_merchandise' or (
        ${table.productId} is null
        and ${table.variantId} is null
        and ${table.chargeDefinitionId} is null
      )`,
    ),
    check(
      "promotion_targets_product_shape_check",
      sql`${table.targetType} <> 'product' or (
        ${table.productId} is not null
        and ${table.variantId} is null
        and ${table.chargeDefinitionId} is null
      )`,
    ),
    check(
      "promotion_targets_variant_shape_check",
      sql`${table.targetType} <> 'variant' or (
        ${table.variantId} is not null
        and ${table.productId} is null
        and ${table.chargeDefinitionId} is null
      )`,
    ),
    check(
      "promotion_targets_charge_shape_check",
      sql`${table.targetType} <> 'charge' or (
        ${table.chargeDefinitionId} is not null
        and ${table.productId} is null
        and ${table.variantId} is null
      )`,
    ),
    uniqueIndex("promotion_targets_all_merchandise_role_uidx")
      .on(table.promotionId, table.targetRole)
      .where(sql`${table.targetType} = 'all_merchandise'`),
    uniqueIndex("promotion_targets_product_role_uidx")
      .on(table.promotionId, table.targetRole, table.productId)
      .where(sql`${table.targetType} = 'product'`),
    uniqueIndex("promotion_targets_variant_role_uidx")
      .on(table.promotionId, table.targetRole, table.variantId)
      .where(sql`${table.targetType} = 'variant'`),
    uniqueIndex("promotion_targets_charge_role_uidx")
      .on(table.promotionId, table.targetRole, table.chargeDefinitionId)
      .where(sql`${table.targetType} = 'charge'`),
    index("promotion_targets_promotion_role_idx").on(table.promotionId, table.targetRole),
  ],
);

export const promotionCouponsTable = appSchema.table(
  "promotion_coupons",
  {
    id: uuid("id").primaryKey(),
    promotionId: uuid("promotion_id").notNull(),
    canonicalCode: text("canonical_code").notNull(),
    origin: text("origin").notNull(),
    status: text("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    maximumRedemptions: integer("maximum_redemptions"),
    maximumRedemptionsPerCustomer: integer("maximum_redemptions_per_customer"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("promotion_coupons_canonical_code_uidx").on(table.canonicalCode),
    foreignKey({
      name: "promotion_coupons_promotion_fk",
      columns: [table.promotionId],
      foreignColumns: [promotionsTable.id],
    }).onDelete("restrict"),
    check(
      "promotion_coupons_origin_check",
      sql`${table.origin} in ('manual', 'generated')`,
    ),
    check(
      "promotion_coupons_status_check",
      sql`${table.status} in ('draft', 'active', 'disabled', 'retired')`,
    ),
    check(
      "promotion_coupons_canonical_code_format_check",
      sql`${table.canonicalCode} ~ '^[A-Z0-9][A-Z0-9_-]*$' and char_length(${table.canonicalCode}) between 3 and 64`,
    ),
    check(
      "promotion_coupons_draft_state_check",
      sql`${table.status} <> 'draft' or (${table.activatedAt} is null and ${table.disabledAt} is null and ${table.retiredAt} is null)`,
    ),
    check(
      "promotion_coupons_active_state_check",
      sql`${table.status} <> 'active' or (${table.activatedAt} is not null and ${table.disabledAt} is null and ${table.retiredAt} is null)`,
    ),
    check(
      "promotion_coupons_disabled_state_check",
      sql`${table.status} <> 'disabled' or (${table.activatedAt} is not null and ${table.disabledAt} is not null and ${table.retiredAt} is null)`,
    ),
    check(
      "promotion_coupons_retired_state_check",
      sql`${table.status} <> 'retired' or (${table.activatedAt} is not null and ${table.retiredAt} is not null)`,
    ),
    check(
      "promotion_coupons_time_window_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "promotion_coupons_maximum_redemptions_check",
      sql`${table.maximumRedemptions} is null or ${table.maximumRedemptions} > 0`,
    ),
    check(
      "promotion_coupons_maximum_redemptions_per_customer_check",
      sql`${table.maximumRedemptionsPerCustomer} is null or ${table.maximumRedemptionsPerCustomer} > 0`,
    ),
    check(
      "promotion_coupons_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    index("promotion_coupons_promotion_status_idx").on(table.promotionId, table.status),
  ],
);

export const promotionAuditEventsTable = appSchema.table(
  "promotion_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorWorkforceUserId: text("actor_workforce_user_id"),
    permissionKey: text("permission_key"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    brandId: uuid("brand_id"),
    territoryId: uuid("territory_id"),
    organizationId: uuid("organization_id"),
    outletId: uuid("outlet_id"),
    configurationFingerprint: text("configuration_fingerprint"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: "promotion_audit_events_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }),
    foreignKey({
      name: "promotion_audit_events_actor_workforce_user_fk",
      columns: [table.actorWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }),
    check(
      "promotion_audit_events_action_nonempty_check",
      sql`length(trim(${table.action})) > 0`,
    ),
    check(
      "promotion_audit_events_resource_type_nonempty_check",
      sql`length(trim(${table.resourceType})) > 0`,
    ),
    index("promotion_audit_events_brand_occurred_idx").on(
      table.brandId,
      table.occurredAt,
    ),
    index("promotion_audit_events_action_occurred_idx").on(
      table.action,
      table.occurredAt,
    ),
    index("promotion_audit_events_resource_idx").on(
      table.resourceType,
      table.resourceId,
    ),
  ],
);

/**
 * Payment-boundary redemption capacity claims (IMP-022).
 * One claim participates in all applicable limits for that Promotion.
 * Customer identity is derived via snapshot → checkout → customer_auth_user.
 */
export const promotionRedemptionClaimsTable = appSchema.table(
  "promotion_redemption_claims",
  {
    id: uuid("id").primaryKey(),
    promotionId: uuid("promotion_id").notNull(),
    checkoutSnapshotId: uuid("checkout_snapshot_id").notNull(),
    paymentId: uuid("payment_id"),
    paymentAttemptId: uuid("payment_attempt_id"),
    redemptionUnits: bigint("redemption_units", { mode: "bigint" }).notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "promotion_redemption_claims_promotion_fk",
      columns: [table.promotionId],
      foreignColumns: [promotionsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotion_redemption_claims_checkout_snapshot_fk",
      columns: [table.checkoutSnapshotId],
      foreignColumns: [checkoutSnapshotsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotion_redemption_claims_payment_snapshot_fk",
      columns: [table.paymentId, table.checkoutSnapshotId],
      foreignColumns: [
        paymentIdForClaimsColumn(),
        paymentCheckoutSnapshotIdForClaimsColumn(),
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "promotion_redemption_claims_attempt_payment_fk",
      columns: [table.paymentAttemptId, table.paymentId],
      foreignColumns: [
        paymentAttemptIdForClaimsColumn(),
        paymentAttemptPaymentIdForClaimsColumn(),
      ],
    }).onDelete("restrict"),
    uniqueIndex("promotion_redemption_claims_attempt_promotion_uidx")
      .on(table.paymentAttemptId, table.promotionId)
      .where(sql`${table.paymentAttemptId} is not null`),
    uniqueIndex("promotion_redemption_claims_zero_snapshot_promotion_uidx")
      .on(table.checkoutSnapshotId, table.promotionId)
      .where(sql`${table.paymentId} is null`),
    index("promotion_redemption_claims_promotion_status_idx").on(
      table.promotionId,
      table.status,
    ),
    index("promotion_redemption_claims_snapshot_idx").on(table.checkoutSnapshotId),
    check(
      "promotion_redemption_claims_units_positive_check",
      sql`${table.redemptionUnits} > 0`,
    ),
    check(
      "promotion_redemption_claims_status_check",
      sql`${table.status} in ('RESERVED', 'CONSUMED', 'RELEASED')`,
    ),
    check(
      "promotion_redemption_claims_payment_attempt_pair_check",
      sql`(${table.paymentId} is null) = (${table.paymentAttemptId} is null)`,
    ),
    check(
      "promotion_redemption_claims_zero_must_be_consumed_check",
      sql`${table.paymentId} is not null or ${table.status} = 'CONSUMED'`,
    ),
    check(
      "promotion_redemption_claims_reserved_timestamps_check",
      sql`${table.status} <> 'RESERVED' or (
        ${table.consumedAt} is null and ${table.releasedAt} is null
      )`,
    ),
    check(
      "promotion_redemption_claims_consumed_timestamps_check",
      sql`${table.status} <> 'CONSUMED' or (
        ${table.consumedAt} is not null and ${table.releasedAt} is null
      )`,
    ),
    check(
      "promotion_redemption_claims_released_timestamps_check",
      sql`${table.status} <> 'RELEASED' or (
        ${table.consumedAt} is null and ${table.releasedAt} is not null
      )`,
    ),
  ],
);
