/**
 * Order materialization from completed Checkout (IMP-023).
 *
 * Internal/system authority — no CustomerActor / WorkforceActor.
 * Idempotent on checkout_id uniqueness. Cart finalization only on create.
 */

import { sql } from "drizzle-orm";

import {
  OrderError,
  requireOrderPolicy,
  type OrderCartFinalizationDisposition,
  type OrderMaterializationResult,
  type OrderPolicy,
} from "../../shared/order";
import { enqueueOrderReceivedNotification } from "../notifications/enqueue";
import type { Persistence } from "../persistence/types";
import {
  finalizeCartForOrder,
  lockCartForOrder,
} from "./adapters/cart";
import {
  lockCheckoutForOrder,
  loadSnapshotRowForOrder,
  peekCheckoutForOrder,
} from "./adapters/checkout";
import {
  findSucceededPaymentForSnapshot,
  lockPaymentForOrder,
  paymentExistsForSnapshot,
} from "./adapters/payment";
import { isUniqueViolation } from "./assert-role";
import { systemOrderClock, type OrderClock } from "./clock";
import {
  cryptoOrderNumberGenerator,
  type OrderNumberGenerator,
} from "./order-number";
import {
  findOrderByCheckoutId,
  insertPlacedOrder,
  mapOrderRow,
  newOrderId,
} from "./repository";

export type MaterializeOrderOptions = Readonly<{
  clock?: OrderClock;
  policy?: OrderPolicy;
  orderNumberGenerator?: OrderNumberGenerator;
}>;

