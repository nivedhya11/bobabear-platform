/**
 * Exact-path HTTP router for the customer-auth service (IMP-009).
 *
 * Only six endpoints exist. Every other path is `404`; a known path with
 * the wrong method is `405` with an `Allow` header. Nothing in this module
 * calls `console.*` — it only returns safe, allowlisted outcome metadata
 * for the service layer (`../service.ts`) to log.
 */
import "server-only";

import { randomInt } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { APIError } from "better-auth";

import {
  CUSTOMER_AUTH_PUBLIC_PATHS,
  type CustomerAuthSendOtpInvalidPhone,
  type CustomerAuthSendOtpRateLimited,
  type CustomerAuthSendOtpSuccess,
  type CustomerAuthSendOtpUnavailable,
  type CustomerAuthSessionAuthenticated,
  type CustomerAuthSessionUnauthenticated,
  type CustomerAuthSignOutResponse,
  type CustomerAuthVerifyOtpFailure,
  type CustomerAuthVerifyOtpSuccess,
} from "../../../shared/customer-auth/contracts";
import { normalizeIndianMobileNumber } from "../../../shared/customer-auth/phone";
import type { Persistence } from "../../persistence";
import { CustomerOtpProviderError } from "../errors";
import type { CustomerPiiHashSecret } from "../pii";
import {
  CUSTOMER_OTP_EXPIRES_IN_SECONDS,
  CUSTOMER_OTP_LENGTH,
  type CustomerOtpProvider,
} from "../provider";
import {
  consumeCustomerOtpRateLimits,
  CUSTOMER_OTP_RATE_LIMIT_RULES,
  hashCustomerOtpIpKey,
  hashCustomerOtpPhoneKey,
  type CustomerOtpRateLimitScope,
} from "../rate-limit";
import { deriveClientIp } from "./client-ip";
import { buildBetterAuthRequestHeaders } from "./headers";
import { checkTrustedOrigin } from "./origin";
import { hasDisallowedQueryParams, readJsonObjectBody } from "./request";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";

/**
 * The narrow structural surface this router needs from the customer realm's
 * Better Auth instance. Deliberately not `CustomerBetterAuthInstance` from
 * `../../auth/customer` — this router only cares about three endpoints, and
 * a minimal, locally-owned contract keeps it decoupled from that instance's
 * full generated shape (including its plugin list).
 */
export interface CustomerAuthApi {
  verifyPhoneNumber(input: {
    body: Readonly<{
      phoneNumber: string;
      code: string;
      disableSession: false;
      updatePhoneNumber: false;
    }>;
    headers: Headers;
    returnHeaders: true;
  }): Promise<{
    headers: Headers;
    response: { status: boolean; token: string | null; user: { id: string } | null };
  }>;

  getSession(input: { headers: Headers; returnHeaders: true }): Promise<{
    headers: Headers;
    response: { session: unknown; user: { id: string } } | null;
  }>;

  signOut(input: { headers: Headers; returnHeaders: true }): Promise<{
    headers: Headers;
    response: { success: boolean };
  }>;
}

export type CustomerAuthRouteDependencies = Readonly<{
  getAuthApi: () => Promise<CustomerAuthApi>;
  persistence: Persistence;
  otpProvider: CustomerOtpProvider;
  piiHashSecret: CustomerPiiHashSecret;
  trustedOrigin: string;
  trustProxyHops: number;
  now: () => Date;
}>;

export type CustomerAuthRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  rateLimitScope?: string;
}>;

const SEND_OTP_RETRY_AFTER_SECONDS = 60;
const QUERY_STRING_DISALLOWED_FIELDS = ["phoneNumber", "phone", "code", "otp"] as const;
const UNKNOWN_CLIENT_IP_BUCKET = "unknown";

function generateNumericOtp(length: number): string {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, "0");
}

function resolveClientIp(
  req: IncomingMessage,
  trustProxyHops: number,
): string {
  const result = deriveClientIp(req.headers, req.socket.remoteAddress, trustProxyHops);
  return result.ok ? result.canonicalIp : UNKNOWN_CLIENT_IP_BUCKET;
}

