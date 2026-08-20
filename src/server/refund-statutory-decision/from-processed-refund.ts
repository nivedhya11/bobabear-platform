/**
 * Persistence-level PROCESSED Refund → PENDING RefundStatutoryDecision
 * (IMP-028 / D-366).
 *
 * Invoked after the Refund commercial commit. Never rewrites Refund / Payment /
 * Order truth and never infers RFV/CN/NSD. Missing-PENDING catch-up reuses the
 * D-362 operator recovery model (scan + idempotent retry, no scheduler).
 */
import {
  RefundStatutoryDecisionError,
  type RefundStatutoryDecision,
} from "../../shared/refund-statutory-decision";
import type { Persistence } from "../persistence/types";
import {
  ensureRefundStatutoryDecisionPending,
  findProcessedRefundIdsMissingStatutoryDecision,
  loadRefundStatutoryDecisionByRefundId,
} from "./repository";

export async function ensurePendingForProcessedRefund(
  persistence: Persistence,
  refundId: string,
  now: Date = new Date(),
): Promise<RefundStatutoryDecision> {
  return persistence.transaction((tx) =>
    ensureRefundStatutoryDecisionPending(tx, { refundId, now }),
  );
}

export type RefundStatutoryDecisionRecoveryItemResult = Readonly<{
  refundId: string;
  disposition: "ENSURED" | "ALREADY_EXISTS" | "SKIPPED" | "RETRYABLE_FAILURE";
  reason?: string;
  decisionId?: string;
}>;

export type RefundStatutoryDecisionRecoveryBatchResult = Readonly<{
  results: readonly RefundStatutoryDecisionRecoveryItemResult[];
  nextCursor: string | null;
}>;

export type RecoverMissingRefundStatutoryDecisionsOptions = Readonly<{
  limit?: number;
  afterRefundId?: string;
}>;

function classifyFailure(error: unknown): {
  disposition: "SKIPPED" | "RETRYABLE_FAILURE";
  reason: string;
} {
  if (error instanceof RefundStatutoryDecisionError) {
    if (
      error.code === "REFUND_NOT_PROCESSED" ||
      error.code === "REFUND_NOT_FOUND"
    ) {
      return { disposition: "SKIPPED", reason: error.code };
    }
    return { disposition: "RETRYABLE_FAILURE", reason: error.code };
  }
  return { disposition: "RETRYABLE_FAILURE", reason: "UNKNOWN" };
}

export async function recoverMissingRefundStatutoryDecisionsBatch(
  persistence: Persistence,
  options: RecoverMissingRefundStatutoryDecisionsOptions = {},
): Promise<RefundStatutoryDecisionRecoveryBatchResult> {
  const limit = options.limit ?? 25;
  const candidates = await persistence.withContext((ctx) =>
    findProcessedRefundIdsMissingStatutoryDecision(ctx, {
      limit,
      ...(options.afterRefundId
        ? { afterRefundId: options.afterRefundId }
        : {}),
    }),
  );

  const results: RefundStatutoryDecisionRecoveryItemResult[] = [];
  const now = new Date();
  for (const refundId of candidates) {
    try {
      const existing = await persistence.withContext((ctx) =>
        loadRefundStatutoryDecisionByRefundId(ctx, refundId),
      );
      if (existing) {
        results.push(
          Object.freeze({
            refundId,
            disposition: "ALREADY_EXISTS",
            decisionId: existing.id,
          }),
        );
        continue;
      }
      const decision = await ensurePendingForProcessedRefund(
        persistence,
        refundId,
        now,
      );
      results.push(
        Object.freeze({
          refundId,
          disposition: "ENSURED",
          decisionId: decision.id,
        }),
      );
    } catch (error) {
      const classified = classifyFailure(error);
      results.push(
        Object.freeze({
          refundId,
          disposition: classified.disposition,
          reason: classified.reason,
        }),
      );
    }
  }

  const last = candidates[candidates.length - 1];
  const nextCursor = candidates.length === limit && last ? last : null;

  return Object.freeze({
    results: Object.freeze(results),
    nextCursor,
  });
}
