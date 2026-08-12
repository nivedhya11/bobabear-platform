/**
 * Opaque authenticated customer identity (IMP-020 Cart trust boundary).
 *
 * Only {@link resolveTrustedCustomerAuthIdentity} may mint a branded
 * {@link TrustedCustomerAuthIdentity}, and only after authoritative
 * customer-auth session validation against the Better Auth customer runtime.
 * A plain `{ userId }` object is never sufficient.
 */
import "server-only";

import {
  CUSTOMER_AUTH_COOKIE_PREFIX,
} from "../shared/constants";
import type { CustomerAuthRuntime } from "./runtime";

/** Module-private brand — not recoverable via Symbol.for. */
const TRUSTED_CUSTOMER_AUTH_IDENTITY_BRAND = Symbol(
  "boba-bear.TrustedCustomerAuthIdentity"
);

export type TrustedCustomerAuthIdentity = Readonly<{
  readonly userId: string;
}> & {
  readonly [TRUSTED_CUSTOMER_AUTH_IDENTITY_BRAND]: true;
};

export type TrustedCustomerAuthCredentials =
  | Readonly<{ headers: Headers }>
  | Readonly<{ sessionToken: string }>;

type SessionLookup = {
  findSession: (
    token: string,
  ) => Promise<{ session: { token: string }; user: { id: string } } | null>;
};

function mintTrustedCustomerAuthIdentity(
  userId: string,
): TrustedCustomerAuthIdentity {
  const identity = { userId };
  Object.defineProperty(identity, TRUSTED_CUSTOMER_AUTH_IDENTITY_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(identity) as TrustedCustomerAuthIdentity;
}

export function isTrustedCustomerAuthIdentity(
  value: unknown,
): value is TrustedCustomerAuthIdentity {
  if (typeof value !== "object" || value === null) return false;
  return (
    Object.prototype.hasOwnProperty.call(
      value,
      TRUSTED_CUSTOMER_AUTH_IDENTITY_BRAND,
    ) &&
    (value as Record<symbol, unknown>)[TRUSTED_CUSTOMER_AUTH_IDENTITY_BRAND] ===
      true &&
    typeof (value as TrustedCustomerAuthIdentity).userId === "string" &&
    (value as TrustedCustomerAuthIdentity).userId.length > 0
  );
}

/**
 * Validate customer-auth session credentials and return a non-forgeable
 * trusted identity. Returns `null` when the session is missing or invalid.
 *
 * - `{ headers }` uses Better Auth `auth.api.getSession` (cookie/request path).
 * - `{ sessionToken }` uses Better Auth's database session lookup for the raw
 *   opaque token (same store `getSession` ultimately consults).
 */
export async function resolveTrustedCustomerAuthIdentity(
  runtime: CustomerAuthRuntime,
  credentials: TrustedCustomerAuthCredentials,
): Promise<TrustedCustomerAuthIdentity | null> {
  if (
    credentials !== null &&
    typeof credentials === "object" &&
    "headers" in credentials &&
    credentials.headers instanceof Headers
  ) {
    const auth = await runtime.getAuth();
    const session = await auth.api.getSession({
      headers: credentials.headers,
    });
    const userId = session?.user?.id;
    if (typeof userId !== "string" || userId.length === 0) {
      return null;
    }
    return mintTrustedCustomerAuthIdentity(userId);
  }

  if (
    credentials !== null &&
    typeof credentials === "object" &&
    "sessionToken" in credentials &&
    typeof credentials.sessionToken === "string" &&
    credentials.sessionToken.length > 0
  ) {
    const auth = await runtime.getAuth();
    const context = (await auth.$context) as { internalAdapter: SessionLookup };
    const found = await context.internalAdapter.findSession(
      credentials.sessionToken,
    );
    const userId = found?.user?.id;
    if (typeof userId !== "string" || userId.length === 0) {
      return null;
    }
    return mintTrustedCustomerAuthIdentity(userId);
  }

  return null;
}

/** Cookie name Better Auth issues for the customer realm session token. */
export const CUSTOMER_AUTH_SESSION_COOKIE_NAME =
  `${CUSTOMER_AUTH_COOKIE_PREFIX}.session_token` as const;
