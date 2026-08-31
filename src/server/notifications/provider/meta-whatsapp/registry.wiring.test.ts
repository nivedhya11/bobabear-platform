/**
 * Meta WhatsApp registry wiring tests (IMP-034).
 */
import { describe, expect, it } from "vitest";

import { createNotificationChannelRegistry } from "../../channels";
import {
  buildMetaWhatsAppProviderEventDedupKey,
  createMetaWhatsAppChannelAdapter,
  type MetaWhatsAppHttpTransport,
} from "./index";

describe("IMP-034 channel registry wiring", () => {
  it("uses Meta adapter for WHATSAPP when registered", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return {
          kind: "ok",
          status: 200,
          json: { messages: [{ id: "wamid.REG" }] },
        };
      },
    };
    const registry = createNotificationChannelRegistry({
      whatsapp: createMetaWhatsAppChannelAdapter({
        secrets: {
          accessToken: "test_access_token_value",
          phoneNumberId: "pn-1",
          appSecret: "test_app_secret_value",
          webhookVerifyToken: "verify-token-value",
          wabaId: "waba-1",
          graphApiVersion: "v23.0",
          graphApiBaseUrl: "https://graph.facebook.com",
          sendNewMessages: true,
        },
        transport,
      }),
    });
    const result = await registry.adapterFor("WHATSAPP").send({
      notificationRequestId: "9c1f5d3a-0000-4000-8000-000000000001",
      attemptId: "9c1f5d3a-0000-4000-8000-000000000002",
      channel: "WHATSAPP",
      templateKey: "order_received",
      providerTemplateRef: "order_received",
      locale: "en-IN",
      variables: {},
      recipient: { customerId: "c1", phoneE164: "+919876543210" },
      correlationId: "9c1f5d3a-0000-4000-8000-000000000004",
    });
    expect(result.provider).toBe("meta_whatsapp");
    expect(result.outcome).toBe("ACCEPTED");
  });

  it("scopes webhook dedup keys by environment and account", () => {
    const staging = buildMetaWhatsAppProviderEventDedupKey({
      environment: "staging",
      wabaOrAccountId: "waba-1",
      providerEventId: "evt-1",
    });
    const production = buildMetaWhatsAppProviderEventDedupKey({
      environment: "production",
      wabaOrAccountId: "waba-1",
      providerEventId: "evt-1",
    });
    expect(staging).not.toEqual(production);
    expect(staging).toContain("staging");
    expect(production).toContain("production");
  });
});
