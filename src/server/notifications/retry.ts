/**
 * Notification retry decisions (IMP-033).
 *
 * Server-side re-export of the pure retry policy plus the status mapping used
 * when an attempt does not result in a provider acceptance.
 */
import "server-only";

import {
  nextAttemptDelayMs,
  normalizeRetryCategory,
  requiresReviewCategory,
  retryDispositionFor,
  reviewReasonForCategory,
  shouldRetry,
  shouldReview,
  type NotificationRetryCategory,
  type NotificationReviewReason,
  type NotificationStatus,
} from "../../shared/notifications";

export {
  nextAttemptDelayMs,
  normalizeRetryCategory as normalizeFailureCategory,
  requiresReviewCategory,
  retryDispositionFor,
  reviewReasonForCategory,
  shouldRetry,
  shouldReview,
};

export type FailureOutcome = Readonly<{
  status: Extract<NotificationStatus, "PENDING" | "FAILED" | "REVIEW_REQUIRED">;
  reviewReason: NotificationReviewReason | null;
  nextAttemptAt: Date | null;
}>;

/**
 * Decide what a failed attempt does to the request.
 *
 * Retryable → back to PENDING with a backoff. Needs a human → REVIEW_REQUIRED.
 * Otherwise terminal FAILED. No branch can produce a status that asserts an
 * external provider or recipient fact.
 */
export function resolveFailureOutcome(
  input: Readonly<{
    failureCategory: NotificationRetryCategory;
    attemptCount: number;
    maxAttempts: number;
    now: Date;
    baseDelayMs?: number;
  }>,
): FailureOutcome {
  const retry = shouldRetry({
    failureCategory: input.failureCategory,
    attemptCount: input.attemptCount,
    maxAttempts: input.maxAttempts,
  });

  if (retry) {
    const delayMs = nextAttemptDelayMs(input.attemptCount, input.baseDelayMs);
    return Object.freeze({
      status: "PENDING" as const,
      reviewReason: null,
      nextAttemptAt: new Date(input.now.getTime() + delayMs),
    });
  }

  const reviewReason = shouldReview({
    failureCategory: input.failureCategory,
    attemptCount: input.attemptCount,
    maxAttempts: input.maxAttempts,
  });

  if (reviewReason) {
    return Object.freeze({
      status: "REVIEW_REQUIRED" as const,
      reviewReason,
      nextAttemptAt: null,
    });
  }

  return Object.freeze({
    status: "FAILED" as const,
    reviewReason: null,
    nextAttemptAt: null,
  });
}
