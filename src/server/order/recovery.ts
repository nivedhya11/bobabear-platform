/**
 * Missing-Order recovery (IMP-023).
 *
 * Discovers COMPLETED checkouts without Orders and materializes independently.
 * No giant multi-Order transaction. No cron/worker.
 */

import {
  OrderError,
  parseRecoverMissingOrdersBatchInput,
  requireOrderPolicy,
  type OrderPolicy,
  type OrderRecoveryBatchResult,
  type OrderRecoveryItemResult,
} from "../../shared/order";
import type { Persistence } from "../persistence/types";
import type { OrderClock } from "./clock";
import {
  materializeOrderForCompletedCheckout,
  type MaterializeOrderOptions,
} from "./materialize";
import { findCompletedCheckoutsMissingOrder } from "./repository";
import type { OrderNumberGenerator } from "./order-number";

export type RecoverMissingOrdersOptions = Readonly<{
  clock?: OrderClock;
  policy?: OrderPolicy;
  orderNumberGenerator?: OrderNumberGenerator;
}>;

export async function recoverMissingOrdersBatch(
  persistence: Persistence,
  input: unknown = {},
  options: RecoverMissingOrdersOptions = {},
): Promise<OrderRecoveryBatchResult> {
  const policy = requireOrderPolicy(options.policy);
  const parsed = parseRecoverMissingOrdersBatchInput(input);

  const candidates = await persistence.withContext((ctx) =>
    findCompletedCheckoutsMissingOrder(ctx, {
      limit: policy.recoveryBatchSize,
      ...(parsed.cursor ? { cursor: parsed.cursor } : {}),
    }),
  );

  const results: OrderRecoveryItemResult[] = [];
  for (const candidate of candidates) {
    try {
      const materializeOptions: MaterializeOrderOptions = {
        policy,
        ...(options.clock ? { clock: options.clock } : {}),
        ...(options.orderNumberGenerator
          ? { orderNumberGenerator: options.orderNumberGenerator }
          : {}),
      };
      const result = await materializeOrderForCompletedCheckout(
        persistence,
        candidate.checkoutId,
        materializeOptions,
      );
      results.push(
        Object.freeze({
          checkoutId: candidate.checkoutId,
          disposition:
            result.disposition === "CREATED"
              ? ("CREATED" as const)
              : ("ALREADY_EXISTS" as const),
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
        }),
      );
    } catch (error) {
      if (
        error instanceof OrderError &&
        error.code === "ORDER_MATERIALIZATION_ANOMALY"
      ) {
        results.push(
          Object.freeze({
            checkoutId: candidate.checkoutId,
            disposition: "ANOMALY" as const,
          }),
        );
      } else {
        results.push(
          Object.freeze({
            checkoutId: candidate.checkoutId,
            disposition: "RETRYABLE_FAILURE" as const,
          }),
        );
      }
    }
  }

  const last = candidates[candidates.length - 1];
  const nextCursor =
    candidates.length === policy.recoveryBatchSize && last
      ? Object.freeze({
          lastCheckoutUpdatedAt: last.updatedAt,
          lastCheckoutId: last.checkoutId,
        })
      : null;

  return Object.freeze({
    results: Object.freeze(results),
    nextCursor,
  });
}

export { findCompletedCheckoutsMissingOrder };
