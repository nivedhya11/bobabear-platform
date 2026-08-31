/**
 * Meta WhatsApp Cloud API channel adapter (IMP-034).
 *
 * Implements NotificationChannelAdapter for WHATSAPP. Never fabricates
 * ACCEPTED without a real Meta `messages[0].id`. Ambiguous network → NOT_SENT
 * TRANSIENT (Razorpay uncertain pattern — do not duplicate-send blindly).
 */
import "server-only";

import type {
  ChannelSendInput,
  ChannelSendResult,
  NotificationChannelAdapter,
} from "../../types";
import {
  META_WHATSAPP_PROVIDER,
  WHATSAPP_SEND_DISABLED_CODE,
} from "./constants";
import { mapMetaWhatsAppHttpError } from "./errors";
import {
  createMetaWhatsAppHttpClient,
  type MetaWhatsAppHttpTransport,
} from "./http";
import type { MetaWhatsAppRuntimeSecrets } from "./config";
import { buildMetaWhatsAppTemplatePayload } from "./send";

export type MetaWhatsAppAdapterOptions = Readonly<{
  secrets: MetaWhatsAppRuntimeSecrets;
  transport?: MetaWhatsAppHttpTransport;
}>;

function parseAcceptedMessageId(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const messages = (json as Record<string, unknown>).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const first = messages[0];
  if (typeof first !== "object" || first === null) return null;
  const id = (first as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function createMetaWhatsAppChannelAdapter(
  options: MetaWhatsAppAdapterOptions,
): NotificationChannelAdapter {
  const { secrets } = options;
  const transport =
    options.transport ??
    createMetaWhatsAppHttpClient({
      accessToken: secrets.accessToken,
      baseUrl: secrets.graphApiBaseUrl,
    });

  return Object.freeze({
    channel: "WHATSAPP" as const,
    provider: META_WHATSAPP_PROVIDER,
    async send(input: ChannelSendInput): Promise<ChannelSendResult> {
      if (!secrets.sendNewMessages) {
        return Object.freeze({
          outcome: "NOT_SENT" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: "POLICY_REJECTED" as const,
          failureCode: WHATSAPP_SEND_DISABLED_CODE,
          failureDetail: "Outbound WhatsApp sends are disabled by kill switch.",
        });
      }

      const phone = input.recipient.phoneE164?.trim() ?? "";
      if (phone.length === 0) {
        return Object.freeze({
          outcome: "NOT_SENT" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: "RECIPIENT_UNAVAILABLE" as const,
          failureCode: "RECIPIENT_PHONE_MISSING",
          failureDetail: "Customer phone number is missing.",
        });
      }

      const templateRef = input.providerTemplateRef?.trim() ?? "";
      if (templateRef.length === 0) {
        return Object.freeze({
          outcome: "NOT_SENT" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: "TEMPLATE_FAILURE" as const,
          failureCode: "PROVIDER_TEMPLATE_REF_MISSING",
          failureDetail: "providerTemplateRef is required for Meta template sends.",
        });
      }

      const body = buildMetaWhatsAppTemplatePayload({
        toE164: phone,
        providerTemplateRef: templateRef,
        locale: input.locale,
        variables: input.variables,
      });

      const path = `/${secrets.graphApiVersion}/${secrets.phoneNumberId}/messages`;
      const result = await transport.request({
        method: "POST",
        path,
        body,
      });

      if (result.kind === "uncertain") {
        return Object.freeze({
          outcome: "NOT_SENT" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: "TRANSIENT" as const,
          failureCode: `META_NETWORK_${result.reason.toUpperCase()}`,
          failureDetail:
            "Meta Graph API outcome is ambiguous; message was not confirmed accepted.",
        });
      }

      if (result.kind === "http_error") {
        const mapped = mapMetaWhatsAppHttpError(result.status, result.json);
        return Object.freeze({
          outcome: "REJECTED" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: mapped.category,
          failureCode: mapped.code,
          failureDetail: mapped.detail,
        });
      }

      const providerMessageId = parseAcceptedMessageId(result.json);
      if (!providerMessageId) {
        return Object.freeze({
          outcome: "NOT_SENT" as const,
          provider: META_WHATSAPP_PROVIDER,
          providerMessageId: null,
          failureCategory: "UNKNOWN" as const,
          failureCode: "META_MESSAGE_ID_MISSING",
          failureDetail: "Meta response lacked messages[0].id.",
        });
      }

      return Object.freeze({
        outcome: "ACCEPTED" as const,
        provider: META_WHATSAPP_PROVIDER,
        providerMessageId,
        failureCategory: null,
        failureCode: null,
        failureDetail: null,
      });
    },
  });
}
