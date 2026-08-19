/**
 * In-process Refund reconciliation tick (IMP-027).
 *
 * Runs inside existing customer-commerce. No new deployable worker.
 */
import type { Persistence } from "../persistence/types";
import type { PaymentProvider } from "../payment/provider";
import { reconcileNonTerminalRefundsBatch } from "./operations";
import { systemRefundClock, type RefundClock } from "./clock";

export const REFUND_RECONCILE_POLL_INTERVAL_MS = 5_000;

export class RefundReconciliationProcessor {
  private readonly persistence: Persistence;
  private readonly provider: PaymentProvider;
  private readonly pollIntervalMs: number;
  private readonly clock: RefundClock;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private running = false;

  constructor(options: {
    persistence: Persistence;
    provider: PaymentProvider;
    pollIntervalMs?: number;
    clock?: RefundClock;
  }) {
    this.persistence = options.persistence;
    this.provider = options.provider;
    this.pollIntervalMs = options.pollIntervalMs ?? REFUND_RECONCILE_POLL_INTERVAL_MS;
    this.clock = options.clock ?? systemRefundClock;
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
      await reconcileNonTerminalRefundsBatch(this.persistence, {
        provider: this.provider,
        clock: this.clock,
      });
    } catch {
      // Processor must not crash customer-commerce.
    } finally {
      this.running = false;
    }
  }
}
