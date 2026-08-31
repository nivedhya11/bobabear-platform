/**
 * Notification retry policy (IMP-033).
 *
 * Pure classification only. A retry decision never depends on a raw provider
 * status string: unrecognized input normalizes to UNKNOWN, which is reviewed
 * by an operator rather than retried indefinitely.
 */
import {
  NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_BASE_DELAY_MS,
  NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS,
  isNotificationRetryCategory,
  type NotificationRetryCategory,
  type NotificationReviewReason,
} from "./constants";

/** Longest backoff step. Beyond this the schedule stops growing so a stuck
 * notification still reaches its max-age expiry rather than drifting forever. */
const RETRY_MAX_DELAY_MS = 2 * 60 * 60 * 1000;

type RetryDisposition = Readonly<{
  retryable: boolean;
  review: boolean;
  reviewReason: NotificationReviewReason | null;
}>;

/**
 * Category → disposition. Rate limiting and transient faults are the only
 * categories worth an automatic retry; credential, template, and policy
 * failures need a human because retrying cannot fix them.
 */
const RETRY_DISPOSITIONS: Readonly<
  Record<NotificationRetryCategory, RetryDisposition>
> = Object.freeze({
  TRANSIENT: Object.freeze({ retryable: true, review: false, reviewReason: null }),
  RATE_LIMITED: Object.freeze({ retryable: true, review: false, reviewReason: null }),
  AUTHENTICATION_FAILURE: Object.freeze({
    retryable: false,
    review: true,
    reviewReason: "AUTHENTICATION_FAILURE",
  }),
  TEMPLATE_FAILURE: Object.freeze({
    retryable: false,
    review: true,
    reviewReason: "TEMPLATE_FAILURE",
  }),
  RECIPIENT_UNAVAILABLE: Object.freeze({
    retryable: false,
    review: false,
    reviewReason: null,
  }),
  POLICY_REJECTED: Object.freeze({
    retryable: false,
    review: true,
    reviewReason: "POLICY_REJECTED",
  }),
  PERMANENT_FAILURE: Object.freeze({
    retryable: false,
    review: false,
    reviewReason: null,
  }),
  UNKNOWN: Object.freeze({
    retryable: false,
    review: true,
    reviewReason: "UNKNOWN_FAILURE",
  }),
});

/** Normalize an unvalidated failure category to exactly one known category. */
export function normalizeRetryCategory(
  value: string | null | undefined,
): NotificationRetryCategory {
  if (typeof value !== "string") return "UNKNOWN";
  const upper = value.trim().toUpperCase();
  return isNotificationRetryCategory(upper) ? upper : "UNKNOWN";
}

export function retryDispositionFor(
  category: NotificationRetryCategory,
): RetryDisposition {
  return RETRY_DISPOSITIONS[category];
}

export function isRetryableCategory(category: NotificationRetryCategory): boolean {
  return RETRY_DISPOSITIONS[category].retryable;
}

export function requiresReviewCategory(
  category: NotificationRetryCategory,
): boolean {
  return RETRY_DISPOSITIONS[category].review;
}

export function reviewReasonForCategory(
  category: NotificationRetryCategory,
): NotificationReviewReason | null {
  return RETRY_DISPOSITIONS[category].reviewReason;
}

/** Exponential backoff from the base delay, capped. `attemptCount` is the
 * number of attempts already made (1 after the first failure). */
export function nextAttemptDelayMs(
  attemptCount: number,
  baseDelayMs: number = NOTIFICATION_RETRY_BASE_DELAY_MS,
): number {
  const completed = Number.isFinite(attemptCount) ? Math.max(1, Math.trunc(attemptCount)) : 1;
  const exponent = Math.min(completed - 1, 10);
  return Math.min(baseDelayMs * 2 ** exponent, RETRY_MAX_DELAY_MS);
}

export type RetryDecisionInput = Readonly<{
  failureCategory: NotificationRetryCategory;
  attemptCount: number;
  maxAttempts?: number;
}>;

export function shouldRetry(input: RetryDecisionInput): boolean {
  const maxAttempts = input.maxAttempts ?? NOTIFICATION_DEFAULT_MAX_ATTEMPTS;
  if (!isRetryableCategory(input.failureCategory)) return false;
  return input.attemptCount < maxAttempts;
}

export function shouldReview(input: RetryDecisionInput): NotificationReviewReason | null {
  const maxAttempts = input.maxAttempts ?? NOTIFICATION_DEFAULT_MAX_ATTEMPTS;
  const disposition = retryDispositionFor(input.failureCategory);
  if (disposition.review) return disposition.reviewReason;
  if (disposition.retryable && input.attemptCount >= maxAttempts) {
    return "RETRIES_EXHAUSTED";
  }
  return null;
}

/** A notification older than its max age must never be sent late. */
export function isExpiredForAge(
  createdAt: Date,
  now: Date,
  maxAgeMs: number = NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS,
): boolean {
  return now.getTime() - createdAt.getTime() >= maxAgeMs;
}

export function notificationExpiryFor(
  createdAt: Date,
  maxAgeMs: number = NOTIFICATION_TRANSACTIONAL_MAX_AGE_MS,
): Date {
  return new Date(createdAt.getTime() + maxAgeMs);
}
