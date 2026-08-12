/**
 * Customer trust resolution for customer-commerce (IMP-024).
 *
 * Cookie session → TrustedCustomerAuthIdentity → domain CustomerActor.
 * Never accepts caller-supplied customerId/userId as authority.
 */
import "server-only";

import type { IncomingHttpHeaders } from "node:http";

import {
  resolveTrustedCustomerAuthIdentity,
  type CustomerAuthRuntime,
  type TrustedCustomerAuthIdentity,
} from "../../auth/customer";
import { customerActorFromTrustedCustomerAuthIdentity } from "../../cart/auth-adapter";
import type { CustomerActor as CartCustomerActor } from "../../cart/actor";
import { customerActorFromTrustedCustomerAuthSession as profileActorFromSession } from "../../customer-profiles/auth-adapter";
import type { CustomerActor as ProfileCustomerActor } from "../../customer-profiles/actor";
import { customerActorFromTrustedCustomerAuthSession as addressActorFromSession } from "../../customer-addresses/auth-adapter";
import type { CustomerActor as AddressCustomerActor } from "../../customer-addresses/actor";
import { CartError } from "../../../shared/cart";
import { buildCustomerAuthRequestHeaders } from "./headers";

export async function resolveOptionalTrustedIdentity(
  runtime: CustomerAuthRuntime,
  incoming: IncomingHttpHeaders,
): Promise<TrustedCustomerAuthIdentity | null> {
  const headers = buildCustomerAuthRequestHeaders(incoming);
  return resolveTrustedCustomerAuthIdentity(runtime, { headers });
}

export async function requireTrustedIdentity(
  runtime: CustomerAuthRuntime,
  incoming: IncomingHttpHeaders,
): Promise<TrustedCustomerAuthIdentity> {
  const identity = await resolveOptionalTrustedIdentity(runtime, incoming);
  if (!identity) {
    throw new CartError(
      "CUSTOMER_AUTH_REQUIRED",
      "A validated customer-auth session is required.",
    );
  }
  return identity;
}

export function toCartCustomerActor(identity: TrustedCustomerAuthIdentity): CartCustomerActor {
  return customerActorFromTrustedCustomerAuthIdentity(identity);
}

export function toProfileCustomerActor(
  identity: TrustedCustomerAuthIdentity,
): ProfileCustomerActor {
  return profileActorFromSession({ userId: identity.userId });
}

export function toAddressCustomerActor(
  identity: TrustedCustomerAuthIdentity,
): AddressCustomerActor {
  return addressActorFromSession({ userId: identity.userId });
}
