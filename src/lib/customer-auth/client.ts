/**
 * Browser-side customer-auth HTTP façade (IMP-009).
 *
 * A typed `fetch` wrapper for the six-endpoint customer-auth service,
 * reached through the Nginx reverse-proxy path prefix
 * (`docker/nginx/nginx.conf`'s `location ^~ /api/customer-auth/`) — never a
 * cross-origin request. Every call is same-origin, JSON-only, and parses
 * only the approved response shapes from `@/shared/customer-auth/contracts`.
 *
 * Deliberately does not import `src/server/**` or `better-auth` — this
 * module ships to the browser. It never reads, writes, or inspects a
 * cookie/token itself; the browser's own cookie jar handles that via
 * `credentials: "same-origin"`.
 */
import {
  CUSTOMER_AUTH_PUBLIC_PATHS,
  type CustomerAuthSendOtpResponse,
  type CustomerAuthSessionResponse,
  type CustomerAuthSignOutResponse,
  type CustomerAuthVerifyOtpFailure,
  type CustomerAuthVerifyOtpResponse,
} from "@/shared/customer-auth/contracts";

/** A request never reached the service at all (network failure, the
 * response body was not valid JSON, or it did not match any approved
 * shape). Never wraps or exposes the underlying `fetch` error. */
export type CustomerAuthClientError = Readonly<{
  ok: false;
  code: "NETWORK_ERROR" | "INVALID_RESPONSE";
}>;

export type CustomerAuthSendOtpResult =
  | Readonly<{ ok: true; data: CustomerAuthSendOtpResponse }>
  | CustomerAuthClientError;

export type CustomerAuthVerifyOtpResult =
  | Readonly<{ ok: true; data: CustomerAuthVerifyOtpResponse }>
  | CustomerAuthClientError;

export type CustomerAuthSessionResult =
  | Readonly<{ ok: true; data: CustomerAuthSessionResponse }>
  | CustomerAuthClientError;

export type CustomerAuthSignOutResult =
  | Readonly<{ ok: true; data: CustomerAuthSignOutResponse }>
  | CustomerAuthClientError;

const JSON_CONTENT_TYPE = "application/json";

function parseRetryAfterSeconds(response: Response): number | undefined {
  const raw = response.headers.get("Retry-After");
  if (raw === null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function readJsonBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes(JSON_CONTENT_TYPE)) {
    throw new Error("Response was not JSON.");
  }
  return response.json();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown decoded JSON body to one of the approved send-OTP
 * response shapes, folding the header-derived `Retry-After` value in when
 * the body itself omitted it. */
function parseSendOtpBody(
  body: unknown,
  retryAfterSeconds: number | undefined,
): CustomerAuthSendOtpResponse | null {
  if (!isPlainObject(body) || typeof body.ok !== "boolean") return null;

  if (body.ok === true && body.code === "OTP_REQUEST_ACCEPTED") {
    const seconds =
      typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : retryAfterSeconds ?? 0;
    return { ok: true, code: "OTP_REQUEST_ACCEPTED", retryAfterSeconds: seconds };
  }
  if (body.ok === false && body.code === "OTP_RATE_LIMITED") {
    const seconds =
      typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : retryAfterSeconds ?? 0;
    return { ok: false, code: "OTP_RATE_LIMITED", retryAfterSeconds: seconds };
  }
  if (body.ok === false && body.code === "OTP_DELIVERY_UNAVAILABLE") {
    return { ok: false, code: "OTP_DELIVERY_UNAVAILABLE" };
  }
  if (body.ok === false && body.code === "INVALID_PHONE_NUMBER") {
    return { ok: false, code: "INVALID_PHONE_NUMBER" };
  }
  return null;
}

const VERIFY_OTP_FAILURE_CODES: ReadonlySet<CustomerAuthVerifyOtpFailure["code"]> = new Set([
  "OTP_INVALID_OR_EXPIRED",
  "OTP_ATTEMPTS_EXHAUSTED",
  "OTP_RATE_LIMITED",
  "OTP_DELIVERY_UNAVAILABLE",
  "INVALID_PHONE_NUMBER",
  "INVALID_REQUEST",
]);

function isVerifyOtpFailureCode(value: unknown): value is CustomerAuthVerifyOtpFailure["code"] {
  return (
    typeof value === "string" &&
    VERIFY_OTP_FAILURE_CODES.has(value as CustomerAuthVerifyOtpFailure["code"])
  );
}

function parseVerifyOtpBody(
  body: unknown,
  retryAfterSeconds: number | undefined,
): CustomerAuthVerifyOtpResponse | null {
  if (!isPlainObject(body) || typeof body.authenticated !== "boolean") return null;

  if (body.authenticated === true) {
    return { authenticated: true };
  }
  if (isVerifyOtpFailureCode(body.code)) {
    const seconds =
      typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : retryAfterSeconds;
    return {
      authenticated: false,
      code: body.code,
      ...(seconds !== undefined ? { retryAfterSeconds: seconds } : {}),
    };
  }
  return null;
}

function parseSessionBody(body: unknown): CustomerAuthSessionResponse | null {
  if (!isPlainObject(body) || typeof body.authenticated !== "boolean") return null;
  if (body.authenticated === false) return { authenticated: false };

  const user = body.user;
  if (!isPlainObject(user) || typeof user.id !== "string") return null;
  return { authenticated: true, user: { id: user.id } };
}

function parseSignOutBody(body: unknown): CustomerAuthSignOutResponse | null {
  if (!isPlainObject(body) || body.authenticated !== false) return null;
  return { authenticated: false };
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": JSON_CONTENT_TYPE },
    body: JSON.stringify(body),
  });
}

/** Request an OTP be sent to `phoneNumber` (already client-normalized —
 * see `normalizeIndianMobileNumber`). */
export async function sendCustomerOtp(phoneNumber: string): Promise<CustomerAuthSendOtpResult> {
  let response: Response;
  try {
    response = await postJson(CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp, { phoneNumber });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  try {
    const body = await readJsonBody(response);
    const parsed = parseSendOtpBody(body, retryAfterSeconds);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

/** Verify a six-digit code for `phoneNumber`. On success, the service sets
 * the customer session cookie itself — this façade never touches it. */
export async function verifyCustomerOtp(
  phoneNumber: string,
  code: string,
): Promise<CustomerAuthVerifyOtpResult> {
  let response: Response;
  try {
    response = await postJson(CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp, { phoneNumber, code });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  try {
    const body = await readJsonBody(response);
    const parsed = parseVerifyOtpBody(body, retryAfterSeconds);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

/** Restore session state on page load. Never throws — a network failure or
 * malformed response is reported as `INVALID_RESPONSE`/`NETWORK_ERROR`, not
 * treated as "signed in". */
export async function fetchCustomerSession(): Promise<CustomerAuthSessionResult> {
  let response: Response;
  try {
    response = await fetch(CUSTOMER_AUTH_PUBLIC_PATHS.session, {
      method: "GET",
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseSessionBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function signOutCustomer(): Promise<CustomerAuthSignOutResult> {
  let response: Response;
  try {
    response = await postJson(CUSTOMER_AUTH_PUBLIC_PATHS.signOut, {});
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseSignOutBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}
