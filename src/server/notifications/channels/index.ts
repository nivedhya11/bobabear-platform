/**
 * Channel adapter registry (IMP-033).
 *
 * Every channel resolves to a non-sending adapter in this slice. A real
 * provider adapter is registered here in IMP-034 without changing the port.
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

export function createNonSendingChannelRegistry(): NotificationChannelRegistry {
  const adapters = new Map<NotificationChannel, NotificationChannelAdapter>([
    ["WHATSAPP", createNoopChannelAdapter("WHATSAPP")],
    ["EMAIL", createNoopChannelAdapter("EMAIL")],
    ["SMS", createNoopChannelAdapter("SMS")],
    ["PUSH", createNoopChannelAdapter("PUSH")],
    ["IN_APP", createInAppChannelAdapter()],
  ]);

  return Object.freeze({
    adapterFor(channel: NotificationChannel): NotificationChannelAdapter {
      const adapter = adapters.get(channel);
      if (!adapter) {
        // Unreachable for a validated NotificationChannel; a non-sending
        // adapter is still the only safe fallback.
        return createNoopChannelAdapter(channel);
      }
      return adapter;
    },
  });
}
