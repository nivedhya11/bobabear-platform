/**
 * Operations API error envelope parsing (IMP-030).
 *
 * Transport-level folding only. Does not invent domain codes.
 */

export type OperationsTransportError = Readonly<{
  ok: false;
  code: "NETWORK_ERROR" | "INVALID_RESPONSE";
}>;

export type OperationsApiError = Readonly<{
  ok: false;
  code: string;
  requestId?: string;
  field?: string;
}>;

export type OperationsFailure = OperationsTransportError | OperationsApiError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOperationsErrorBody(body: unknown): OperationsApiError | null {
  if (!isPlainObject(body) || body.ok !== false || typeof body.code !== "string" || body.code.length === 0) {
    return null;
  }
  const error: {
    ok: false;
    code: string;
    requestId?: string;
    field?: string;
  } = { ok: false, code: body.code };
  if (typeof body.requestId === "string") error.requestId = body.requestId;
  if (typeof body.field === "string") error.field = body.field;
  return error;
}