function extractApiErrorCode(error: unknown): string | null {
  if (!(error instanceof APIError)) return null;
  const code = (error.body as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : null;
}

function mapVerifyPhoneNumberError(
  error: unknown,
): Readonly<{ code: CustomerAuthVerifyOtpFailure["code"]; httpStatus: number }> | null {
  if (error instanceof CustomerOtpProviderError) {
    return { code: "OTP_DELIVERY_UNAVAILABLE", httpStatus: 503 };
  }

  const apiErrorCode = extractApiErrorCode(error);
  if (apiErrorCode === "TOO_MANY_ATTEMPTS") {
    return { code: "OTP_ATTEMPTS_EXHAUSTED", httpStatus: 403 };
  }
  if (
    apiErrorCode === "INVALID_OTP" ||
    apiErrorCode === "OTP_EXPIRED" ||
    apiErrorCode === "OTP_NOT_FOUND"
  ) {
    return { code: "OTP_INVALID_OR_EXPIRED", httpStatus: 401 };
  }
  if (apiErrorCode === "INVALID_PHONE_NUMBER") {
    return { code: "INVALID_PHONE_NUMBER", httpStatus: 400 };
  }
  return null;
}

async function handleSendOtp(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<CustomerAuthRouteOutcome> {
  const operation = "send_otp";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    sendJson(res, { ok: false, code: "INVALID_REQUEST" }, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    sendJson(res, { ok: false, code: "INVALID_REQUEST" }, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const bodyResult = await readJsonObjectBody(req, ["phoneNumber"]);
  if (!bodyResult.ok) {
    sendJson(res, { ok: false, code: "INVALID_REQUEST" }, { status: 400, requestId });
    return { operation, safeOutcomeCode: `BODY_${bodyResult.reason.toUpperCase()}`, httpStatus: 400 };
  }

  const normalized = normalizeIndianMobileNumber(bodyResult.value.phoneNumber);
  if (!normalized.ok) {
    const body: CustomerAuthSendOtpInvalidPhone = { ok: false, code: "INVALID_PHONE_NUMBER" };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_PHONE_NUMBER", httpStatus: 400 };
  }
  const phoneNumber = normalized.phoneNumber;

  const canonicalIp = resolveClientIp(req, deps.trustProxyHops);
  const now = deps.now();
  const phoneKeyHash = hashCustomerOtpPhoneKey(deps.piiHashSecret, phoneNumber);
  const ipKeyHash = hashCustomerOtpIpKey(deps.piiHashSecret, canonicalIp);

  const keyHashes: Record<CustomerOtpRateLimitScope, string> = {
    otp_send_phone_60s: phoneKeyHash,
    otp_send_phone_1h: phoneKeyHash,
    otp_send_ip_10m: ipKeyHash,
    otp_verify_ip_10m: ipKeyHash,
  };

  let rateLimitOutcome;
  try {
    rateLimitOutcome = await deps.persistence.transaction((tx) =>
      consumeCustomerOtpRateLimits(tx, {
        rules: [
          CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_60s,
          CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_phone_1h,
          CUSTOMER_OTP_RATE_LIMIT_RULES.otp_send_ip_10m,
        ],
        keyHashes,
        now,
      }),
    );
  } catch {
    const body: CustomerAuthSendOtpUnavailable = { ok: false, code: "OTP_DELIVERY_UNAVAILABLE" };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  if (rateLimitOutcome.outcome === "limited") {
    const body: CustomerAuthSendOtpRateLimited = {
      ok: false,
      code: "OTP_RATE_LIMITED",
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "OTP_RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "otp_send",
    };
  }

  const generatedCode = generateNumericOtp(CUSTOMER_OTP_LENGTH);
  const expiresAt = new Date(now.getTime() + CUSTOMER_OTP_EXPIRES_IN_SECONDS * 1000);

  try {
    const startResult = await deps.otpProvider.startVerification({
      phoneNumber,
      generatedCode,
      now,
      expiresAt,
    });
    if (startResult.outcome === "unavailable") {
      const body: CustomerAuthSendOtpUnavailable = { ok: false, code: "OTP_DELIVERY_UNAVAILABLE" };
      sendJson(res, body, { status: 503, requestId });
      return { operation, safeOutcomeCode: "OTP_DELIVERY_UNAVAILABLE", httpStatus: 503 };
    }
  } catch (error) {
    if (error instanceof CustomerOtpProviderError) {
      const body: CustomerAuthSendOtpUnavailable = { ok: false, code: "OTP_DELIVERY_UNAVAILABLE" };
      sendJson(res, body, { status: 503, requestId });
      return { operation, safeOutcomeCode: "OTP_DELIVERY_UNAVAILABLE", httpStatus: 503 };
    }
    throw error;
  }

  const body: CustomerAuthSendOtpSuccess = {
    ok: true,
    code: "OTP_REQUEST_ACCEPTED",
    retryAfterSeconds: SEND_OTP_RETRY_AFTER_SECONDS,
  };
  sendJson(res, body, { status: 202, requestId });
  return { operation, safeOutcomeCode: "OTP_REQUEST_ACCEPTED", httpStatus: 202 };
}

async function handleVerifyOtp(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<CustomerAuthRouteOutcome> {
  const operation = "verify_otp";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    sendJson(res, { authenticated: false, code: "INVALID_REQUEST" }, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    sendJson(res, { authenticated: false, code: "INVALID_REQUEST" }, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const bodyResult = await readJsonObjectBody(req, ["phoneNumber", "code"]);
  if (!bodyResult.ok) {
    sendJson(res, { authenticated: false, code: "INVALID_REQUEST" }, { status: 400, requestId });
    return { operation, safeOutcomeCode: `BODY_${bodyResult.reason.toUpperCase()}`, httpStatus: 400 };
  }

  const normalized = normalizeIndianMobileNumber(bodyResult.value.phoneNumber);
  if (!normalized.ok) {
    sendJson(
      res,
      { authenticated: false, code: "INVALID_PHONE_NUMBER" },
      { status: 400, requestId },
    );
    return { operation, safeOutcomeCode: "INVALID_PHONE_NUMBER", httpStatus: 400 };
  }
  const phoneNumber = normalized.phoneNumber;

  const rawCode = bodyResult.value.code;
  if (typeof rawCode !== "string" || !/^\d{6}$/.test(rawCode)) {
    sendJson(res, { authenticated: false, code: "INVALID_REQUEST" }, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_OTP_SHAPE", httpStatus: 400 };
  }

  const canonicalIp = resolveClientIp(req, deps.trustProxyHops);
  const now = deps.now();
  const ipKeyHash = hashCustomerOtpIpKey(deps.piiHashSecret, canonicalIp);

  let rateLimitOutcome;
  try {
    rateLimitOutcome = await deps.persistence.transaction((tx) =>
      consumeCustomerOtpRateLimits(tx, {
        rules: [CUSTOMER_OTP_RATE_LIMIT_RULES.otp_verify_ip_10m],
        keyHashes: { otp_verify_ip_10m: ipKeyHash } as Record<CustomerOtpRateLimitScope, string>,
        now,
      }),
    );
  } catch {
    sendJson(
      res,
      { authenticated: false, code: "OTP_DELIVERY_UNAVAILABLE" },
      { status: 503, requestId },
    );
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  if (rateLimitOutcome.outcome === "limited") {
    const body: CustomerAuthVerifyOtpFailure = {
      authenticated: false,
      code: "OTP_RATE_LIMITED",
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "OTP_RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "otp_verify",
    };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const api = await deps.getAuthApi();

  try {
    const { headers: responseHeaders } = await api.verifyPhoneNumber({
      body: {
        phoneNumber,
        code: rawCode,
        disableSession: false,
        updatePhoneNumber: false,
      },
      headers: requestHeaders,
      returnHeaders: true,
    });

    const body: CustomerAuthVerifyOtpSuccess = { authenticated: true };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: responseHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "OTP_VERIFIED", httpStatus: 200 };
  } catch (error) {
    const mapped = mapVerifyPhoneNumberError(error);
    if (!mapped) throw error;

    const body: CustomerAuthVerifyOtpFailure = {
      authenticated: false,
      code: mapped.code,
    };
    sendJson(res, body, { status: mapped.httpStatus, requestId });
    return { operation, safeOutcomeCode: mapped.code, httpStatus: mapped.httpStatus };
  }
}

async function handleSession(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<CustomerAuthRouteOutcome> {
  const operation = "session";

  if (method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const api = await deps.getAuthApi();
  const { headers: responseHeaders, response } = await api.getSession({
    headers: requestHeaders,
    returnHeaders: true,
  });

  if (!response) {
    const body: CustomerAuthSessionUnauthenticated = { authenticated: false };
    sendJson(res, body, {
      status: 200,
      requestId,
      varyCookie: true,
      setCookies: responseHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "UNAUTHENTICATED", httpStatus: 200 };
  }

  const body: CustomerAuthSessionAuthenticated = {
    authenticated: true,
    user: { id: response.user.id },
  };
  sendJson(res, body, {
    status: 200,
    requestId,
    varyCookie: true,
    setCookies: responseHeaders.getSetCookie(),
  });
  return { operation, safeOutcomeCode: "AUTHENTICATED", httpStatus: 200 };
}

async function handleSignOut(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<CustomerAuthRouteOutcome> {
  const operation = "sign_out";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    sendJson(res, { authenticated: false }, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const api = await deps.getAuthApi();
  const { headers: responseHeaders } = await api.signOut({
    headers: requestHeaders,
    returnHeaders: true,
  });

  const body: CustomerAuthSignOutResponse = { authenticated: false };
  sendJson(res, body, {
    status: 200,
    requestId,
    setCookies: responseHeaders.getSetCookie(),
  });
  return { operation, safeOutcomeCode: "SIGNED_OUT", httpStatus: 200 };
}

function handleHealthLive(
  res: ServerResponse,
  requestId: string,
  method: string,
): CustomerAuthRouteOutcome {
  const operation = "health_live";
  if (method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }
  sendJson(res, { ok: true }, { status: 200, requestId });
  return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
}

async function handleHealthReady(
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<CustomerAuthRouteOutcome> {
  const operation = "health_ready";
  if (method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  try {
    await deps.persistence.checkAvailability();
    await deps.otpProvider.checkReadiness();
  } catch {
    sendJson(res, { ok: false }, { status: 503, requestId });
    return { operation, safeOutcomeCode: "NOT_READY", httpStatus: 503 };
  }

  sendJson(res, { ok: true }, { status: 200, requestId });
  return { operation, safeOutcomeCode: "OK", httpStatus: 200 };
}

/**
 * Dispatch one request to the exact matching endpoint. Every branch is a
 * literal path comparison — there is no pattern matching, and no path
 * outside this table is ever reachable.
 */
export async function routeCustomerAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CustomerAuthRouteDependencies,
  requestId: string,
): Promise<CustomerAuthRouteOutcome> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", "http://customer-auth.internal");
  const pathname = url.pathname;

  if (pathname === "/health/live") {
    return handleHealthLive(res, requestId, method);
  }
  if (pathname === "/health/ready") {
    return handleHealthReady(res, deps, requestId, method);
  }
  if (pathname === CUSTOMER_AUTH_PUBLIC_PATHS.sendOtp) {
    return handleSendOtp(req, res, deps, requestId, method, url);
  }
  if (pathname === CUSTOMER_AUTH_PUBLIC_PATHS.verifyOtp) {
    return handleVerifyOtp(req, res, deps, requestId, method, url);
  }
  if (pathname === CUSTOMER_AUTH_PUBLIC_PATHS.session) {
    return handleSession(req, res, deps, requestId, method);
  }
  if (pathname === CUSTOMER_AUTH_PUBLIC_PATHS.signOut) {
    return handleSignOut(req, res, deps, requestId, method);
  }

  sendNotFound(res, requestId);
  return { operation: "unknown", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
}
