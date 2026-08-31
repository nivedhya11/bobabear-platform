/**
 * Same-origin `/api/admin/v1/*` fetch wrapper (IMP-035).
 */
const JSON_CONTENT_TYPE = "application/json";

export type AdminRequestOptions = Readonly<{
  method?: "GET" | "POST" | "PATCH";
  query?: Readonly<Record<string, string | undefined>>;
  body?: Readonly<Record<string, unknown>>;
}>;

export type AdminHttpResult<T> =
  | Readonly<{ ok: true; status: number; data: T }>
  | Readonly<{ ok: false; code: string; status: number; field?: string }>;

function buildUrl(path: string, query?: Readonly<Record<string, string | undefined>>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value.length > 0) params.set(key, value);
  }
  const encoded = params.toString();
  return encoded.length > 0 ? `${path}?${encoded}` : path;
}

export async function adminRequest<T>(
  path: string,
  options: AdminRequestOptions = {},
): Promise<AdminHttpResult<T>> {
  const method = options.method ?? "GET";
  const init: RequestInit = { method, credentials: "same-origin" };
  if ((method === "POST" || method === "PATCH") && options.body !== undefined) {
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
    parsed = response.status === 204 ? null : await response.json();
  } catch {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }
  if (!response.ok) {
    const code =
      typeof parsed === "object" &&
      parsed !== null &&
      "code" in parsed &&
      typeof (parsed as { code: unknown }).code === "string"
        ? (parsed as { code: string }).code
        : "INVALID_RESPONSE";
    const field =
      typeof parsed === "object" &&
      parsed !== null &&
      "field" in parsed &&
      typeof (parsed as { field: unknown }).field === "string"
        ? (parsed as { field: string }).field
        : undefined;
    return { ok: false, code, status: response.status, ...(field ? { field } : {}) };
  }
  if (typeof parsed !== "object" || parsed === null || (parsed as { ok?: unknown }).ok !== true) {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }
  return { ok: true, status: response.status, data: parsed as T };
}
