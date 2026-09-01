/**
 * Same-origin `/api/v1/*` fetch wrapper (IMP-025 / D-360).
 *
 * No business rules. No `src/server/**` imports.
 */
import { parseCommerceErrorBody, type CommerceFailure } from "./errors";
import { guestCartTokenHeader, readGuestCartCredential } from "./guest-token";

const JSON_CONTENT_TYPE = "application/json";

export type CommerceRequestOptions = Readonly<{
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Readonly<Record<string, string | undefined>>;
  /** Attach guest cart token when the operation accepts it. */
  guestToken?: boolean;
  signal?: AbortSignal;
}>;

export type CommerceHttpResult<T> =
  | Readonly<{ ok: true; status: number; data: T }>
  | (CommerceFailure & Readonly<{ status: number }>);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildUrl(path: string, query?: Readonly<Record<string, string | undefined>>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value.length > 0) params.set(key, value);
  }
  const encoded = params.toString();
  return encoded.length > 0 ? `${path}?${encoded}` : path;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes(JSON_CONTENT_TYPE)) {
    throw new Error("Response was not JSON.");
  }
  return response.json();
}

export async function commerceRequest<T>(
  path: string,
  options: CommerceRequestOptions = {},
): Promise<CommerceHttpResult<T>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = JSON_CONTENT_TYPE;
  }
  if (options.guestToken) {
    Object.assign(headers, guestCartTokenHeader(readGuestCartCredential()));
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR", status: 0 };
  }

  let parsed: unknown;
  try {
    parsed = await readBody(response);
  } catch {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }

  if (!response.ok) {
    const error = parseCommerceErrorBody(parsed);
    if (!error) return { ok: false, code: "INVALID_RESPONSE", status: response.status };
    return { ...error, status: response.status };
  }

  if (response.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  if (!isPlainObject(parsed) || parsed.ok !== true) {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }

  return { ok: true, status: response.status, data: parsed as T };
}
