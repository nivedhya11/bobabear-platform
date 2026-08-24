/**
 * Trusted workforce session resolution (IMP-029 / D-372).
 *
 * Only {@link resolveTrustedWorkforceAuthIdentity} may mint a branded
 * {@link TrustedWorkforceAuthIdentity}, and only after authoritative
 * Better Auth workforce session validation plus server-loaded lifecycle
 * eligibility. Caller-supplied user ids, roles, permissions, or scope are
 * never accepted as authority.
 */
import "server-only";

import {
  WORKFORCE_AUTH_COOKIE_PREFIX,
} from "../shared/constants";
import {
  isFullyAuthenticated,
  resolveWorkforceAuthLifecycle,
  type WorkforceAuthLifecycleState,
  type WorkforceAuthLifecycleUser,
} from "../../workforce-auth/auth-state";
import type { WorkforceAuthRuntime } from "./runtime";

/** Module-private brand — not recoverable via Symbol.for. */
const TRUSTED_WORKFORCE_AUTH_IDENTITY_BRAND = Symbol(
  "boba-bear.TrustedWorkforceAuthIdentity",
);

export type TrustedWorkforceAuthIdentity = Readonly<{
  readonly workforceUserId: string;
  readonly disabledAt: null;
  readonly passwordChangeRequired: false;
  readonly twoFactorEnabled: true;
}> & {
  readonly [TRUSTED_WORKFORCE_AUTH_IDENTITY_BRAND]: true;
};

export type TrustedWorkforceAuthCredentials =
  | Readonly<{ headers: Headers }>
  | Readonly<{ sessionToken: string }>;

type WorkforceUserRow = Partial<WorkforceAuthLifecycleUser> & {
  id: string;
  email?: string;
  name?: string;
};

/**
 * Narrow Better Auth surface required for workforce session resolution.
 * Satisfied by the workforce realm runtime and the workforce-auth HTTP router.
 */
