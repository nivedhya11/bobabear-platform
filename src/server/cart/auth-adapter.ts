/**
 * Trusted customer-auth → Cart CustomerActor bridge (IMP-020).
 *
 * Not part of the Cart public domain barrel (`./index`). Accepts only a
 * non-forgeable {@link TrustedCustomerAuthIdentity} produced by
 * {@link resolveTrustedCustomerAuthIdentity} after authoritative customer-auth
 * session validation. A plain `{ userId }` / caller-chosen id is rejected.
 */
import {
  isTrustedCustomerAuthIdentity,
  type TrustedCustomerAuthIdentity,
} from "../auth/customer/trusted-identity";
import { CartError } from "../../shared/cart";
import {
  createCustomerActorFromTrustedAuthIdentity,
  type CustomerActor,
} from "./actor";

/**
 * Convert a trusted customer-auth identity into a branded Cart CustomerActor.
 */
export function customerActorFromTrustedCustomerAuthIdentity(
  identity: TrustedCustomerAuthIdentity | null | undefined,
): CustomerActor {
  if (!isTrustedCustomerAuthIdentity(identity)) {
    throw new CartError(
      "CUSTOMER_AUTH_REQUIRED",
      "A validated customer-auth session is required.",
    );
  }
  return createCustomerActorFromTrustedAuthIdentity(identity);
}
