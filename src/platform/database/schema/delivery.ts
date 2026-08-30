/**
 * Drizzle schema for Delivery persistence (IMP-031 / ARCH-G24).
 *
 * Provider-neutral Delivery authority. Order remains sole commercial lifecycle
 * authority. Provider observations are evidence; provider cost facts never
 * rewrite Checkout/Pricing customer delivery charge.
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

import { appSchema } from "./index";
import { ordersTable } from "./order";

/** Money column helper — INR paise, exact integer, never floating point. */
function paise(name: string) {
  return bigint(name, { mode: "bigint" });
}

export const deliveriesTable = appSchema.table(
  "deliveries",
  {
    id: uuid("id").primaryKey(),
    orderId: uuid("order_id").notNull(),
    priorDeliveryId: uuid("prior_delivery_id"),
    requestFingerprint: text("request_fingerprint").notNull(),
    status: text("status").notNull(),
    revision: bigint("revision", { mode: "bigint" }).notNull(),
    bookingCorrelationId: uuid("booking_correlation_id"),
    externalBookingReference: text("external_booking_reference"),
    provider: text("provider"),
    handoffReference: text("handoff_reference"),
    proofReference: text("proof_reference"),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    cancellationCode: text("cancellation_code"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    bookingOutcomeUnknownAt: timestamp("booking_outcome_unknown_at", {
      withTimezone: true,
    }),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "deliveries_order_fk",
      columns: [table.orderId],
      foreignColumns: [ordersTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "deliveries_prior_delivery_fk",
      columns: [table.priorDeliveryId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    uniqueIndex("deliveries_order_request_fingerprint_uidx").on(
      table.orderId,
      table.requestFingerprint,
    ),
    uniqueIndex("deliveries_one_active_per_order_uidx")
      .on(table.orderId)
      .where(
        sql`${table.status} in ('REQUESTED', 'BOOKING_OUTCOME_UNKNOWN', 'BOOKED', 'PICKED_UP')`,
      ),
    uniqueIndex("deliveries_booking_correlation_id_uidx")
      .on(table.bookingCorrelationId)
      .where(sql`${table.bookingCorrelationId} is not null`),
    index("deliveries_order_id_idx").on(table.orderId),
    index("deliveries_status_created_at_idx").on(table.status, table.createdAt),
    check(
      "deliveries_status_check",
      sql`${table.status} in (
        'REQUESTED',
        'BOOKING_OUTCOME_UNKNOWN',
        'BOOKED',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      )`,
    ),
    check("deliveries_revision_positive_check", sql`${table.revision} > 0`),
    check(
      "deliveries_request_fingerprint_nonempty_check",
      sql`char_length(trim(${table.requestFingerprint})) between 1 and 128`,
    ),
    check(
      "deliveries_provider_nonempty_check",
      sql`${table.provider} is null or length(trim(${table.provider})) > 0`,
    ),
    check(
      "deliveries_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "deliveries_lifecycle_provenance_check",
      sql`(
        (
          ${table.status} = 'REQUESTED'
          and ${table.bookingOutcomeUnknownAt} is null
          and ${table.bookedAt} is null
          and ${table.pickedUpAt} is null
          and ${table.deliveredAt} is null
          and ${table.failedAt} is null
          and ${table.cancelledAt} is null
          and ${table.failureCode} is null
          and ${table.failureReason} is null
          and ${table.cancellationCode} is null
          and ${table.cancellationReason} is null
          and ${table.proofReference} is null
        )
        or
        (
          ${table.status} = 'BOOKING_OUTCOME_UNKNOWN'
          and ${table.bookingOutcomeUnknownAt} is not null
          and ${table.bookingCorrelationId} is not null
          and ${table.bookedAt} is null
          and ${table.pickedUpAt} is null
          and ${table.deliveredAt} is null
          and ${table.failedAt} is null
          and ${table.cancelledAt} is null
        )
        or
        (
          ${table.status} = 'BOOKED'
          and ${table.bookedAt} is not null
          and ${table.pickedUpAt} is null
          and ${table.deliveredAt} is null
          and ${table.failedAt} is null
          and ${table.cancelledAt} is null
          and ${table.proofReference} is null
        )
        or
        (
          ${table.status} = 'PICKED_UP'
          and ${table.bookedAt} is not null
          and ${table.pickedUpAt} is not null
          and ${table.handoffReference} is not null
          and ${table.deliveredAt} is null
          and ${table.failedAt} is null
          and ${table.cancelledAt} is null
        )
        or
        (
          ${table.status} = 'DELIVERED'
          and ${table.bookedAt} is not null
          and ${table.pickedUpAt} is not null
          and ${table.deliveredAt} is not null
          and ${table.proofReference} is not null
          and ${table.failedAt} is null
          and ${table.cancelledAt} is null
        )
        or
        (
          ${table.status} = 'FAILED'
          and ${table.failedAt} is not null
          and ${table.failureCode} is not null
          and ${table.failureReason} is not null
          and ${table.deliveredAt} is null
          and ${table.cancelledAt} is null
        )
        or
        (
          ${table.status} = 'CANCELLED'
          and ${table.cancelledAt} is not null
          and ${table.cancellationCode} is not null
          and ${table.cancellationReason} is not null
          and ${table.pickedUpAt} is null
          and ${table.deliveredAt} is null
          and ${table.failedAt} is null
        )
      )`,
    ),
  ],
);

export const deliveryAssignmentsTable = appSchema.table(
  "delivery_assignments",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id").notNull(),
    provider: text("provider").notNull(),
    assignmentKey: text("assignment_key").notNull(),
    courierReference: text("courier_reference"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "delivery_assignments_delivery_fk",
      columns: [table.deliveryId],
      foreignColumns: [deliveriesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("delivery_assignments_delivery_key_uidx").on(
      table.deliveryId,
      table.assignmentKey,
    ),
    index("delivery_assignments_delivery_idx").on(table.deliveryId),
    check(
      "delivery_assignments_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "delivery_assignments_key_nonempty_check",
      sql`length(trim(${table.assignmentKey})) > 0`,
    ),
  ],
);

export const deliveryProviderObservationsTable = appSchema.table(
  "delivery_provider_observations",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id").notNull(),
    provider: text("provider").notNull(),
    observationSource: text("observation_source").notNull(),
    observationKey: text("observation_key").notNull(),
    providerEventId: text("provider_event_id"),
    normalizedMeaning: text("normalized_meaning").notNull(),
    disposition: text("disposition").notNull(),
    payloadDigest: text("payload_digest"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "delivery_provider_observations_delivery_fk",
      columns: [table.deliveryId],
      foreignColumns: [deliveriesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("delivery_provider_observations_key_uidx").on(
      table.provider,
      table.observationSource,
      table.observationKey,
    ),
    index("delivery_provider_observations_delivery_idx").on(table.deliveryId),
    check(
      "delivery_provider_observations_observation_key_nonempty_check",
      sql`length(trim(${table.observationKey})) > 0`,
    ),
    check(
      "delivery_provider_observations_source_check",
      sql`${table.observationSource} in ('sync', 'query', 'reconciliation', 'manual')`,
    ),
    check(
      "delivery_provider_observations_meaning_check",
      sql`${table.normalizedMeaning} in (
        'BOOKING_ACTIVE',
        'BOOKING_INACTIVE_FAILED',
        'BOOKING_INACTIVE_CANCELLED',
        'BOOKING_AMBIGUOUS',
        'ASSIGNMENT',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED',
        'UNKNOWN'
      )`,
    ),
    check(
      "delivery_provider_observations_disposition_check",
      sql`${table.disposition} in (
        'APPLIED',
        'DUPLICATE',
        'UNAPPLIED_UNKNOWN',
        'UNAPPLIED_CONFLICT',
        'UNAPPLIED_UNSAFE',
        'UNAPPLIED_NO_TRANSITION'
      )`,
    ),
    check(
      "delivery_provider_observations_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "delivery_provider_observations_payload_digest_check",
      sql`${table.payloadDigest} is null or ${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const deliveryProviderReferencesTable = appSchema.table(
  "delivery_provider_references",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id").notNull(),
    provider: text("provider").notNull(),
    referenceKind: text("reference_kind").notNull(),
    referenceValue: text("reference_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "delivery_provider_references_delivery_fk",
      columns: [table.deliveryId],
      foreignColumns: [deliveriesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("delivery_provider_references_provider_kind_value_uidx").on(
      table.provider,
      table.referenceKind,
      table.referenceValue,
    ),
    index("delivery_provider_references_delivery_idx").on(table.deliveryId),
    check(
      "delivery_provider_references_provider_nonempty_check",
      sql`length(trim(${table.provider})) > 0`,
    ),
    check(
      "delivery_provider_references_kind_nonempty_check",
      sql`length(trim(${table.referenceKind})) > 0`,
    ),
    check(
      "delivery_provider_references_value_nonempty_check",
      sql`length(trim(${table.referenceValue})) > 0`,
    ),
  ],
);

export const deliveryReturnsTable = appSchema.table(
  "delivery_returns",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id").notNull(),
    status: text("status").notNull(),
    reason: text("reason").notNull(),
    returnDestination: text("return_destination").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    returningAt: timestamp("returning_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    returnFailedAt: timestamp("return_failed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "delivery_returns_delivery_fk",
      columns: [table.deliveryId],
      foreignColumns: [deliveriesTable.id],
    }).onDelete("restrict"),
    uniqueIndex("delivery_returns_one_active_per_delivery_uidx")
      .on(table.deliveryId)
      .where(sql`${table.status} in ('RETURN_REQUESTED', 'RETURNING')`),
    index("delivery_returns_delivery_idx").on(table.deliveryId),
    check(
      "delivery_returns_status_check",
      sql`${table.status} in (
        'RETURN_REQUESTED',
        'RETURNING',
        'RETURNED',
        'RETURN_FAILED'
      )`,
    ),
    check(
      "delivery_returns_reason_length_check",
      sql`char_length(${table.reason}) between 1 and 500`,
    ),
    check(
      "delivery_returns_destination_nonempty_check",
      sql`length(trim(${table.returnDestination})) > 0`,
    ),
    check(
      "delivery_returns_lifecycle_provenance_check",
      sql`(
        (
          ${table.status} = 'RETURN_REQUESTED'
          and ${table.returningAt} is null
          and ${table.returnedAt} is null
          and ${table.returnFailedAt} is null
          and ${table.failureReason} is null
        )
        or
        (
          ${table.status} = 'RETURNING'
          and ${table.returningAt} is not null
          and ${table.returnedAt} is null
          and ${table.returnFailedAt} is null
        )
        or
        (
          ${table.status} = 'RETURNED'
          and ${table.returningAt} is not null
          and ${table.returnedAt} is not null
          and ${table.returnFailedAt} is null
        )
        or
        (
          ${table.status} = 'RETURN_FAILED'
          and ${table.returnFailedAt} is not null
          and ${table.failureReason} is not null
          and ${table.returnedAt} is null
        )
      )`,
    ),
  ],
);

export const deliveryProviderCostsTable = appSchema.table(
  "delivery_provider_costs",
  {
    id: uuid("id").primaryKey(),
    deliveryId: uuid("delivery_id").notNull(),
    kind: text("kind").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    currency: text("currency").notNull(),
    provider: text("provider"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "delivery_provider_costs_delivery_fk",
      columns: [table.deliveryId],
      foreignColumns: [deliveriesTable.id],
    }).onDelete("restrict"),
    index("delivery_provider_costs_delivery_idx").on(table.deliveryId),
    check(
      "delivery_provider_costs_kind_check",
      sql`${table.kind} in (
        'estimated',
        'booked',
        'final',
        'cancellation',
        'return',
        'adjustment'
      )`,
    ),
    check(
      "delivery_provider_costs_amount_positive_check",
      sql`${table.amountPaise} > 0`,
    ),
    check(
      "delivery_provider_costs_currency_check",
      sql`${table.currency} = 'INR'`,
    ),
    check(
      "delivery_provider_costs_provider_nonempty_check",
      sql`${table.provider} is null or length(trim(${table.provider})) > 0`,
    ),
  ],
);
