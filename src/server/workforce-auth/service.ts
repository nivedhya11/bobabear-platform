/**
 * The workforce-auth HTTP service process (IMP-010).
 *
 * `WorkforceAuthService` owns the Node `http.Server` and the workforce
 * realm's Better Auth runtime for one process lifetime. `start()`/`close()`
 * are both idempotent. Shutdown order is fixed: stop accepting new
 * connections, wait (bounded) for in-flight requests to finish, close the
 * Better Auth runtime, then finish closing the HTTP server.
 *
 * This is the only module in `src/server/workforce-auth/**` that logs
 * *per-request* events — always one JSON line, always restricted to the
 * allowlisted safe fields below. Never logs an email, password, IP, TOTP
 * code, backup code, cookie, session token, request body, or user ID.
 * (`main.ts` separately logs its own process-lifecycle lines.)
 */
import "server-only";

import { createServer, type Server } from "node:http";

import {
  getWorkforceAuthRuntime,
  type WorkforceAuthRuntime,
} from "../auth/workforce";
import type { WorkforceAuthConfig } from "../auth/shared/types";
import type { WebConfig, WorkerConfig } from "../../platform/config";
import { getApplicationPersistence, type Persistence } from "../persistence";
import { createWorkforceAuthRequestListener, type WorkforceAuthRequestEvent } from "./http/app";
import type { WorkforceAuthHandle } from "./http/router";
import type { WorkforcePiiHashSecret } from "./pii";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export type WorkforceAuthServiceOptions = Readonly<{
  auth: WorkforceAuthConfig;
  persistenceConfig: WebConfig | WorkerConfig;
  piiHashSecret: WorkforcePiiHashSecret;
  trustedOrigin: string;
  trustProxyHops: number;
  host: string;
  port: number;
  /** Bounded wait for in-flight requests during `close()`. */
  shutdownTimeoutMs?: number;
}>;

const SAFE_LOG_FIELDS = [
  "requestId",
  "operation",
  "safeOutcomeCode",
  "httpStatus",
  "durationMs",
  "rateLimitScope",
] as const;

function logSafeEvent(event: WorkforceAuthRequestEvent): void {
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_LOG_FIELDS) {
    const value = event[field];
    if (value !== undefined) safe[field] = value;
  }
  console.log(JSON.stringify(safe));
}

export class WorkforceAuthService {
  private readonly config: WorkforceAuthServiceOptions;
  private readonly persistence: Persistence;
  private readonly runtime: WorkforceAuthRuntime;
  private readonly server: Server;

  private started = false;
  private closed = false;
  private inFlightCount = 0;
  private inFlightWaiters: Array<() => void> = [];

  constructor(config: WorkforceAuthServiceOptions) {
    this.config = config;
    this.persistence = getApplicationPersistence(config.persistenceConfig);

    this.runtime = getWorkforceAuthRuntime({
      auth: config.auth,
      persistence: config.persistenceConfig,
    });

    const requestListener = createWorkforceAuthRequestListener(
      {
        getAuth: async (): Promise<WorkforceAuthHandle> => {
          const auth = await this.runtime.getAuth();
          return auth as unknown as WorkforceAuthHandle;
        },
        persistence: this.persistence,
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
          logSafeEvent(event);
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
   * (`port: 0`). `null` before `start()` or after `close()`.
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
   * (bounded) for in-flight requests, close the Better Auth runtime, then
   * finish closing the HTTP server.
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

    this.server.closeAllConnections();
    await serverClosed;
  }
}
