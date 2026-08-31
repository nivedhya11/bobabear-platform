/**
 * IN_APP channel adapter (IMP-033).
 *
 * IN_APP is the fallback surface when an outbound channel cannot reach the
 * customer, but the foundation slice has no push payload builder and no PWA
 * notification transport. So this adapter performs no send either: it returns
 * `NOT_SENT` with `IN_APP_NO_PUSH_PAYLOAD`.
 *
 * Deliberately *not* modelled as delivered. The customer-facing order surface
 * already reads Order/Delivery truth directly, so an IN_APP notification row is
 * a communication record, not evidence the customer saw anything. Claiming
 * DELIVERED or READ here would fabricate a recipient fact. The database blocks
 * it too — see `notification_message_attempts_non_sending_provider_check`.
 */
import {
  NOTIFICATION_IN_APP_PROVIDER,
  type NotificationChannel,
} from "../../../shared/notifications";
import type { ChannelSendResult, NotificationChannelAdapter } from "../types";

export const IN_APP_FAILURE_CODE = "IN_APP_NO_PUSH_PAYLOAD" as const;

const IN_APP_FAILURE_DETAIL =
  "No in-app delivery payload transport exists in this slice; nothing was transmitted and no recipient fact is implied.";

export function createInAppChannelAdapter(): NotificationChannelAdapter {
  const channel: NotificationChannel = "IN_APP";
  return Object.freeze({
    channel,
    provider: NOTIFICATION_IN_APP_PROVIDER,
    // The input is deliberately unused: there is nothing to transmit it to.
    async send(): Promise<ChannelSendResult> {
      return Object.freeze({
        outcome: "NOT_SENT" as const,
        provider: NOTIFICATION_IN_APP_PROVIDER,
        providerMessageId: null,
        failureCategory: "PERMANENT_FAILURE" as const,
        failureCode: IN_APP_FAILURE_CODE,
        failureDetail: IN_APP_FAILURE_DETAIL,
      });
    },
  });
}
