/**
 * Same-origin `/api/admin/v1/*` fetch wrapper (IMP-035).
 */
import { WORKFORCE_STEP_UP_PROOF_HEADER } from "@/shared/workforce-auth/contracts";

const JSON_CONTENT_TYPE = "application/json";

export type AdminRequestOptions = Readonly<{
  method?: "GET" | "POST" | "PATCH";
  query?: Readonly<Record<string, string | undefined>>;
  body?: Readonly<Record<string, unknown>>;
  /** IMP-038 single-use step-up proof id for high-consequence mutations. */
  stepUpProofId?: string;
}>;

export type AdminHttpResult<T> =
  | Readonly<{ ok: true; status: number; data: T }>
  | Readonly<{
      ok: false;
      code: string;
      status: number;
      field?: string;
      message?: string;
      issues?: readonly string[];
    }>;

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
  const headers: Record<string, string> = {};
  const init: RequestInit = { method, credentials: "same-origin" };
  if ((method === "POST" || method === "PATCH") && options.body !== undefined) {
    headers["Content-Type"] = JSON_CONTENT_TYPE;
    const body: Record<string, unknown> = { ...options.body };
    if (typeof options.stepUpProofId === "string" && options.stepUpProofId.length > 0) {
      body.stepUpProofId = options.stepUpProofId;
      headers[WORKFORCE_STEP_UP_PROOF_HEADER] = options.stepUpProofId;
    }
    init.body = JSON.stringify(body);
  } else if (typeof options.stepUpProofId === "string" && options.stepUpProofId.length > 0) {
    headers[WORKFORCE_STEP_UP_PROOF_HEADER] = options.stepUpProofId;
  }
  if (Object.keys(headers).length > 0) {
    init.headers = headers;
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
    const envelope =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    const code =
      envelope && typeof envelope.code === "string" ? envelope.code : "INVALID_RESPONSE";
    const field = envelope && typeof envelope.field === "string" ? envelope.field : undefined;
    const message =
      envelope && typeof envelope.message === "string" ? envelope.message : undefined;
    const issues =
      envelope &&
      Array.isArray(envelope.issues) &&
      envelope.issues.every((issue) => typeof issue === "string")
        ? (envelope.issues as string[])
        : undefined;
    return {
      ok: false,
      code,
      status: response.status,
      ...(field ? { field } : {}),
      ...(message ? { message } : {}),
      ...(issues ? { issues } : {}),
    };
  }
  if (typeof parsed !== "object" || parsed === null || (parsed as { ok?: unknown }).ok !== true) {
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }
  return { ok: true, status: response.status, data: parsed as T };
}
