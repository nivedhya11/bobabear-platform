/**
 * Same-origin `/api/operations/v1/*` fetch wrapper (IMP-030).
 *
 * No business rules. No `src/server/**` imports.
 */
import { parseOperationsErrorBody, type OperationsFailure } from "./errors";

const JSON_CONTENT_TYPE = "application/json";

export type OperationsRequestOptions = Readonly<{
  method?: "GET" | "POST";
  query?: Readonly<Record<string, string | undefined>>;
  body?: Readonly<Record<string, string>>;
}>;

export type OperationsHttpResult<T> =
  | Readonly<{ ok: true; status: number; data: T }>
  | (OperationsFailure & Readonly<{ status: number }>);

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

export async function operationsRequest<T>(
  path: string,
  options: OperationsRequestOptions = {},
): Promise<OperationsHttpResult<T>> {
  const method = options.method ?? "GET";
  const init: RequestInit = {
    method,
    credentials: "same-origin",
  };
  if (method === "POST" && options.body !== undefined) {
    init.headers = { "Content-Type": JSON_CONTENT_TYPE };
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), init);
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
    const error = parseOperationsErrorBody(parsed);
    if (!error) return { ok: false, code: "INVALID_RESPONSE", status: response.status };
    return { ...error, status: response.status };
  }

  if (!isPlainObject(parsed) || parsed.ok !== true) {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }

  return { ok: true, status: response.status, data: parsed as T };
}
