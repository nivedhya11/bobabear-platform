/**
 * Browser-side workforce-auth HTTP façade (IMP-010).
 *
 * A typed `fetch` wrapper for the eight-endpoint workforce-auth service.
 * Every call is same-origin, JSON-only, and parses only the approved
 * response shapes from `@/shared/workforce-auth/contracts`.
 *
 * Deliberately does not import `src/server/**` or `better-auth` — this
 * module ships to the browser. It never reads, writes, or inspects a
 * cookie/token itself; the browser's own cookie jar handles that via
 * `credentials: "same-origin"`.
 */
import {
  WORKFORCE_AUTH_PUBLIC_PATHS,
  type WorkforceAuthChangePasswordResponse,
  type WorkforceAuthMfaEnrollResponse,
  type WorkforceAuthMfaVerifyEnrollmentResponse,
  type WorkforceAuthMfaVerifyResponse,
  type WorkforceAuthSessionResponse,
  type WorkforceAuthSignInResponse,
  type WorkforceAuthSignOutResponse,
} from "@/shared/workforce-auth/contracts";

export type WorkforceAuthClientError = Readonly<{
  ok: false;
  code: "NETWORK_ERROR" | "INVALID_RESPONSE";
}>;

export type WorkforceAuthSignInResult =
  | Readonly<{ ok: true; data: WorkforceAuthSignInResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthChangePasswordResult =
  | Readonly<{ ok: true; data: WorkforceAuthChangePasswordResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthMfaEnrollResult =
  | Readonly<{ ok: true; data: WorkforceAuthMfaEnrollResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthMfaVerifyEnrollmentResult =
  | Readonly<{ ok: true; data: WorkforceAuthMfaVerifyEnrollmentResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthMfaVerifyResult =
  | Readonly<{ ok: true; data: WorkforceAuthMfaVerifyResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthSessionResult =
  | Readonly<{ ok: true; data: WorkforceAuthSessionResponse }>
  | WorkforceAuthClientError;

export type WorkforceAuthSignOutResult =
  | Readonly<{ ok: true; data: WorkforceAuthSignOutResponse }>
  | WorkforceAuthClientError;

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

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": JSON_CONTENT_TYPE },
    body: JSON.stringify(body),
  });
}

function parseSignInBody(
  body: unknown,
  retryAfterSeconds: number | undefined,
): WorkforceAuthSignInResponse | null {
  if (!isPlainObject(body) || body.authenticated !== false) return null;
  if (body.next === "mfa" || body.next === "change_password" || body.next === "mfa_enrollment") {
    return { authenticated: false, next: body.next };
  }
  if (
    body.code === "AUTHENTICATION_FAILED" ||
    body.code === "RATE_LIMITED" ||
    body.code === "INVALID_REQUEST"
  ) {
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

function parseChangePasswordBody(
  body: unknown,
  retryAfterSeconds: number | undefined,
): WorkforceAuthChangePasswordResponse | null {
  if (!isPlainObject(body) || body.authenticated !== false) return null;
  if (body.next === "mfa_enrollment") {
    return { authenticated: false, next: "mfa_enrollment" };
  }
  if (
    body.code === "AUTHENTICATION_FAILED" ||
    body.code === "PASSWORD_POLICY_VIOLATION" ||
    body.code === "RATE_LIMITED" ||
    body.code === "INVALID_REQUEST" ||
    body.code === "FORBIDDEN"
  ) {
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

function parseMfaEnrollBody(body: unknown): WorkforceAuthMfaEnrollResponse | null {
  if (!isPlainObject(body)) return null;
  if (typeof body.totpUri === "string" && Array.isArray(body.backupCodes)) {
    if (!body.backupCodes.every((code) => typeof code === "string")) return null;
    return { totpUri: body.totpUri, backupCodes: body.backupCodes };
  }
  if (body.authenticated === false) {
    if (
      body.code === "AUTHENTICATION_FAILED" ||
      body.code === "FORBIDDEN" ||
      body.code === "RATE_LIMITED" ||
      body.code === "INVALID_REQUEST"
    ) {
      return {
        authenticated: false,
        code: body.code,
        ...(typeof body.retryAfterSeconds === "number"
          ? { retryAfterSeconds: body.retryAfterSeconds }
          : {}),
      };
    }
  }
  return null;
}

function parseMfaVerifyEnrollmentBody(
  body: unknown,
): WorkforceAuthMfaVerifyEnrollmentResponse | null {
  if (!isPlainObject(body) || body.authenticated !== false) return null;
  if (body.next === "sign_in") {
    return { authenticated: false, next: "sign_in" };
  }
  if (
    body.code === "MFA_INVALID_CODE" ||
    body.code === "MFA_LOCKED" ||
    body.code === "FORBIDDEN" ||
    body.code === "RATE_LIMITED" ||
    body.code === "INVALID_REQUEST"
  ) {
    return {
      authenticated: false,
      code: body.code,
      ...(typeof body.retryAfterSeconds === "number"
        ? { retryAfterSeconds: body.retryAfterSeconds }
        : {}),
    };
  }
  return null;
}

function parseMfaVerifyBody(body: unknown): WorkforceAuthMfaVerifyResponse | null {
  if (!isPlainObject(body) || typeof body.authenticated !== "boolean") return null;
  if (body.authenticated === true) return { authenticated: true };
  if (
    body.code === "MFA_INVALID_CODE" ||
    body.code === "MFA_LOCKED" ||
    body.code === "AUTHENTICATION_FAILED" ||
    body.code === "RATE_LIMITED" ||
    body.code === "INVALID_REQUEST"
  ) {
    return {
      authenticated: false,
      code: body.code,
      ...(typeof body.retryAfterSeconds === "number"
        ? { retryAfterSeconds: body.retryAfterSeconds }
        : {}),
    };
  }
  return null;
}

function parseSessionBody(body: unknown): WorkforceAuthSessionResponse | null {
  if (!isPlainObject(body) || typeof body.authenticated !== "boolean") return null;
  if (body.authenticated === true) {
    const user = body.user;
    if (!isPlainObject(user) || typeof user.id !== "string") return null;
    return { authenticated: true, user: { id: user.id } };
  }
  if (
    body.next === "change_password" ||
    body.next === "mfa_enrollment" ||
    body.next === "mfa"
  ) {
    return { authenticated: false, next: body.next };
  }
  return { authenticated: false };
}

function parseSignOutBody(body: unknown): WorkforceAuthSignOutResponse | null {
  if (!isPlainObject(body) || body.authenticated !== false) return null;
  return { authenticated: false };
}

export async function signInWorkforce(
  email: string,
  password: string,
): Promise<WorkforceAuthSignInResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.signIn, { email, password });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  try {
    const body = await readJsonBody(response);
    const parsed = parseSignInBody(body, retryAfterSeconds);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function changeWorkforcePassword(
  currentPassword: string,
  newPassword: string,
): Promise<WorkforceAuthChangePasswordResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.changePassword, {
      currentPassword,
      newPassword,
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  try {
    const body = await readJsonBody(response);
    const parsed = parseChangePasswordBody(body, retryAfterSeconds);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function enrollWorkforceMfa(
  password: string,
): Promise<WorkforceAuthMfaEnrollResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.mfaEnroll, { password });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseMfaEnrollBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function verifyWorkforceMfaEnrollment(
  code: string,
): Promise<WorkforceAuthMfaVerifyEnrollmentResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyEnrollment, { code });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseMfaVerifyEnrollmentBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function verifyWorkforceMfa(code: string): Promise<WorkforceAuthMfaVerifyResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerify, { code });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseMfaVerifyBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function verifyWorkforceMfaBackupCode(
  code: string,
): Promise<WorkforceAuthMfaVerifyResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.mfaVerifyBackupCode, { code });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  try {
    const body = await readJsonBody(response);
    const parsed = parseMfaVerifyBody(body);
    if (!parsed) return { ok: false, code: "INVALID_RESPONSE" };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }
}

export async function fetchWorkforceSession(): Promise<WorkforceAuthSessionResult> {
  let response: Response;
  try {
    response = await fetch(WORKFORCE_AUTH_PUBLIC_PATHS.session, {
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

export async function signOutWorkforce(): Promise<WorkforceAuthSignOutResult> {
  let response: Response;
  try {
    response = await postJson(WORKFORCE_AUTH_PUBLIC_PATHS.signOut, {});
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
