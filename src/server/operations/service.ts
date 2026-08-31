/** Dedicated Operations Node service process (IMP-029). */
import "server-only";

import { createServer, type Server } from "node:http";

import { getWorkforceAuthRuntime, type WorkforceAuthRuntime } from "../auth/workforce";
import type { WorkforceAuthConfig } from "../auth/shared/types";
import type { WebConfig, WorkerConfig } from "../../platform/config";
import { NotificationOutboxProcessor } from "../notifications";
import { createNotificationChannelRegistry } from "../notifications/channels";
import {
  createMetaWhatsAppChannelAdapter,
  type MetaWhatsAppRuntimeSecrets,
} from "../notifications/provider/meta-whatsapp";
import { getApplicationPersistence, type Persistence } from "../persistence";
import { createOperationsRequestListener, type OperationsRequestEvent } from "./http/app";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const SAFE_LOG_FIELDS = ["requestId", "operation", "safeOutcomeCode", "httpStatus", "durationMs"] as const;

export type OperationsServiceOptions = Readonly<{
  auth: WorkforceAuthConfig;
  persistenceConfig: WebConfig | WorkerConfig;
  trustedOrigin: string;
  host: string;
  port: number;
  shutdownTimeoutMs?: number;
  /** Notification outbox processor (IMP-033). Order and Delivery mutations
   * originate here, so this host polls too; SKIP LOCKED keeps it safe to run
   * concurrently with the same processor in customer-commerce. */
  enableNotificationOutboxProcessor?: boolean;
  /** Meta WhatsApp secrets when enabled (IMP-034). */
  metaWhatsApp?: MetaWhatsAppRuntimeSecrets | null;
}>;

function logSafeEvent(event: OperationsRequestEvent): void {
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_LOG_FIELDS) safe[field] = event[field];
  console.log(JSON.stringify(safe));
}

export class OperationsService {
  private readonly config: OperationsServiceOptions;
  private readonly persistence: Persistence;
  private readonly runtime: WorkforceAuthRuntime;
  private readonly server: Server;
  private readonly notificationProcessor: NotificationOutboxProcessor | null;
  private started = false;
  private closed = false;
  private inFlightCount = 0;
  private inFlightWaiters: Array<() => void> = [];

  constructor(config: OperationsServiceOptions) {
    this.config = config;
    this.persistence = getApplicationPersistence(config.persistenceConfig);
    this.runtime = getWorkforceAuthRuntime({ auth: config.auth, persistence: config.persistenceConfig });
    this.server = createServer(createOperationsRequestListener(
      { runtime: this.runtime, persistence: this.persistence, trustedOrigin: config.trustedOrigin },
      {
        onRequestStart: () => { this.inFlightCount += 1; },
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
    ));
    const notificationChannels = createNotificationChannelRegistry({
      whatsapp: config.metaWhatsApp
        ? createMetaWhatsAppChannelAdapter({ secrets: config.metaWhatsApp })
        : undefined,
    });
    this.notificationProcessor =
      config.enableNotificationOutboxProcessor === false
        ? null
        : new NotificationOutboxProcessor({
            persistence: this.persistence,
            operationOptions: { channels: notificationChannels },
          });
  }

  async start(): Promise<void> {
    if (this.started || this.closed) return;
    this.started = true;
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
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
      this.inFlightWaiters.push(() => { clearTimeout(timer); resolve(); });
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.notificationProcessor?.stop();
    const serverClosed = new Promise<void>((resolve) => { this.server.close(() => resolve()); });
    await this.waitForInFlightRequests(this.config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
    await this.runtime.close();
    await this.persistence.close();
    this.server.closeAllConnections();
    await serverClosed;
  }
}
