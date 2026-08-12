/**
 * Combined customer-auth service configuration (IMP-009).
 *
 * A thin wrapper over two already-existing, independently-validated
 * boundaries: IMP-008's Better Auth foundation config
 * (`../auth/shared/config.ts`) and this slice's own phone/OTP service
 * config (`./pii.ts`). Never reads the real environment itself — callers
 * (`./main.ts` only) pass an explicit source object.
 *
 * Deliberately validates only the customer realm
 * (`validateCustomerAuthConfig`), not `loadAuthFoundationConfig`'s combined
 * customer+workforce validation — this is a standalone customer-only Node
 * service, so it must never require `WORKFORCE_AUTH_SECRET`/
 * `WORKFORCE_AUTH_BASE_URL` to start. The workforce realm has its own,
 * separate, not-yet-built runtime that will validate its own config
 * independently when that slice lands.
 */
import "server-only";

import { validateCustomerAuthConfig } from "../auth/shared/config";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import type { CustomerAuthConfig } from "../auth/shared/types";
import type { AppEnvironment } from "../../platform/config";
import {
  loadCustomerPhoneAuthServiceConfig,
  type CustomerPhoneAuthServiceConfig,
} from "./pii";

export type CustomerAuthServiceEnvSource = Readonly<Record<string, string | undefined>>;

export type CustomerAuthServiceConfig = Readonly<{
  environmentType: AppEnvironment;
  auth: CustomerAuthConfig;
  phone: CustomerPhoneAuthServiceConfig;
}>;

/**
 * Validate the customer realm's Better Auth foundation config and this
 * slice's phone/OTP service config from one explicit environment source,
 * and combine them. The customer realm's own trusted base-URL origin
 * (`auth.baseURL.origin`) is what `http/origin.ts` treats as the one
 * trusted `Origin` for state-changing requests — the same origin Better
 * Auth itself trusts.
 */
export function loadCustomerAuthServiceConfig(
  source: CustomerAuthServiceEnvSource,
  environmentType: AppEnvironment,
): CustomerAuthServiceConfig {
  const customerResult = validateCustomerAuthConfig(source, environmentType);
  if (!customerResult.ok) {
    throw new AuthFoundationConfigurationError(customerResult.issues);
  }
  const auth = customerResult.config;

  const phone = loadCustomerPhoneAuthServiceConfig(
    source,
    environmentType,
    auth.baseURL.origin,
    {
      customerAuthSecret: auth.secret,
    },
  );

  return Object.freeze({
    environmentType,
    auth,
    phone,
  });
}
