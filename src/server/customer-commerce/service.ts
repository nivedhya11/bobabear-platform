/**
 * Customer-commerce HTTP service process (IMP-024).
 *
 * Owns the Node `http.Server`, customer-auth runtime (session validation
 * only), and application persistence handle. Safe structured logs only.
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
import { getApplicationPersistence, type Persistence } from "../persistence";
import type {
  CustomerTemporaryIdentityDeriver,
} from "../customer-auth/pii";
import type { CustomerOtpProvider } from "../customer-auth/provider/types";
import { NotificationOutboxProcessor } from "../notifications";
import { PaymentInboxProcessor } from "../payment/inbox";
import type { PaymentProvider } from "../payment/provider";
import { RefundReconciliationProcessor } from "../refund/reconciliation";
import { createCustomerCommerceRequestListener, type CustomerCommerceRequestEvent } from "./http/app";
import { createSessionOnlyOtpProvider } from "./session-otp-stub";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export type CustomerCommerceServiceOptions = Readonly<{
  auth: CustomerAuthConfig;
  persistenceConfig: WebConfig | WorkerConfig;
  identityDeriver: CustomerTemporaryIdentityDeriver;
  host: string;
  port: number;
  shutdownTimeoutMs?: number;
  /** Optional Payment provider (tests). Production omits → disabled provider. */
  paymentProvider?: PaymentProvider;
  /** Start Razorpay inbox processor only when explicitly enabled. */
  enablePaymentInboxProcessor?: boolean;
  /** Notification outbox processor (IMP-033). In-process, no new deployable
   * worker. Defaults to enabled; SKIP LOCKED makes it safe to run alongside
   * the same processor in Operations. */
  enableNotificationOutboxProcessor?: boolean;
}>;

const SAFE_LOG_FIELDS = [
  "requestId",
  "operation",
  "safeOutcomeCode",
  "httpStatus",
  "durationMs",
] as const;

function logSafeEvent(event: CustomerCommerceRequestEvent): void {
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_LOG_FIELDS) {
    const value = event[field];
    if (value !== undefined) safe[field] = value;
  }
  console.log(JSON.stringify(safe));
}

export class CustomerCommerceService {
  private readonly config: CustomerCommerceServiceOptions;
  private readonly persistence: Persistence;
  private readonly runtime: CustomerAuthRuntime;
  private readonly otpProvider: CustomerOtpProvider;
  private readonly server: Server;
  private readonly inboxProcessor: PaymentInboxProcessor | null;
  private readonly refundReconciler: RefundReconciliationProcessor | null;
  private readonly notificationProcessor: NotificationOutboxProcessor | null;

  private started = false;
  private closed = false;
  private inFlightCount = 0;
  private inFlightWaiters: Array<() => void> = [];

  constructor(config: CustomerCommerceServiceOptions) {
    this.config = config;
    this.persistence = getApplicationPersistence(config.persistenceConfig);

    this.otpProvider = createSessionOnlyOtpProvider();

    const phoneDependencies: CustomerPhoneAuthRuntimeDependencies = {
      otpProvider: this.otpProvider,
      identityDeriver: config.identityDeriver,
    };
    this.runtime = getCustomerAuthRuntime(
      { auth: config.auth, persistence: config.persistenceConfig },
      phoneDependencies,
    );

    const requestListener = createCustomerCommerceRequestListener(
      {
        runtime: this.runtime,
        persistence: this.persistence,
        paymentProvider: config.paymentProvider,
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

    const enableInbox =
      config.enablePaymentInboxProcessor === true &&
      config.paymentProvider?.name === "razorpay";
    this.inboxProcessor = enableInbox
      ? new PaymentInboxProcessor({ persistence: this.persistence })
      : null;
    this.refundReconciler =
      enableInbox && config.paymentProvider
        ? new RefundReconciliationProcessor({
            persistence: this.persistence,
            provider: config.paymentProvider,
          })
        : null;
    this.notificationProcessor =
      config.enableNotificationOutboxProcessor === false
        ? null
        : new NotificationOutboxProcessor({ persistence: this.persistence });
  }

  async start(): Promise<void> {
    if (this.started || this.closed) return;
    this.started = true;
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
    this.inboxProcessor?.start();
    this.refundReconciler?.start();
    this.notificationProcessor?.start();
  }

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

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.inboxProcessor?.stop();
    await this.refundReconciler?.stop();
    await this.notificationProcessor?.stop();

    const serverClosed = new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });

    await this.waitForInFlightRequests(
      this.config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    );

    await this.runtime.close();
    await this.otpProvider.close();

    this.server.closeAllConnections();
    await serverClosed;
  }
}
