/**
 * DELIVERED → Order fulfil coordination (IMP-032 §15).
 *
 * Delivery never directly mutates Order. Orchestration re-reads truth and
 * invokes existing fulfilOrder authority when eligible.
 */
import "server-only";

import {
  DeliveryError,
  parseConfirmDeliveryWithFulfilInput,
  parseRetryFulfilForDeliveredInput,
  type ConfirmDeliveryWithFulfilResult,
  type Delivery,
} from "../../shared/delivery";
import { OrderError } from "../../shared/order";
import type { Persistence } from "../persistence/types";
import { fulfilOrder } from "../order/lifecycle";
import { loadSnapshotRowForOrder } from "../order/adapters/checkout";
import { findOrderById } from "../order/repository";
import {
  authorizeDeliveryOutletAccess,
  requireDeliveryWorkforceActor,
  type DeliveryWorkforceActor,
} from "./authorize";
import {
  getOrderLifecycleSnapshot,
  recordProofAndDeliver,
  type DeliveryOperationOptions,
} from "./operations";
import { findDeliveryById, mapDeliveryRow } from "./repository";

async function loadOutletIdForDeliveryOrder(
  persistence: Persistence,
  orderId: string,
): Promise<string> {
  const order = await persistence.withContext((ctx) => findOrderById(ctx, orderId));
  if (!order) {
    throw new DeliveryError("DELIVERY_ORDER_NOT_ELIGIBLE", "Order not found.");
  }
  const snapshot = await persistence.withContext((ctx) =>
    loadSnapshotRowForOrder(ctx, order.checkoutSnapshotId),
  );
  if (!snapshot) {
    throw new DeliveryError("DELIVERY_ORDER_NOT_ELIGIBLE", "Order not found.");
  }
  return snapshot.selectedOutletId;
}

async function tryFulfilEligibleOrder(
  persistence: Persistence,
  actor: DeliveryWorkforceActor,
  orderId: string,
  expectedOrderRevision: bigint,
): Promise<{ attempted: boolean; succeeded: boolean; orderStatus: string | null }> {
  const order = await getOrderLifecycleSnapshot(persistence, orderId);
  if (order.status !== "ACCEPTED") {
    return { attempted: false, succeeded: false, orderStatus: order.status };
  }
  if (order.revision !== expectedOrderRevision) {
    throw new DeliveryError(
      "DELIVERY_STATE_CONFLICT",
      "Order revision does not match expectedOrderRevision for fulfil coordination.",
      { field: "expectedOrderRevision" },
    );
  }
  try {
    const result = await fulfilOrder(persistence, actor, {
      orderId,
      expectedOrderRevision,
    });
    return {
      attempted: true,
      succeeded: result.status === "FULFILLED",
      orderStatus: result.status,
    };
  } catch (error) {
    if (error instanceof OrderError && error.code === "ORDER_FULFIL_NOT_ALLOWED") {
      return { attempted: true, succeeded: false, orderStatus: order.status };
    }
    throw error;
  }
}

export async function confirmDeliveryWithFulfilCoordination(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<ConfirmDeliveryWithFulfilResult> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = parseConfirmDeliveryWithFulfilInput(input);

  const probe = await persistence.withContext(async (ctx) => {
    const row = await findDeliveryById(ctx, parsed.deliveryId);
    if (!row) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    return row;
  });

  const outletId = await loadOutletIdForDeliveryOrder(persistence, probe.orderId);
  await persistence.withContext((ctx) =>
    authorizeDeliveryOutletAccess(ctx, workforce, outletId, "delivery.complete"),
  );

  const delivery = await recordProofAndDeliver(persistence, parsed, options);

  const orderBefore = await getOrderLifecycleSnapshot(persistence, probe.orderId);
  let fulfilAttempted = false;
  let fulfilSucceeded = false;
  let orderStatus: string | null = orderBefore.status;

  if (delivery.status === "DELIVERED" && orderBefore.status === "ACCEPTED") {
    const outcome = await tryFulfilEligibleOrder(
      persistence,
      workforce,
      probe.orderId,
      orderBefore.revision,
    );
    fulfilAttempted = outcome.attempted;
    fulfilSucceeded = outcome.succeeded;
    orderStatus = outcome.orderStatus;
  }

  return Object.freeze({
    delivery,
    fulfilAttempted,
    fulfilSucceeded,
    orderStatus,
  });
}

export async function retryFulfilForDeliveredDelivery(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<ConfirmDeliveryWithFulfilResult> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = parseRetryFulfilForDeliveredInput(input);

  const row = await persistence.withContext(async (ctx) => {
    const delivery = await findDeliveryById(ctx, parsed.deliveryId);
    if (!delivery) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    if (delivery.status !== "DELIVERED") {
      throw new DeliveryError(
        "DELIVERY_STATE_CONFLICT",
        "Fulfil retry requires DELIVERED Delivery.",
      );
    }
    return delivery;
  });

  const outletId = await loadOutletIdForDeliveryOrder(persistence, row.orderId);
  await persistence.withContext((ctx) =>
    authorizeDeliveryOutletAccess(ctx, workforce, outletId, "delivery.complete"),
  );

  const outcome = await tryFulfilEligibleOrder(
    persistence,
    workforce,
    row.orderId,
    parsed.expectedOrderRevision,
  );

  return Object.freeze({
    delivery: await persistence.withContext(async (ctx) => {
      const current = await findDeliveryById(ctx, parsed.deliveryId);
      if (!current) {
        throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
      }
      return mapDeliveryRow(current);
    }),
    fulfilAttempted: outcome.attempted,
    fulfilSucceeded: outcome.succeeded,
    orderStatus: outcome.orderStatus,
  });
}
