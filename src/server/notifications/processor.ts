/**
 * In-process notification outbox processor (IMP-033).
 *
 * Runs inside existing services — no new deployable worker, no broker, no
 * Redis/Kafka/RabbitMQ. Claims from the existing PostgreSQL transactional
 * outbox with `FOR UPDATE SKIP LOCKED`, so several hosts can poll the same
 * table concurrently without double-handling a live-leased event.
 *
 * Delivery is at-least-once, so handling must be idempotent: request creation
 * converges on the dedup-key UNIQUE index and processing is a no-op for a
 * request that is not awaiting a send.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import {
  claimOutboxBatch,
  markOutboxDeadLetter,
  markOutboxPublished,
  releaseOutboxForRetry,
  type ClaimedOutboxEvent,
} from "../persistence/outbox";
import type { Persistence } from "../persistence/types";
import { systemNotificationClock, type NotificationClock } from "./clock";
import {
  createNotificationRequestFromDomainEvent,
  processPendingNotification,
  type NotificationOperationOptions,
} from "./operations";
import {
  isNotificationOutboxEventType,
  parseNotificationOutboxPayload,
} from "./outbox-events";

export const NOTIFICATION_OUTBOX_POLL_INTERVAL_MS = 1_000;
export const NOTIFICATION_OUTBOX_BATCH_LIMIT = 25;
export const NOTIFICATION_OUTBOX_LEASE_MS = 30_000;
export const NOTIFICATION_OUTBOX_MAX_ATTEMPTS = 5;
export const NOTIFICATION_OUTBOX_RETRY_DELAY_MS = 30_000;

export type NotificationOutboxProcessorOptions = Readonly<{
  persistence: Persistence;
  pollIntervalMs?: number;
  batchLimit?: number;
  leaseMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  clock?: NotificationClock;
  operationOptions?: NotificationOperationOptions;
}>;

export class NotificationOutboxProcessor {
  private readonly persistence: Persistence;
  private readonly pollIntervalMs: number;
  private readonly batchLimit: number;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly clock: NotificationClock;
  private readonly operationOptions: NotificationOperationOptions;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private running = false;

  constructor(options: NotificationOutboxProcessorOptions) {
    this.persistence = options.persistence;
    this.pollIntervalMs = options.pollIntervalMs ?? NOTIFICATION_OUTBOX_POLL_INTERVAL_MS;
    this.batchLimit = options.batchLimit ?? NOTIFICATION_OUTBOX_BATCH_LIMIT;
    this.leaseMs = options.leaseMs ?? NOTIFICATION_OUTBOX_LEASE_MS;
    this.maxAttempts = options.maxAttempts ?? NOTIFICATION_OUTBOX_MAX_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? NOTIFICATION_OUTBOX_RETRY_DELAY_MS;
    this.clock = options.clock ?? systemNotificationClock;
    this.operationOptions = options.operationOptions ?? {};
  }

  start(): void {
    if (this.timer || this.stopped) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
    void this.tick();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const deadline = Date.now() + 5_000;
    while (this.running && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async tick(): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    try {
      const now = this.clock.now();
      const leaseToken = randomUUID();
      const claimed = await this.persistence.withContext((ctx) =>
        claimOutboxBatch(ctx, {
          now,
          leaseToken,
          leaseExpiresAt: new Date(now.getTime() + this.leaseMs),
          limit: this.batchLimit,
        }),
      );
      for (const event of claimed.events) {
        if (this.stopped) break;
        await this.processClaimed(event, leaseToken);
      }
    } catch {
      // The processor must never crash its host service. The next tick retries,
      // and an unreleased lease expires and becomes reclaimable.
    } finally {
      this.running = false;
    }
  }

  private async processClaimed(
    event: ClaimedOutboxEvent,
    leaseToken: string,
  ): Promise<void> {
    const now = this.clock.now();

    // Events this processor does not own are published untouched rather than
    // dead-lettered: another consumer may legitimately own them.
    if (!isNotificationOutboxEventType(event.eventType)) {
      await this.persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId: event.id, leaseToken, publishedAt: now }),
      );
      return;
    }

    const payload = parseNotificationOutboxPayload(event.payload);
    if (!payload) {
      await this.persistence.withContext((ctx) =>
        markOutboxDeadLetter(ctx, {
          eventId: event.id,
          leaseToken,
          errorCode: "NOTIFICATION_PAYLOAD_INVALID",
          updatedAt: now,
        }),
      );
      return;
    }

    try {
      const request = await createNotificationRequestFromDomainEvent(
        this.persistence,
        payload,
        this.operationOptions,
      );
      // A null request means the intent is past its max age — nothing to send,
      // and nothing to retry.
      if (request) {
        await processPendingNotification(
          this.persistence,
          request.id,
          this.operationOptions,
        );
      }
      await this.persistence.withContext((ctx) =>
        markOutboxPublished(ctx, { eventId: event.id, leaseToken, publishedAt: now }),
      );
    } catch {
      if (event.attemptCount >= this.maxAttempts) {
        await this.persistence.withContext((ctx) =>
          markOutboxDeadLetter(ctx, {
            eventId: event.id,
            leaseToken,
            errorCode: "NOTIFICATION_PROCESSING_FAILED",
            updatedAt: now,
          }),
        );
        return;
      }
      await this.persistence.withContext((ctx) =>
        releaseOutboxForRetry(ctx, {
          eventId: event.id,
          leaseToken,
          nextAvailableAt: new Date(now.getTime() + this.retryDelayMs),
          errorCode: "NOTIFICATION_PROCESSING_FAILED",
          updatedAt: now,
        }),
      );
    }
  }
}
