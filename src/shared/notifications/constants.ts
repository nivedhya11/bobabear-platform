/**
 * Notification domain constants (IMP-033 Notification Foundation).
 *
 * Channel- and provider-neutral. No Meta/WhatsApp API surface, credentials,
 * template ids, or webhook vocabulary — those belong to IMP-034. A channel
 * adapter that cannot actually transmit must report a non-sending outcome;
 * nothing here permits fabricating provider acceptance or delivery.
 */

export const NOTIFICATION_CHANNELS = [
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "IN_APP",
  "PUSH",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PURPOSES = [
  "ORDER_UPDATES",
  "DELIVERY_UPDATES",
  "SUPPORT_MESSAGES",
  "MARKETING_MESSAGES",
  "AUTHENTICATION_MESSAGES",
] as const;

export type NotificationPurpose = (typeof NOTIFICATION_PURPOSES)[number];

export const NOTIFICATION_STATUSES = [
  "PENDING",
  "SCHEDULED",
  "SUPPRESSED",
  "SENDING",
  "PROVIDER_ACCEPTED",
  "DELIVERED",
  "READ",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REVIEW_REQUIRED",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * Statuses that assert an external provider or recipient fact. A non-sending
 * adapter must never produce one of these — see
 * `notification_message_attempts_non_sending_provider_check`.
 */
export const NOTIFICATION_EXTERNAL_SUCCESS_STATUSES = [
  "PROVIDER_ACCEPTED",
  "DELIVERED",
  "READ",
] as const;

export type NotificationExternalSuccessStatus =
  (typeof NOTIFICATION_EXTERNAL_SUCCESS_STATUSES)[number];

export const NOTIFICATION_TERMINAL_STATUSES = [
  "DELIVERED",
  "READ",
  "SUPPRESSED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type NotificationTerminalStatus =
  (typeof NOTIFICATION_TERMINAL_STATUSES)[number];

/** Provider-neutral failure classification. Raw provider codes never become
 * retry authority; they are normalized into exactly one of these. */
export const NOTIFICATION_RETRY_CATEGORIES = [
  "TRANSIENT",
  "RATE_LIMITED",
  "AUTHENTICATION_FAILURE",
  "TEMPLATE_FAILURE",
  "RECIPIENT_UNAVAILABLE",
  "POLICY_REJECTED",
  "PERMANENT_FAILURE",
  "UNKNOWN",
] as const;

export type NotificationRetryCategory =
  (typeof NOTIFICATION_RETRY_CATEGORIES)[number];

export const NOTIFICATION_TEMPLATE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "RETIRED",
] as const;

export type NotificationTemplateStatus =
  (typeof NOTIFICATION_TEMPLATE_STATUSES)[number];

/** Only APPROVED templates may be used for an outbound send attempt. */
export const NOTIFICATION_SENDABLE_TEMPLATE_STATUS = "APPROVED" as const;

/**
 * Minimal V1 semantic set. Semantic type — not provider template id — is the
 * durable notification identity.
 */
export const NOTIFICATION_SEMANTIC_TYPES = [
  "ORDER_RECEIVED",
  "PAYMENT_CONFIRMED",
  "ORDER_ACCEPTED",
  "ORDER_CANCELLED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type NotificationSemanticType =
  (typeof NOTIFICATION_SEMANTIC_TYPES)[number];

/**
 * Progress rank within one Order's customer-visible journey. A higher rank
 * supersedes a lower one: once rank N has been sent for an Order, an
 * outstanding notification of rank < N is stale and must be suppressed rather
 * than delivered out of order.
 *
 * ORDER_CANCELLED is deliberately ranked above the delivery-progress states:
 * a cancellation is the customer's final commercial truth for that Order.
 */
export const NOTIFICATION_SEMANTIC_ORDER_RANKS: Readonly<
  Record<NotificationSemanticType, number>
> = Object.freeze({
  ORDER_RECEIVED: 10,
  PAYMENT_CONFIRMED: 20,
  ORDER_ACCEPTED: 30,
  OUT_FOR_DELIVERY: 40,
  DELIVERED: 50,
  ORDER_CANCELLED: 60,
});

/** Purpose each semantic type is consented against. */
export const NOTIFICATION_SEMANTIC_PURPOSES: Readonly<
  Record<NotificationSemanticType, NotificationPurpose>
> = Object.freeze({
  ORDER_RECEIVED: "ORDER_UPDATES",
  PAYMENT_CONFIRMED: "ORDER_UPDATES",
  ORDER_ACCEPTED: "ORDER_UPDATES",
  ORDER_CANCELLED: "ORDER_UPDATES",
  OUT_FOR_DELIVERY: "DELIVERY_UPDATES",
  DELIVERED: "DELIVERY_UPDATES",
});

export const NOTIFICATION_CONSENT_STATUSES = [
  "GRANTED",
  "WITHDRAWN",
  "SUPPRESSED",
] as const;

export type NotificationConsentStatus =
  (typeof NOTIFICATION_CONSENT_STATUSES)[number];

/** How a consent record was established. Evidence, never an assumption. */
export const NOTIFICATION_CONSENT_EVIDENCE_TYPES = [
  "TRANSACTIONAL_RELATIONSHIP",
  "EXPLICIT_OPT_IN",
  "EXPLICIT_OPT_OUT",
  "OPERATOR_SUPPRESSION",
] as const;

export type NotificationConsentEvidenceType =
  (typeof NOTIFICATION_CONSENT_EVIDENCE_TYPES)[number];

export const NOTIFICATION_SUPPRESSION_REASONS = [
  "CONSENT_WITHDRAWN",
  "CONSENT_SUPPRESSED",
  "CONSENT_MISSING",
  "CHANNEL_DISABLED",
  "SUPERSEDED_BY_LATER_SEMANTIC",
  "EXPIRED_BEFORE_SEND",
] as const;

export type NotificationSuppressionReason =
  (typeof NOTIFICATION_SUPPRESSION_REASONS)[number];

export const NOTIFICATION_REVIEW_REASONS = [
  "AUTHENTICATION_FAILURE",
  "TEMPLATE_FAILURE",
  "POLICY_REJECTED",
  "RETRIES_EXHAUSTED",
  "UNKNOWN_FAILURE",
] as const;

export type NotificationReviewReason =
  (typeof NOTIFICATION_REVIEW_REASONS)[number];

export const NOTIFICATION_PROVIDER_EVENT_DIRECTIONS = [
  "INBOUND",
  "OUTBOUND",
] as const;

export type NotificationProviderEventDirection =
  (typeof NOTIFICATION_PROVIDER_EVENT_DIRECTIONS)[number];

export const NOTIFICATION_PROVIDER_EVENT_PROCESSING_STATUSES = [
  "RECEIVED",
  "PROCESSED",
  "IGNORED",
  "FAILED",
] as const;

export type NotificationProviderEventProcessingStatus =
  (typeof NOTIFICATION_PROVIDER_EVENT_PROCESSING_STATUSES)[number];

/**
 * Provider identifiers for the IMP-033 non-sending adapters. Both are
 * explicitly incapable of external transmission. The Meta WhatsApp adapter
 * (IMP-034) uses `NOTIFICATION_META_WHATSAPP_PROVIDER` and is not non-sending.
 */
export const NOTIFICATION_NOOP_PROVIDER = "noop" as const;
export const NOTIFICATION_IN_APP_PROVIDER = "in_app" as const;
export const NOTIFICATION_META_WHATSAPP_PROVIDER = "meta_whatsapp" as const;

export const NOTIFICATION_NON_SENDING_PROVIDERS = [
  NOTIFICATION_NOOP_PROVIDER,
  NOTIFICATION_IN_APP_PROVIDER,
] as const;

export type NotificationNonSendingProvider =
  (typeof NOTIFICATION_NON_SENDING_PROVIDERS)[number];

export const NOTIFICATION_DEFAULT_LOCALE = "en-IN" as const;

/** Default channel for transactional notifications. Routes through the
 * non-sending adapter until a real provider adapter exists (IMP-034). */
export const NOTIFICATION_DEFAULT_TRANSACTIONAL_CHANNEL: NotificationChannel =
  "WHATSAPP";

/** Conservative transactional retry defaults. Implementation defaults, not
 * architecture decisions — tune without a governance change. */
export const NOTIFICATION_DEFAULT_MAX_ATTEMPTS = 5 as const;
export const NOTIFICATION_RETRY_BASE_DELAY_MS = 30_000 as const;
export const NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const NOTIFICATION_DEDUP_KEY_MAX_LENGTH = 512 as const;
export const NOTIFICATION_DOMAIN_EVENT_REF_MAX_LENGTH = 256 as const;
export const NOTIFICATION_REASON_MAX_LENGTH = 500 as const;
export const NOTIFICATION_TEMPLATE_KEY_MAX_LENGTH = 128 as const;
export const NOTIFICATION_LOCALE_MAX_LENGTH = 35 as const;

export function isNotificationChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

export function isNotificationSemanticType(
  value: string,
): value is NotificationSemanticType {
  return (NOTIFICATION_SEMANTIC_TYPES as readonly string[]).includes(value);
}

export function isNotificationRetryCategory(
  value: string,
): value is NotificationRetryCategory {
  return (NOTIFICATION_RETRY_CATEGORIES as readonly string[]).includes(value);
}

export function purposeForSemanticType(
  semanticType: NotificationSemanticType,
): NotificationPurpose {
  return NOTIFICATION_SEMANTIC_PURPOSES[semanticType];
}

export function semanticOrderRank(
  semanticType: NotificationSemanticType,
): number {
  return NOTIFICATION_SEMANTIC_ORDER_RANKS[semanticType];
}
