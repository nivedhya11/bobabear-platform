/**
 * Combined workforce-auth service configuration (IMP-010).
 *
 * Validates only the workforce realm (`validateWorkforceAuthConfig`), not
 * the customer realm — this standalone Node service must never require
 * `CUSTOMER_AUTH_*` variables to start.
 */
import "server-only";

import { validateWorkforceAuthConfig } from "../auth/shared/config";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import type { WorkforceAuthConfig } from "../auth/shared/types";
import type { AppEnvironment } from "../../platform/config";
import {
  loadWorkforceAuthServiceHostConfig,
  type WorkforceAuthServiceHostConfig,
} from "./pii";

export type WorkforceAuthServiceEnvSource = Readonly<Record<string, string | undefined>>;

export type WorkforceAuthServiceConfig = Readonly<{
  environmentType: AppEnvironment;
  auth: WorkforceAuthConfig;
  service: WorkforceAuthServiceHostConfig;
}>;

/**
 * Validate the workforce realm's Better Auth foundation config and this
 * slice's service/PII config from one explicit environment source.
 */
export function loadWorkforceAuthServiceConfig(
  source: WorkforceAuthServiceEnvSource,
  environmentType: AppEnvironment,
): WorkforceAuthServiceConfig {
  const workforceResult = validateWorkforceAuthConfig(source, environmentType);
  if (!workforceResult.ok) {
    throw new AuthFoundationConfigurationError(workforceResult.issues);
  }
  const auth = workforceResult.config;

  const service = loadWorkforceAuthServiceHostConfig(
    source,
    environmentType,
    auth.baseURL.origin,
    {
      workforceAuthSecret: auth.secret,
      customerAuthSecret: source.CUSTOMER_AUTH_SECRET,
      customerPiiHashSecret: source.CUSTOMER_AUTH_PII_HASH_SECRET,
    },
  );

  return Object.freeze({
    environmentType,
    auth,
    service,
  });
}
