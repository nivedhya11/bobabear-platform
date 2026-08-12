/**
 * Programmatic `CustomerCommerceService` test harness (IMP-024).
 */
import { makeSignature } from "better-auth/crypto";

import type { WebConfig } from "../../../src/platform/config";
import {
  getCustomerAuthRuntime,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../../../src/server/auth/customer";
import { CUSTOMER_AUTH_COOKIE_PREFIX } from "../../../src/server/auth/shared/constants";
import { validateCustomerAuthConfig } from "../../../src/server/auth/shared/config";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../../src/server/customer-auth/provider/local";
import { CustomerCommerceService } from "../../../src/server/customer-commerce/service";
import type { PaymentProvider } from "../../../src/server/payment/provider";
import { getApplicationPersistence } from "../../../src/server/persistence";

export const CUSTOMER_COMMERCE_HTTP_TEST_ORIGIN = "http://localhost:3100";
export const CUSTOMER_COMMERCE_HTTP_TEST_SECRET =
  "customer-commerce-http-integration-test-secret-32chars";
export const CUSTOMER_COMMERCE_HTTP_TEST_PII_SECRET =
  "customer-commerce-http-integration-test-pii-hash-secret" as CustomerPiiHashSecret;

export interface CustomerCommerceHttpTestHarness {
  readonly baseUrl: string;
  readonly service: CustomerCommerceService;
  readonly databaseConnectionString: string;
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: CUSTOMER_COMMERCE_HTTP_TEST_ORIGIN,
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

function commerceAuthConfig() {
  const authResult = validateCustomerAuthConfig(
    {
      CUSTOMER_AUTH_SECRET: CUSTOMER_COMMERCE_HTTP_TEST_SECRET,
      CUSTOMER_AUTH_BASE_URL: CUSTOMER_COMMERCE_HTTP_TEST_ORIGIN,
    },
    "test",
  );
  if (!authResult.ok) {
    throw new Error("Invalid synthetic customer-commerce test configuration.");
  }
  return authResult.config;
}

/**
 * Mint a signed `boba-customer.session_token` Cookie header for HTTP tests.
 * Uses the same secrets as {@link withCustomerCommerceHttpService}.
 */
export async function mintCustomerSessionCookieHeader(
  databaseConnectionString: string,
  customerAuthUserId: string,
): Promise<string> {
  const auth = commerceAuthConfig();
  const identityDeriver = createCustomerTemporaryIdentityDeriver(
    CUSTOMER_COMMERCE_HTTP_TEST_PII_SECRET,
  );
  const otpProvider = createLocalCustomerOtpProviderForTests({
    environmentType: "test",
  });
  const phoneDependencies: CustomerPhoneAuthRuntimeDependencies = {
    otpProvider,
    identityDeriver,
  };
  const runtime = getCustomerAuthRuntime(
    {
      auth,
      persistence: applicationConfig(databaseConnectionString),
    },
    phoneDependencies,
  );

  try {
    const auth = await runtime.getAuth();
    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(customerAuthUserId);
    const cookieName = `${CUSTOMER_AUTH_COOKIE_PREFIX}.session_token`;
    const signedValue = `${session.token}.${await makeSignature(session.token, CUSTOMER_COMMERCE_HTTP_TEST_SECRET)}`;
    return `${cookieName}=${signedValue}`;
  } finally {
    await runtime.close();
    await otpProvider.close();
  }
}

export type WithCustomerCommerceHttpServiceOptions = Readonly<{
  paymentProvider?: PaymentProvider;
}>;

export async function withCustomerCommerceHttpService<T>(
  databaseConnectionString: string,
  callback: (harness: CustomerCommerceHttpTestHarness) => Promise<T>,
  options: WithCustomerCommerceHttpServiceOptions = {},
): Promise<T> {
  const auth = commerceAuthConfig();
  const identityDeriver = createCustomerTemporaryIdentityDeriver(
    CUSTOMER_COMMERCE_HTTP_TEST_PII_SECRET,
  );

  const service = new CustomerCommerceService({
    auth,
    persistenceConfig: applicationConfig(databaseConnectionString),
    identityDeriver,
    host: "127.0.0.1",
    port: 0,
    shutdownTimeoutMs: 2_000,
    paymentProvider: options.paymentProvider,
  });

  await service.start();
  const port = service.boundPort;
  if (!port) {
    await service.close();
    throw new Error("customer-commerce test service failed to bind an ephemeral port.");
  }

  try {
    return await callback({
      baseUrl: `http://127.0.0.1:${port}`,
      service,
      databaseConnectionString,
    });
  } finally {
    await service.close();
  }
}

/** Application persistence against the same DB the HTTP service uses. */
export function commerceTestPersistence(databaseConnectionString: string) {
  return getApplicationPersistence(applicationConfig(databaseConnectionString));
}
