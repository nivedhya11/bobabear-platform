/**
 * Public entry point for the customer Better Auth realm (IMP-008 core;
 * IMP-009 phone OTP).
 *
 * Server-only. Nothing here is reachable from the static public app tree
 * (`src/app/**`, `src/components/**`) — there is no HTTP transport, login
 * route, or browser auth client in this slice. See AGENTS.md's IMP-008/
 * IMP-009 sections.
 */
import "server-only";

export { getCustomerAuthRuntime } from "./runtime";
export type {
  CustomerAuthRuntime,
  CustomerBetterAuthInstance,
  CustomerPhoneAuthRuntimeDependencies,
} from "./runtime";

export {
  CUSTOMER_AUTH_SESSION_COOKIE_NAME,
  isTrustedCustomerAuthIdentity,
  resolveTrustedCustomerAuthIdentity,
} from "./trusted-identity";
export type {
  TrustedCustomerAuthCredentials,
  TrustedCustomerAuthIdentity,
} from "./trusted-identity";
