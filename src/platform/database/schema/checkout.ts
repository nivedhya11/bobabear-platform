/**
 * Drizzle schema for Checkout persistence (IMP-021).
 *
 * Exactly ten `app.*` tables. Authenticated-customer purchase-attempt aggregate
 * with immutable READY commercial snapshots. No Payment / Order tables.
 * No core JSON authority. No business seed rows.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  catalogBundleGroupOptionsTable,
  catalogModifierGroupOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "./catalog";
import { cartsTable } from "./cart";
import { customerAddressesTable } from "./customer-addresses";
import { customerAuthUsers } from "./customer-auth";
import { appSchema } from "./index";
import { brandsTable, outletsTable } from "./organizations";
import { chargeDefinitionsTable } from "./pricing";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

const ADDRESS_FIELD_CHECKS = {
  recipientName: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_recipient_name_length_check`,
      sql`char_length(${col}) between 1 and 100`,
    ),
  recipientPhone: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_recipient_phone_nonempty_check`,
      sql`length(trim(${col})) > 0`,
    ),
  addressLine1: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_address_line_1_length_check`,
      sql`char_length(${col}) between 1 and 200`,
    ),
  addressLine2: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_address_line_2_length_check`,
      sql`${col} is null or char_length(${col}) between 1 and 200`,
    ),
  landmark: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_landmark_length_check`,
      sql`${col} is null or char_length(${col}) between 1 and 150`,
    ),
  locality: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_locality_length_check`,
      sql`${col} is null or char_length(${col}) between 1 and 120`,
    ),
  city: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_city_length_check`,
      sql`char_length(${col}) between 1 and 100`,
    ),
  stateCode: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_state_code_nonempty_check`,
      sql`length(trim(${col})) > 0`,
    ),
  postalCode: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_postal_code_check`,
      sql`${col} ~ '^[1-9][0-9]{5}$'`,
    ),
  label: (col: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_label_length_check`,
      sql`${col} is null or char_length(${col}) between 1 and 50`,
    ),
  coordPair: (lat: AnyPgColumn, lng: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_coordinates_pair_check`,
      sql`(${lat} is null) = (${lng} is null)`,
    ),
  latRange: (lat: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_latitude_range_check`,
      sql`${lat} is null or (${lat} >= -90 and ${lat} <= 90)`,
    ),
  lngRange: (lng: AnyPgColumn, tableName: string) =>
    check(
      `${tableName}_longitude_range_check`,
      sql`${lng} is null or (${lng} >= -180 and ${lng} <= 180)`,
    ),
} as const;

/** Lazy column accessors — break TS circular inference with checkout_snapshots. */
function checkoutSnapshotIdColumn(): AnyPgColumn {
  return checkoutSnapshotsTable.id;
}
function checkoutSnapshotCheckoutIdColumn(): AnyPgColumn {
  return checkoutSnapshotsTable.checkoutId;
}

