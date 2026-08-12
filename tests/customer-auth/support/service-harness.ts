/**
 * Programmatic `CustomerAuthService` test harness (IMP-009).
 *
 * Starts the real HTTP service directly — never through `main.ts` (which
 * only reads the real environment) — on an OS-assigned loopback port with
 * `trustProxyHops: 0`. Backed by a real Testcontainers PostgreSQL database
 * and a real in-process local OTP provider (test-capture-seam variant) —
 * never a mock persistence layer, never a real SMS/network call.
 */
import type { WebConfig } from "../../../src/platform/config";
import {
  createCustomerTemporaryIdentityDeriver,
  type CustomerPiiHashSecret,
} from "../../../src/server/customer-auth/pii";
import { createLocalCustomerOtpProviderForTests } from "../../../src/server/customer-auth/provider/local";
import { CustomerAuthService } from "../../../src/server/customer-auth/service";
import { validateCustomerAuthConfig } from "../../../src/server/auth/shared/config";

export const CUSTOMER_AUTH_HTTP_TEST_ORIGIN = "http://localhost:3100";
export const CUSTOMER_AUTH_HTTP_TEST_SECRET =
  "customer-auth-http-integration-test-secret-32-chars-min";
export const CUSTOMER_AUTH_HTTP_TEST_PII_SECRET =
  "customer-auth-http-integration-test-pii-hash-secret-32ch" as CustomerPiiHashSecret;

export interface CustomerAuthHttpTestHarness {
  readonly baseUrl: string;
  readonly otpProvider: ReturnType<typeof createLocalCustomerOtpProviderForTests>;
  readonly service: CustomerAuthService;
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: CUSTOMER_AUTH_HTTP_TEST_ORIGIN,
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

/**
 * Start a real `CustomerAuthService` on `127.0.0.1` with an OS-assigned
 * ephemeral port, run `callback` against it, then always close the service
 * (which in turn closes its Better Auth runtime and the OTP provider) even
 * if `callback` throws.
 */
export async function withCustomerAuthHttpService<T>(
  databaseConnectionString: string,
  callback: (harness: CustomerAuthHttpTestHarness) => Promise<T>,
): Promise<T> {
  const authResult = validateCustomerAuthConfig(
    {
      CUSTOMER_AUTH_SECRET: CUSTOMER_AUTH_HTTP_TEST_SECRET,
      CUSTOMER_AUTH_BASE_URL: CUSTOMER_AUTH_HTTP_TEST_ORIGIN,
    },
    "test",
  );
  if (!authResult.ok) {
    throw new Error("Invalid synthetic customer-auth test configuration.");
  }

  const otpProvider = createLocalCustomerOtpProviderForTests({ environmentType: "test" });
  const identityDeriver = createCustomerTemporaryIdentityDeriver(CUSTOMER_AUTH_HTTP_TEST_PII_SECRET);

  const service = new CustomerAuthService({
    auth: authResult.config,
    persistenceConfig: applicationConfig(databaseConnectionString),
    otpProvider,
    identityDeriver,
    piiHashSecret: CUSTOMER_AUTH_HTTP_TEST_PII_SECRET,
    trustedOrigin: authResult.config.baseURL.origin,
    trustProxyHops: 0,
    host: "127.0.0.1",
    port: 0,
    shutdownTimeoutMs: 2_000,
  });

  await service.start();
  const port = service.boundPort;
  if (!port) {
    await service.close();
    throw new Error("customer-auth test service failed to bind an ephemeral port.");
  }

  try {
    return await callback({ baseUrl: `http://127.0.0.1:${port}`, otpProvider, service });
  } finally {
    await service.close();
  }
}
