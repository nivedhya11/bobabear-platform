/**
 * Explicitly non-sending channel adapter (IMP-033).
 *
 * IMP-033 contains no external messaging transport. This adapter exists so the
 * notification pipeline is end-to-end exercisable without pretending a message
 * was sent: every call returns `NOT_SENT` with a `PROVIDER_NOT_CONFIGURED`
 * category, so the request lands in a reviewable non-delivered state instead of
 * a fabricated success.
 *
 * It never returns `ACCEPTED`, never mints a provider message id, and never
 * reports a provider acknowledgement, delivery, or read receipt. The database
 * enforces the same rule for the `noop` provider — see
 * `notification_message_attempts_non_sending_provider_check`.
 */
import {
  NOTIFICATION_NOOP_PROVIDER,
  type NotificationChannel,
} from "../../../shared/notifications";
import type { ChannelSendResult, NotificationChannelAdapter } from "../types";

export const NOOP_FAILURE_CODE = "PROVIDER_NOT_CONFIGURED" as const;

const NOOP_FAILURE_DETAIL =
  "No messaging provider adapter is configured; the notification was not transmitted.";

export function createNoopChannelAdapter(
  channel: NotificationChannel,
): NotificationChannelAdapter {
  return Object.freeze({
    channel,
    provider: NOTIFICATION_NOOP_PROVIDER,
    // The input is deliberately unused: there is nothing to transmit it to.
    async send(): Promise<ChannelSendResult> {
      return Object.freeze({
        outcome: "NOT_SENT" as const,
        provider: NOTIFICATION_NOOP_PROVIDER,
        providerMessageId: null,
        failureCategory: "PERMANENT_FAILURE" as const,
        failureCode: NOOP_FAILURE_CODE,
        failureDetail: NOOP_FAILURE_DETAIL,
      });
    },
  });
}