export type WorkforceAuthSessionAuthority = Readonly<{
  api: {
    getSession(input: {
      headers: Headers;
      returnHeaders?: boolean;
    }): Promise<GetSessionResult>;
  };
  $context: Promise<{
    internalAdapter: {
      findUserById: (userId: string) => Promise<WorkforceUserRow | null>;
      findSession: (
        token: string,
      ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
    };
  }>;
}>;

export type ResolvedWorkforceSession = Readonly<{
  userId: string | null;
  lifecycleUser: WorkforceAuthLifecycleUser | null;
  lifecycleState: WorkforceAuthLifecycleState;
}>;

function mintTrustedWorkforceAuthIdentity(
  lifecycleUser: WorkforceAuthLifecycleUser,
): TrustedWorkforceAuthIdentity {
  const identity = {
    workforceUserId: lifecycleUser.id,
    disabledAt: null,
    passwordChangeRequired: false,
    twoFactorEnabled: true,
  };
  Object.defineProperty(identity, TRUSTED_WORKFORCE_AUTH_IDENTITY_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(identity) as TrustedWorkforceAuthIdentity;
}

type GetSessionResult =
  | Readonly<{ user?: { id?: string } | null; session?: unknown }>
  | null
  | Readonly<{
      headers?: Headers;
      response: Readonly<{ user?: { id?: string } | null; session?: unknown }> | null;
    }>;

function userIdFromGetSessionResult(result: GetSessionResult): string | null {
  if (!result || typeof result !== "object") return null;
  if ("response" in result) {
    const userId = result.response?.user?.id;
    return typeof userId === "string" && userId.length > 0 ? userId : null;
  }
  const userId = result.user?.id;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function headersFromGetSessionResult(result: GetSessionResult): Headers {
  if (result && typeof result === "object" && "headers" in result && result.headers) {
    return result.headers;
  }
  return new Headers();
}

export function isTrustedWorkforceAuthIdentity(
  value: unknown,
): value is TrustedWorkforceAuthIdentity {
  if (typeof value !== "object" || value === null) return false;
  return (
    Object.prototype.hasOwnProperty.call(
      value,
      TRUSTED_WORKFORCE_AUTH_IDENTITY_BRAND,
    ) &&
    (value as Record<symbol, unknown>)[TRUSTED_WORKFORCE_AUTH_IDENTITY_BRAND] ===
      true &&
    typeof (value as TrustedWorkforceAuthIdentity).workforceUserId === "string" &&
    (value as TrustedWorkforceAuthIdentity).workforceUserId.length > 0 &&
    (value as TrustedWorkforceAuthIdentity).disabledAt === null &&
    (value as TrustedWorkforceAuthIdentity).passwordChangeRequired === false &&
    (value as TrustedWorkforceAuthIdentity).twoFactorEnabled === true
  );
}

/** Server-loaded workforce lifecycle identity for an authoritative user id. */
export async function loadWorkforceLifecycleUser(
  auth: WorkforceAuthSessionAuthority,
  userId: string,
): Promise<WorkforceAuthLifecycleUser | null> {
  const context = await auth.$context;
  const user = await context.internalAdapter.findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    disabledAt: user.disabledAt ?? null,
    passwordChangeRequired: Boolean(user.passwordChangeRequired),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

async function lookupWorkforceSessionUserId(
  auth: WorkforceAuthSessionAuthority,
  credentials: TrustedWorkforceAuthCredentials,
): Promise<string | null> {
  if (
    credentials !== null &&
    typeof credentials === "object" &&
    "headers" in credentials &&
    credentials.headers instanceof Headers
  ) {
    const result = await auth.api.getSession({
      headers: credentials.headers,
    });
    return userIdFromGetSessionResult(result);
  }

  if (
    credentials !== null &&
    typeof credentials === "object" &&
    "sessionToken" in credentials &&
    typeof credentials.sessionToken === "string" &&
    credentials.sessionToken.length > 0
  ) {
    const context = await auth.$context;
    const found = await context.internalAdapter.findSession(
      credentials.sessionToken,
    );
    const userId = found?.user?.id;
    return typeof userId === "string" && userId.length > 0 ? userId : null;
  }

  return null;
}

/**
 * Resolve an authoritative workforce session to lifecycle state without
 * minting a trusted eligible identity.
 */
export async function resolveWorkforceSession(
  auth: WorkforceAuthSessionAuthority,
  credentials: TrustedWorkforceAuthCredentials,
): Promise<ResolvedWorkforceSession> {
  const userId = await lookupWorkforceSessionUserId(auth, credentials);
  if (!userId) {
    return {
      userId: null,
      lifecycleUser: null,
      lifecycleState: "UNAUTHENTICATED",
    };
  }

  const lifecycleUser = await loadWorkforceLifecycleUser(auth, userId);
  const lifecycleState = resolveWorkforceAuthLifecycle({
    sessionPresent: true,
    user: lifecycleUser,
  });

  return {
    userId,
    lifecycleUser,
    lifecycleState,
  };
}

/**
 * Resolve a workforce session from request headers, optionally returning
 * Better Auth response headers for transport-specific cookie forwarding.
 */
export async function resolveWorkforceSessionFromHeaders(
  auth: WorkforceAuthSessionAuthority,
  headers: Headers,
  options: Readonly<{ returnHeaders: true }>,
): Promise<ResolvedWorkforceSession & Readonly<{ headers: Headers }>>;
export async function resolveWorkforceSessionFromHeaders(
  auth: WorkforceAuthSessionAuthority,
  headers: Headers,
  options?: Readonly<{ returnHeaders?: false }>,
): Promise<ResolvedWorkforceSession>;
export async function resolveWorkforceSessionFromHeaders(
  auth: WorkforceAuthSessionAuthority,
  headers: Headers,
  options?: Readonly<{ returnHeaders?: boolean }>,
): Promise<ResolvedWorkforceSession & Readonly<{ headers?: Headers }>> {
  const result = await auth.api.getSession({
    headers,
    returnHeaders: options?.returnHeaders === true,
  });
  const resolvedUserId = userIdFromGetSessionResult(result);

  if (!resolvedUserId) {
    return {
      userId: null,
      lifecycleUser: null,
      lifecycleState: "UNAUTHENTICATED",
      ...(options?.returnHeaders === true
        ? { headers: headersFromGetSessionResult(result) }
        : {}),
    };
  }

  const lifecycleUser = await loadWorkforceLifecycleUser(auth, resolvedUserId);
  const lifecycleState = resolveWorkforceAuthLifecycle({
    sessionPresent: true,
    user: lifecycleUser,
  });

  return {
    userId: resolvedUserId,
    lifecycleUser,
    lifecycleState,
    ...(options?.returnHeaders === true
      ? { headers: headersFromGetSessionResult(result) }
      : {}),
  };
}

/**
 * Validate workforce session credentials and return a non-forgeable trusted
 * identity when the user is fully lifecycle-eligible. Returns `null` when the
 * session is missing/invalid or the user is disabled, password-change-required,
 * or MFA-ineligible.
 */
export async function resolveTrustedWorkforceAuthIdentity(
  runtime: WorkforceAuthRuntime,
  credentials: TrustedWorkforceAuthCredentials,
): Promise<TrustedWorkforceAuthIdentity | null> {
  const auth = await runtime.getAuth();
  return resolveTrustedWorkforceAuthIdentityFromAuth(
    auth as unknown as WorkforceAuthSessionAuthority,
    credentials,
  );
}

export async function resolveTrustedWorkforceAuthIdentityFromAuth(
  auth: WorkforceAuthSessionAuthority,
  credentials: TrustedWorkforceAuthCredentials,
): Promise<TrustedWorkforceAuthIdentity | null> {
  const session = await resolveWorkforceSession(auth, credentials);
  if (
    !session.lifecycleUser ||
    !isFullyAuthenticated(session.lifecycleState)
  ) {
    return null;
  }

  return mintTrustedWorkforceAuthIdentity(session.lifecycleUser);
}

/** Cookie name Better Auth issues for the workforce realm session token. */
export const WORKFORCE_AUTH_SESSION_COOKIE_NAME =
  `${WORKFORCE_AUTH_COOKIE_PREFIX}.session_token` as const;
