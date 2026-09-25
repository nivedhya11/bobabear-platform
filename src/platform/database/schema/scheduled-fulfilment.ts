/**
 * IMP-036I Tranche 1 persistence.
 *
 * Brand cancellation policy, Outlet scheduling profile, and future full-day
 * Outlet closure. No Slot aggregate, capacity, or scheduler.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";
import { brandsTable, outletsTable } from "./organizations";

export const brandScheduledFulfilmentPoliciesTable = appSchema.table(
  "brand_scheduled_fulfilment_policies",
  {
    brandId: uuid("brand_id").primaryKey(),
    pickupCancellationCutoffMinutes: integer("pickup_cancellation_cutoff_minutes")
      .notNull()
      .default(30),
    deliveryCancellationCutoffMinutes: integer("delivery_cancellation_cutoff_minutes")
      .notNull()
      .default(60),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "brand_scheduled_fulfilment_policies_brand_fk",
      columns: [table.brandId],
      foreignColumns: [brandsTable.id],
    }).onDelete("restrict"),
    check(
      "brand_scheduled_fulfilment_policies_pickup_cutoff_check",
      sql`${table.pickupCancellationCutoffMinutes} between 0 and 240`,
    ),
    check(
      "brand_scheduled_fulfilment_policies_delivery_cutoff_check",
      sql`${table.deliveryCancellationCutoffMinutes} between 0 and 240`,
    ),
    check(
      "brand_scheduled_fulfilment_policies_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "brand_scheduled_fulfilment_policies_updated_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const outletSchedulingProfilesTable = appSchema.table(
  "outlet_scheduling_profiles",
  {
    outletId: uuid("outlet_id").primaryKey(),
    pickupMinLeadMinutes: integer("pickup_min_lead_minutes").notNull(),
    deliveryMinLeadMinutes: integer("delivery_min_lead_minutes").notNull(),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "outlet_scheduling_profiles_outlet_fk",
      columns: [table.outletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    check(
      "outlet_scheduling_profiles_pickup_lead_check",
      sql`${table.pickupMinLeadMinutes} > 0`,
    ),
    check(
      "outlet_scheduling_profiles_delivery_lead_check",
      sql`${table.deliveryMinLeadMinutes} > 0`,
    ),
    check(
      "outlet_scheduling_profiles_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "outlet_scheduling_profiles_updated_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const outletOperatingDateExceptionsTable = appSchema.table(
  "outlet_operating_date_exceptions",
  {
    id: uuid("id").primaryKey(),
    outletId: uuid("outlet_id").notNull(),
    localDate: date("local_date", { mode: "string" }).notNull(),
    exceptionKind: text("exception_kind").notNull(),
    note: text("note"),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "outlet_operating_date_exceptions_outlet_fk",
      columns: [table.outletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("outlet_operating_date_exceptions_outlet_date_uidx").on(
      table.outletId,
      table.localDate,
    ),
    check(
      "outlet_operating_date_exceptions_kind_check",
      sql`${table.exceptionKind} = 'CLOSED_FULL_DAY'`,
    ),
    check(
      "outlet_operating_date_exceptions_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "outlet_operating_date_exceptions_updated_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);
