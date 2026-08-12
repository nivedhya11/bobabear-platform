/**
 * Drizzle schema for Saved Customer Addresses (IMP-018).
 *
 * Exactly two `app.*` tables. Ownership is via customer_auth_users only —
 * no Profile FK, no soft-delete lifecycle, no serviceability/geography columns.
 * Audit is append-only and survives Address hard deletion (no live Address FK).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { customerAuthUsers } from "./customer-auth";
import { appSchema } from "./index";

export const customerAddressesTable = appSchema.table(
  "customer_addresses",
  {
    id: uuid("id").primaryKey(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
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
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "customer_addresses_customer_auth_user_fk",
      columns: [table.customerAuthUserId],
      foreignColumns: [customerAuthUsers.id],
    }).onDelete("restrict"),
    check(
      "customer_addresses_recipient_name_length_check",
      sql`char_length(${table.recipientName}) between 1 and 100`,
    ),
    check(
      "customer_addresses_recipient_phone_nonempty_check",
      sql`length(trim(${table.recipientPhone})) > 0`,
    ),
    check(
      "customer_addresses_address_line_1_length_check",
      sql`char_length(${table.addressLine1}) between 1 and 200`,
    ),
    check(
      "customer_addresses_address_line_2_length_check",
      sql`${table.addressLine2} is null or char_length(${table.addressLine2}) between 1 and 200`,
    ),
    check(
      "customer_addresses_landmark_length_check",
      sql`${table.landmark} is null or char_length(${table.landmark}) between 1 and 150`,
    ),
    check(
      "customer_addresses_locality_length_check",
      sql`${table.locality} is null or char_length(${table.locality}) between 1 and 120`,
    ),
    check(
      "customer_addresses_city_length_check",
      sql`char_length(${table.city}) between 1 and 100`,
    ),
    check(
      "customer_addresses_state_code_nonempty_check",
      sql`length(trim(${table.stateCode})) > 0`,
    ),
    check(
      "customer_addresses_postal_code_check",
      sql`${table.postalCode} ~ '^[1-9][0-9]{5}$'`,
    ),
    check(
      "customer_addresses_coordinates_pair_check",
      sql`(${table.latitude} is null) = (${table.longitude} is null)`,
    ),
    check(
      "customer_addresses_latitude_range_check",
      sql`${table.latitude} is null or (${table.latitude} >= -90 and ${table.latitude} <= 90)`,
    ),
    check(
      "customer_addresses_longitude_range_check",
      sql`${table.longitude} is null or (${table.longitude} >= -180 and ${table.longitude} <= 180)`,
    ),
    check(
      "customer_addresses_label_length_check",
      sql`${table.label} is null or char_length(${table.label}) between 1 and 50`,
    ),
    // At most one default Address per customer; zero defaults remain valid.
    uniqueIndex("customer_addresses_one_default_per_customer_uidx")
      .on(table.customerAuthUserId)
      .where(sql`${table.isDefault} = true`),
    // List by owner with deterministic ordering support.
    index("customer_addresses_owner_list_idx").on(
      table.customerAuthUserId,
      table.isDefault,
      table.createdAt,
      table.id,
    ),
  ],
);

export const customerAddressAuditEventsTable = appSchema.table(
  "customer_address_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorKind: text("actor_kind").notNull(),
    actorId: text("actor_id").notNull(),
    addressId: uuid("address_id").notNull(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
    action: text("action").notNull(),
    affectedFields: jsonb("affected_fields").notNull().default([]),
    previousDefaultAddressId: uuid("previous_default_address_id"),
  },
  (table) => [
    check(
      "customer_address_audit_events_actor_kind_check",
      sql`${table.actorKind} = 'customer'`,
    ),
    check(
      "customer_address_audit_events_actor_id_nonempty_check",
      sql`length(trim(${table.actorId})) > 0`,
    ),
    check(
      "customer_address_audit_events_customer_auth_user_id_nonempty_check",
      sql`length(trim(${table.customerAuthUserId})) > 0`,
    ),
    check(
      "customer_address_audit_events_action_check",
      sql`${table.action} in ('address_created', 'address_updated', 'address_deleted', 'address_default_set', 'address_default_cleared')`,
    ),
    check(
      "customer_address_audit_events_affected_fields_array_check",
      sql`jsonb_typeof(${table.affectedFields}) = 'array'`,
    ),
    check(
      "customer_address_audit_events_previous_default_usage_check",
      sql`(${table.action} = 'address_default_set') or (${table.previousDefaultAddressId} is null)`,
    ),
    index("customer_address_audit_events_address_occurred_idx").on(
      table.addressId,
      table.occurredAt,
    ),
    index("customer_address_audit_events_auth_user_occurred_idx").on(
      table.customerAuthUserId,
      table.occurredAt,
    ),
    index("customer_address_audit_events_action_occurred_idx").on(
      table.action,
      table.occurredAt,
    ),
  ],
);
