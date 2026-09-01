/**
 * The customer-auth HTTP service process (IMP-009).
 *
 * `CustomerAuthService` owns the Node `http.Server`, the customer realm's
 * Better Auth runtime, and the OTP provider handle for one process
 * lifetime. `start()`/`close()` are both idempotent. Shutdown order is
 * fixed: stop accepting new connections, wait (bounded) for in-flight
 * requests to finish, close the Better Auth runtime, close the OTP
 * provider, then finish closing the HTTP server.
 *
 * This is the only module in `src/server/customer-auth/**` that logs
 * *per-request* events — always one JSON line, always restricted to the
 * allowlisted safe fields below. Never logs a phone number, IP address, OTP
 * code, cookie, session token, email, request body, or user ID. (`main.ts`,
 * the process entry point, separately logs its own process-lifecycle
 * start/shutdown/fatal-error lines, same as `scripts/database/migrate.ts` —
 * never a per-request event, and never anything beyond the same safe
 * operation/outcome-code fields.)
 */
import "server-only";

import { createServer, type Server } from "node:http";

import {
  getCustomerAuthRuntime,
  type CustomerAuthRuntime,
  type CustomerPhoneAuthRuntimeDependencies,
} from "../auth/customer";
import type { CustomerAuthConfig } from "../auth/shared/types";
import type { WebConfig, WorkerConfig } from "../../platform/config";
import {
  createStructuredLogger,
  incrementCounter,
  STANDARD_HTTP_LOG_FIELDS,
  type StructuredLogger,
} from "../../platform/observability";
import { getApplicationPersistence, type Persistence } from "../persistence";
import { createCustomerAuthRequestListener, type CustomerAuthRequestEvent } from "./http/app";
import type { CustomerAuthApi } from "./http/router";
import type { CustomerPiiHashSecret, CustomerTemporaryIdentityDeriver } from "./pii";
import type { CustomerOtpProvider } from "./provider";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

const CUSTOMER_AUTH_SERVICE_NAME = "customer-auth";

export type CustomerAuthServiceOptions = Readonly<{
  auth: CustomerAuthConfig;
  persistenceConfig: WebConfig | WorkerConfig;
  otpProvider: CustomerOtpProvider;
  identityDeriver: CustomerTemporaryIdentityDeriver;
  piiHashSecret: CustomerPiiHashSecret;
  trustedOrigin: string;
  trustProxyHops: number;
  host: string;
  port: number;
  /** Bounded wait for in-flight requests during `close()`. */
  shutdownTimeoutMs?: number;
}>;

const EXTRA_LOG_FIELDS = ["providerKind", "rateLimitScope"] as const;

export class CustomerAuthService {
  private readonly config: CustomerAuthServiceOptions;
  private readonly persistence: Persistence;
  private readonly runtime: CustomerAuthRuntime;
  private readonly server: Server;
  private readonly logger: StructuredLogger;

  private started = false;
  private closed = false;
  private inFlightCount = 0;
  private inFlightWaiters: Array<() => void> = [];

  constructor(config: CustomerAuthServiceOptions) {
    this.config = config;
    this.persistence = getApplicationPersistence(config.persistenceConfig);
    this.logger = createStructuredLogger({
      logLevel: config.persistenceConfig.logLevel,
      allowFields: [...STANDARD_HTTP_LOG_FIELDS, ...EXTRA_LOG_FIELDS],
      service: CUSTOMER_AUTH_SERVICE_NAME,
    });

    const phoneDependencies: CustomerPhoneAuthRuntimeDependencies = {
      otpProvider: config.otpProvider,
      identityDeriver: config.identityDeriver,
    };
    this.runtime = getCustomerAuthRuntime(
      { auth: config.auth, persistence: config.persistenceConfig },
      phoneDependencies,
    );

    const requestListener = createCustomerAuthRequestListener(
      {
        getAuthApi: async (): Promise<CustomerAuthApi> => {
          const auth = await this.runtime.getAuth();
          return auth.api;
        },
        persistence: this.persistence,
        otpProvider: config.otpProvider,
        piiHashSecret: config.piiHashSecret,
        trustedOrigin: config.trustedOrigin,
        trustProxyHops: config.trustProxyHops,
        now: () => new Date(),
      },
      {
        onRequestStart: () => {
          this.inFlightCount += 1;
        },
        onRequestComplete: (event) => {
          this.inFlightCount = Math.max(0, this.inFlightCount - 1);
          if (this.inFlightCount === 0) {
            const waiters = this.inFlightWaiters;
            this.inFlightWaiters = [];
            for (const waiter of waiters) waiter();
          }
          incrementCounter("http.requests.total");
          this.logger.info({ ...event, providerKind: config.otpProvider.kind });
        },
      },
    );

    this.server = createServer(requestListener);
  }

  async start(): Promise<void> {
    if (this.started || this.closed) return;
    this.started = true;
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
  }

  /**
   * The actual bound port after `start()` resolves — distinct from
   * `config.port` when the caller requested an OS-assigned ephemeral port
   * (`port: 0`, e.g. an integration test). `null` before `start()` or after
   * `close()`.
   */
  get boundPort(): number | null {
    const address = this.server.address();
    return address && typeof address === "object" ? address.port : null;
  }

  private async waitForInFlightRequests(timeoutMs: number): Promise<void> {
    if (this.inFlightCount === 0) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.inFlightWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Idempotent, ordered shutdown: stop accepting new connections, wait
   * (bounded) for in-flight requests, close the Better Auth runtime, close
   * the OTP provider, then finish closing the HTTP server (forcing any
   * remaining idle/keep-alive sockets closed if the bounded wait expired).
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    const serverClosed = new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });

    await this.waitForInFlightRequests(
      this.config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    );

    await this.runtime.close();
    await this.config.otpProvider.close();

    this.server.closeAllConnections();
    await serverClosed;
  }
}
