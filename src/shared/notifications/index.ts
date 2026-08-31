/**
 * Notification shared domain boundary (IMP-033).
 *
 * Channel- and provider-neutral vocabulary plus pure policy. Contains no
 * provider SDK, credential, webhook, or external transport concern.
 */

export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CONSENT_EVIDENCE_TYPES,
  NOTIFICATION_CONSENT_STATUSES,
  NOTIFICATION_DEDUP_KEY_MAX_LENGTH,
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
  NOTIFICATION_DEFAULT_TRANSACTIONAL_CHANNEL,
  NOTIFICATION_DOMAIN_EVENT_REF_MAX_LENGTH,
  NOTIFICATION_EXTERNAL_SUCCESS_STATUSES,
  NOTIFICATION_IN_APP_PROVIDER,
  NOTIFICATION_LOCALE_MAX_LENGTH,
  NOTIFICATION_NON_SENDING_PROVIDERS,
  NOTIFICATION_NOOP_PROVIDER,
  NOTIFICATION_PROVIDER_EVENT_DIRECTIONS,
  NOTIFICATION_PROVIDER_EVENT_PROCESSING_STATUSES,
  NOTIFICATION_PURPOSES,
  NOTIFICATION_REASON_MAX_LENGTH,
  NOTIFICATION_RETRY_BASE_DELAY_MS,
  NOTIFICATION_RETRY_CATEGORIES,
  NOTIFICATION_REVIEW_REASONS,
  NOTIFICATION_SEMANTIC_ORDER_RANKS,
  NOTIFICATION_SEMANTIC_PURPOSES,
  NOTIFICATION_SEMANTIC_TYPES,
  NOTIFICATION_SENDABLE_TEMPLATE_STATUS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_SUPPRESSION_REASONS,
  NOTIFICATION_TEMPLATE_KEY_MAX_LENGTH,
  NOTIFICATION_TEMPLATE_STATUSES,
  NOTIFICATION_TERMINAL_STATUSES,
  NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS,
  isNotificationChannel,
  isNotificationRetryCategory,
  isNotificationSemanticType,
  purposeForSemanticType,
  semanticOrderRank,
} from "./constants";

export type {
  NotificationChannel,
  NotificationConsentEvidenceType,
  NotificationConsentStatus,
  NotificationExternalSuccessStatus,
  NotificationNonSendingProvider,
  NotificationProviderEventDirection,
  NotificationProviderEventProcessingStatus,
  NotificationPurpose,
  NotificationRetryCategory,
  NotificationReviewReason,
  NotificationSemanticType,
  NotificationStatus,
  NotificationSuppressionReason,
  NotificationTemplateStatus,
  NotificationTerminalStatus,
} from "./constants";

export {
  NOTIFICATION_ERROR_CODES,
  NotificationError,
  isNotificationError,
} from "./errors";
export type { NotificationErrorCode } from "./errors";

export { computeNotificationDedupKey } from "./dedup";
export type { NotificationDedupKeyInput } from "./dedup";

export {
  isExpiredForAge,
  isRetryableCategory,
  nextAttemptDelayMs,
  normalizeRetryCategory,
  notificationExpiryFor,
  requiresReviewCategory,
  retryDispositionFor,
  reviewReasonForCategory,
  shouldRetry,
  shouldReview,
} from "./retry";
export type { RetryDecisionInput } from "./retry";

export {
  NOTIFICATION_TEMPLATE_VARIABLE_NAME_PATTERN,
  NOTIFICATION_TEMPLATE_VARIABLE_VALUE_MAX_LENGTH,
  parseTemplateVariableSchema,
  validateTemplateVariables,
} from "./template-variables";

export {
  evaluateConsent,
  evaluatePreference,
  evaluateSendPolicy,
  evaluateStaleness,
  isStaleSemantic,
  isWithinQuietHours,
  shouldExpire,
} from "./policy";

export type {
  NotificationClock,
  NotificationCommunicationPreference,
  NotificationConsent,
  NotificationMessageAttempt,
  NotificationPolicyDecision,
  NotificationProviderEvent,
  NotificationQuietHours,
  NotificationRequest,
  NotificationTemplate,
} from "./types";
