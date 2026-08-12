/**
 * Drizzle schema for Customer Profiles (IMP-017).
 *
 * Exactly two `app.*` tables. Customer Profile is platform/customer-owned —
 * no Brand/Outlet scope, no phone column (auth-owned), no soft-delete status.
 * Audit is append-only and survives Profile hard deletion (no live Profile FK).
 */
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { customerAuthUsers } from "./customer-auth";
import { appSchema } from "./index";

export const customerProfilesTable = appSchema.table(
  "customer_profiles",
  {
    id: uuid("id").primaryKey(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
    givenName: text("given_name").notNull(),
    familyName: text("family_name"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "customer_profiles_customer_auth_user_fk",
      columns: [table.customerAuthUserId],
      foreignColumns: [customerAuthUsers.id],
    }).onDelete("restrict"),
    uniqueIndex("customer_profiles_customer_auth_user_id_uidx").on(
      table.customerAuthUserId,
    ),
    check(
      "customer_profiles_given_name_length_check",
      sql`char_length(${table.givenName}) between 1 and 100`,
    ),
    check(
      "customer_profiles_family_name_length_check",
      sql`${table.familyName} is null or char_length(${table.familyName}) between 1 and 100`,
    ),
    check(
      "customer_profiles_email_length_check",
      sql`${table.email} is null or char_length(${table.email}) <= 254`,
    ),
    index("customer_profiles_updated_at_idx").on(table.updatedAt),
  ],
);

export const customerProfileAuditEventsTable = appSchema.table(
  "customer_profile_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorKind: text("actor_kind").notNull(),
    actorId: text("actor_id").notNull(),
    profileId: uuid("profile_id").notNull(),
    customerAuthUserId: text("customer_auth_user_id").notNull(),
    action: text("action").notNull(),
    affectedFields: jsonb("affected_fields").notNull().default([]),
  },
  (table) => [
    check(
      "customer_profile_audit_events_actor_kind_check",
      sql`${table.actorKind} = 'customer'`,
    ),
    check(
      "customer_profile_audit_events_actor_id_nonempty_check",
      sql`length(trim(${table.actorId})) > 0`,
    ),
    check(
      "customer_profile_audit_events_customer_auth_user_id_nonempty_check",
      sql`length(trim(${table.customerAuthUserId})) > 0`,
    ),
    check(
      "customer_profile_audit_events_action_check",
      sql`${table.action} in ('profile_created', 'profile_updated', 'profile_deleted')`,
    ),
    check(
      "customer_profile_audit_events_affected_fields_array_check",
      sql`jsonb_typeof(${table.affectedFields}) = 'array'`,
    ),
    index("customer_profile_audit_events_profile_occurred_idx").on(
      table.profileId,
      table.occurredAt,
    ),
    index("customer_profile_audit_events_auth_user_occurred_idx").on(
      table.customerAuthUserId,
      table.occurredAt,
    ),
    index("customer_profile_audit_events_action_occurred_idx").on(
      table.action,
      table.occurredAt,
    ),
  ],
);
