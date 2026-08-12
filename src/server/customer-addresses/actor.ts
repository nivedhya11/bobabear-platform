/**
 * Trusted CustomerActor for customer Address self-service (IMP-018).
 *
 * Uses the same brand symbol as Customer Profiles so a trusted actor from either
 * adapter is interchangeable. Only the factory can produce a usable actor.
 */

import { CustomerAddressError } from "../../shared/customer-addresses";

const CUSTOMER_ACTOR_BRAND = Symbol.for("boba-bear.CustomerActor");

export type CustomerActorIdentity = Readonly<{
  authUserId: string;
}>;

export type CustomerActor = Readonly<{
  readonly kind: "customer";
  readonly authUserId: string;
}> & {
  readonly [CUSTOMER_ACTOR_BRAND]: true;
};

/**
 * Build a branded actor from a server-validated customer-auth identity.
 * Never call this with a client-supplied authUserId in production flows —
 * only from a trusted session/auth adapter.
 */
export function createCustomerActorFromTrustedAuthIdentity(
  identity: CustomerActorIdentity,
): CustomerActor {
  if (
    typeof identity !== "object" ||
    identity === null ||
    typeof identity.authUserId !== "string" ||
    identity.authUserId.length === 0
  ) {
    throw new CustomerAddressError(
      "CUSTOMER_AUTH_REQUIRED",
      "A trusted customer-auth identity is required.",
    );
  }

  const actor = {
    kind: "customer" as const,
    authUserId: identity.authUserId,
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
    throw new CustomerAddressError(
      "CUSTOMER_AUTH_REQUIRED",
      "A trusted CustomerActor is required.",
    );
  }
  return value;
}
