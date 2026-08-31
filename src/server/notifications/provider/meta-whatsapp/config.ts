/**
 * Meta WhatsApp Cloud API runtime configuration (IMP-034 / ADR-015).
 *
 * Fail-closed when selector is `meta_cloud_api`: required secrets must be
 * present. Staging/production credential isolation is via environment source
 * (existing ADR-015 pattern) — this loader never invents defaults for secrets.
 */
import "server-only";

import type { AppEnvironment } from "../../../../platform/config";
import {
  META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL,
  META_WHATSAPP_DEFAULT_GRAPH_API_VERSION,
} from "./constants";

export const WHATSAPP_PROVIDER_SELECTORS = ["disabled", "meta_cloud_api"] as const;
export type WhatsAppProviderSelector = (typeof WHATSAPP_PROVIDER_SELECTORS)[number];

export type MetaWhatsAppEnvSource = Readonly<Record<string, string | undefined>>;

export type MetaWhatsAppRuntimeSecrets = Readonly<{
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  webhookVerifyToken: string;
  wabaId: string | null;
  graphApiVersion: string;
  graphApiBaseUrl: string;
  sendNewMessages: boolean;
}>;

export type MetaWhatsAppProviderConfig =
  | Readonly<{ selector: "disabled" }>
  | Readonly<{ selector: "meta_cloud_api"; meta: MetaWhatsAppRuntimeSecrets }>;

export class MetaWhatsAppConfigurationError extends Error {
  readonly issues: ReadonlyArray<{ key: string; message: string }>;

  constructor(issues: ReadonlyArray<{ key: string; message: string }>) {
    const summary = issues.map((i) => `${i.key}: ${i.message}`).join("; ");
    super(`Meta WhatsApp configuration invalid: ${summary}`);
    this.name = "MetaWhatsAppConfigurationError";
    this.issues = issues;
  }
}

function requireSecret(
  key: string,
  raw: string | undefined,
  issues: Array<{ key: string; message: string }>,
): string | null {
  if (raw === undefined || raw.length === 0) {
    issues.push({
      key,
      message: "Required when BOBA_BEAR_WHATSAPP_PROVIDER=meta_cloud_api.",
    });
    return null;
  }
  if (raw.trim() !== raw || /\s/.test(raw)) {
    issues.push({
      key,
      message: "Must not contain surrounding or internal whitespace.",
    });
    return null;
  }
  if (raw.length < 8) {
    issues.push({
      key,
      message: "Must be at least 8 characters.",
    });
    return null;
  }
  return raw;
}

function parseSendNewMessages(raw: string | undefined): boolean {
  if (raw === undefined || raw.length === 0) return true;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return true;
}

/**
 * Load WhatsApp provider config from an env source.
 *
 * Default selector is `disabled`. When `meta_cloud_api`, secrets are required.
 * `BOBA_BEAR_WHATSAPP_SEND_NEW_MESSAGES` defaults to `true` when the provider
 * is enabled; `false` blocks outbound only (webhook ingest continues).
 */
