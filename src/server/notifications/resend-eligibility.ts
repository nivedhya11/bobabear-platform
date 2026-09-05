/**
 * Shared manual Notification resend eligibility (IMP-033 / IMP-036D).
 *
 * Projection and mutation must use the same predicate so Operations UI does
 * not drift from `manualResendNotification` attempt-ceiling enforcement.
 */
import "server-only";

/** Hard ceiling matching `notification_requests_max_attempts_check`. */
export const NOTIFICATION_MAX_ATTEMPTS_CEILING = BigInt(20);

/** Source statuses from which a manual resend may start. */
export const NOTIFICATION_MANUAL_RESENDABLE_STATUSES = ["FAILED", "REVIEW_REQUIRED"] as const;

export type NotificationManualResendableStatus =
  (typeof NOTIFICATION_MANUAL_RESENDABLE_STATUSES)[number];

export function isNotificationManualResendableStatus(
  status: string,
): status is NotificationManualResendableStatus {
  return (NOTIFICATION_MANUAL_RESENDABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Effective maxAttempts after the same bump rule used by manual resend.
 * When the automatic budget is spent, grant exactly one further attempt unless
 * the hard ceiling is already reached.
 */
export function effectiveManualResendMaxAttempts(
  attemptCount: bigint,
  maxAttempts: bigint,
): bigint {
  if (attemptCount < maxAttempts) return maxAttempts;
  const bumped = attemptCount + BigInt(1);
  return bumped > NOTIFICATION_MAX_ATTEMPTS_CEILING
    ? NOTIFICATION_MAX_ATTEMPTS_CEILING
    : bumped;
}

/**
 * Whether Operations may present / attempt a manual resend for this request.
 * Backend mutation remains final authority for consent, template, and send.
 */
export function isManualNotificationResendPermitted(input: {
  status: string;
  attemptCount: bigint;
  maxAttempts: bigint;
}): boolean {
  if (!isNotificationManualResendableStatus(input.status)) return false;
  const effectiveMax = effectiveManualResendMaxAttempts(input.attemptCount, input.maxAttempts);
  return input.attemptCount < effectiveMax;
}
