/**
 * Exact-path HTTP router for the workforce-auth service (IMP-010).
 *
 * Only ten endpoints exist (eight public façade paths + two health checks).
 * Every other path is `404`; a known path with the wrong method is `405`
 * with an `Allow` header. Nothing in this module calls `console.*` — it
 * only returns safe, allowlisted outcome metadata for the service layer
 * (`../service.ts`) to log.
 *
 * Never logs email, password, IP, TOTP, backup codes, tokens, cookies,
 * user IDs, or request bodies.
 */
import "server-only";

import type { IncomingMessage, ServerResponse } from "node:http";

import { APIError } from "better-auth";

import {
  WORKFORCE_AUTH_PUBLIC_PATHS,
  type WorkforceAuthChangePasswordFailure,
  type WorkforceAuthChangePasswordSuccess,
  type WorkforceAuthMfaEnrollFailure,
  type WorkforceAuthMfaEnrollSuccess,
  type WorkforceAuthMfaVerifyEnrollmentFailure,
  type WorkforceAuthMfaVerifyEnrollmentSuccess,
  type WorkforceAuthMfaVerifyFailure,
  type WorkforceAuthMfaVerifySuccess,
  type WorkforceAuthSessionAuthenticated,
  type WorkforceAuthSessionUnauthenticated,
  type WorkforceAuthSignInFailure,
  type WorkforceAuthSignInSuccess,
  type WorkforceAuthSignOutResponse,
} from "../../../shared/workforce-auth/contracts";
import { normalizeWorkforceEmail } from "../../../shared/workforce-auth/email";
import type { Persistence } from "../../persistence";
import {
  loadWorkforceLifecycleUser,
  resolveWorkforceSessionFromHeaders,
  type WorkforceAuthSessionAuthority,
} from "../../auth/workforce/trusted-identity";
import {
  isFullyAuthenticated,
  resolveWorkforceAuthLifecycle,
  type WorkforceAuthLifecycleUser,
} from "../auth-state";
import { validateWorkforcePassword } from "../password-policy";
import type { WorkforcePiiHashSecret } from "../pii";
import {
  consumeWorkforceAuthRateLimits,
  hashWorkforceAuthEmailKey,
  hashWorkforceAuthIpKey,
  WORKFORCE_AUTH_RATE_LIMIT_RULES,
  type WorkforceAuthRateLimitScope,
} from "../rate-limit";
import { deriveClientIp } from "./client-ip";
import { buildBetterAuthRequestHeaders } from "./headers";
import { checkTrustedOrigin } from "./origin";
import { hasDisallowedQueryParams, readJsonObjectBody } from "./request";
import { sendJson, sendMethodNotAllowed, sendNotFound } from "./response";

type WorkforceUserRow = WorkforceAuthLifecycleUser & {
  email?: string;
  name?: string;
};

type BetterAuthReturnHeadersResult<T> = {
  headers: Headers;
  response: T;
};

/**
 * Narrow structural surface this router needs from the workforce realm's
 * Better Auth instance — API methods plus `$context` for lifecycle fields
 * and session revocation (returned:false additional fields are omitted from
 * session.user payloads).
 */
export interface WorkforceAuthHandle extends WorkforceAuthSessionAuthority {
  api: WorkforceAuthSessionAuthority["api"] & {
    signInEmail(input: {
      body: Readonly<{ email: string; password: string }>;
      headers: Headers;
      returnHeaders: true;
    }): Promise<
      BetterAuthReturnHeadersResult<
        | Readonly<{ twoFactorRedirect: true; twoFactorMethods?: readonly string[] }>
        | Readonly<{ token: string; user: { id: string }; redirect: boolean }>
      >
    >;

    changePassword(input: {
      body: Readonly<{
        currentPassword: string;
        newPassword: string;
        revokeOtherSessions: true;
      }>;
      headers: Headers;
      returnHeaders: true;
    }): Promise<BetterAuthReturnHeadersResult<{ token: string | null; user: { id: string } }>>;

    enableTwoFactor(input: {
      body: Readonly<{ password: string }>;
      headers: Headers;
      returnHeaders: true;
    }): Promise<
      BetterAuthReturnHeadersResult<{
        totpURI: string;
        backupCodes: string[];
      }>
    >;

    verifyTOTP(input: {
      body: Readonly<{ code: string; trustDevice: false }>;
      headers: Headers;
      returnHeaders: true;
    }): Promise<BetterAuthReturnHeadersResult<{ status?: boolean; token?: string | null; user?: { id: string } }>>;

    verifyBackupCode(input: {
      body: Readonly<{
        code: string;
        trustDevice: false;
        disableSession: false;
      }>;
      headers: Headers;
      returnHeaders: true;
    }): Promise<
      BetterAuthReturnHeadersResult<{
        token?: string | null;
        user?: { id: string };
        session?: unknown;
      }>
    >;

    signOut(input: { headers: Headers; returnHeaders: true }): Promise<{
      headers: Headers;
      response: { success: boolean };
    }>;
  };

