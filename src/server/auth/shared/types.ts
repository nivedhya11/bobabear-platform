/**
 * Typed configuration shapes for the Better Auth foundation (IMP-008).
 *
 * Mirrors `src/platform/config/types.ts`'s separation of concerns: this
 * module describes the *application-facing* shape only; `config.ts` owns
 * validation. `CustomerAuthSecret`/`WorkforceAuthSecret` are phantom-branded
 * so the two realms' secrets are not structurally interchangeable at the
 * type level — the actual runtime guarantee (a customer config rejected by
 * the workforce factory) is enforced separately, at runtime, via the
 * `realm` discriminant checked in `src/server/auth/{customer,workforce}/runtime.ts`.
 */
import type { AppEnvironment } from "../../../platform/config";
import type { ApplicationPersistenceConfig } from "../../persistence";
import {
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_AUTH_COOKIE_PREFIX,
  CUSTOMER_REALM,
  WORKFORCE_AUTH_BASE_PATH,
  WORKFORCE_AUTH_COOKIE_PREFIX,
  WORKFORCE_REALM,
} from "./constants";

declare const customerAuthSecretBrand: unique symbol;
declare const workforceAuthSecretBrand: unique symbol;

export type CustomerAuthSecret = string & {
  readonly [customerAuthSecretBrand]: "customer";
};
export type WorkforceAuthSecret = string & {
  readonly [workforceAuthSecretBrand]: "workforce";
};

export interface CustomerAuthConfig {
  readonly realm: typeof CUSTOMER_REALM;
  readonly secret: CustomerAuthSecret;
  readonly baseURL: URL;
  readonly basePath: typeof CUSTOMER_AUTH_BASE_PATH;
  readonly cookiePrefix: typeof CUSTOMER_AUTH_COOKIE_PREFIX;
  readonly environmentType: AppEnvironment;
}

export interface WorkforceAuthConfig {
  readonly realm: typeof WORKFORCE_REALM;
  readonly secret: WorkforceAuthSecret;
  readonly baseURL: URL;
  readonly basePath: typeof WORKFORCE_AUTH_BASE_PATH;
  readonly cookiePrefix: typeof WORKFORCE_AUTH_COOKIE_PREFIX;
  readonly environmentType: AppEnvironment;
}

export type AuthFoundationConfig = Readonly<{
  customer: CustomerAuthConfig;
  workforce: WorkforceAuthConfig;
}>;

/** Raw environment source. Deliberately not the real runtime environment
 * itself — callers (the two pre-existing browser-visible marketing overrides
 * aside) pass an explicit source object, same convention as
 * `src/platform/config`. */
export type AuthEnvSource = Readonly<Record<string, string | undefined>>;

/**
 * What a realm runtime factory (`getCustomerAuthRuntime` /
 * `getWorkforceAuthRuntime`) accepts: the realm's own validated auth
 * config, plus the `WebConfig`/`WorkerConfig` needed to obtain this realm's
 * own application persistence handle via IMP-006's
 * `getApplicationPersistence`. The combined object's identity (not its
 * field values) is the runtime registry's cache key — see
 * `src/server/auth/{customer,workforce}/runtime.ts`.
 */
export type CustomerAuthRuntimeConfig = Readonly<{
  readonly auth: CustomerAuthConfig;
  readonly persistence: ApplicationPersistenceConfig;
}>;

export type WorkforceAuthRuntimeConfig = Readonly<{
  readonly auth: WorkforceAuthConfig;
  readonly persistence: ApplicationPersistenceConfig;
}>;
