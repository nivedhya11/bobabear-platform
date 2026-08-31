/**
 * Drizzle schema for Notification persistence (IMP-033).
 *
 * Notifications-owned tables only. Notification rows are downstream
 * projections: nothing here is Order / Payment / Delivery / Refund / Identity
 * authority, and no notification status may be read back as domain truth.
 *
 * `customer_id` is intentionally FK-free. A notification is created from an
 * at-least-once outbox event and must remain a durable, self-contained
 * communication record; taking a restrict FK on the Identity tables would
 * make Notifications a constraint on Identity lifecycle, which it must not be.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";
import { ordersTable } from "./order";

// Rendered per constraint so no single SQL fragment instance is shared
// between generated CHECK definitions.
const channelValues = () => sql`('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP', 'PUSH')`;
const purposeValues = () => sql`(
  'ORDER_UPDATES',
  'DELIVERY_UPDATES',
  'SUPPORT_MESSAGES',
  'MARKETING_MESSAGES',
  'AUTHENTICATION_MESSAGES'
)`;
const semanticTypeValues = () => sql`(
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'ORDER_CANCELLED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
)`;
const statusValues = () => sql`(
  'PENDING',
  'SCHEDULED',
  'SUPPRESSED',
  'SENDING',
  'PROVIDER_ACCEPTED',
  'DELIVERED',
  'READ',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REVIEW_REQUIRED'
)`;
const retryCategoryValues = () => sql`(
  'TRANSIENT',
  'RATE_LIMITED',
  'AUTHENTICATION_FAILURE',
  'TEMPLATE_FAILURE',
  'RECIPIENT_UNAVAILABLE',
  'POLICY_REJECTED',
  'PERMANENT_FAILURE',
  'UNKNOWN'
)`;

export const notificationRequestsTable = appSchema.table(
  "notification_requests",
  {
    id: uuid("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    purpose: text("purpose").notNull(),
    channel: text("channel").notNull(),
    semanticType: text("semantic_type").notNull(),
    domainEventRef: text("domain_event_ref").notNull(),
    dedupKey: text("dedup_key").notNull(),
    orderId: uuid("order_id"),
    status: text("status").notNull(),
    templateKey: text("template_key"),
    locale: text("locale").notNull(),
    suppressionReason: text("suppression_reason"),
    reviewReason: text("review_reason"),
    attemptCount: bigint("attempt_count", { mode: "bigint" }).notNull(),
    maxAttempts: bigint("max_attempts", { mode: "bigint" }).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    terminalAt: timestamp("terminal_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "notification_requests_order_fk",
      columns: [table.orderId],
      foreignColumns: [ordersTable.id],
    }).onDelete("restrict"),
    // Durable idempotency for at-least-once outbox redelivery.
    uniqueIndex("notification_requests_dedup_key_uidx").on(table.dedupKey),
    index("notification_requests_customer_created_at_idx").on(
      table.customerId,
      table.createdAt,
    ),
    index("notification_requests_order_id_idx").on(table.orderId),
    index("notification_requests_status_next_attempt_at_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    check("notification_requests_channel_check", sql`${table.channel} in ${channelValues()}`),
    check("notification_requests_purpose_check", sql`${table.purpose} in ${purposeValues()}`),
    check(
      "notification_requests_semantic_type_check",
      sql`${table.semanticType} in ${semanticTypeValues()}`,
    ),
    check("notification_requests_status_check", sql`${table.status} in ${statusValues()}`),
    check(
      "notification_requests_customer_id_nonempty_check",
      sql`char_length(trim(${table.customerId})) between 1 and 255`,
    ),
    check(
      "notification_requests_domain_event_ref_length_check",
      sql`char_length(trim(${table.domainEventRef})) between 1 and 256`,
    ),
    check(
      "notification_requests_dedup_key_length_check",
      sql`char_length(${table.dedupKey}) between 1 and 512`,
    ),
    check(
      "notification_requests_locale_length_check",
      sql`char_length(trim(${table.locale})) between 2 and 35`,
    ),
    check(
      "notification_requests_template_key_length_check",
      sql`${table.templateKey} is null or char_length(trim(${table.templateKey})) between 1 and 128`,
    ),
    check(
      "notification_requests_suppression_reason_check",
      sql`${table.suppressionReason} is null or ${table.suppressionReason} in (
        'CONSENT_WITHDRAWN',
        'CONSENT_SUPPRESSED',
        'CONSENT_MISSING',
        'CHANNEL_DISABLED',
        'SUPERSEDED_BY_LATER_SEMANTIC',
        'EXPIRED_BEFORE_SEND'
      )`,
    ),
    check(
      "notification_requests_review_reason_check",
      sql`${table.reviewReason} is null or ${table.reviewReason} in (
        'AUTHENTICATION_FAILURE',
        'TEMPLATE_FAILURE',
        'POLICY_REJECTED',
        'RETRIES_EXHAUSTED',
        'UNKNOWN_FAILURE'
      )`,
    ),
    check(
      "notification_requests_attempt_count_check",
      sql`${table.attemptCount} >= 0 and ${table.attemptCount} <= ${table.maxAttempts}`,
    ),
    check(
      "notification_requests_max_attempts_check",
      sql`${table.maxAttempts} between 1 and 20`,
    ),
    check(
      "notification_requests_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
    check(
      "notification_requests_expires_at_after_created_at_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    // SUPPRESSED always carries its reason; nothing else may claim one.
    check(
      "notification_requests_suppression_provenance_check",
      sql`(${table.status} = 'SUPPRESSED') = (${table.suppressionReason} is not null)`,
    ),
    check(
      "notification_requests_review_provenance_check",
      sql`${table.status} = 'REVIEW_REQUIRED' or ${table.reviewReason} is null`,
    ),
  ],
);

/**
 * One row per outbound send attempt. Provider facts are recorded only when a
 * provider actually reported them: `notification_message_attempts_
 * external_success_provenance_check` makes a status asserting provider or
 * recipient behaviour impossible without a provider message id and ack time,
 * and `..._non_sending_provider_check` makes it impossible at all for the
 * IMP-033 non-sending adapters.
 */
