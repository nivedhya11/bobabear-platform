/**
 * Meta WhatsApp Cloud API provider constants (IMP-034).
 *
 * Graph API version is config-pinned at runtime; these defaults match the
 * verified Meta documentation pin at implementation time (`v23.0`).
 */

export const META_WHATSAPP_PROVIDER = "meta_whatsapp" as const;

export const META_WHATSAPP_DEFAULT_GRAPH_API_VERSION = "v23.0" as const;

export const META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL =
  "https://graph.facebook.com" as const;

export const META_WHATSAPP_MESSAGING_PRODUCT = "whatsapp" as const;

export const WHATSAPP_SEND_DISABLED_CODE = "WHATSAPP_SEND_DISABLED" as const;
