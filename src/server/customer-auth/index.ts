/**
 * Public entry point for the customer-auth HTTP service (IMP-009).
 *
 * Exposes only what a test or another server module needs to construct and
 * drive the service end-to-end — the underlying HTTP request-listener/
 * router capture seams (`./http/**`) are deliberately not re-exported here,
 * mirroring how `../persistence` and `../auth/customer` keep their own
 * internal seams off their public boundary.
 */
import "server-only";

export { loadCustomerAuthServiceConfig } from "./config";
export type {
  CustomerAuthServiceConfig,
  CustomerAuthServiceEnvSource,
} from "./config";

export { CustomerAuthService } from "./service";
export type { CustomerAuthServiceOptions } from "./service";

export {
  CustomerAuthConfigurationError,
  CustomerAuthServiceError,
  CustomerOtpProviderError,
} from "./errors";
export type { CustomerAuthSafeIssue } from "./errors";

export {
  createCustomerTemporaryIdentityDeriver,
  loadCustomerPhoneAuthServiceConfig,
  loadCustomerPiiHashSecret,
  CUSTOMER_TEMPORARY_DISPLAY_NAME,
} from "./pii";
export type {
  CustomerPhoneAuthServiceConfig,
  CustomerPiiHashSecret,
  CustomerTemporaryIdentityDeriver,
} from "./pii";

export { createCustomerOtpProvider } from "./provider";
export type { CustomerOtpProvider, CustomerOtpProviderKind } from "./provider";