export function loadMetaWhatsAppProviderConfig(
  source: MetaWhatsAppEnvSource,
  environmentType: AppEnvironment,
): MetaWhatsAppProviderConfig {
  void environmentType;
  const rawSelector = source.BOBA_BEAR_WHATSAPP_PROVIDER;
  const selector: WhatsAppProviderSelector =
    rawSelector === undefined || rawSelector.length === 0
      ? "disabled"
      : (rawSelector as WhatsAppProviderSelector);

  if (!(WHATSAPP_PROVIDER_SELECTORS as readonly string[]).includes(selector)) {
    throw new MetaWhatsAppConfigurationError([
      {
        key: "BOBA_BEAR_WHATSAPP_PROVIDER",
        message: 'Must be exactly "disabled" or "meta_cloud_api".',
      },
    ]);
  }

  if (selector === "disabled") {
    return Object.freeze({ selector: "disabled" });
  }

  const issues: Array<{ key: string; message: string }> = [];
  const accessToken = requireSecret(
    "BOBA_BEAR_META_WHATSAPP_ACCESS_TOKEN",
    source.BOBA_BEAR_META_WHATSAPP_ACCESS_TOKEN,
    issues,
  );
  const phoneNumberId = requireSecret(
    "BOBA_BEAR_META_WHATSAPP_PHONE_NUMBER_ID",
    source.BOBA_BEAR_META_WHATSAPP_PHONE_NUMBER_ID,
    issues,
  );
  const appSecret = requireSecret(
    "BOBA_BEAR_META_WHATSAPP_APP_SECRET",
    source.BOBA_BEAR_META_WHATSAPP_APP_SECRET,
    issues,
  );
  const webhookVerifyToken = requireSecret(
    "BOBA_BEAR_META_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    source.BOBA_BEAR_META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    issues,
  );

  const graphApiVersionRaw = source.BOBA_BEAR_META_WHATSAPP_GRAPH_API_VERSION;
  const graphApiVersion =
    graphApiVersionRaw === undefined || graphApiVersionRaw.length === 0
      ? META_WHATSAPP_DEFAULT_GRAPH_API_VERSION
      : graphApiVersionRaw.trim();
  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    issues.push({
      key: "BOBA_BEAR_META_WHATSAPP_GRAPH_API_VERSION",
      message: 'Must match "vMAJOR.MINOR" (e.g. v23.0).',
    });
  }

  const baseUrlRaw = source.BOBA_BEAR_META_WHATSAPP_GRAPH_API_BASE_URL;
  const graphApiBaseUrl =
    baseUrlRaw === undefined || baseUrlRaw.length === 0
      ? META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL
      : baseUrlRaw.trim().replace(/\/+$/, "");
  if (baseUrlRaw !== undefined && baseUrlRaw.length > 0) {
    try {
      const parsed = new URL(graphApiBaseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        issues.push({
          key: "BOBA_BEAR_META_WHATSAPP_GRAPH_API_BASE_URL",
          message: "Must be an absolute http(s) URL.",
        });
      }
    } catch {
      issues.push({
        key: "BOBA_BEAR_META_WHATSAPP_GRAPH_API_BASE_URL",
        message: "Must be an absolute http(s) URL.",
      });
    }
  }

  const wabaRaw = source.BOBA_BEAR_META_WHATSAPP_WABA_ID;
  let wabaId: string | null = null;
  if (wabaRaw !== undefined && wabaRaw.length > 0) {
    if (wabaRaw.trim() !== wabaRaw || /\s/.test(wabaRaw)) {
      issues.push({
        key: "BOBA_BEAR_META_WHATSAPP_WABA_ID",
        message: "Must not contain surrounding or internal whitespace.",
      });
    } else {
      wabaId = wabaRaw;
    }
  }

  const sendNewMessagesRaw = source.BOBA_BEAR_WHATSAPP_SEND_NEW_MESSAGES;
  if (
    sendNewMessagesRaw !== undefined &&
    sendNewMessagesRaw.length > 0 &&
    sendNewMessagesRaw !== "true" &&
    sendNewMessagesRaw !== "false"
  ) {
    issues.push({
      key: "BOBA_BEAR_WHATSAPP_SEND_NEW_MESSAGES",
      message: 'Must be exactly "true" or "false" when set.',
    });
  }

  if (issues.length > 0) {
    throw new MetaWhatsAppConfigurationError(issues);
  }

  return Object.freeze({
    selector: "meta_cloud_api",
    meta: Object.freeze({
      accessToken: accessToken!,
      phoneNumberId: phoneNumberId!,
      appSecret: appSecret!,
      webhookVerifyToken: webhookVerifyToken!,
      wabaId,
      graphApiVersion,
      graphApiBaseUrl,
      sendNewMessages: parseSendNewMessages(sendNewMessagesRaw),
    }),
  });
}
