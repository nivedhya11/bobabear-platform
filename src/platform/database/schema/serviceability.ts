/**
 * Drizzle schema for Outlet Serviceability (IMP-019).
 *
 * Exactly three `app.*` tables. V1 geographic coverage is an explicit
 * per-Outlet Indian PIN positive list. Audit is append-only.
 * Pricing, cart, PostGIS, and persisted evaluation results are out of scope.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";
import { outletsTable } from "./organizations";

export const outletServiceabilityConfigsTable = appSchema.table(
  "outlet_serviceability_configs",
  {
    outletId: uuid("outlet_id").primaryKey(),
    routingPriority: integer("routing_priority").notNull(),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    serviceOriginLatitude: numeric("service_origin_latitude", { precision: 10, scale: 7 }),
    serviceOriginLongitude: numeric("service_origin_longitude", { precision: 10, scale: 7 }),
    maxServiceDistanceMeters: integer("max_service_distance_meters"),
    deliveryFeeBands: jsonb("delivery_fee_bands"),
    freeDeliverySubtotalThresholdPaise: bigint("free_delivery_subtotal_threshold_paise", {
      mode: "bigint",
    }),
  },
  (table) => [
    foreignKey({
      name: "outlet_serviceability_configs_outlet_fk",
      columns: [table.outletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    check(
      "outlet_serviceability_configs_routing_priority_positive_check",
      sql`${table.routingPriority} > 0`,
    ),
    check(
      "outlet_serviceability_configs_revision_positive_check",
      sql`${table.revision} > 0`,
    ),
    check(
      "outlet_serviceability_configs_origin_pair_check",
      sql`(${table.serviceOriginLatitude} is null) = (${table.serviceOriginLongitude} is null)`,
    ),
    check(
      "outlet_serviceability_configs_origin_latitude_range_check",
      sql`${table.serviceOriginLatitude} is null or (${table.serviceOriginLatitude} >= -90 and ${table.serviceOriginLatitude} <= 90)`,
    ),
    check(
      "outlet_serviceability_configs_origin_longitude_range_check",
      sql`${table.serviceOriginLongitude} is null or (${table.serviceOriginLongitude} >= -180 and ${table.serviceOriginLongitude} <= 180)`,
    ),
    check(
      "outlet_serviceability_configs_max_distance_positive_check",
      sql`${table.maxServiceDistanceMeters} is null or ${table.maxServiceDistanceMeters} > 0`,
    ),
    check(
      "outlet_serviceability_configs_distance_requires_origin_check",
      sql`${table.maxServiceDistanceMeters} is null or (${table.serviceOriginLatitude} is not null and ${table.serviceOriginLongitude} is not null)`,
    ),
  ],
);

export const outletServiceabilityPinsTable = appSchema.table(
  "outlet_serviceability_pins",
  {
    outletId: uuid("outlet_id").notNull(),
    postalCode: text("postal_code").notNull(),
  },
  (table) => [
    primaryKey({
      name: "outlet_serviceability_pins_pk",
      columns: [table.outletId, table.postalCode],
    }),
    foreignKey({
      name: "outlet_serviceability_pins_config_fk",
      columns: [table.outletId],
      foreignColumns: [outletServiceabilityConfigsTable.outletId],
    }).onDelete("cascade"),
    check(
      "outlet_serviceability_pins_postal_code_check",
      sql`${table.postalCode} ~ '^[1-9][0-9]{5}$'`,
    ),
    // PIN-first lookup for Brand-scoped candidate resolution.
    index("outlet_serviceability_pins_postal_outlet_idx").on(
      table.postalCode,
      table.outletId,
    ),
  ],
);

export const outletServiceabilityAuditEventsTable = appSchema.table(
  "outlet_serviceability_audit_events",
  {
    id: uuid("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorKind: text("actor_kind").notNull(),
    actorId: text("actor_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    action: text("action").notNull(),
    previousRevision: bigint("previous_revision", { mode: "bigint" }),
    newRevision: bigint("new_revision", { mode: "bigint" }).notNull(),
    previousRoutingPriority: integer("previous_routing_priority"),
    newRoutingPriority: integer("new_routing_priority"),
    addedPostalCodes: text("added_postal_codes").array().notNull(),
    removedPostalCodes: text("removed_postal_codes").array().notNull(),
    previousServiceOriginLatitude: numeric("previous_service_origin_latitude", {
      precision: 10,
      scale: 7,
    }),
    newServiceOriginLatitude: numeric("new_service_origin_latitude", {
      precision: 10,
      scale: 7,
    }),
    previousServiceOriginLongitude: numeric("previous_service_origin_longitude", {
      precision: 10,
      scale: 7,
    }),
    newServiceOriginLongitude: numeric("new_service_origin_longitude", {
      precision: 10,
      scale: 7,
    }),
    previousMaxServiceDistanceMeters: integer("previous_max_service_distance_meters"),
    newMaxServiceDistanceMeters: integer("new_max_service_distance_meters"),
  },
  (table) => [
    // No FK to current config — history must survive later state changes.
    // Outlet FK uses restrict so hard-delete cannot silently erase audit.
    foreignKey({
      name: "outlet_serviceability_audit_events_outlet_fk",
      columns: [table.outletId],
      foreignColumns: [outletsTable.id],
    }).onDelete("restrict"),
    check(
      "outlet_serviceability_audit_events_actor_kind_check",
      sql`${table.actorKind} = 'workforce'`,
    ),
    check(
      "outlet_serviceability_audit_events_actor_id_nonempty_check",
      sql`length(trim(${table.actorId})) > 0`,
    ),
    check(
      "outlet_serviceability_audit_events_action_check",
      sql`${table.action} in ('serviceability_routing_priority_set', 'serviceability_pins_added', 'serviceability_pins_removed', 'serviceability_pins_replaced', 'serviceability_distance_policy_set')`,
    ),
    check(
      "outlet_serviceability_audit_events_new_revision_positive_check",
      sql`${table.newRevision} > 0`,
    ),
    check(
      "outlet_serviceability_audit_events_previous_revision_positive_check",
      sql`${table.previousRevision} is null or ${table.previousRevision} > 0`,
    ),
    unique("outlet_serviceability_audit_events_outlet_new_revision_key").on(
      table.outletId,
      table.newRevision,
    ),
    index("outlet_serviceability_audit_events_outlet_occurred_idx").on(
      table.outletId,
      table.occurredAt,
    ),
    index("outlet_serviceability_audit_events_action_occurred_idx").on(
      table.action,
      table.occurredAt,
    ),
  ],
);
