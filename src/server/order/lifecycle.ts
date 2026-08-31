/**
 * Order lifecycle commands (IMP-023).
 *
 * acceptOrder / fulfilOrder / cancelOrder — revision-gated, provenance write-once.
 */

import {
  OrderError,
  parseAcceptOrderDomainInput,
  parseCancelOrderDomainInput,
  parseFulfilOrderDomainInput,
  type OrderMutationResult,
  type OrderPolicy,
} from "../../shared/order";
import { enqueueOrderLifecycleNotification } from "../notifications/enqueue";
import type { Persistence } from "../persistence/types";
import { loadSnapshotRowForOrder } from "./adapters/checkout";
import {
  authorizeOrderOutletAccess,
  requireOrderWorkforceActor,
} from "./authorize";
import { systemOrderClock, type OrderClock } from "./clock";
import { toOrderMutationResult } from "./projections";
import {
  findOrderById,
  lockOrderForUpdate,
  mapOrderRow,
  updateOrderLifecycle,
} from "./repository";
import { tryIssueTaxInvoiceAfterOrderFulfilled } from "./tax-invoice-hook";

export type OrderLifecycleOptions = Readonly<{
  clock?: OrderClock;
  policy?: OrderPolicy;
}>;

async function loadOutletIdForOrder(
  persistence: Persistence,
  orderCheckoutSnapshotId: string,
): Promise<string> {
  const snapshot = await persistence.withContext((ctx) =>
    loadSnapshotRowForOrder(ctx, orderCheckoutSnapshotId),
  );
  if (!snapshot) {
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }
  return snapshot.selectedOutletId;
}

export async function acceptOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: OrderLifecycleOptions = {},
): Promise<OrderMutationResult> {
  const workforce = requireOrderWorkforceActor(actor);
  const parsed = parseAcceptOrderDomainInput(input);
  const clock = options.clock ?? systemOrderClock;
  const now = clock.now();

  const probe = await persistence.withContext((ctx) =>
    findOrderById(ctx, parsed.orderId),
  );
  // Capability-first using probe outlet when present; if missing still check capability
  // against a synthetic path — load outlet only when order exists.
  if (!probe) {
    await persistence.withContext(async (ctx) => {
      const { requireOrderCapability } = await import("./authorize");
      await requireOrderCapability(ctx, workforce, "order.accept");
    });
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }

  const outletId = await loadOutletIdForOrder(
    persistence,
    probe.checkoutSnapshotId,
  );

  await persistence.withContext((ctx) =>
    authorizeOrderOutletAccess(ctx, workforce, outletId, "order.accept"),
  );

  return persistence.transaction(async (tx) => {
    const row = await lockOrderForUpdate(tx, parsed.orderId);
    if (!row) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    if (row.revision !== parsed.expectedOrderRevision) {
      throw new OrderError(
        "ORDER_CONFLICT",
        "Order revision does not match expectedOrderRevision.",
        { field: "expectedOrderRevision" },
      );
    }
    if (row.status === "ACCEPTED") {
      return toOrderMutationResult(mapOrderRow(row));
    }
    if (row.status !== "PLACED") {
      throw new OrderError(
        "ORDER_ACCEPT_NOT_ALLOWED",
        "Order cannot be accepted from its current status.",
      );
    }

    const updated = await updateOrderLifecycle(tx, row.id, {
      status: "ACCEPTED",
      revision: row.revision + BigInt(1),
      updatedAt: now,
      acceptedAt: now,
      acceptedByWorkforceUserId: workforce.workforceUserId,
    });
    // IMP-033: notification intent commits with the acceptance it describes.
    await enqueueOrderLifecycleNotification(tx, {
      orderId: updated.id,
      semanticType: "ORDER_ACCEPTED",
      revision: updated.revision,
      occurredAt: now,
    });
    return toOrderMutationResult(mapOrderRow(updated));
  });
}

