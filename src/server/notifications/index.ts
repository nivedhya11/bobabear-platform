/**
 * Server-only Notification boundary (IMP-033).
 *
 * No HTTP routes, no webhook inbox, no provider SDK, no credentials, and no
 * external messaging transport — a real provider adapter arrives in IMP-034.
 */
import "server-only";

export { NotificationError, isNotificationError } from "../../shared/notifications";
export type {
  NotificationChannel,
  NotificationCommunicationPreference,
  NotificationConsent,
  NotificationMessageAttempt,
  NotificationPolicyDecision,
  NotificationPurpose,
  NotificationRequest,
  NotificationRetryCategory,
  NotificationSemanticType,
  NotificationStatus,
  NotificationTemplate,
} from "../../shared/notifications";

export {
  systemNotificationClock,
  fixedNotificationClock,
  type NotificationClock,
} from "./clock";

export type {
  ChannelSendInput,
  ChannelSendResult,
  NotificationChannelAdapter,
  NotificationChannelRegistry,
} from "./types";

export {
  createInAppChannelAdapter,
  createNonSendingChannelRegistry,
  createNoopChannelAdapter,
  IN_APP_FAILURE_CODE,
  NOOP_FAILURE_CODE,
} from "./channels";

export {
  createNotificationRequestFromDomainEvent,
  manualResendNotification,
  processPendingNotification,
  type ManualResendInput,
  type NotificationOperationOptions,
} from "./operations";

export {
  actorHasNotificationCapability,
  requireNotificationCapability,
  requireNotificationWorkforceActor,
  type NotificationWorkforceActor,
} from "./authorize";

export {
  enqueueDeliveryProgressNotification,
  enqueueNotificationIntent,
  enqueueOrderLifecycleNotification,
  enqueueOrderReceivedNotification,
  enqueuePaymentConfirmedNotification,
} from "./enqueue";

export {
  NOTIFICATION_OUTBOX_AGGREGATE_TYPE,
  NOTIFICATION_OUTBOX_EVENT_TYPES,
  NOTIFICATION_OUTBOX_EVENT_VERSION,
  isNotificationOutboxEventType,
  notificationDomainEventRef,
  outboxEventTypeFor,
  parseNotificationOutboxPayload,
  semanticTypeForOutboxEventType,
  type NotificationOutboxEventType,
  type NotificationOutboxPayload,
} from "./outbox-events";

export {
  NotificationOutboxProcessor,
  NOTIFICATION_OUTBOX_POLL_INTERVAL_MS,
  type NotificationOutboxProcessorOptions,
} from "./processor";

export {
  evaluateNotificationSendPolicy,
} from "./policy";

export { resolveApprovedTemplate, validateVariables } from "./templates";

export {
  findConsent,
  findNotificationRequestById,
  findPreference,
  insertProviderEventIfAbsent,
  listNotificationAttempts,
  setCommunicationPreference,
  setConsentStatus,
} from "./repository";
