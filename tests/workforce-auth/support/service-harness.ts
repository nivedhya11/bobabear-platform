/**
 * Programmatic `WorkforceAuthService` test harness (IMP-010).
 *
 * Starts the real HTTP service directly — never through `main.ts` (which
 * only reads the real environment) — on an OS-assigned loopback port with
 * `trustProxyHops: 0`. Backed by a real Testcontainers PostgreSQL database
 * — never a mock persistence layer. Mirrors
 * `tests/customer-auth/support/service-harness.ts`.
 */
import type { WebConfig } from "../../../src/platform/config";
import { validateWorkforceAuthConfig } from "../../../src/server/auth/shared/config";
import { WorkforceAuthService } from "../../../src/server/workforce-auth/service";
import type { WorkforcePiiHashSecret } from "../../../src/server/workforce-auth/pii";

export const WORKFORCE_AUTH_HTTP_TEST_ORIGIN = "http://localhost:3200";
export const WORKFORCE_AUTH_HTTP_TEST_SECRET =
  "workforce-auth-http-integration-test-secret-32-chars";
export const WORKFORCE_AUTH_HTTP_TEST_PII_SECRET =
  "workforce-auth-http-integration-test-pii-hash-secret" as WorkforcePiiHashSecret;

export interface WorkforceAuthHttpTestHarness {
  readonly baseUrl: string;
  readonly service: WorkforceAuthService;
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

/**
 * Start a real `WorkforceAuthService` on `127.0.0.1` with an OS-assigned
 * ephemeral port, run `callback` against it, then always close the service
 * (which in turn closes its Better Auth runtime) even if `callback` throws.
 */
export async function withWorkforceAuthHttpService<T>(
  databaseConnectionString: string,
  callback: (harness: WorkforceAuthHttpTestHarness) => Promise<T>,
): Promise<T> {
  const authResult = validateWorkforceAuthConfig(
    {
      WORKFORCE_AUTH_SECRET: WORKFORCE_AUTH_HTTP_TEST_SECRET,
      WORKFORCE_AUTH_BASE_URL: WORKFORCE_AUTH_HTTP_TEST_ORIGIN,
    },
    "test",
  );
  if (!authResult.ok) {
    throw new Error("Invalid synthetic workforce-auth test configuration.");
  }

  const service = new WorkforceAuthService({
    auth: authResult.config,
    persistenceConfig: applicationConfig(databaseConnectionString),
    piiHashSecret: WORKFORCE_AUTH_HTTP_TEST_PII_SECRET,
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
    throw new Error("workforce-auth test service failed to bind an ephemeral port.");
  }

  try {
    return await callback({ baseUrl: `http://127.0.0.1:${port}`, service });
  } finally {
    await service.close();
  }
}
