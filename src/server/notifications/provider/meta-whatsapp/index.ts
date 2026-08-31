/**
 * Meta WhatsApp Cloud API adapter public surface (IMP-034).
 */

export {
  META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL,
  META_WHATSAPP_DEFAULT_GRAPH_API_VERSION,
  META_WHATSAPP_MESSAGING_PRODUCT,
  META_WHATSAPP_PROVIDER,
  WHATSAPP_SEND_DISABLED_CODE,
} from "./constants";

export {
  createMetaWhatsAppChannelAdapter,
  type MetaWhatsAppAdapterOptions,
} from "./adapter";

export {
  loadMetaWhatsAppProviderConfig,
  MetaWhatsAppConfigurationError,
  WHATSAPP_PROVIDER_SELECTORS,
  type MetaWhatsAppEnvSource,
  type MetaWhatsAppProviderConfig,
  type MetaWhatsAppRuntimeSecrets,
  type WhatsAppProviderSelector,
} from "./config";

export {
  hmacSha256Hex,
  metaWhatsAppWebhookSignatureHex,
  timingSafeStringEqual,
} from "./crypto";

export { mapMetaWhatsAppHttpError } from "./errors";

export {
  createMetaWhatsAppHttpClient,
  type MetaWhatsAppHttpClientOptions,
  type MetaWhatsAppHttpResult,
  type MetaWhatsAppHttpTransport,
} from "./http";

export {
  redactUnknown,
  redactWebhookPayload,
  truncateBodyPreview,
} from "./redact";

export {
  buildMetaWhatsAppTemplatePayload,
  localeToMetaLanguageCode,
  normalizePhoneE164Digits,
} from "./send";

export {
  META_WHATSAPP_WEBHOOK_OBJECT,
  parseMetaWhatsAppWebhookPayload,
  type MetaWhatsAppInboundEvent,
  type MetaWhatsAppParsedEvent,
  type MetaWhatsAppStatusEvent,
  type MetaWhatsAppStatusValue,
} from "./webhook-payload";

export {
  buildMetaWhatsAppProviderEventDedupKey,
  processMetaWhatsAppWebhook,
  type ProcessMetaWhatsAppWebhookInput,
  type ProcessMetaWhatsAppWebhookResult,
} from "./webhook-process";

export {
  verifyMetaWhatsAppWebhookGet,
  verifyMetaWhatsAppWebhookSignature,
} from "./webhook-verify";
