/**
 * Drizzle schema for Cart core persistence (IMP-020).
 *
 * Exactly five `app.*` tables. Owner XOR is customer XOR guest (DB CHECKs).
 * No outlet/address/price/tax columns. No
 * configuration JSON authority — line configuration is normalized relational child tables.
 * No workforce permissions or business seed data in this slice.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  catalogBundleGroupOptionsTable,
  catalogModifierGroupOptionsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "./catalog";
import { customerAuthUsers } from "./customer-auth";
import { appSchema } from "./index";
import { brandsTable } from "./organizations";

export const cartsTable = appSchema.table(
  "carts",
  {
    id: uuid("id").primaryKey(),
    brandId: uuid("brand_id").notNull(),
    customerAuthUserId: text("customer_auth_user_id"),
    guestCredentialVerifier: text("guest_credential_verifier"),
    manualCouponCode: text("manual_coupon_code"),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "carts_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "carts_customer_auth_user_fk",
      columns: [table.customerAuthUserId],
      foreignColumns: [customerAuthUsers.id],
    }).onDelete("restrict"),
    // Customer XOR guest ownership — exactly one mode.
    check(
      "carts_owner_xor_check",
      sql`(
        (
          ${table.customerAuthUserId} is not null
          and ${table.guestCredentialVerifier} is null
          and ${table.expiresAt} is null
        )
        or
        (
          ${table.customerAuthUserId} is null
          and ${table.guestCredentialVerifier} is not null
          and ${table.expiresAt} is not null
        )
      )`,
    ),
    check(
      "carts_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "carts_guest_credential_verifier_sha256_hex_check",
      sql`${table.guestCredentialVerifier} is null or ${table.guestCredentialVerifier} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "carts_manual_coupon_code_nonempty_check",
      sql`${table.manualCouponCode} is null or length(trim(${table.manualCouponCode})) > 0`,
    ),
    check(
      "carts_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    // At most one customer Cart per Brand.
    uniqueIndex("carts_customer_brand_uidx")
      .on(table.customerAuthUserId, table.brandId)
      .where(sql`${table.customerAuthUserId} is not null`),
    // Guest verifier unique when present.
    uniqueIndex("carts_guest_credential_verifier_uidx")
      .on(table.guestCredentialVerifier)
      .where(sql`${table.guestCredentialVerifier} is not null`),
    // Expired-guest cleanup support.
    index("carts_expires_at_idx")
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} is not null`),
  ],
);

export const cartLinesTable = appSchema.table(
  "cart_lines",
  {
    id: uuid("id").primaryKey(),
    cartId: uuid("cart_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    foreignKey({
      name: "cart_lines_cart_fk",
      columns: [table.cartId],
      foreignColumns: [cartsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "cart_lines_variant_fk",
      columns: [table.variantId],
      foreignColumns: [catalogVariantsTable.id],
    }).onDelete("restrict"),
    check("cart_lines_quantity_positive_check", sql`${table.quantity} > 0`),
    index("cart_lines_cart_id_idx").on(table.cartId),
  ],
);

export const cartLineModifierSelectionsTable = appSchema.table(
  "cart_line_modifier_selections",
  {
    cartLineId: uuid("cart_line_id").notNull(),
    variantModifierGroupId: uuid("variant_modifier_group_id").notNull(),
    modifierGroupOptionId: uuid("modifier_group_option_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({
      name: "cart_line_modifier_selections_pk",
      columns: [
        table.cartLineId,
        table.variantModifierGroupId,
        table.modifierGroupOptionId,
      ],
    }),
    foreignKey({
      name: "cart_line_modifier_selections_line_fk",
      columns: [table.cartLineId],
      foreignColumns: [cartLinesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "cart_line_modifier_selections_vmg_fk",
      columns: [table.variantModifierGroupId],
      foreignColumns: [catalogVariantModifierGroupsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "cart_line_modifier_selections_mgo_fk",
      columns: [table.modifierGroupOptionId],
      foreignColumns: [catalogModifierGroupOptionsTable.id],
    }).onDelete("restrict"),
    check(
      "cart_line_modifier_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
  ],
);

export const cartLineBundleSelectionsTable = appSchema.table(
  "cart_line_bundle_selections",
  {
    id: uuid("id").primaryKey(),
    cartLineId: uuid("cart_line_id").notNull(),
    bundleGroupOptionId: uuid("bundle_group_option_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    foreignKey({
      name: "cart_line_bundle_selections_line_fk",
      columns: [table.cartLineId],
      foreignColumns: [cartLinesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "cart_line_bundle_selections_bgo_fk",
      columns: [table.bundleGroupOptionId],
      foreignColumns: [catalogBundleGroupOptionsTable.id],
    }).onDelete("restrict"),
    check(
      "cart_line_bundle_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
    index("cart_line_bundle_selections_line_id_idx").on(table.cartLineId),
  ],
);

export const cartLineBundleModifierSelectionsTable = appSchema.table(
  "cart_line_bundle_modifier_selections",
  {
    cartLineBundleSelectionId: uuid("cart_line_bundle_selection_id").notNull(),
    variantModifierGroupId: uuid("variant_modifier_group_id").notNull(),
    modifierGroupOptionId: uuid("modifier_group_option_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({
      name: "cart_line_bundle_modifier_selections_pk",
      columns: [
        table.cartLineBundleSelectionId,
        table.variantModifierGroupId,
        table.modifierGroupOptionId,
      ],
    }),
    foreignKey({
      name: "cart_line_bundle_modifier_selections_bundle_sel_fk",
      columns: [table.cartLineBundleSelectionId],
      foreignColumns: [cartLineBundleSelectionsTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "cart_line_bundle_modifier_selections_vmg_fk",
      columns: [table.variantModifierGroupId],
      foreignColumns: [catalogVariantModifierGroupsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "cart_line_bundle_modifier_selections_mgo_fk",
      columns: [table.modifierGroupOptionId],
      foreignColumns: [catalogModifierGroupOptionsTable.id],
    }).onDelete("restrict"),
    check(
      "cart_line_bundle_modifier_selections_quantity_positive_check",
      sql`${table.quantity} > 0`,
    ),
  ],
);
