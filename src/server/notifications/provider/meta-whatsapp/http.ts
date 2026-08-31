/**
 * Injectable Meta Graph API HTTP transport (IMP-034).
 *
 * Bearer access-token auth. Base URL is encapsulated — never browser-controlled.
 * Secrets are never included in errors. Ambiguous network / 5xx outcomes are
 * `uncertain` (Razorpay pattern) so callers never fabricate provider acceptance.
 */
import {
  META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL,
} from "./constants";

export type MetaWhatsAppHttpMethod = "GET" | "POST";

export type MetaWhatsAppHttpOk = Readonly<{
  kind: "ok";
  status: number;
  json: unknown;
}>;

export type MetaWhatsAppHttpError = Readonly<{
  kind: "http_error";
  status: number;
  json: unknown;
}>;

export type MetaWhatsAppHttpUncertain = Readonly<{
  kind: "uncertain";
  reason: "timeout" | "connection_reset" | "network_failure";
}>;

export type MetaWhatsAppHttpResult =
  | MetaWhatsAppHttpOk
  | MetaWhatsAppHttpError
  | MetaWhatsAppHttpUncertain;

export type MetaWhatsAppHttpRequest = Readonly<{
  method: MetaWhatsAppHttpMethod;
  path: string;
  query?: Readonly<Record<string, string>>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
}>;

export type MetaWhatsAppHttpTransport = Readonly<{
  request(input: MetaWhatsAppHttpRequest): Promise<MetaWhatsAppHttpResult>;
}>;

export type MetaWhatsAppHttpClientOptions = Readonly<{
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}>;

const DEFAULT_TIMEOUT_MS = 10_000;

function assertSafeRelativePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new Error("Meta WhatsApp HTTP path is invalid.");
  }
}

function classifyFetchFailure(error: unknown): MetaWhatsAppHttpUncertain["reason"] {
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    if (name === "aborterror" || message.includes("timeout") || message.includes("timed out")) {
      return "timeout";
    }
    if (
      message.includes("econnreset") ||
      message.includes("connection reset") ||
      message.includes("socket hang up")
    ) {
      return "connection_reset";
    }
  }
  return "network_failure";
}

export function createMetaWhatsAppHttpClient(
  options: MetaWhatsAppHttpClientOptions,
): MetaWhatsAppHttpTransport {
  const baseUrl = (options.baseUrl ?? META_WHATSAPP_DEFAULT_GRAPH_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Capture once; never interpolate into error messages.
  const authorization = `Bearer ${options.accessToken}`;

  return Object.freeze({
    async request(input: MetaWhatsAppHttpRequest): Promise<MetaWhatsAppHttpResult> {
      assertSafeRelativePath(input.path);
      const url = new URL(`${baseUrl}${input.path}`);
      if (input.query) {
        for (const [key, value] of Object.entries(input.query)) {
          url.searchParams.set(key, value);
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: input.method,
          headers: {
            Authorization: authorization,
            Accept: "application/json",
            ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(input.headers ?? {}),
          },
          body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
          signal: controller.signal,
        });
        let json: unknown = null;
        const text = await response.text();
        if (text.length > 0) {
          try {
            json = JSON.parse(text) as unknown;
          } catch {
            json = null;
          }
        }
        if (response.status >= 500) {
          return Object.freeze({ kind: "uncertain", reason: "network_failure" });
        }
        if (!response.ok) {
          return Object.freeze({
            kind: "http_error",
            status: response.status,
            json,
          });
        }
        return Object.freeze({ kind: "ok", status: response.status, json });
      } catch (error) {
        return Object.freeze({
          kind: "uncertain",
          reason: classifyFetchFailure(error),
        });
      } finally {
        clearTimeout(timer);
      }
    },
  });
}