  $context: Promise<{
    internalAdapter: {
      findUserById: (userId: string) => Promise<WorkforceUserRow | null>;
      findSession: (
        token: string,
      ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
      updateUser: (
        userId: string,
        data: Record<string, unknown>,
      ) => Promise<WorkforceUserRow>;
      deleteUserSessions: (userId: string) => Promise<void>;
      deleteSession: (token: string) => Promise<void>;
    };
  }>;
}

export type WorkforceAuthRouteDependencies = Readonly<{
  getAuth: () => Promise<WorkforceAuthHandle>;
  persistence: Persistence;
  piiHashSecret: WorkforcePiiHashSecret;
  trustedOrigin: string;
  trustProxyHops: number;
  now: () => Date;
}>;

export type WorkforceAuthRouteOutcome = Readonly<{
  operation: string;
  safeOutcomeCode: string;
  httpStatus: number;
  rateLimitScope?: string;
}>;

const QUERY_STRING_DISALLOWED_FIELDS = [
  "email",
  "password",
  "code",
  "totp",
  "backupCode",
  "currentPassword",
  "newPassword",
] as const;

const UNKNOWN_CLIENT_IP_BUCKET = "unknown";

function resolveClientIp(req: IncomingMessage, trustProxyHops: number): string {
  const result = deriveClientIp(req.headers, req.socket.remoteAddress, trustProxyHops);
  return result.ok ? result.canonicalIp : UNKNOWN_CLIENT_IP_BUCKET;
}

function extractApiErrorCode(error: unknown): string | null {
  if (!(error instanceof APIError)) return null;
  const code = (error.body as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : null;
}

function mapMfaError(
  error: unknown,
): Readonly<{ code: WorkforceAuthMfaVerifyFailure["code"]; httpStatus: number }> | null {
  const apiErrorCode = extractApiErrorCode(error);
  if (apiErrorCode === "ACCOUNT_TEMPORARILY_LOCKED") {
    return { code: "MFA_LOCKED", httpStatus: 403 };
  }
  if (
    apiErrorCode === "INVALID_CODE" ||
    apiErrorCode === "INVALID_BACKUP_CODE" ||
    apiErrorCode === "TOTP_NOT_ENABLED" ||
    apiErrorCode === "BACKUP_CODES_NOT_ENABLED" ||
    apiErrorCode === "TWO_FACTOR_NOT_ENABLED" ||
    apiErrorCode === "INVALID_TWO_FACTOR_COOKIE" ||
    apiErrorCode === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"
  ) {
    return { code: "MFA_INVALID_CODE", httpStatus: 401 };
  }
  return null;
}

/**
 * Rewrite Set-Cookie values so the browser expires them immediately.
 * Used after MFA enrollment verify so Better Auth's newly-minted session
 * cookies are never forwarded to the client.
 */
function expireSetCookieValues(cookies: readonly string[]): string[] {
  return cookies.map((cookie) => {
    const nameValue = cookie.split(";", 1)[0] ?? cookie;
    const eq = nameValue.indexOf("=");
    const name = eq === -1 ? nameValue.trim() : nameValue.slice(0, eq).trim();
    if (name.length === 0) return "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
    return `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
  });
}

function mergeUniqueCookies(
  ...groups: ReadonlyArray<readonly string[] | undefined>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const cookie of group) {
      const nameValue = cookie.split(";", 1)[0] ?? cookie;
      const eq = nameValue.indexOf("=");
      const name = (eq === -1 ? nameValue : nameValue.slice(0, eq)).trim().toLowerCase();
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(cookie);
    }
  }
  return out;
}

async function revokeUserAndClearCookies(
  auth: WorkforceAuthHandle,
  userId: string,
  requestHeaders: Headers,
  extraCookiesToExpire: readonly string[] = [],
): Promise<string[]> {
  const context = await auth.$context;
  await context.internalAdapter.deleteUserSessions(userId);
  const { headers: signOutHeaders } = await auth.api.signOut({
    headers: requestHeaders,
    returnHeaders: true,
  });
  return mergeUniqueCookies(
    expireSetCookieValues(extraCookiesToExpire),
    signOutHeaders.getSetCookie(),
  );
}

function sessionBodyForLifecycle(
  state: ReturnType<typeof resolveWorkforceAuthLifecycle>,
  userId: string | null,
): WorkforceAuthSessionAuthenticated | WorkforceAuthSessionUnauthenticated {
  if (isFullyAuthenticated(state) && userId) {
    return { authenticated: true, user: { id: userId } };
  }
  if (state === "PASSWORD_CHANGE_REQUIRED") {
    return { authenticated: false, next: "change_password" };
  }
  if (state === "MFA_ENROLLMENT_REQUIRED") {
    return { authenticated: false, next: "mfa_enrollment" };
  }
  if (state === "MFA_CHALLENGE_REQUIRED") {
    return { authenticated: false, next: "mfa" };
  }
  return { authenticated: false };
}

async function handleSignIn(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "sign_in";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const bodyResult = await readJsonObjectBody(req, ["email", "password"]);
  if (!bodyResult.ok) {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: `BODY_${bodyResult.reason.toUpperCase()}`, httpStatus: 400 };
  }

  const normalized = normalizeWorkforceEmail(bodyResult.value.email);
  if (!normalized.ok || typeof bodyResult.value.password !== "string") {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 401, requestId });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }

  const email = normalized.email;
  const password = bodyResult.value.password;
  const canonicalIp = resolveClientIp(req, deps.trustProxyHops);
  const now = deps.now();
  const emailKeyHash = hashWorkforceAuthEmailKey(deps.piiHashSecret, email);
  const ipKeyHash = hashWorkforceAuthIpKey(deps.piiHashSecret, canonicalIp);

  const keyHashes: Partial<Record<WorkforceAuthRateLimitScope, string>> = {
    workforce_sign_in_email_15m: emailKeyHash,
    workforce_sign_in_ip_10m: ipKeyHash,
  };

  let rateLimitOutcome;
  try {
    rateLimitOutcome = await deps.persistence.transaction((tx) =>
      consumeWorkforceAuthRateLimits(tx, {
        rules: [
          WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_email_15m,
          WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_sign_in_ip_10m,
        ],
        keyHashes,
        now,
      }),
    );
  } catch {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  if (rateLimitOutcome.outcome === "limited") {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rateLimitOutcome.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "workforce_sign_in",
    };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();

  let signInHeaders: Headers;
  let signInResponse: Awaited<ReturnType<WorkforceAuthHandle["api"]["signInEmail"]>>["response"];
  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
      returnHeaders: true,
    });
    signInHeaders = result.headers;
    signInResponse = result.response;
  } catch {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 401, requestId });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }

  if (
    signInResponse &&
    typeof signInResponse === "object" &&
    "twoFactorRedirect" in signInResponse &&
    signInResponse.twoFactorRedirect === true
  ) {
    const body: WorkforceAuthSignInSuccess = { authenticated: false, next: "mfa" };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: signInHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "MFA_CHALLENGE_REQUIRED", httpStatus: 200 };
  }

  const userId =
    signInResponse &&
    typeof signInResponse === "object" &&
    "user" in signInResponse &&
    signInResponse.user &&
    typeof signInResponse.user.id === "string"
      ? signInResponse.user.id
      : null;

  if (!userId) {
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, {
      status: 401,
      requestId,
      setCookies: expireSetCookieValues(signInHeaders.getSetCookie()),
    });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }

  const lifecycleUser = await loadWorkforceLifecycleUser(auth, userId);
  const state = resolveWorkforceAuthLifecycle({
    sessionPresent: true,
    user: lifecycleUser,
  });

  if (state === "UNAUTHENTICATED" || !lifecycleUser) {
    const clearCookies = await revokeUserAndClearCookies(
      auth,
      userId,
      requestHeaders,
      signInHeaders.getSetCookie(),
    );
    const body: WorkforceAuthSignInFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 401, requestId, setCookies: clearCookies });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }

  if (state === "PASSWORD_CHANGE_REQUIRED") {
    const body: WorkforceAuthSignInSuccess = {
      authenticated: false,
      next: "change_password",
    };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: signInHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "PASSWORD_CHANGE_REQUIRED", httpStatus: 200 };
  }

  if (state === "MFA_ENROLLMENT_REQUIRED") {
    const body: WorkforceAuthSignInSuccess = {
      authenticated: false,
      next: "mfa_enrollment",
    };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: signInHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "MFA_ENROLLMENT_REQUIRED", httpStatus: 200 };
  }

  // Fully authenticated without a 2FA redirect should not happen when MFA
  // is required — fail safe to MFA challenge rather than granting access.
  const clearCookies = await revokeUserAndClearCookies(
    auth,
    userId,
    requestHeaders,
    signInHeaders.getSetCookie(),
  );
  const body: WorkforceAuthSignInSuccess = { authenticated: false, next: "mfa" };
  sendJson(res, body, { status: 200, requestId, setCookies: clearCookies });
  return { operation, safeOutcomeCode: "MFA_CHALLENGE_REQUIRED", httpStatus: 200 };
}

async function requireLimitedSession(
  auth: WorkforceAuthHandle,
  requestHeaders: Headers,
): Promise<
  | Readonly<{
      ok: true;
      user: WorkforceAuthLifecycleUser;
      sessionHeaders: Headers;
    }>
  | Readonly<{ ok: false; reason: "unauthenticated" | "disabled" }>
> {
  const session = await resolveWorkforceSessionFromHeaders(auth, requestHeaders, {
    returnHeaders: true,
  });
  if (!session.userId || !session.lifecycleUser) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (session.lifecycleUser.disabledAt) {
    await revokeUserAndClearCookies(auth, session.lifecycleUser.id, requestHeaders);
    return { ok: false, reason: "disabled" };
  }
  return { ok: true, user: session.lifecycleUser, sessionHeaders: session.headers };
}

async function consumeSecurityChangeRateLimit(
  deps: WorkforceAuthRouteDependencies,
  req: IncomingMessage,
): Promise<
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; kind: "limited"; retryAfterSeconds: number }>
  | Readonly<{ ok: false; kind: "unavailable" }>
> {
  const canonicalIp = resolveClientIp(req, deps.trustProxyHops);
  const ipKeyHash = hashWorkforceAuthIpKey(deps.piiHashSecret, canonicalIp);
  try {
    const outcome = await deps.persistence.transaction((tx) =>
      consumeWorkforceAuthRateLimits(tx, {
        rules: [WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_security_change_ip_10m],
        keyHashes: { workforce_security_change_ip_10m: ipKeyHash },
        now: deps.now(),
      }),
    );
    if (outcome.outcome === "limited") {
      return {
        ok: false,
        kind: "limited",
        retryAfterSeconds: outcome.retryAfterSeconds,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, kind: "unavailable" };
  }
}

async function consumeMfaRateLimit(
  deps: WorkforceAuthRouteDependencies,
  req: IncomingMessage,
): Promise<
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; kind: "limited"; retryAfterSeconds: number }>
  | Readonly<{ ok: false; kind: "unavailable" }>
> {
  const canonicalIp = resolveClientIp(req, deps.trustProxyHops);
  const ipKeyHash = hashWorkforceAuthIpKey(deps.piiHashSecret, canonicalIp);
  try {
    const outcome = await deps.persistence.transaction((tx) =>
      consumeWorkforceAuthRateLimits(tx, {
        rules: [WORKFORCE_AUTH_RATE_LIMIT_RULES.workforce_mfa_ip_10m],
        keyHashes: { workforce_mfa_ip_10m: ipKeyHash },
        now: deps.now(),
      }),
    );
    if (outcome.outcome === "limited") {
      return {
        ok: false,
        kind: "limited",
        retryAfterSeconds: outcome.retryAfterSeconds,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, kind: "unavailable" };
  }
}

async function handleChangePassword(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "change_password";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const rate = await consumeSecurityChangeRateLimit(deps, req);
  if (!rate.ok && rate.kind === "limited") {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "workforce_security_change",
    };
  }
  if (!rate.ok) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  const bodyResult = await readJsonObjectBody(req, ["currentPassword", "newPassword"]);
  if (!bodyResult.ok) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: `BODY_${bodyResult.reason.toUpperCase()}`, httpStatus: 400 };
  }

  const passwordCheck = validateWorkforcePassword(bodyResult.value.newPassword);
  if (!passwordCheck.ok) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "PASSWORD_POLICY_VIOLATION",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "PASSWORD_POLICY_VIOLATION", httpStatus: 400 };
  }

  if (typeof bodyResult.value.currentPassword !== "string") {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_REQUEST", httpStatus: 400 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();
  const session = await requireLimitedSession(auth, requestHeaders);
  if (!session.ok || !session.user.passwordChangeRequired) {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "FORBIDDEN",
    };
    sendJson(res, body, { status: 403, requestId });
    return { operation, safeOutcomeCode: "FORBIDDEN", httpStatus: 403 };
  }

  try {
    const { headers: responseHeaders } = await auth.api.changePassword({
      body: {
        currentPassword: bodyResult.value.currentPassword,
        newPassword: bodyResult.value.newPassword as string,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
      returnHeaders: true,
    });

    const context = await auth.$context;
    await context.internalAdapter.updateUser(session.user.id, {
      passwordChangeRequired: false,
    });

    const body: WorkforceAuthChangePasswordSuccess = {
      authenticated: false,
      next: "mfa_enrollment",
    };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: responseHeaders.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "PASSWORD_CHANGED", httpStatus: 200 };
  } catch {
    const body: WorkforceAuthChangePasswordFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 401, requestId });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }
}

async function handleMfaEnroll(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "mfa_enroll";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const rate = await consumeSecurityChangeRateLimit(deps, req);
  if (!rate.ok && rate.kind === "limited") {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "workforce_security_change",
    };
  }
  if (!rate.ok) {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  const bodyResult = await readJsonObjectBody(req, ["password"]);
  if (!bodyResult.ok || typeof bodyResult.value.password !== "string") {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_REQUEST", httpStatus: 400 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();
  const session = await requireLimitedSession(auth, requestHeaders);
  if (
    !session.ok ||
    session.user.passwordChangeRequired ||
    session.user.twoFactorEnabled
  ) {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "FORBIDDEN",
    };
    sendJson(res, body, { status: 403, requestId });
    return { operation, safeOutcomeCode: "FORBIDDEN", httpStatus: 403 };
  }

  try {
    const { response } = await auth.api.enableTwoFactor({
      body: { password: bodyResult.value.password },
      headers: requestHeaders,
      returnHeaders: true,
    });

    const body: WorkforceAuthMfaEnrollSuccess = {
      totpUri: response.totpURI,
      backupCodes: response.backupCodes,
    };
    // Cache-Control: no-store is set by sendJson for every response.
    sendJson(res, body, { status: 200, requestId });
    return { operation, safeOutcomeCode: "MFA_ENROLL_STARTED", httpStatus: 200 };
  } catch {
    const body: WorkforceAuthMfaEnrollFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 401, requestId });
    return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
  }
}

async function handleMfaVerifyEnrollment(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "mfa_verify_enrollment";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const rate = await consumeMfaRateLimit(deps, req);
  if (!rate.ok && rate.kind === "limited") {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "workforce_mfa",
    };
  }
  if (!rate.ok) {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "MFA_INVALID_CODE",
    };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  const bodyResult = await readJsonObjectBody(req, ["code"]);
  if (!bodyResult.ok || typeof bodyResult.value.code !== "string") {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_REQUEST", httpStatus: 400 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();
  const session = await requireLimitedSession(auth, requestHeaders);
  if (
    !session.ok ||
    session.user.passwordChangeRequired ||
    session.user.twoFactorEnabled
  ) {
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: "FORBIDDEN",
    };
    sendJson(res, body, { status: 403, requestId });
    return { operation, safeOutcomeCode: "FORBIDDEN", httpStatus: 403 };
  }

  const userId = session.user.id;

  try {
    const { headers: verifyHeaders } = await auth.api.verifyTOTP({
      body: { code: bodyResult.value.code, trustDevice: false },
      headers: requestHeaders,
      returnHeaders: true,
    });

    // Discard any session Better Auth minted on enrollment verify.
    const clearCookies = await revokeUserAndClearCookies(
      auth,
      userId,
      requestHeaders,
      verifyHeaders.getSetCookie(),
    );

    const body: WorkforceAuthMfaVerifyEnrollmentSuccess = {
      authenticated: false,
      next: "sign_in",
    };
    sendJson(res, body, { status: 200, requestId, setCookies: clearCookies });
    return { operation, safeOutcomeCode: "MFA_ENROLLMENT_VERIFIED", httpStatus: 200 };
  } catch (error) {
    const mapped = mapMfaError(error);
    const body: WorkforceAuthMfaVerifyEnrollmentFailure = {
      authenticated: false,
      code: mapped?.code === "MFA_LOCKED" ? "MFA_LOCKED" : "MFA_INVALID_CODE",
    };
    sendJson(res, body, { status: mapped?.httpStatus ?? 401, requestId });
    return {
      operation,
      safeOutcomeCode: body.code,
      httpStatus: mapped?.httpStatus ?? 401,
    };
  }
}

async function handleMfaVerify(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
  url: URL,
  mode: "totp" | "backup",
): Promise<WorkforceAuthRouteOutcome> {
  const operation = mode === "totp" ? "mfa_verify" : "mfa_verify_backup_code";

  if (method !== "POST") {
    sendMethodNotAllowed(res, ["POST"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  if (hasDisallowedQueryParams(url, QUERY_STRING_DISALLOWED_FIELDS)) {
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "QUERY_STRING_REJECTED", httpStatus: 400 };
  }

  const originResult = checkTrustedOrigin(req.headers, deps.trustedOrigin);
  if (!originResult.ok) {
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 403, requestId });
    return {
      operation,
      safeOutcomeCode: `ORIGIN_${originResult.reason.toUpperCase()}`,
      httpStatus: 403,
    };
  }

  const rate = await consumeMfaRateLimit(deps, req);
  if (!rate.ok && rate.kind === "limited") {
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: rate.retryAfterSeconds,
    };
    sendJson(res, body, {
      status: 429,
      requestId,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return {
      operation,
      safeOutcomeCode: "RATE_LIMITED",
      httpStatus: 429,
      rateLimitScope: "workforce_mfa",
    };
  }
  if (!rate.ok) {
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: "AUTHENTICATION_FAILED",
    };
    sendJson(res, body, { status: 503, requestId });
    return { operation, safeOutcomeCode: "RATE_LIMIT_STORE_UNAVAILABLE", httpStatus: 503 };
  }

  const bodyResult = await readJsonObjectBody(req, ["code"]);
  if (!bodyResult.ok || typeof bodyResult.value.code !== "string") {
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: "INVALID_REQUEST",
    };
    sendJson(res, body, { status: 400, requestId });
    return { operation, safeOutcomeCode: "INVALID_REQUEST", httpStatus: 400 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();

  try {
    const result =
      mode === "totp"
        ? await auth.api.verifyTOTP({
            body: { code: bodyResult.value.code, trustDevice: false },
            headers: requestHeaders,
            returnHeaders: true,
          })
        : await auth.api.verifyBackupCode({
            body: {
              code: bodyResult.value.code,
              trustDevice: false,
              disableSession: false,
            },
            headers: requestHeaders,
            returnHeaders: true,
          });

    const userId =
      result.response &&
      typeof result.response === "object" &&
      "user" in result.response &&
      result.response.user &&
      typeof result.response.user.id === "string"
        ? result.response.user.id
        : null;

    if (userId) {
      const lifecycleUser = await loadWorkforceLifecycleUser(auth, userId);
      if (!lifecycleUser || lifecycleUser.disabledAt) {
        const clearCookies = await revokeUserAndClearCookies(
          auth,
          userId,
          requestHeaders,
          result.headers.getSetCookie(),
        );
        const body: WorkforceAuthMfaVerifyFailure = {
          authenticated: false,
          code: "AUTHENTICATION_FAILED",
        };
        sendJson(res, body, { status: 401, requestId, setCookies: clearCookies });
        return { operation, safeOutcomeCode: "AUTHENTICATION_FAILED", httpStatus: 401 };
      }
    }

    const body: WorkforceAuthMfaVerifySuccess = { authenticated: true };
    sendJson(res, body, {
      status: 200,
      requestId,
      setCookies: result.headers.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "MFA_VERIFIED", httpStatus: 200 };
  } catch (error) {
    const mapped = mapMfaError(error);
    const body: WorkforceAuthMfaVerifyFailure = {
      authenticated: false,
      code: mapped?.code ?? "MFA_INVALID_CODE",
    };
    sendJson(res, body, { status: mapped?.httpStatus ?? 401, requestId });
    return {
      operation,
      safeOutcomeCode: body.code,
      httpStatus: mapped?.httpStatus ?? 401,
    };
  }
}

async function handleSession(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "session";

  if (method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  const requestHeaders = buildBetterAuthRequestHeaders(req.headers);
  const auth = await deps.getAuth();
  const session = await resolveWorkforceSessionFromHeaders(auth, requestHeaders, {
    returnHeaders: true,
  });

  if (!session.userId) {
    const body: WorkforceAuthSessionUnauthenticated = { authenticated: false };
    sendJson(res, body, {
      status: 200,
      requestId,
      varyCookie: true,
      setCookies: session.headers.getSetCookie(),
    });
    return { operation, safeOutcomeCode: "UNAUTHENTICATED", httpStatus: 200 };
  }

  const { lifecycleUser, lifecycleState: state } = session;

  if (state === "UNAUTHENTICATED" || !lifecycleUser) {
    const clearCookies = lifecycleUser
      ? await revokeUserAndClearCookies(
          auth,
          lifecycleUser.id,
          requestHeaders,
          session.headers.getSetCookie(),
        )
      : expireSetCookieValues(session.headers.getSetCookie());
    const body: WorkforceAuthSessionUnauthenticated = { authenticated: false };
    sendJson(res, body, {
      status: 200,
      requestId,
      varyCookie: true,
      setCookies: clearCookies,
    });
    return { operation, safeOutcomeCode: "UNAUTHENTICATED", httpStatus: 200 };
  }

  const body = sessionBodyForLifecycle(state, lifecycleUser.id);
  sendJson(res, body, {
    status: 200,
    requestId,
    varyCookie: true,
    setCookies: session.headers.getSetCookie(),
  });
  return {
    operation,
    safeOutcomeCode: isFullyAuthenticated(state) ? "AUTHENTICATED" : state,
    httpStatus: 200,
  };
}

async function handleSignOut(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<WorkforceAuthRouteOutcome> {
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
  const auth = await deps.getAuth();
  const { headers: responseHeaders } = await auth.api.signOut({
    headers: requestHeaders,
    returnHeaders: true,
  });

  const body: WorkforceAuthSignOutResponse = { authenticated: false };
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
): WorkforceAuthRouteOutcome {
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
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
  method: string,
): Promise<WorkforceAuthRouteOutcome> {
  const operation = "health_ready";
  if (method !== "GET") {
    sendMethodNotAllowed(res, ["GET"], requestId);
    return { operation, safeOutcomeCode: "METHOD_NOT_ALLOWED", httpStatus: 405 };
  }

  try {
    await deps.persistence.checkAvailability();
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
export async function routeWorkforceAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WorkforceAuthRouteDependencies,
  requestId: string,
): Promise<WorkforceAuthRouteOutcome> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", "http://workforce-auth.internal");
  const pathname = url.pathname;

  if (pathname === "/health/live") {
    return handleHealthLive(res, requestId, method);
  }
  if (pathname === "/health/ready") {
    return handleHealthReady(res, deps, requestId, method);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.signIn) {
    return handleSignIn(req, res, deps, requestId, method, url);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.changePassword) {
    return handleChangePassword(req, res, deps, requestId, method, url);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.mfaEnroll) {
    return handleMfaEnroll(req, res, deps, requestId, method, url);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyEnrollment) {
    return handleMfaVerifyEnrollment(req, res, deps, requestId, method, url);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify) {
    return handleMfaVerify(req, res, deps, requestId, method, url, "totp");
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyBackupCode) {
    return handleMfaVerify(req, res, deps, requestId, method, url, "backup");
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.session) {
    return handleSession(req, res, deps, requestId, method);
  }
  if (pathname === WORKFORCE_AUTH_PUBLIC_PATHS.signOut) {
    return handleSignOut(req, res, deps, requestId, method);
  }

  sendNotFound(res, requestId);
  return { operation: "unknown", safeOutcomeCode: "NOT_FOUND", httpStatus: 404 };
}
