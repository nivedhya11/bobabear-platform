/**
 * Channel adapter registry (IMP-033 / IMP-034).
 *
 * WHATSAPP resolves to a Meta Cloud API adapter when one is supplied; otherwise
 * the non-sending noop adapter remains the safe default.
 */
import type { NotificationChannel } from "../../../shared/notifications";
import type {
  NotificationChannelAdapter,
  NotificationChannelRegistry,
} from "../types";
import { createInAppChannelAdapter } from "./in-app";
import { createNoopChannelAdapter } from "./noop";

export { createNoopChannelAdapter, NOOP_FAILURE_CODE } from "./noop";
export { createInAppChannelAdapter, IN_APP_FAILURE_CODE } from "./in-app";

export type ChannelRegistryOptions = Readonly<{
  whatsapp?: NotificationChannelAdapter;
}>;

export function createNotificationChannelRegistry(
  options: ChannelRegistryOptions = {},
): NotificationChannelRegistry {
  const whatsapp = options.whatsapp ?? createNoopChannelAdapter("WHATSAPP");
  const adapters = new Map<NotificationChannel, NotificationChannelAdapter>([
    ["WHATSAPP", whatsapp],
    ["EMAIL", createNoopChannelAdapter("EMAIL")],
    ["SMS", createNoopChannelAdapter("SMS")],
    ["PUSH", createNoopChannelAdapter("PUSH")],
    ["IN_APP", createInAppChannelAdapter()],
  ]);

  return Object.freeze({
    adapterFor(channel: NotificationChannel): NotificationChannelAdapter {
      const adapter = adapters.get(channel);
      if (!adapter) {
        return createNoopChannelAdapter(channel);
      }
      return adapter;
    },
  });
}

/** IMP-033 default: every channel is non-sending. */
export function createNonSendingChannelRegistry(): NotificationChannelRegistry {
  return createNotificationChannelRegistry();
}
