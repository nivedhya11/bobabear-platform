/**
 * In-process Razorpay webhook inbox processor (IMP-026A / D-363).
 *
 * Runs inside existing customer-commerce. No new deployable worker.
 */
import { randomUUID } from "node:crypto";

import type { Persistence } from "../../persistence/types";
import { applyRefundProviderEvidence } from "../../refund/operations";
import { processVerifiedProviderEvent } from "../operations";
import { sealVerifiedProviderEvent } from "../verified-event";
import { deserializeInboxEvidence, isRefundInboxEvidence } from "./evidence";
import {
  PAYMENT_INBOX_DEFAULT_BATCH_LIMIT,
  PAYMENT_INBOX_DEFAULT_LEASE_MS,
  PAYMENT_INBOX_MAX_ATTEMPTS,
  PAYMENT_INBOX_RETRY_DELAY_MS,
  claimInboxBatch,
  markInboxPoison,
  markInboxProcessed,
  releaseInboxForRetry,
  type ClaimedInboxEvent,
} from "./repository";

export const PAYMENT_INBOX_POLL_INTERVAL_MS = 1_000;

export type PaymentInboxProcessorOptions = Readonly<{
  persistence: Persistence;
  pollIntervalMs?: number;
  batchLimit?: number;
  leaseMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  now?: () => Date;
}>;

function isIgnoredEvidence(event: ClaimedInboxEvent): boolean {
  try {
    const evidence = deserializeInboxEvidence(event.evidenceJson);
    if (isRefundInboxEvidence(evidence)) {
      return evidence.outcome === "UNSUPPORTED";
    }
    return (
      evidence.outcome === "UNSUPPORTED" ||
      evidence.providerStatusCode === "EVENT_IGNORED"
    );
  } catch {
    return false;
  }
}

export class PaymentInboxProcessor {
  private readonly persistence: Persistence;
  private readonly pollIntervalMs: number;
  private readonly batchLimit: number;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly now: () => Date;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private running = false;

  constructor(options: PaymentInboxProcessorOptions) {
    this.persistence = options.persistence;
    this.pollIntervalMs = options.pollIntervalMs ?? PAYMENT_INBOX_POLL_INTERVAL_MS;
    this.batchLimit = options.batchLimit ?? PAYMENT_INBOX_DEFAULT_BATCH_LIMIT;
    this.leaseMs = options.leaseMs ?? PAYMENT_INBOX_DEFAULT_LEASE_MS;
    this.maxAttempts = options.maxAttempts ?? PAYMENT_INBOX_MAX_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? PAYMENT_INBOX_RETRY_DELAY_MS;
    this.now = options.now ?? (() => new Date());
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
      const now = this.now();
      const leaseToken = randomUUID();
      const claimed = await this.persistence.withContext((ctx) =>
        claimInboxBatch(ctx, {
          now,
          leaseToken,
          leaseExpiresAt: new Date(now.getTime() + this.leaseMs),
          limit: this.batchLimit,
        }),
      );
      for (const event of claimed) {
        if (this.stopped) break;
        await this.processClaimed(event, leaseToken);
      }
    } catch {
      // Processor must not crash customer-commerce. Next tick retries.
    } finally {
      this.running = false;
    }
  }

  private async processClaimed(event: ClaimedInboxEvent, leaseToken: string): Promise<void> {
    const now = this.now();
    try {
      if (isIgnoredEvidence(event)) {
        await this.persistence.withContext((ctx) =>
          markInboxProcessed(ctx, { id: event.id, claimToken: leaseToken, now }),
        );
        return;
      }

      const evidence = deserializeInboxEvidence(event.evidenceJson);
      if (isRefundInboxEvidence(evidence)) {
        const applied = await applyRefundProviderEvidence(this.persistence, evidence, {
          clock: { now: this.now },
        });
        if (!applied) {
          if (event.processingAttemptCount >= BigInt(this.maxAttempts)) {
            await this.persistence.withContext((ctx) =>
              markInboxPoison(ctx, {
                id: event.id,
                claimToken: leaseToken,
                now,
                errorCode: "UNKNOWN_CORRELATION",
                errorMessage: "Verified refund event could not be correlated to a Refund.",
              }),
            );
            return;
          }
          await this.persistence.withContext((ctx) =>
            releaseInboxForRetry(ctx, {
              id: event.id,
              claimToken: leaseToken,
              now,
              availableAt: new Date(now.getTime() + this.retryDelayMs),
              errorCode: "UNKNOWN_CORRELATION",
              errorMessage: "Verified refund event could not be correlated to a Refund.",
            }),
          );
          return;
        }
        await this.persistence.withContext((ctx) =>
          markInboxProcessed(ctx, { id: event.id, claimToken: leaseToken, now }),
        );
        return;
      }

      const sealed = sealVerifiedProviderEvent({
        provider: event.provider,
        rawBody: new Uint8Array(),
        headers: Object.freeze({}),
        evidence: {
          ...evidence,
          providerEventId: event.providerEventId,
        },
      });
      const applied = await processVerifiedProviderEvent(this.persistence, sealed, {
        clock: { now: this.now },
      });
      if (!applied) {
        if (event.processingAttemptCount >= BigInt(this.maxAttempts)) {
          await this.persistence.withContext((ctx) =>
            markInboxPoison(ctx, {
              id: event.id,
              claimToken: leaseToken,
              now,
              errorCode: "UNKNOWN_CORRELATION",
              errorMessage: "Verified provider event could not be correlated to a Payment attempt.",
            }),
          );
          return;
        }
        await this.persistence.withContext((ctx) =>
          releaseInboxForRetry(ctx, {
            id: event.id,
            claimToken: leaseToken,
            now,
            availableAt: new Date(now.getTime() + this.retryDelayMs),
            errorCode: "UNKNOWN_CORRELATION",
            errorMessage: "Verified provider event could not be correlated to a Payment attempt.",
          }),
        );
        return;
      }

      await this.persistence.withContext((ctx) =>
        markInboxProcessed(ctx, { id: event.id, claimToken: leaseToken, now }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inbox processing failed.";
      if (event.processingAttemptCount >= BigInt(this.maxAttempts)) {
        await this.persistence.withContext((ctx) =>
          markInboxPoison(ctx, {
            id: event.id,
            claimToken: leaseToken,
            now,
            errorCode: "PROCESSING_FAILED",
            errorMessage: message,
          }),
        );
        return;
      }
      await this.persistence.withContext((ctx) =>
        releaseInboxForRetry(ctx, {
          id: event.id,
          claimToken: leaseToken,
          now,
          availableAt: new Date(now.getTime() + this.retryDelayMs),
          errorCode: "PROCESSING_FAILED",
          errorMessage: message,
        }),
      );
    }
  }
}
