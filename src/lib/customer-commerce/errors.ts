/**
 * D-360 customer-commerce error envelope parsing (IMP-025).
 *
 * Transport-level folding only. Does not invent domain codes.
 */

export const GUEST_CART_TOKEN_HEADER = "X-Boba-Guest-Cart-Token";

export type CommerceTransportError = Readonly<{
  ok: false;
  code: "NETWORK_ERROR" | "INVALID_RESPONSE";
}>;

export type CommerceApiError = Readonly<{
  ok: false;
  code: string;
  requestId?: string;
  field?: string;
  resolutionOptions?: readonly string[];
}>;

export type CommerceFailure = CommerceTransportError | CommerceApiError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCommerceErrorBody(body: unknown): CommerceApiError | null {
  if (!isPlainObject(body) || body.ok !== false || typeof body.code !== "string" || body.code.length === 0) {
    return null;
  }
  const error: {
    ok: false;
    code: string;
    requestId?: string;
    field?: string;
    resolutionOptions?: readonly string[];
  } = { ok: false, code: body.code };
  if (typeof body.requestId === "string") error.requestId = body.requestId;
  if (typeof body.field === "string") error.field = body.field;
  if (
    Array.isArray(body.resolutionOptions) &&
    body.resolutionOptions.every((option) => typeof option === "string")
  ) {
    error.resolutionOptions = body.resolutionOptions;
  }
  return error;
}

export function isCommerceFailure(value: unknown): value is CommerceFailure {
  return isPlainObject(value) && value.ok === false && typeof value.code === "string";
}
