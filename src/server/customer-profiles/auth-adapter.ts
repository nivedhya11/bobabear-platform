/**
 * Trusted adapter: customer-auth session identity → CustomerActor (IMP-017).
 *
 * Does not parse OTP, session cookies, or Better Auth tokens. Callers must
 * pass an already-validated customer-auth user id from the auth boundary.
 */
import { createCustomerActorFromTrustedAuthIdentity, type CustomerActor } from "./actor";
import { CustomerProfileError } from "../../shared/customer-profiles";

export type TrustedCustomerAuthIdentity = Readonly<{
  userId: string;
}>;

/**
 * Convert a validated customer-auth session user into a branded CustomerActor.
 */
export function customerActorFromTrustedCustomerAuthSession(
  session: TrustedCustomerAuthIdentity | null | undefined,
): CustomerActor {
  if (
    session === null ||
    session === undefined ||
    typeof session !== "object" ||
    typeof session.userId !== "string" ||
    session.userId.length === 0
  ) {
    throw new CustomerProfileError(
      "CUSTOMER_AUTH_REQUIRED",
      "A validated customer-auth session is required.",
    );
  }
  return createCustomerActorFromTrustedAuthIdentity({ authUserId: session.userId });
}
