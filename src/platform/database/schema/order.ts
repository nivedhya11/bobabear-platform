/**
 * Drizzle schema for Order persistence (IMP-023).
 *
 * Exactly one `app.orders` table. Commercial truth remains on the bound
 * Checkout snapshot; Payment is financial provenance only. No Order lines,
 * snapshots, events, refund, or inventory tables.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { checkoutSnapshotsTable } from "./checkout";
import { appSchema } from "./index";
import { paymentsTable } from "./payment";
import { workforceAuthUsers } from "./workforce-auth";

export const ordersTable = appSchema.table(
  "orders",
  {
    id: uuid("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    checkoutId: uuid("checkout_id").notNull(),
    checkoutSnapshotId: uuid("checkout_snapshot_id").notNull(),
    paymentProvenanceKind: text("payment_provenance_kind").notNull(),
    paymentId: uuid("payment_id"),
    status: text("status").notNull(),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByWorkforceUserId: text("accepted_by_workforce_user_id"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    fulfilledByWorkforceUserId: text("fulfilled_by_workforce_user_id"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledByWorkforceUserId: text("cancelled_by_workforce_user_id"),
    cancellationReasonCode: text("cancellation_reason_code"),
  },
  (table) => [
    foreignKey({
      name: "orders_checkout_snapshot_ownership_fk",
      columns: [table.checkoutSnapshotId, table.checkoutId],
      foreignColumns: [
        checkoutSnapshotsTable.id,
        checkoutSnapshotsTable.checkoutId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "orders_payment_snapshot_ownership_fk",
      columns: [table.paymentId, table.checkoutSnapshotId],
      foreignColumns: [paymentsTable.id, paymentsTable.checkoutSnapshotId],
    }).onDelete("restrict"),
    foreignKey({
      name: "orders_accepted_by_workforce_user_fk",
      columns: [table.acceptedByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "orders_fulfilled_by_workforce_user_fk",
      columns: [table.fulfilledByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "orders_cancelled_by_workforce_user_fk",
      columns: [table.cancelledByWorkforceUserId],
      foreignColumns: [workforceAuthUsers.id],
    }).onDelete("restrict"),
    uniqueIndex("orders_checkout_id_uidx").on(table.checkoutId),
    uniqueIndex("orders_checkout_snapshot_id_uidx").on(table.checkoutSnapshotId),
    uniqueIndex("orders_payment_id_uidx")
      .on(table.paymentId)
      .where(sql`${table.paymentId} is not null`),
    uniqueIndex("orders_order_number_uidx").on(table.orderNumber),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    index("orders_created_at_id_idx").on(table.createdAt, table.id),
    index("orders_order_number_idx").on(table.orderNumber),
    check(
      "orders_order_number_format_check",
      sql`${table.orderNumber} ~ '^ORD-[0-9A-HJKMNP-TV-Z]{12}$'`,
    ),
    check(
      "orders_status_check",
      sql`${table.status} in ('PLACED', 'ACCEPTED', 'FULFILLED', 'CANCELLED')`,
    ),
    check("orders_revision_positive_check", sql`${table.revision} > 0`),
    check(
      "orders_payment_provenance_kind_check",
      sql`${table.paymentProvenanceKind} in ('PAYMENT', 'NO_PAYMENT_REQUIRED')`,
    ),
    check(
      "orders_payment_provenance_shape_check",
      sql`(
        (${table.paymentProvenanceKind} = 'PAYMENT' and ${table.paymentId} is not null)
        or
        (${table.paymentProvenanceKind} = 'NO_PAYMENT_REQUIRED' and ${table.paymentId} is null)
      )`,
    ),
    check(
      "orders_cancellation_reason_check",
      sql`${table.cancellationReasonCode} is null or ${table.cancellationReasonCode} in (
        'CUSTOMER_REQUESTED',
        'ITEM_UNAVAILABLE',
        'OUTLET_UNABLE_TO_FULFIL',
        'OPERATIONAL_DISRUPTION',
        'BUSINESS_DECISION'
      )`,
    ),
    // PLACED: no lifecycle provenance
    // ACCEPTED: acceptance only
    // FULFILLED: acceptance + fulfilment, no cancellation
    // CANCELLED: cancellation required; optional prior acceptance; never fulfilment
    check(
      "orders_lifecycle_provenance_check",
      sql`(
        (
          ${table.status} = 'PLACED'
          and ${table.acceptedAt} is null
          and ${table.acceptedByWorkforceUserId} is null
          and ${table.fulfilledAt} is null
          and ${table.fulfilledByWorkforceUserId} is null
          and ${table.cancelledAt} is null
          and ${table.cancelledByWorkforceUserId} is null
          and ${table.cancellationReasonCode} is null
        )
        or
        (
          ${table.status} = 'ACCEPTED'
          and ${table.acceptedAt} is not null
          and ${table.acceptedByWorkforceUserId} is not null
          and ${table.fulfilledAt} is null
          and ${table.fulfilledByWorkforceUserId} is null
          and ${table.cancelledAt} is null
          and ${table.cancelledByWorkforceUserId} is null
          and ${table.cancellationReasonCode} is null
        )
        or
        (
          ${table.status} = 'FULFILLED'
          and ${table.acceptedAt} is not null
          and ${table.acceptedByWorkforceUserId} is not null
          and ${table.fulfilledAt} is not null
          and ${table.fulfilledByWorkforceUserId} is not null
          and ${table.cancelledAt} is null
          and ${table.cancelledByWorkforceUserId} is null
          and ${table.cancellationReasonCode} is null
        )
        or
        (
          ${table.status} = 'CANCELLED'
          and ${table.cancelledAt} is not null
          and ${table.cancelledByWorkforceUserId} is not null
          and ${table.cancellationReasonCode} is not null
          and ${table.fulfilledAt} is null
          and ${table.fulfilledByWorkforceUserId} is null
          and (
            (
              ${table.acceptedAt} is null
              and ${table.acceptedByWorkforceUserId} is null
            )
            or
            (
              ${table.acceptedAt} is not null
              and ${table.acceptedByWorkforceUserId} is not null
            )
          )
        )
      )`,
    ),
    check(
      "orders_accepted_pair_check",
      sql`(${table.acceptedAt} is null) = (${table.acceptedByWorkforceUserId} is null)`,
    ),
    check(
      "orders_fulfilled_pair_check",
      sql`(${table.fulfilledAt} is null) = (${table.fulfilledByWorkforceUserId} is null)`,
    ),
    check(
      "orders_cancelled_triple_check",
      sql`(
        (${table.cancelledAt} is null)
        = (${table.cancelledByWorkforceUserId} is null)
        and (${table.cancelledAt} is null) = (${table.cancellationReasonCode} is null)
      )`,
    ),
    check(
      "orders_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "orders_accepted_at_after_created_at_check",
      sql`${table.acceptedAt} is null or ${table.acceptedAt} >= ${table.createdAt}`,
    ),
    check(
      "orders_fulfilled_at_after_accepted_at_check",
      sql`${table.fulfilledAt} is null or (
        ${table.acceptedAt} is not null and ${table.fulfilledAt} >= ${table.acceptedAt}
      )`,
    ),
    check(
      "orders_cancelled_at_after_accepted_at_check",
      sql`${table.cancelledAt} is null or ${table.acceptedAt} is null or ${table.cancelledAt} >= ${table.acceptedAt}`,
    ),
    check(
      "orders_cancelled_at_after_created_at_check",
      sql`${table.cancelledAt} is null or ${table.cancelledAt} >= ${table.createdAt}`,
    ),
  ],
);
