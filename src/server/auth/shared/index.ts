/**
 * Public entry point for the Better Auth foundation's shared, realm-agnostic
 * pieces (IMP-008): configuration loading, locked constants, and the error
 * types both realms throw. Server-only — realm Better Auth instances
 * themselves are obtained only through `src/server/auth/{customer,workforce}`.
 */
import "server-only";

export {
  AUTH_SESSION_POLICY,
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_AUTH_COOKIE_PREFIX,
  CUSTOMER_REALM,
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
  WORKFORCE_REALM,
} from "./constants";

export {
  WORKFORCE_AUTH_SESSION_POLICY,
  WORKFORCE_BACKUP_CODE_AMOUNT,
  WORKFORCE_BACKUP_CODE_LENGTH,
  WORKFORCE_MFA_LOCK_DURATION_SECONDS,
  WORKFORCE_MFA_MAX_FAILED_ATTEMPTS,
  WORKFORCE_PASSWORD_MAX_LENGTH,
  WORKFORCE_PASSWORD_MIN_LENGTH,
  WORKFORCE_TOTP_DIGITS,
  WORKFORCE_TOTP_ISSUER,
  WORKFORCE_TOTP_PERIOD_SECONDS,
  WORKFORCE_USER_ADDITIONAL_FIELDS,
} from "./workforce-session-policy";

export {
  loadAuthFoundationConfig,
  validateCustomerAuthConfig,
  validateWorkforceAuthConfig,
} from "./config";

export type {
  AuthEnvSource,
  AuthFoundationConfig,
  CustomerAuthConfig,
  CustomerAuthRuntimeConfig,
  CustomerAuthSecret,
  WorkforceAuthConfig,
  WorkforceAuthRuntimeConfig,
  WorkforceAuthSecret,
} from "./types";

export {
  AuthFoundationConfigurationError,
  AuthPersistenceUnavailableError,
  AuthRealmMismatchError,
  AuthRuntimeClosedError,
  AuthRuntimeInitializationError,
} from "./errors";
export type { AuthRealm } from "./errors";
