/**
 * Testable Razorpay REST transport (IMP-026A).
 *
 * Key ID + Key Secret Basic auth. Base URL is encapsulated — never browser-controlled.
 * Secrets are never included in errors.
 */
import { PaymentError } from "../../../../shared/payment";

export const RAZORPAY_DEFAULT_API_BASE_URL = "https://api.razorpay.com/v1";
const DEFAULT_TIMEOUT_MS = 10_000;

export type RazorpayHttpMethod = "GET" | "POST";

export type RazorpayHttpOk = Readonly<{
  kind: "ok";
  status: number;
  json: unknown;
}>;

export type RazorpayHttpError = Readonly<{
  kind: "http_error";
  status: number;
  json: unknown;
}>;

export type RazorpayHttpUncertain = Readonly<{
  kind: "uncertain";
  reason: "timeout" | "connection_reset" | "network_failure";
}>;

export type RazorpayHttpResult = RazorpayHttpOk | RazorpayHttpError | RazorpayHttpUncertain;

export type RazorpayHttpRequest = Readonly<{
  method: RazorpayHttpMethod;
  path: string;
  query?: Readonly<Record<string, string>>;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
}>;

export type RazorpayHttpTransport = Readonly<{
  request(input: RazorpayHttpRequest): Promise<RazorpayHttpResult>;
}>;

export type RazorpayHttpClientOptions = Readonly<{
  keyId: string;
  keySecret: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}>;

function assertSafeRelativePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Razorpay HTTP path is invalid.",
    );
  }
}

function classifyFetchFailure(error: unknown): RazorpayHttpUncertain["reason"] {
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

export function createRazorpayHttpClient(
  options: RazorpayHttpClientOptions,
): RazorpayHttpTransport {
  const baseUrl = (options.baseUrl ?? RAZORPAY_DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const authorization = `Basic ${Buffer.from(`${options.keyId}:${options.keySecret}`, "utf8").toString("base64")}`;

  return Object.freeze({
    async request(input: RazorpayHttpRequest): Promise<RazorpayHttpResult> {
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
            ...(input.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
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