export const notificationMessageAttemptsTable = appSchema.table(
  "notification_message_attempts",
  {
    id: uuid("id").primaryKey(),
    notificationRequestId: uuid("notification_request_id").notNull(),
    attemptSequence: bigint("attempt_sequence", { mode: "bigint" }).notNull(),
    channel: text("channel").notNull(),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    status: text("status").notNull(),
    failureCategory: text("failure_category"),
    failureCode: text("failure_code"),
    failureDetail: text("failure_detail"),
    correlationId: uuid("correlation_id").notNull(),
    // Operator audit trail for a permission-gated manual resend. Lives on the
    // attempt because the attempt is what the operator caused.
    manualResendReason: text("manual_resend_reason"),
    manualResendByWorkforceUserId: text("manual_resend_by_workforce_user_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    providerAckedAt: timestamp("provider_acked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "notification_message_attempts_request_fk",
      columns: [table.notificationRequestId],
      foreignColumns: [notificationRequestsTable.id],
    }).onDelete("restrict"),
    uniqueIndex("notification_message_attempts_request_sequence_uidx").on(
      table.notificationRequestId,
      table.attemptSequence,
    ),
    index("notification_message_attempts_request_idx").on(table.notificationRequestId),
    index("notification_message_attempts_provider_message_id_idx").on(
      table.provider,
      table.providerMessageId,
    ),
    // IMP-034: partial lookup by provider_message_id alone for webhook status.
    index("notification_message_attempts_provider_message_id_partial_idx")
      .on(table.providerMessageId)
      .where(sql`${table.providerMessageId} is not null`),
    check(
      "notification_message_attempts_channel_check",
      sql`${table.channel} in ${channelValues()}`,
    ),
    check(
      "notification_message_attempts_status_check",
      sql`${table.status} in ${statusValues()}`,
    ),
    check(
      "notification_message_attempts_provider_nonempty_check",
      sql`char_length(trim(${table.provider})) between 1 and 64`,
    ),
    check(
      "notification_message_attempts_sequence_positive_check",
      sql`${table.attemptSequence} > 0`,
    ),
    check(
      "notification_message_attempts_failure_category_check",
      sql`${table.failureCategory} is null or ${table.failureCategory} in ${retryCategoryValues()}`,
    ),
    check(
      "notification_message_attempts_failure_code_length_check",
      sql`${table.failureCode} is null or char_length(trim(${table.failureCode})) between 1 and 128`,
    ),
    check(
      "notification_message_attempts_failure_detail_length_check",
      sql`${table.failureDetail} is null or char_length(${table.failureDetail}) <= 500`,
    ),
    check(
      "notification_message_attempts_manual_resend_pair_check",
      sql`(${table.manualResendReason} is null)
        = (${table.manualResendByWorkforceUserId} is null)`,
    ),
    check(
      "notification_message_attempts_manual_resend_reason_length_check",
      sql`${table.manualResendReason} is null
        or char_length(trim(${table.manualResendReason})) between 1 and 500`,
    ),
    check(
      "notification_message_attempts_external_success_provenance_check",
      sql`${table.status} not in ('PROVIDER_ACCEPTED', 'DELIVERED', 'READ')
        or (${table.providerMessageId} is not null and ${table.providerAckedAt} is not null)`,
    ),
    check(
      "notification_message_attempts_non_sending_provider_check",
      sql`${table.provider} not in ('noop', 'in_app')
        or (
          ${table.status} not in ('PROVIDER_ACCEPTED', 'DELIVERED', 'READ')
          and ${table.providerMessageId} is null
          and ${table.providerAckedAt} is null
          and ${table.sentAt} is null
        )`,
    ),
  ],
);