export const checkoutsTable = appSchema.table(
  "checkouts",
  {
    id: uuid("id").primaryKey(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
    brandId: uuid("brand_id").notNull(),
    cartId: uuid("cart_id").notNull(),
    sourceCartRevision: bigint("source_cart_revision", { mode: "bigint" }).notNull(),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Forward-ref composite ownership FK is declared in extraConfig below
    // (ExtraConfigBuilder runs after checkout_snapshots is initialized).
    activeSnapshotId: uuid("active_snapshot_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Scoped ownership: active snapshot must belong to this Checkout.
    // References checkout_snapshots (id, checkout_id) — see unique index there.
    foreignKey({
      name: "checkouts_active_snapshot_ownership_fk",
      columns: [table.activeSnapshotId, table.id],
      foreignColumns: [
        checkoutSnapshotIdColumn(),
        checkoutSnapshotCheckoutIdColumn(),
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkouts_customer_auth_user_fk",
      columns: [table.customerAuthUserId],
      foreignColumns: [customerAuthUsers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkouts_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkouts_cart_fk",
      columns: [table.cartId],
      foreignColumns: [cartsTable.id],
    }).onDelete("restrict"),
    check(
      "checkouts_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "checkouts_source_cart_revision_positive_check",
      sql`${table.sourceCartRevision} > 0`,
    ),
    check(
      "checkouts_status_check",
      sql`${table.status} in (
        'DRAFT',
        'READY_FOR_PAYMENT',
        'PAYMENT_PENDING',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED'
      )`,
    ),
    check(
      "checkouts_status_snapshot_null_check",
      sql`(
        (
          ${table.status} in ('DRAFT', 'CANCELLED', 'EXPIRED')
          and ${table.activeSnapshotId} is null
        )
        or
        (
          ${table.status} in ('READY_FOR_PAYMENT', 'PAYMENT_PENDING', 'COMPLETED')
          and ${table.activeSnapshotId} is not null
        )
      )`,
    ),
    check(
      "checkouts_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    // At most one non-terminal Checkout per Cart.
    uniqueIndex("checkouts_one_non_terminal_per_cart_uidx")
      .on(table.cartId)
      .where(
        sql`${table.status} in ('DRAFT', 'READY_FOR_PAYMENT', 'PAYMENT_PENDING')`,
      ),
    index("checkouts_customer_auth_user_id_idx").on(table.customerAuthUserId),
    index("checkouts_cart_id_idx").on(table.cartId),
    index("checkouts_expires_at_idx").on(table.expiresAt),
  ],
);

export const checkoutDeliveryDestinationsTable = appSchema.table(
  "checkout_delivery_destinations",
  {
    checkoutId: uuid("checkout_id").primaryKey(),
    destinationKind: text("destination_kind").notNull(),
    sourceSavedAddressId: uuid("source_saved_address_id"),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    landmark: text("landmark"),
    locality: text("locality"),
    city: text("city").notNull(),
    stateCode: text("state_code").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_delivery_destinations_checkout_fk",
      columns: [table.checkoutId],
      foreignColumns: [checkoutsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_delivery_destinations_source_address_fk",
      columns: [table.sourceSavedAddressId],
      foreignColumns: [customerAddressesTable.id],
    }).onDelete("set null"),
    check(
      "checkout_delivery_destinations_kind_check",
      sql`${table.destinationKind} in ('SAVED_ADDRESS', 'ONE_TIME_ADDRESS')`,
    ),
    check(
      "checkout_delivery_destinations_saved_provenance_check",
      sql`(
        (
          ${table.destinationKind} = 'SAVED_ADDRESS'
          and ${table.sourceSavedAddressId} is not null
        )
        or
        (
          ${table.destinationKind} = 'ONE_TIME_ADDRESS'
          and ${table.sourceSavedAddressId} is null
        )
      )`,
    ),
    ADDRESS_FIELD_CHECKS.recipientName(table.recipientName, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.recipientPhone(table.recipientPhone, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.addressLine1(table.addressLine1, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.addressLine2(table.addressLine2, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.landmark(table.landmark, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.locality(table.locality, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.city(table.city, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.stateCode(table.stateCode, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.postalCode(table.postalCode, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.label(table.label, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.coordPair(
      table.latitude,
      table.longitude,
      "checkout_delivery_destinations",
    ),
    ADDRESS_FIELD_CHECKS.latRange(table.latitude, "checkout_delivery_destinations"),
    ADDRESS_FIELD_CHECKS.lngRange(table.longitude, "checkout_delivery_destinations"),
    check(
      "checkout_delivery_destinations_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const checkoutSnapshotsTable = appSchema.table(
  "checkout_snapshots",
  {
    id: uuid("id").primaryKey(),
    checkoutId: uuid("checkout_id").notNull(),
    checkoutRevision: bigint("checkout_revision", { mode: "bigint" }).notNull(),
    sourceCartRevision: bigint("source_cart_revision", { mode: "bigint" }).notNull(),
    selectedOutletId: uuid("selected_outlet_id").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    serviceabilityEvaluatedAt: timestamp("serviceability_evaluated_at", {
      withTimezone: true,
    }).notNull(),
    currency: text("currency").notNull(),
    manualCouponCode: text("manual_coupon_code"),
    destinationKind: text("destination_kind").notNull(),
    sourceSavedAddressId: uuid("source_saved_address_id"),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    landmark: text("landmark"),
    locality: text("locality"),
    city: text("city").notNull(),
    stateCode: text("state_code").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    label: text("label"),
    basePaise: paise("base_paise").notNull(),
    modifierAdjustmentsPaise: paise("modifier_adjustments_paise").notNull(),
    bundleAdjustmentsPaise: paise("bundle_adjustments_paise").notNull(),
    chargesPaise: paise("charges_paise").notNull(),
    prePromotionSubtotalPaise: paise("pre_promotion_subtotal_paise").notNull(),
    promotionDiscountPaise: paise("promotion_discount_paise").notNull(),
    taxablePaise: paise("taxable_paise").notNull(),
    taxPaise: paise("tax_paise").notNull(),
    grandTotalPaise: paise("grand_total_paise").notNull(),
    taxInclusionMode: text("tax_inclusion_mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshots_checkout_fk",
      columns: [table.checkoutId],
      foreignColumns: [checkoutsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshots_outlet_fk",
      columns: [table.selectedOutletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    // Required target for checkouts_active_snapshot_ownership_fk
    // (active_snapshot_id, checkouts.id) → (snapshots.id, snapshots.checkout_id).
    uniqueIndex("checkout_snapshots_id_checkout_id_uidx").on(
      table.id,
      table.checkoutId,
    ),
    uniqueIndex("checkout_snapshots_checkout_revision_uidx").on(
      table.checkoutId,
      table.checkoutRevision,
    ),
    check(
      "checkout_snapshots_checkout_revision_positive_check",
      sql`${table.checkoutRevision} > 0`,
    ),
    check(
      "checkout_snapshots_source_cart_revision_positive_check",
      sql`${table.sourceCartRevision} > 0`,
    ),
    check(
      "checkout_snapshots_currency_check",
      sql`${table.currency} = 'INR'`,
    ),
    check(
      "checkout_snapshots_destination_kind_check",
      sql`${table.destinationKind} in ('SAVED_ADDRESS', 'ONE_TIME_ADDRESS')`,
    ),
    check(
      "checkout_snapshots_tax_inclusion_mode_check",
      sql`${table.taxInclusionMode} in ('exclusive', 'inclusive')`,
    ),
    check(
      "checkout_snapshots_manual_coupon_code_nonempty_check",
      sql`${table.manualCouponCode} is null or length(trim(${table.manualCouponCode})) > 0`,
    ),
    ADDRESS_FIELD_CHECKS.recipientName(table.recipientName, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.recipientPhone(table.recipientPhone, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.addressLine1(table.addressLine1, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.addressLine2(table.addressLine2, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.landmark(table.landmark, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.locality(table.locality, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.city(table.city, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.stateCode(table.stateCode, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.postalCode(table.postalCode, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.label(table.label, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.coordPair(table.latitude, table.longitude, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.latRange(table.latitude, "checkout_snapshots"),
    ADDRESS_FIELD_CHECKS.lngRange(table.longitude, "checkout_snapshots"),
    check(
      "checkout_snapshots_base_paise_nonnegative_check",
      sql`${table.basePaise} >= 0`,
    ),
    check(
      "checkout_snapshots_modifier_adjustments_paise_nonnegative_check",
      sql`${table.modifierAdjustmentsPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_bundle_adjustments_paise_nonnegative_check",
      sql`${table.bundleAdjustmentsPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_charges_paise_nonnegative_check",
      sql`${table.chargesPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_pre_promotion_subtotal_paise_nonnegative_check",
      sql`${table.prePromotionSubtotalPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_promotion_discount_paise_nonnegative_check",
      sql`${table.promotionDiscountPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_taxable_paise_nonnegative_check",
      sql`${table.taxablePaise} >= 0`,
    ),
    check(
      "checkout_snapshots_tax_paise_nonnegative_check",
      sql`${table.taxPaise} >= 0`,
    ),
    check(
      "checkout_snapshots_grand_total_paise_nonnegative_check",
      sql`${table.grandTotalPaise} >= 0`,
    ),
    index("checkout_snapshots_checkout_id_idx").on(table.checkoutId),
  ],
);

export const checkoutSnapshotLinesTable = appSchema.table(
  "checkout_snapshot_lines",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id").notNull(),
    sourceCartLineId: uuid("source_cart_line_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    productName: text("product_name").notNull(),
    variantName: text("variant_name").notNull(),
    quantity: integer("quantity").notNull(),
    lineBasePaise: paise("line_base_paise").notNull(),
    lineModifierAdjustmentsPaise: paise("line_modifier_adjustments_paise").notNull(),
    lineBundleAdjustmentsPaise: paise("line_bundle_adjustments_paise").notNull(),
    lineSubtotalPaise: paise("line_subtotal_paise").notNull(),
    linePromotionDiscountPaise: paise("line_promotion_discount_paise").notNull(),
    lineTaxablePaise: paise("line_taxable_paise").notNull(),
    lineTaxPaise: paise("line_tax_paise").notNull(),
    lineTotalPaise: paise("line_total_paise").notNull(),
    sequence: integer("sequence").notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshot_lines_snapshot_fk",
      columns: [table.snapshotId],
      foreignColumns: [checkoutSnapshotsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshot_lines_product_fk",
      columns: [table.productId],
      foreignColumns: [catalogProductsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkout_snapshot_lines_variant_fk",
      columns: [table.variantId],
      foreignColumns: [catalogVariantsTable.id],
    }).onDelete("restrict"),
    check(
      "checkout_snapshot_lines_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "checkout_snapshot_lines_sequence_nonnegative_check",
      sql`${table.sequence} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_product_name_nonempty_check",
      sql`length(trim(${table.productName})) > 0`,
    ),
    check(
      "checkout_snapshot_lines_variant_name_nonempty_check",
      sql`length(trim(${table.variantName})) > 0`,
    ),
    check(
      "checkout_snapshot_lines_line_base_paise_nonnegative_check",
      sql`${table.lineBasePaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_modifier_adjustments_paise_nonnegative_check",
      sql`${table.lineModifierAdjustmentsPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_bundle_adjustments_paise_nonnegative_check",
      sql`${table.lineBundleAdjustmentsPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_subtotal_paise_nonnegative_check",
      sql`${table.lineSubtotalPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_promotion_discount_paise_nonnegative_check",
      sql`${table.linePromotionDiscountPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_taxable_paise_nonnegative_check",
      sql`${table.lineTaxablePaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_tax_paise_nonnegative_check",
      sql`${table.lineTaxPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_lines_line_total_paise_nonnegative_check",
      sql`${table.lineTotalPaise} >= 0`,
    ),
    index("checkout_snapshot_lines_snapshot_id_idx").on(table.snapshotId),
  ],
);

export const checkoutSnapshotLineModifierSelectionsTable = appSchema.table(
  "checkout_snapshot_line_modifier_selections",
  {
    snapshotLineId: uuid("snapshot_line_id").notNull(),
    variantModifierGroupId: uuid("variant_modifier_group_id").notNull(),
    modifierGroupOptionId: uuid("modifier_group_option_id").notNull(),
    quantity: integer("quantity").notNull(),
    groupName: text("group_name").notNull(),
    optionName: text("option_name").notNull(),
    unitDeltaPaise: paise("unit_delta_paise").notNull(),
  },
  (table) => [
    primaryKey({
      name: "checkout_snapshot_line_modifier_selections_pk",
      columns: [
        table.snapshotLineId,
        table.variantModifierGroupId,
        table.modifierGroupOptionId,
      ],
    }),
    foreignKey({
      name: "checkout_snapshot_line_modifier_selections_line_fk",
      columns: [table.snapshotLineId],
      foreignColumns: [checkoutSnapshotLinesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshot_line_modifier_selections_vmg_fk",
      columns: [table.variantModifierGroupId],
      foreignColumns: [catalogVariantModifierGroupsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkout_snapshot_line_modifier_selections_mgo_fk",
      columns: [table.modifierGroupOptionId],
      foreignColumns: [catalogModifierGroupOptionsTable.id],
    }).onDelete("restrict"),
    check(
      "checkout_snapshot_line_modifier_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "checkout_snapshot_line_modifier_selections_group_name_nonempty_check",
      sql`length(trim(${table.groupName})) > 0`,
    ),
    check(
      "checkout_snapshot_line_modifier_selections_option_name_nonempty_check",
      sql`length(trim(${table.optionName})) > 0`,
    ),
  ],
);

export const checkoutSnapshotLineBundleSelectionsTable = appSchema.table(
  "checkout_snapshot_line_bundle_selections",
  {
    id: uuid("id").primaryKey(),
    snapshotLineId: uuid("snapshot_line_id").notNull(),
    bundleGroupOptionId: uuid("bundle_group_option_id").notNull(),
    selectedVariantId: uuid("selected_variant_id").notNull(),
    quantity: integer("quantity").notNull(),
    groupName: text("group_name").notNull(),
    optionName: text("option_name").notNull(),
    variantName: text("variant_name").notNull(),
    unitDeltaPaise: paise("unit_delta_paise").notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshot_line_bundle_selections_line_fk",
      columns: [table.snapshotLineId],
      foreignColumns: [checkoutSnapshotLinesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshot_line_bundle_selections_bgo_fk",
      columns: [table.bundleGroupOptionId],
      foreignColumns: [catalogBundleGroupOptionsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkout_snapshot_line_bundle_selections_variant_fk",
      columns: [table.selectedVariantId],
      foreignColumns: [catalogVariantsTable.id],
    }).onDelete("restrict"),
    check(
      "checkout_snapshot_line_bundle_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "checkout_snapshot_line_bundle_selections_group_name_nonempty_check",
      sql`length(trim(${table.groupName})) > 0`,
    ),
    check(
      "checkout_snapshot_line_bundle_selections_option_name_nonempty_check",
      sql`length(trim(${table.optionName})) > 0`,
    ),
    check(
      "checkout_snapshot_line_bundle_selections_variant_name_nonempty_check",
      sql`length(trim(${table.variantName})) > 0`,
    ),
    index("checkout_snapshot_line_bundle_selections_line_id_idx").on(
      table.snapshotLineId,
    ),
  ],
);

export const checkoutSnapshotLineBundleModifierSelectionsTable = appSchema.table(
  "checkout_snapshot_line_bundle_modifier_selections",
  {
    snapshotLineBundleSelectionId: uuid(
      "snapshot_line_bundle_selection_id",
    ).notNull(),
    variantModifierGroupId: uuid("variant_modifier_group_id").notNull(),
    modifierGroupOptionId: uuid("modifier_group_option_id").notNull(),
    quantity: integer("quantity").notNull(),
    groupName: text("group_name").notNull(),
    optionName: text("option_name").notNull(),
    unitDeltaPaise: paise("unit_delta_paise").notNull(),
  },
  (table) => [
    primaryKey({
      name: "checkout_snapshot_line_bundle_modifier_selections_pk",
      columns: [
        table.snapshotLineBundleSelectionId,
        table.variantModifierGroupId,
        table.modifierGroupOptionId,
      ],
    }),
    foreignKey({
      name: "checkout_snapshot_line_bundle_modifier_selections_bundle_sel_fk",
      columns: [table.snapshotLineBundleSelectionId],
      foreignColumns: [checkoutSnapshotLineBundleSelectionsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshot_line_bundle_modifier_selections_vmg_fk",
      columns: [table.variantModifierGroupId],
      foreignColumns: [catalogVariantModifierGroupsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "checkout_snapshot_line_bundle_modifier_selections_mgo_fk",
      columns: [table.modifierGroupOptionId],
      foreignColumns: [catalogModifierGroupOptionsTable.id],
    }).onDelete("restrict"),
    check(
      "checkout_snapshot_line_bundle_modifier_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "checkout_snapshot_line_bundle_modifier_selections_group_name_nonempty_check",
      sql`length(trim(${table.groupName})) > 0`,
    ),
    check(
      "checkout_snapshot_line_bundle_modifier_selections_option_name_nonempty_check",
      sql`length(trim(${table.optionName})) > 0`,
    ),
  ],
);

export const checkoutSnapshotChargesTable = appSchema.table(
  "checkout_snapshot_charges",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id").notNull(),
    chargeDefinitionId: uuid("charge_definition_id").notNull(),
    chargeCode: text("charge_code").notNull(),
    calculationMode: text("calculation_mode").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshot_charges_snapshot_fk",
      columns: [table.snapshotId],
      foreignColumns: [checkoutSnapshotsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_snapshot_charges_definition_fk",
      columns: [table.chargeDefinitionId],
      foreignColumns: [chargeDefinitionsTable.id],
    }).onDelete("restrict"),
    check(
      "checkout_snapshot_charges_code_check",
      sql`${table.chargeCode} in ('packaging', 'delivery')`,
    ),
    check(
      "checkout_snapshot_charges_calculation_mode_check",
      sql`${table.calculationMode} in ('fixed_per_order', 'per_item_quantity')`,
    ),
    check(
      "checkout_snapshot_charges_amount_paise_nonnegative_check",
      sql`${table.amountPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_charges_name_nonempty_check",
      sql`length(trim(${table.name})) > 0`,
    ),
    check(
      "checkout_snapshot_charges_sort_order_nonnegative_check",
      sql`${table.sortOrder} >= 0`,
    ),
    index("checkout_snapshot_charges_snapshot_id_idx").on(table.snapshotId),
  ],
);

export const checkoutSnapshotPromotionEffectsTable = appSchema.table(
  "checkout_snapshot_promotion_effects",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id").notNull(),
    effectKind: text("effect_kind").notNull(),
    promotionId: uuid("promotion_id").notNull(),
    couponId: uuid("coupon_id"),
    promotionCode: text("promotion_code").notNull(),
    displayName: text("display_name").notNull(),
    triggerType: text("trigger_type"),
    stackingPolicy: text("stacking_policy"),
    componentId: text("component_id"),
    lineId: uuid("line_id"),
    amountPaise: paise("amount_paise"),
    realizedDiscountPaise: paise("realized_discount_paise"),
    rewardVariantId: uuid("reward_variant_id"),
    rewardUnitId: text("reward_unit_id"),
    rewardQuantity: integer("reward_quantity"),
    rewardBasePaise: paise("reward_base_paise"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshot_promotion_effects_snapshot_fk",
      columns: [table.snapshotId],
      foreignColumns: [checkoutSnapshotsTable.id],
    }).onDelete("cascade"),
    check(
      "checkout_snapshot_promotion_effects_kind_check",
      sql`${table.effectKind} in (
        'monetary_allocation',
        'applied_promotion',
        'bogo_reward'
      )`,
    ),
    check(
      "checkout_snapshot_promotion_effects_promotion_code_nonempty_check",
      sql`length(trim(${table.promotionCode})) > 0`,
    ),
    check(
      "checkout_snapshot_promotion_effects_display_name_nonempty_check",
      sql`length(trim(${table.displayName})) > 0`,
    ),
    check(
      "checkout_snapshot_promotion_effects_sort_order_nonnegative_check",
      sql`${table.sortOrder} >= 0`,
    ),
    check(
      "checkout_snapshot_promotion_effects_reward_quantity_positive_check",
      sql`${table.rewardQuantity} is null or ${table.rewardQuantity} > 0`,
    ),
    index("checkout_snapshot_promotion_effects_snapshot_id_idx").on(table.snapshotId),
  ],
);

export const checkoutSnapshotTaxComponentsTable = appSchema.table(
  "checkout_snapshot_tax_components",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id").notNull(),
    targetContext: text("target_context").notNull(),
    taxType: text("tax_type").notNull(),
    rateBps: integer("rate_bps").notNull(),
    taxableAmountPaise: paise("taxable_amount_paise").notNull(),
    taxAmountPaise: paise("tax_amount_paise").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    foreignKey({
      name: "checkout_snapshot_tax_components_snapshot_fk",
      columns: [table.snapshotId],
      foreignColumns: [checkoutSnapshotsTable.id],
    }).onDelete("cascade"),
    check(
      "checkout_snapshot_tax_components_target_context_nonempty_check",
      sql`length(trim(${table.targetContext})) > 0`,
    ),
    check(
      "checkout_snapshot_tax_components_tax_type_check",
      sql`${table.taxType} in ('cgst', 'sgst', 'utgst', 'igst')`,
    ),
    check(
      "checkout_snapshot_tax_components_rate_bps_nonnegative_check",
      sql`${table.rateBps} >= 0`,
    ),
    check(
      "checkout_snapshot_tax_components_taxable_amount_paise_nonnegative_check",
      sql`${table.taxableAmountPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_tax_components_tax_amount_paise_nonnegative_check",
      sql`${table.taxAmountPaise} >= 0`,
    ),
    check(
      "checkout_snapshot_tax_components_sort_order_nonnegative_check",
      sql`${table.sortOrder} >= 0`,
    ),
    index("checkout_snapshot_tax_components_snapshot_id_idx").on(table.snapshotId),
  ],
);
