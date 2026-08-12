/**
 * Trusted CustomerActor for Cart self-service (IMP-020).
 *
 * Branding uses a module-private Symbol (not Symbol.for). Possession of the
 * global registry key cannot forge a Cart CustomerActor. Minting requires a
 * non-forgeable {@link TrustedCustomerAuthIdentity} from customer-auth session
 * validation — a plain user id / `{ authUserId }` object is never enough.
 */

import {
  isTrustedCustomerAuthIdentity,
  type TrustedCustomerAuthIdentity,
} from "../auth/customer/trusted-identity";
import { CartError } from "../../shared/cart";

/** Module-private brand — not recoverable via Symbol.for. */
const CUSTOMER_ACTOR_BRAND = Symbol("boba-bear.cart.CustomerActor");

export type CustomerActor = Readonly<{
  readonly kind: "customer";
  readonly authUserId: string;
}> & {
  readonly [CUSTOMER_ACTOR_BRAND]: true;
};

/**
 * Mint a branded Cart CustomerActor from a trusted customer-auth identity.
 * Call only from {@link ./auth-adapter} (or equivalent) after
 * {@link resolveTrustedCustomerAuthIdentity}.
 */
export function createCustomerActorFromTrustedAuthIdentity(
  identity: TrustedCustomerAuthIdentity,
): CustomerActor {
  if (!isTrustedCustomerAuthIdentity(identity)) {
    throw new CartError(
      "CUSTOMER_AUTH_REQUIRED",
      "A trusted customer-auth identity is required.",
    );
  }

  const actor = {
    kind: "customer" as const,
    authUserId: identity.userId,
  };
  Object.defineProperty(actor, CUSTOMER_ACTOR_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(actor) as CustomerActor;
}

export function isCustomerActor(value: unknown): value is CustomerActor {
  if (typeof value !== "object" || value === null) return false;
  return (
    Object.prototype.hasOwnProperty.call(value, CUSTOMER_ACTOR_BRAND) &&
    (value as Record<symbol, unknown>)[CUSTOMER_ACTOR_BRAND] === true &&
    (value as CustomerActor).kind === "customer" &&
    typeof (value as CustomerActor).authUserId === "string" &&
    (value as CustomerActor).authUserId.length > 0
  );
}

export function requireCustomerActor(value: unknown): CustomerActor {
  if (!isCustomerActor(value)) {
    throw new CartError(
      "CUSTOMER_AUTH_REQUIRED",
      "A trusted CustomerActor is required.",
    );
  }
  return value;
}
