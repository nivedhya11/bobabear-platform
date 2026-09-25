/**
 * Customer self-service cancellation for a purchased Scheduled Order (IMP-036I).
 *
 * Reuses the Order lifecycle transition, ORDER_CANCELLED notification, and
 * existing refund authority (this command does not create or reprice a Refund).
 * Eligibility uses the immutable Checkout Snapshot cutoff only.
 */
import {
  OrderError,
  parseCancelCustomerScheduledOrderDomainInput,
  type OrderMutationResult,
} from "../../shared/order";
import { evaluatePurchasedScheduledCancellation } from "../../shared/scheduled-fulfilment/cancellation";
import { CartError } from "../../shared/cart";
import { enqueueOrderLifecycleNotification } from "../notifications/enqueue";
import { requireCustomerActor } from "../cart/actor";
import type { Persistence } from "../persistence/types";
import {
  loadFullSnapshotForOrder,
  peekCheckoutForOrder,
} from "./adapters/checkout";
import { systemOrderClock, type OrderClock } from "./clock";
import { toOrderMutationResult } from "./projections";
import {
  findOrderById,
  lockOrderForUpdate,
  mapOrderRow,
  updateOrderLifecycle,
} from "./repository";

const CUTOFF_RECOVERY = Object.freeze(["CONTACT_OUTLET_OR_SUPPORT"] as const);

export type CustomerCancellationOptions = Readonly<{
  clock?: OrderClock;
}>;

function mapCustomerAuthError(error: unknown): never {
  if (error instanceof CartError && error.code === "CUSTOMER_AUTH_REQUIRED") {
    throw new OrderError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer authentication is required.",
    );
  }
  throw error;
}

function denyCutoff(): never {
  throw new OrderError(
    "ORDER_CANCEL_CUTOFF_CLOSED",
    "Self-service cancellation is closed. Contact the outlet or support.",
    { resolutionOptions: CUTOFF_RECOVERY },
  );
}

export async function cancelCustomerScheduledOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CustomerCancellationOptions = {},
): Promise<OrderMutationResult> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseCancelCustomerScheduledOrderDomainInput(input);
  const now = (options.clock ?? systemOrderClock).now();

  const probe = await persistence.withContext((ctx) =>
    findOrderById(ctx, parsed.orderId),
  );
  if (!probe) {
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }
  const checkout = await persistence.withContext((ctx) =>
    peekCheckoutForOrder(ctx, probe.checkoutId),
  );
  if (!checkout || checkout.customerAuthUserId !== customer.authUserId) {
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }

  return persistence.transaction(async (tx) => {
    const row = await lockOrderForUpdate(tx, parsed.orderId);
    if (!row) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    const owner = await peekCheckoutForOrder(tx, row.checkoutId);
    if (!owner || owner.customerAuthUserId !== customer.authUserId) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    if (row.revision !== parsed.expectedOrderRevision) {
      throw new OrderError(
        "ORDER_CONFLICT",
        "Order revision does not match expectedOrderRevision.",
        { field: "expectedOrderRevision" },
      );
    }
    if (row.status === "CANCELLED") {
      if (
        row.cancellationReasonCode === "CUSTOMER_REQUESTED" &&
        row.cancelledByCustomerAuthUserId === customer.authUserId
      ) {
        return toOrderMutationResult(mapOrderRow(row));
      }
      throw new OrderError(
        "ORDER_CANCEL_NOT_ALLOWED",
        "Order is already cancelled.",
      );
    }
    if (row.status !== "PLACED" && row.status !== "ACCEPTED") {
      throw new OrderError(
        "ORDER_CANCEL_NOT_ALLOWED",
        "Order cannot be cancelled from its current status.",
      );
    }

    const snapshot = await loadFullSnapshotForOrder(tx, row.checkoutSnapshotId);
    if (!snapshot) denyCutoff();
    const decision = evaluatePurchasedScheduledCancellation({
      fulfilmentTiming: snapshot.fulfilmentTiming,
      windowStartAt: snapshot.scheduledWindowStartAt,
      cutoffMinutes: snapshot.scheduledCancellationCutoffMinutes,
      now,
    });
    if (decision.outcome !== "ALLOW") denyCutoff();

    const updated = await updateOrderLifecycle(tx, row.id, {
      status: "CANCELLED",
      revision: row.revision + BigInt(1),
      updatedAt: now,
      cancelledAt: now,
      cancelledByWorkforceUserId: null,
      cancelledByCustomerAuthUserId: customer.authUserId,
      cancellationReasonCode: "CUSTOMER_REQUESTED",
    });
    await enqueueOrderLifecycleNotification(tx, {
      orderId: updated.id,
      semanticType: "ORDER_CANCELLED",
      revision: updated.revision,
      occurredAt: now,
    });
    return toOrderMutationResult(mapOrderRow(updated));
  });
}