export async function fulfilOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: OrderLifecycleOptions = {},
): Promise<OrderMutationResult> {
  const workforce = requireOrderWorkforceActor(actor);
  const parsed = parseFulfilOrderDomainInput(input);
  const clock = options.clock ?? systemOrderClock;
  const now = clock.now();

  const probe = await persistence.withContext((ctx) =>
    findOrderById(ctx, parsed.orderId),
  );
  if (!probe) {
    await persistence.withContext(async (ctx) => {
      const { requireOrderCapability } = await import("./authorize");
      await requireOrderCapability(ctx, workforce, "order.fulfil");
    });
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }

  const outletId = await loadOutletIdForOrder(
    persistence,
    probe.checkoutSnapshotId,
  );
  await persistence.withContext((ctx) =>
    authorizeOrderOutletAccess(ctx, workforce, outletId, "order.fulfil"),
  );

  // Durable Order FULFILLED authority commits first. Tax Invoice orchestration
  // runs only after commit so FD failure cannot undo fulfillment truth.
  const result = await persistence.transaction(async (tx) => {
    const row = await lockOrderForUpdate(tx, parsed.orderId);
    if (!row) {
      throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
    }
    if (row.revision !== parsed.expectedOrderRevision) {
      throw new OrderError(
        "ORDER_CONFLICT",
        "Order revision does not match expectedOrderRevision.",
        { field: "expectedOrderRevision" },
      );
    }
    if (row.status === "FULFILLED") {
      return toOrderMutationResult(mapOrderRow(row));
    }
    if (row.status !== "ACCEPTED") {
      throw new OrderError(
        "ORDER_FULFIL_NOT_ALLOWED",
        "Order cannot be fulfilled from its current status.",
      );
    }

    const updated = await updateOrderLifecycle(tx, row.id, {
      status: "FULFILLED",
      revision: row.revision + BigInt(1),
      updatedAt: now,
      fulfilledAt: now,
      fulfilledByWorkforceUserId: workforce.workforceUserId,
    });
    return toOrderMutationResult(mapOrderRow(updated));
  });

  if (result.status === "FULFILLED") {
    await tryIssueTaxInvoiceAfterOrderFulfilled(persistence, result.orderId);
  }

  return result;
}

export async function cancelOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: OrderLifecycleOptions = {},
): Promise<OrderMutationResult> {
  const workforce = requireOrderWorkforceActor(actor);
  const parsed = parseCancelOrderDomainInput(input);
  const clock = options.clock ?? systemOrderClock;
  const now = clock.now();

  const probe = await persistence.withContext((ctx) =>
    findOrderById(ctx, parsed.orderId),
  );
  if (!probe) {
    await persistence.withContext(async (ctx) => {
      const { requireOrderCapability } = await import("./authorize");
      await requireOrderCapability(ctx, workforce, "order.cancel");
    });
    throw new OrderError("ORDER_NOT_FOUND", "Order not found.");
  }

  const outletId = await loadOutletIdForOrder(
    persistence,
    probe.checkoutSnapshotId,
  );
  await persistence.withContext((ctx) =>
    authorizeOrderOutletAccess(ctx, workforce, outletId, "order.cancel"),
  );

  return persistence.transaction(async (tx) => {
    const row = await lockOrderForUpdate(tx, parsed.orderId);
    if (!row) {
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
      if (row.cancellationReasonCode === parsed.cancellationReasonCode) {
        return toOrderMutationResult(mapOrderRow(row));
      }
      throw new OrderError(
        "ORDER_CANCEL_NOT_ALLOWED",
        "Order is already cancelled with a different reason.",
      );
    }
    if (row.status !== "PLACED" && row.status !== "ACCEPTED") {
      throw new OrderError(
        "ORDER_CANCEL_NOT_ALLOWED",
        "Order cannot be cancelled from its current status.",
      );
    }

    const updated = await updateOrderLifecycle(tx, row.id, {
      status: "CANCELLED",
      revision: row.revision + BigInt(1),
      updatedAt: now,
      cancelledAt: now,
      cancelledByWorkforceUserId: workforce.workforceUserId,
      cancellationReasonCode: parsed.cancellationReasonCode,
      // Preserve acceptance provenance when cancelling after ACCEPTED.
    });
    // IMP-033: notification intent commits with the cancellation it describes.
    await enqueueOrderLifecycleNotification(tx, {
      orderId: updated.id,
      semanticType: "ORDER_CANCELLED",
      revision: updated.revision,
      occurredAt: now,
    });
    return toOrderMutationResult(mapOrderRow(updated));
  });
}