export async function materializeOrderForCompletedCheckout(
  persistence: Persistence,
  checkoutId: string,
  options: MaterializeOrderOptions = {},
): Promise<OrderMaterializationResult> {
  if (typeof checkoutId !== "string" || checkoutId.length === 0) {
    throw new OrderError(
      "ORDER_REQUEST_INVALID",
      "checkoutId must be a non-empty string.",
      { field: "checkoutId" },
    );
  }

  const policy = requireOrderPolicy(options.policy);
  const clock = options.clock ?? systemOrderClock;
  const generateNumber =
    options.orderNumberGenerator ?? cryptoOrderNumberGenerator;
  const now = clock.now();

  // Phase 1: peek cart id without long locks (Cart-then-Checkout lock order).
  const peek = await persistence.withContext((ctx) =>
    peekCheckoutForOrder(ctx, checkoutId),
  );
  if (!peek) {
    throw new OrderError(
      "ORDER_MATERIALIZATION_ANOMALY",
      "Checkout not found for materialization.",
    );
  }

  try {
    return await persistence.transaction(async (tx) => {
      if (peek.cartId) {
        await lockCartForOrder(tx, peek.cartId);
      }
      const checkout = await lockCheckoutForOrder(tx, checkoutId);
      if (!checkout) {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Checkout not found for materialization.",
        );
      }
      if (peek.cartId && checkout.cartId !== peek.cartId) {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Checkout cart identity changed during materialization.",
        );
      }

      const existing = await findOrderByCheckoutId(tx, checkoutId);
      if (existing) {
        return Object.freeze({
          disposition: "ALREADY_EXISTS" as const,
          order: mapOrderRow(existing),
          cartFinalization: null,
        });
      }

      if (checkout.status !== "COMPLETED") {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Checkout must be COMPLETED to materialize an Order.",
        );
      }
      if (!checkout.activeSnapshotId) {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Completed Checkout is missing activeSnapshotId.",
        );
      }

      const snapshot = await loadSnapshotRowForOrder(
        tx,
        checkout.activeSnapshotId,
      );
      if (!snapshot || snapshot.checkoutId !== checkout.checkoutId) {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Active snapshot does not belong to the Checkout.",
        );
      }

      let paymentProvenanceKind: "PAYMENT" | "NO_PAYMENT_REQUIRED";
      let paymentId: string | null = null;

      if (snapshot.grandTotalPaise < BigInt(0)) {
        throw new OrderError(
          "ORDER_MATERIALIZATION_ANOMALY",
          "Snapshot grand total cannot be negative.",
        );
      }

      if (snapshot.grandTotalPaise > BigInt(0)) {
        const payment = await findSucceededPaymentForSnapshot(
          tx,
          snapshot.snapshotId,
        );
        if (!payment) {
          throw new OrderError(
            "ORDER_MATERIALIZATION_ANOMALY",
            "Positive Checkout requires a Payment for the exact snapshot.",
          );
        }
        const lockedPayment = await lockPaymentForOrder(tx, payment.paymentId);
        if (
          !lockedPayment ||
          lockedPayment.checkoutSnapshotId !== snapshot.snapshotId ||
          lockedPayment.status !== "SUCCEEDED"
        ) {
          throw new OrderError(
            "ORDER_MATERIALIZATION_ANOMALY",
            "Payment must be SUCCEEDED for the exact snapshot.",
          );
        }
        paymentProvenanceKind = "PAYMENT";
        paymentId = lockedPayment.paymentId;
      } else {
        if (await paymentExistsForSnapshot(tx, snapshot.snapshotId)) {
          throw new OrderError(
            "ORDER_MATERIALIZATION_ANOMALY",
            "Zero-payable Checkout must not have a Payment.",
          );
        }
        paymentProvenanceKind = "NO_PAYMENT_REQUIRED";
        paymentId = null;
      }

      let orderNumber: string | null = null;
      let inserted = null;
      for (let attempt = 0; attempt < policy.orderNumberMaxAttempts; attempt++) {
        orderNumber = generateNumber();
        // PostgreSQL aborts the transaction after a unique violation unless the
        // INSERT is wrapped in a SAVEPOINT — required for order_number retries.
        const savepoint = `order_number_attempt_${attempt}`;
        await tx.db.execute(sql.raw(`savepoint ${savepoint}`));
        try {
          inserted = await insertPlacedOrder(tx, {
            id: newOrderId(),
            orderNumber,
            checkoutId: checkout.checkoutId,
            checkoutSnapshotId: snapshot.snapshotId,
            paymentProvenanceKind,
            paymentId,
            now,
          });
          await tx.db.execute(sql.raw(`release savepoint ${savepoint}`));
          break;
        } catch (error) {
          await tx.db.execute(sql.raw(`rollback to savepoint ${savepoint}`));
          if (isUniqueViolation(error)) {
            // checkout_id / snapshot / payment uniqueness → treat as race win
            const raced = await findOrderByCheckoutId(tx, checkoutId);
            if (raced) {
              return Object.freeze({
                disposition: "ALREADY_EXISTS" as const,
                order: mapOrderRow(raced),
                cartFinalization: null,
              });
            }
            // order_number collision — retry
            continue;
          }
          throw error;
        }
      }

      if (!inserted) {
        throw new OrderError(
          "ORDER_NUMBER_COLLISION_EXHAUSTED",
          "Unable to allocate a unique Order number.",
        );
      }

      // Notification intent commits atomically with the Order it describes
      // (IMP-033). Never a notification without a placed Order, never a placed
      // Order without its queued notification.
      await enqueueOrderReceivedNotification(tx, {
        customerId: checkout.customerAuthUserId,
        orderId: inserted.id,
        occurredAt: now,
      });

      let cartFinalization: OrderCartFinalizationDisposition =
        "PRESERVED_UNAVAILABLE";
      if (checkout.cartId) {
        try {
          cartFinalization = await finalizeCartForOrder(tx, {
            cartId: checkout.cartId,
            expectedSourceCartRevision: snapshot.sourceCartRevision,
            now,
          });
        } catch {
          cartFinalization = "PRESERVED_UNAVAILABLE";
        }
      }

      return Object.freeze({
        disposition: "CREATED" as const,
        order: mapOrderRow(inserted),
        cartFinalization,
      });
    });
  } catch (error) {
    if (error instanceof OrderError) throw error;
    // Unique race after commit visibility
    const raced = await persistence.withContext((ctx) =>
      findOrderByCheckoutId(ctx, checkoutId),
    );
    if (raced) {
      return Object.freeze({
        disposition: "ALREADY_EXISTS" as const,
        order: mapOrderRow(raced),
        cartFinalization: null,
      });
    }
    throw error;
  }
}
