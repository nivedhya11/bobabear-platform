/**
 * Notification domain record types (IMP-033).
 *
 * Notification records are downstream projections of domain truth. They never
 * carry, and must never be read as, Order / Payment / Delivery / Refund /
 * Identity authority.
 */
import type {
  NotificationChannel,
  NotificationConsentEvidenceType,
  NotificationConsentStatus,
  NotificationProviderEventDirection,
  NotificationProviderEventProcessingStatus,
  NotificationPurpose,
  NotificationRetryCategory,
  NotificationReviewReason,
  NotificationSemanticType,
  NotificationStatus,
  NotificationSuppressionReason,
  NotificationTemplateStatus,
} from "./constants";

export type NotificationClock = Readonly<{ now: () => Date }>;

export type NotificationRequest = Readonly<{
  id: string;
  customerId: string;
  purpose: NotificationPurpose;
  channel: NotificationChannel;
  semanticType: NotificationSemanticType;
  domainEventRef: string;
  dedupKey: string;
  orderId: string | null;
  status: NotificationStatus;
  templateKey: string | null;
  locale: string;
  suppressionReason: NotificationSuppressionReason | null;
  reviewReason: NotificationReviewReason | null;
  attemptCount: bigint;
  maxAttempts: bigint;
  nextAttemptAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  terminalAt: Date | null;
}>;

export type NotificationMessageAttempt = Readonly<{
  id: string;
  notificationRequestId: string;
  attemptSequence: bigint;
  channel: NotificationChannel;
  provider: string;
  providerMessageId: string | null;
  status: NotificationStatus;
  failureCategory: NotificationRetryCategory | null;
  failureCode: string | null;
  failureDetail: string | null;
  correlationId: string;
  sentAt: Date | null;
  providerAckedAt: Date | null;
  createdAt: Date;
}>;

export type NotificationConsent = Readonly<{
  id: string;
  customerId: string;
  purpose: NotificationPurpose;
  status: NotificationConsentStatus;
  evidenceType: NotificationConsentEvidenceType;
  evidenceRef: string | null;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type NotificationQuietHours = Readonly<{
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}>;

export type NotificationCommunicationPreference = Readonly<{
  id: string;
  customerId: string;
  channel: NotificationChannel;
  enabled: boolean;
  quietHours: NotificationQuietHours | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type NotificationTemplate = Readonly<{
  id: string;
  semanticType: NotificationSemanticType;
  templateKey: string;
  locale: string;
  version: bigint;
  channel: NotificationChannel;
  /** Opaque external template reference. Null until a real provider adapter
   * registers one (IMP-034). Never a credential. */
  providerTemplateRef: string | null;
  status: NotificationTemplateStatus;
  variableSchema: readonly string[];
  createdAt: Date;
  updatedAt: Date;
}>;

export type NotificationProviderEvent = Readonly<{
  id: string;
  channel: NotificationChannel;
  provider: string;
  direction: NotificationProviderEventDirection;
  providerEventId: string;
  dedupKey: string;
  receivedAt: Date;
  processedAt: Date | null;
  processingStatus: NotificationProviderEventProcessingStatus;
}>;

/** Consent + preference evaluation outcome. `SEND` never implies a provider
 * is available — only that policy does not block the attempt. */
export type NotificationPolicyDecision =
  | Readonly<{ outcome: "SEND" }>
  | Readonly<{
      outcome: "SUPPRESS";
      reason: NotificationSuppressionReason;
    }>;
