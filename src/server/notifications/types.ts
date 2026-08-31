/**
 * Channel adapter port (IMP-033).
 *
 * The port is deliberately narrow: an adapter receives an already-resolved
 * template reference plus validated variables and reports one of three
 * outcomes. There is no outcome that lets an adapter assert delivery or read
 * receipt — those are recipient facts, only ever learned from a real provider
 * event (IMP-034), never from a send call's return value.
 */
import type {
  NotificationChannel,
  NotificationRetryCategory,
} from "../../shared/notifications";

export type ChannelSendInput = Readonly<{
  notificationRequestId: string;
  attemptId: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: string;
  variables: Readonly<Record<string, string>>;
  recipient: Readonly<{ customerId: string; phoneE164?: string | null }>;
  correlationId: string;
}>;

/**
 * - `NOT_SENT`: nothing left this process. Requires a failure category so the
 *   retry policy can classify it.
 * - `ACCEPTED`: a real provider acknowledged the message and returned an id.
 * - `REJECTED`: a real provider refused the message.
 */
export type ChannelSendResult = Readonly<{
  outcome: "NOT_SENT" | "ACCEPTED" | "REJECTED";
  provider: string;
  providerMessageId?: string | null;
  failureCategory?: NotificationRetryCategory | null;
  failureCode?: string | null;
  failureDetail?: string | null;
}>;

export type NotificationChannelAdapter = Readonly<{
  readonly channel: NotificationChannel;
  readonly provider: string;
  send(input: ChannelSendInput): Promise<ChannelSendResult>;
}>;

export type NotificationChannelRegistry = Readonly<{
  adapterFor(channel: NotificationChannel): NotificationChannelAdapter;
}>;
