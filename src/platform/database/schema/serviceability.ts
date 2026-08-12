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
      sql`${table.action} in ('serviceability_routing_priority_set', 'serviceability_pins_added', 'serviceability_pins_removed', 'serviceability_pins_replaced')`,
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
