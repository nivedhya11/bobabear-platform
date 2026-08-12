/**
 * Public entry point for the workforce-auth HTTP service (IMP-010).
 *
 * Exposes only what a test or another server module needs to construct and
 * drive the service end-to-end — the underlying HTTP request-listener/
 * router capture seams (`./http/**`) are deliberately not re-exported here.
 */
import "server-only";

export { loadWorkforceAuthServiceConfig } from "./config";
export type {
  WorkforceAuthServiceConfig,
  WorkforceAuthServiceEnvSource,
} from "./config";

export { WorkforceAuthService } from "./service";
export type { WorkforceAuthServiceOptions } from "./service";

export {
  WorkforceAuthConfigurationError,
  WorkforceAuthServiceError,
} from "./errors";
export type { WorkforceAuthSafeIssue } from "./errors";

export {
  hashWorkforceEmailKey,
  hashWorkforceIpKey,
  loadWorkforceAuthServiceHostConfig,
  loadWorkforcePiiHashSecret,
} from "./pii";
export type {
  WorkforceAuthServiceHostConfig,
  WorkforcePiiHashSecret,
} from "./pii";

export {
  resolveWorkforceAuthLifecycle,
  isFullyAuthenticated,
  WORKFORCE_AUTH_LIFECYCLE_STATES,
} from "./auth-state";
export type {
  WorkforceAuthLifecycleState,
  WorkforceAuthLifecycleUser,
} from "./auth-state";

export { validateWorkforcePassword } from "./password-policy";