export const notificationConsentsTable = appSchema.table(
  "notification_consents",
  {
    id: uuid("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    purpose: text("purpose").notNull(),
    status: text("status").notNull(),
    evidenceType: text("evidence_type").notNull(),
    evidenceRef: text("evidence_ref"),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("notification_consents_customer_purpose_uidx").on(
      table.customerId,
      table.purpose,
    ),
    check("notification_consents_purpose_check", sql`${table.purpose} in ${purposeValues()}`),
    check(
      "notification_consents_status_check",
      sql`${table.status} in ('GRANTED', 'WITHDRAWN', 'SUPPRESSED')`,
    ),
    check(
      "notification_consents_evidence_type_check",
      sql`${table.evidenceType} in (
        'TRANSACTIONAL_RELATIONSHIP',
        'EXPLICIT_OPT_IN',
        'EXPLICIT_OPT_OUT',
        'OPERATOR_SUPPRESSION'
      )`,
    ),
    check(
      "notification_consents_customer_id_nonempty_check",
      sql`char_length(trim(${table.customerId})) between 1 and 255`,
    ),
    check(
      "notification_consents_evidence_ref_length_check",
      sql`${table.evidenceRef} is null or char_length(trim(${table.evidenceRef})) between 1 and 256`,
    ),
    check(
      "notification_consents_granted_provenance_check",
      sql`${table.status} <> 'GRANTED' or ${table.grantedAt} is not null`,
    ),
    check(
      "notification_consents_withdrawn_provenance_check",
      sql`${table.status} <> 'WITHDRAWN' or ${table.withdrawnAt} is not null`,
    ),
    check(
      "notification_consents_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const notificationCommunicationPreferencesTable = appSchema.table(
  "notification_communication_preferences",
  {
    id: uuid("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    channel: text("channel").notNull(),
    enabled: boolean("enabled").notNull(),
    quietHours: jsonb("quiet_hours_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("notification_communication_preferences_customer_channel_uidx").on(
      table.customerId,
      table.channel,
    ),
    check(
      "notification_communication_preferences_channel_check",
      sql`${table.channel} in ${channelValues()}`,
    ),
    check(
      "notification_communication_preferences_customer_id_nonempty_check",
      sql`char_length(trim(${table.customerId})) between 1 and 255`,
    ),
    check(
      "notification_communication_preferences_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);


/**
 * Approved template registry. `provider_template_ref` is an opaque external
 * reference registered by a future provider adapter (IMP-034) — never a
 * credential, and null until such an adapter exists.
 */
export const notificationTemplatesTable = appSchema.table(
  "notification_templates",
  {
    id: uuid("id").primaryKey(),
    semanticType: text("semantic_type").notNull(),
    templateKey: text("template_key").notNull(),
    locale: text("locale").notNull(),
    version: bigint("version", { mode: "bigint" }).notNull(),
    channel: text("channel").notNull(),
    providerTemplateRef: text("provider_template_ref"),
    status: text("status").notNull(),
    variableSchema: jsonb("variable_schema_json").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("notification_templates_key_locale_version_channel_uidx").on(
      table.templateKey,
      table.locale,
      table.version,
      table.channel,
    ),
    index("notification_templates_lookup_idx").on(
      table.semanticType,
      table.channel,
      table.locale,
      table.status,
    ),
    check(
      "notification_templates_semantic_type_check",
      sql`${table.semanticType} in ${semanticTypeValues()}`,
    ),
    check("notification_templates_channel_check", sql`${table.channel} in ${channelValues()}`),
    check(
      "notification_templates_status_check",
      sql`${table.status} in (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'PAUSED',
        'DISABLED',
        'RETIRED'
      )`,
    ),
    check(
      "notification_templates_template_key_length_check",
      sql`char_length(trim(${table.templateKey})) between 1 and 128`,
    ),
    check(
      "notification_templates_locale_length_check",
      sql`char_length(trim(${table.locale})) between 2 and 35`,
    ),
    check("notification_templates_version_positive_check", sql`${table.version} > 0`),
    check(
      "notification_templates_provider_template_ref_length_check",
      sql`${table.providerTemplateRef} is null
        or char_length(trim(${table.providerTemplateRef})) between 1 and 256`,
    ),
    check(
      "notification_templates_updated_at_after_created_at_check",
      sql`${table.updatedAt} >= ${table.createdAt}`,
    ),
  ],
);

/**
 * Structure for future provider event correlation. IMP-033 persists the shape
 * only — it adds no webhook route, no inbound signature verification, and no
 * provider transport. A row here never becomes domain truth on its own.
 */
export const notificationProviderEventsTable = appSchema.table(
  "notification_provider_events",
  {
    id: uuid("id").primaryKey(),
    channel: text("channel").notNull(),
    provider: text("provider").notNull(),
    direction: text("direction").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    dedupKey: text("dedup_key").notNull(),
    payload: jsonb("payload_json").notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingStatus: text("processing_status").notNull(),
  },
  (table) => [
    uniqueIndex("notification_provider_events_dedup_key_uidx").on(table.dedupKey),
    index("notification_provider_events_provider_received_at_idx").on(
      table.provider,
      table.receivedAt,
    ),
    check(
      "notification_provider_events_channel_check",
      sql`${table.channel} in ${channelValues()}`,
    ),
    check(
      "notification_provider_events_direction_check",
      sql`${table.direction} in ('INBOUND', 'OUTBOUND')`,
    ),
    check(
      "notification_provider_events_processing_status_check",
      sql`${table.processingStatus} in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')`,
    ),
    check(
      "notification_provider_events_provider_nonempty_check",
      sql`char_length(trim(${table.provider})) between 1 and 64`,
    ),
    check(
      "notification_provider_events_provider_event_id_length_check",
      sql`char_length(trim(${table.providerEventId})) between 1 and 256`,
    ),
    check(
      "notification_provider_events_dedup_key_length_check",
      sql`char_length(${table.dedupKey}) between 1 and 512`,
    ),
    check(
      "notification_provider_events_processed_provenance_check",
      sql`${table.processingStatus} <> 'PROCESSED' or ${table.processedAt} is not null`,
    ),
  ],
);

/**
 * Minimized inbound WhatsApp (or other provider) messages (IMP-034).
 * Classification stays UNCLASSIFIED in this slice — no conversation UI and
 * no autonomous cancellation/refund from inbound content.
 */
export const notificationInboundMessagesTable = appSchema.table(
  "notification_inbound_messages",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    waFromE164: text("wa_from_e164"),
    customerId: text("customer_id"),
    messageType: text("message_type"),
    bodyPreview: text("body_preview"),
    classification: text("classification").notNull().default("UNCLASSIFIED"),
    providerEventDedupKey: text("provider_event_dedup_key"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("notification_inbound_messages_provider_message_uidx").on(
      table.provider,
      table.providerMessageId,
    ),
    index("notification_inbound_messages_received_at_idx").on(table.receivedAt),
    check(
      "notification_inbound_messages_provider_nonempty_check",
      sql`char_length(trim(${table.provider})) between 1 and 64`,
    ),
    check(
      "notification_inbound_messages_provider_message_id_length_check",
      sql`char_length(trim(${table.providerMessageId})) between 1 and 256`,
    ),
    check(
      "notification_inbound_messages_classification_check",
      sql`${table.classification} in ('UNCLASSIFIED')`,
    ),
    check(
      "notification_inbound_messages_body_preview_length_check",
      sql`${table.bodyPreview} is null or char_length(${table.bodyPreview}) <= 280`,
    ),
    check(
      "notification_inbound_messages_wa_from_length_check",
      sql`${table.waFromE164} is null or char_length(trim(${table.waFromE164})) between 1 and 32`,
    ),
    check(
      "notification_inbound_messages_customer_id_length_check",
      sql`${table.customerId} is null or char_length(trim(${table.customerId})) between 1 and 255`,
    ),
  ],
);
