/**
 * Meta WhatsApp adapter unit tests (IMP-034) — mocked HTTP only.
 */
import { describe, expect, it } from "vitest";

import { createMetaWhatsAppChannelAdapter } from "./adapter";
import type { MetaWhatsAppRuntimeSecrets } from "./config";
import { metaWhatsAppWebhookSignatureHex } from "./crypto";
import type { MetaWhatsAppHttpTransport } from "./http";
import { redactWebhookPayload } from "./redact";
import { parseMetaWhatsAppWebhookPayload } from "./webhook-payload";
import {
  verifyMetaWhatsAppWebhookGet,
  verifyMetaWhatsAppWebhookSignature,
} from "./webhook-verify";
import type { ChannelSendInput } from "../../types";

const secrets = (
  overrides: Partial<MetaWhatsAppRuntimeSecrets> = {},
): MetaWhatsAppRuntimeSecrets =>
  Object.freeze({
    accessToken: "test_access_token_value",
    phoneNumberId: "phone-number-id-1",
    appSecret: "test_app_secret_value",
    webhookVerifyToken: "verify-token-value",
    wabaId: "waba-1",
    graphApiVersion: "v23.0",
    graphApiBaseUrl: "https://graph.facebook.com",
    sendNewMessages: true,
    ...overrides,
  });

function sendInput(overrides: Partial<ChannelSendInput> = {}): ChannelSendInput {
  return {
    notificationRequestId: "9c1f5d3a-0000-4000-8000-000000000001",
    attemptId: "9c1f5d3a-0000-4000-8000-000000000002",
    channel: "WHATSAPP",
    templateKey: "order_received",
    providerTemplateRef: "order_received",
    locale: "en-IN",
    variables: {},
    recipient: {
      customerId: "9c1f5d3a-0000-4000-8000-000000000003",
      phoneE164: "+919876543210",
    },
    correlationId: "9c1f5d3a-0000-4000-8000-000000000004",
    ...overrides,
  };
}

describe("createMetaWhatsAppChannelAdapter", () => {
  it("returns ACCEPTED only with a real provider message id", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return {
          kind: "ok",
          status: 200,
          json: { messages: [{ id: "wamid.ABC123" }] },
        };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result).toMatchObject({
      outcome: "ACCEPTED",
      provider: "meta_whatsapp",
      providerMessageId: "wamid.ABC123",
    });
  });

  it("maps rate-limit rejection", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return {
          kind: "http_error",
          status: 429,
          json: { error: { code: 80007, message: "rate limited" } },
        };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result.outcome).toBe("REJECTED");
    expect(result.failureCategory).toBe("RATE_LIMITED");
  });

  it("maps auth failure", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return {
          kind: "http_error",
          status: 401,
          json: { error: { code: 190, message: "invalid token" } },
        };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result.failureCategory).toBe("AUTHENTICATION_FAILURE");
  });

  it("maps template failure", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return {
          kind: "http_error",
          status: 400,
          json: { error: { code: 132001, message: "template missing" } },
        };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result.failureCategory).toBe("TEMPLATE_FAILURE");
  });

  it("treats uncertain network as NOT_SENT TRANSIENT", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return { kind: "uncertain", reason: "timeout" };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result).toMatchObject({
      outcome: "NOT_SENT",
      failureCategory: "TRANSIENT",
      providerMessageId: null,
    });
  });

  it("respects outbound kill switch", async () => {
    let called = false;
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        called = true;
        return { kind: "ok", status: 200, json: { messages: [{ id: "x" }] } };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets({ sendNewMessages: false }),
      transport,
    }).send(sendInput());
    expect(called).toBe(false);
    expect(result).toMatchObject({
      outcome: "NOT_SENT",
      failureCategory: "POLICY_REJECTED",
      failureCode: "WHATSAPP_SEND_DISABLED",
    });
  });

  it("requires recipient phone and provider template ref", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        throw new Error("should not call");
      },
    };
    const missingPhone = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput({ recipient: { customerId: "c1", phoneE164: null } }));
    expect(missingPhone.failureCategory).toBe("RECIPIENT_UNAVAILABLE");
    const missingTemplate = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput({ providerTemplateRef: null }));
    expect(missingTemplate.failureCategory).toBe("TEMPLATE_FAILURE");
  });

  it("does not fabricate acceptance on malformed success body", async () => {
    const transport: MetaWhatsAppHttpTransport = {
      async request() {
        return { kind: "ok", status: 200, json: { messages: [] } };
      },
    };
    const result = await createMetaWhatsAppChannelAdapter({
      secrets: secrets(),
      transport,
    }).send(sendInput());
    expect(result.outcome).toBe("NOT_SENT");
    expect(result.providerMessageId).toBeNull();
  });
});

describe("webhook verification", () => {
  it("accepts valid hub challenge", () => {
    const result = verifyMetaWhatsAppWebhookGet({
      mode: "subscribe",
      verifyToken: "verify-token-value",
      challenge: "12345",
      expectedVerifyToken: "verify-token-value",
    });
    expect(result).toEqual({ ok: true, challenge: "12345" });
  });

  it("rejects bad verify token", () => {
    const result = verifyMetaWhatsAppWebhookGet({
      mode: "subscribe",
      verifyToken: "wrong",
      challenge: "12345",
      expectedVerifyToken: "verify-token-value",
    });
    expect(result.ok).toBe(false);
  });

  it("verifies X-Hub-Signature-256", () => {
    const body = new TextEncoder().encode('{"object":"whatsapp_business_account"}');
    const sig = `sha256=${metaWhatsAppWebhookSignatureHex("secret-secret", body)}`;
    expect(
      verifyMetaWhatsAppWebhookSignature({
        appSecret: "secret-secret",
        rawBody: body,
        signatureHeader: sig,
      }),
    ).toBe(true);
    expect(
      verifyMetaWhatsAppWebhookSignature({
        appSecret: "secret-secret",
        rawBody: body,
        signatureHeader: "sha256=deadbeef",
      }),
    ).toBe(false);
  });
});

describe("payload parse + redact", () => {
  it("parses status and inbound events", () => {
    const events = parseMetaWhatsAppWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "pn-1" },
                statuses: [
                  {
                    id: "wamid.1",
                    status: "delivered",
                    timestamp: "1",
                  },
                ],
                messages: [
                  {
                    id: "wamid.in.1",
                    from: "919876543210",
                    type: "text",
                    timestamp: "2",
                    text: { body: "hello" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(events.some((e) => e.kind === "status")).toBe(true);
    expect(events.some((e) => e.kind === "inbound")).toBe(true);
  });

  it("redacts secrets from payloads", () => {
    const redacted = redactWebhookPayload({
      access_token: "super-secret",
      nested: { app_secret: "also-secret", ok: "keep" },
    });
    expect(redacted.access_token).toBe("[REDACTED]");
    expect((redacted.nested as { app_secret: string }).app_secret).toBe("[REDACTED]");
    expect((redacted.nested as { ok: string }).ok).toBe("keep");
  });
});
