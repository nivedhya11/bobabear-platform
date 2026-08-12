/**
 * Trusted customer-auth → CustomerActor bridge for Payment tests (IMP-022).
 *
 * Not part of the Payment public domain barrel (`./index`). Reuses Cart's
 * mint path — Payment never independently mints CustomerActor authority.
 */
export { customerActorFromTrustedCustomerAuthIdentity } from "../cart/auth-adapter";
