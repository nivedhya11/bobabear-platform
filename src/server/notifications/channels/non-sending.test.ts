/**
 * Non-sending channel adapter tests (IMP-033).
 *
 * IMP-033 ships no messaging transport, so the load-bearing property is
 * negative: no adapter may claim an external send, mint a provider message id,
 * or assert a provider acknowledgement / delivery / read receipt.
 */
import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IN_APP_PROVIDER,
  NOTIFICATION_NON_SENDING_PROVIDERS,
  NOTIFICATION_NOOP_PROVIDER,
  type NotificationChannel,
} from "../../../shared/notifications";
import type { ChannelSendInput } from "../types";
import {
  createInAppChannelAdapter,
  createNonSendingChannelRegistry,
  createNoopChannelAdapter,
  IN_APP_FAILURE_CODE,
  NOOP_FAILURE_CODE,
} from "./index";

function sendInput(channel: NotificationChannel): ChannelSendInput {
  return {
    notificationRequestId: "9c1f5d3a-0000-4000-8000-000000000001",
    attemptId: "9c1f5d3a-0000-4000-8000-000000000002",
    channel,
    templateKey: "order_received",
    locale: "en-IN",
    variables: { order_code: "BB-1042" },
    recipient: { customerId: "9c1f5d3a-0000-4000-8000-000000000003", phoneE164: "+919000000000" },
    correlationId: "9c1f5d3a-0000-4000-8000-000000000004",
  };
}

describe("noop channel adapter", () => {
  it("never sends and never claims provider acceptance or delivery", async () => {
    for (const channel of ["WHATSAPP", "EMAIL", "SMS", "PUSH"] as const) {
      const adapter = createNoopChannelAdapter(channel);
      const result = await adapter.send(sendInput(channel));

      expect(adapter.channel).toBe(channel);
      expect(adapter.provider).toBe(NOTIFICATION_NOOP_PROVIDER);
      expect(result.outcome).toBe("NOT_SENT");
      expect(result.outcome).not.toBe("ACCEPTED");
      expect(result.provider).toBe(NOTIFICATION_NOOP_PROVIDER);
      expect(result.providerMessageId ?? null).toBeNull();
      expect(result.failureCategory).toBe("PERMANENT_FAILURE");
      expect(result.failureCode).toBe(NOOP_FAILURE_CODE);
      expect(result.failureDetail).toMatch(/not transmitted/i);
    }
  });

  it("does not surface any provider acknowledgement or recipient fact", async () => {
    const result = await createNoopChannelAdapter("WHATSAPP").send(sendInput("WHATSAPP"));
    // Recipient facts (PROVIDER_ACCEPTED / DELIVERED / READ) are never derivable
    // from a send call in this slice.
    expect(Object.keys(result).sort()).toEqual([
      "failureCategory",
      "failureCode",
      "failureDetail",
      "outcome",
      "provider",
      "providerMessageId",
    ]);
    expect(JSON.stringify(result)).not.toMatch(/PROVIDER_ACCEPTED|DELIVERED|READ/);
  });

  it("is repeatably non-sending", async () => {
    const adapter = createNoopChannelAdapter("SMS");
    const first = await adapter.send(sendInput("SMS"));
    const second = await adapter.send(sendInput("SMS"));
    expect(second).toEqual(first);
  });
});

describe("in-app channel adapter", () => {
  it("records no send and implies no recipient view", async () => {
    const adapter = createInAppChannelAdapter();
    const result = await adapter.send(sendInput("IN_APP"));

    expect(adapter.channel).toBe("IN_APP");
    expect(adapter.provider).toBe(NOTIFICATION_IN_APP_PROVIDER);
    expect(result.outcome).toBe("NOT_SENT");
    expect(result.providerMessageId ?? null).toBeNull();
    expect(result.failureCode).toBe(IN_APP_FAILURE_CODE);
    expect(result.failureDetail).toMatch(/no recipient fact is implied/i);
  });
});

describe("non-sending channel registry", () => {
  it("resolves every declared channel to a non-sending adapter", async () => {
    const registry = createNonSendingChannelRegistry();

    for (const channel of NOTIFICATION_CHANNELS) {
      const adapter = registry.adapterFor(channel);
      expect(adapter.channel).toBe(channel);
      expect([...NOTIFICATION_NON_SENDING_PROVIDERS]).toContain(adapter.provider);

      const result = await adapter.send(sendInput(channel));
      expect(result.outcome).toBe("NOT_SENT");
      expect(result.providerMessageId ?? null).toBeNull();
      expect(result.failureCategory).not.toBeNull();
    }
  });

  it("falls back to a non-sending adapter for an unrecognized channel", async () => {
    const registry = createNonSendingChannelRegistry();
    const adapter = registry.adapterFor("TELEPATHY" as NotificationChannel);
    const result = await adapter.send(sendInput("TELEPATHY" as NotificationChannel));
    expect(result.outcome).toBe("NOT_SENT");
    expect(result.provider).toBe(NOTIFICATION_NOOP_PROVIDER);
  });
});
