/**
 * Workforce Delivery orchestration (IMP-032).
 *
 * Trusted session + permission + server-derived outlet scope only.
 */
import "server-only";

import type { PermissionKey } from "../../shared/access-control";
import {
  DeliveryError,
  parseArrangeDeliveryInput,
  type Delivery,
  type WorkforceDeliveryDetail,
} from "../../shared/delivery";
import { loadSnapshotRowForOrder } from "../order/adapters/checkout";
import { findOrderById } from "../order/repository";
import type { Persistence } from "../persistence/types";
import {
  authorizeDeliveryOutletAccess,
  requireDeliveryCapability,
  requireDeliveryWorkforceActor,
  type DeliveryWorkforceActor,
} from "./authorize";
import { confirmDeliveryWithFulfilCoordination } from "./fulfil-coordination";
import {
  advanceReturn,
  beginManualBooking,
  beginReturn,
  cancelDelivery,
  confirmManualBooking,
  confirmPickup,
  createDelivery,
  failDelivery,
  recordAssignment,
  recordProviderCostFact,
  resolveManualBookingCancellation,
  resolveManualBookingFailure,
  updateTrackingReference,
  type DeliveryOperationOptions,
} from "./operations";
import { disabledDeliveryProvider } from "./provider";
import {
  findActiveAssignmentForDelivery,
  findActiveDeliveryForOrder,
  findActiveReturnForDelivery,
  findDeliveryById,
  findTrackingUrlForDelivery,
  listProviderCosts,
  mapAssignmentRow,
  mapDeliveryRow,
  mapProviderCostRow,
  mapReturnRow,
} from "./repository";

async function resolveOutletIdForOrder(
  persistence: Persistence,
  orderId: string,
): Promise<string> {
  const order = await persistence.withContext((ctx) => findOrderById(ctx, orderId));
  if (!order) {
    throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
  }
  const snapshot = await persistence.withContext((ctx) =>
    loadSnapshotRowForOrder(ctx, order.checkoutSnapshotId),
  );
  if (!snapshot) {
    throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
  }
  return snapshot.selectedOutletId;
}

async function authorizeForOrder(
  persistence: Persistence,
  actor: DeliveryWorkforceActor,
  orderId: string,
  permission: PermissionKey,
): Promise<string> {
  const outletId = await resolveOutletIdForOrder(persistence, orderId);
  await persistence.withContext((ctx) =>
    authorizeDeliveryOutletAccess(ctx, actor, outletId, permission),
  );
  return outletId;
}

async function authorizeForDelivery(
  persistence: Persistence,
  actor: DeliveryWorkforceActor,
  deliveryId: string,
  permission: PermissionKey,
): Promise<{ delivery: Delivery; outletId: string }> {
  const row = await persistence.withContext(async (ctx) => {
    const found = await findDeliveryById(ctx, deliveryId);
    if (!found) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    return found;
  });
  const outletId = await authorizeForOrder(
    persistence,
    actor,
    row.orderId,
    permission,
  );
  return { delivery: mapDeliveryRow(row), outletId };
}

function computePermittedCommands(
  delivery: Delivery,
  grants: readonly PermissionKey[],
): readonly string[] {
  const has = (p: PermissionKey) => grants.includes(p);
  const commands: string[] = [];
  const status = delivery.status;

  if (status === "REQUESTED") {
    if (has("delivery.book")) commands.push("BEGIN_MANUAL_BOOKING");
    if (has("delivery.cancel")) commands.push("CANCEL_DELIVERY");
  } else if (status === "BOOKING_OUTCOME_UNKNOWN") {
    if (has("delivery.book")) {
      commands.push("CONFIRM_MANUAL_BOOKING");
      commands.push("RESOLVE_MANUAL_BOOKING_FAILURE");
      commands.push("RESOLVE_MANUAL_BOOKING_CANCELLATION");
    }
  } else if (status === "BOOKED") {
    if (has("delivery.assign")) commands.push("RECORD_ASSIGNMENT");
    if (has("delivery.pickup")) commands.push("CONFIRM_PICKUP");
    if (has("delivery.cancel")) commands.push("RESOLVE_MANUAL_BOOKING_CANCELLATION");
    if (has("delivery.book")) commands.push("UPDATE_TRACKING_REFERENCE");
    if (has("delivery.cost.record")) commands.push("RECORD_PROVIDER_COST");
  } else if (status === "PICKED_UP") {
    if (has("delivery.complete")) commands.push("CONFIRM_DELIVERY");
    if (has("delivery.fail")) commands.push("REPORT_DELIVERY_FAILURE");
    if (has("delivery.cost.record")) commands.push("RECORD_PROVIDER_COST");
  } else if (status === "DELIVERED") {
    if (has("delivery.complete")) commands.push("RETRY_FULFIL");
    if (has("delivery.cost.record")) commands.push("RECORD_PROVIDER_COST");
  } else if (status === "FAILED") {
    if (has("delivery.return")) commands.push("BEGIN_RETURN");
    if (has("delivery.cost.record")) commands.push("RECORD_PROVIDER_COST");
  }

  if (status === "REQUESTED" && has("delivery.dispatch")) {
    commands.unshift("ARRANGE_DELIVERY");
  }

  return Object.freeze(commands);
}

export async function getWorkforceDeliveryForOrder(
  persistence: Persistence,
  actor: unknown,
  orderId: string,
): Promise<WorkforceDeliveryDetail | null> {
  const workforce = requireDeliveryWorkforceActor(actor);
  await authorizeForOrder(persistence, workforce, orderId, "delivery.read");

  return persistence.withContext(async (ctx) => {
    const row = await findActiveDeliveryForOrder(ctx, orderId);
    if (!row) return null;
    const delivery = mapDeliveryRow(row);
    const assignmentRow = await findActiveAssignmentForDelivery(ctx, delivery.id);
    const trackingUrl = await findTrackingUrlForDelivery(ctx, delivery.id);
    const costs = (await listProviderCosts(ctx, delivery.id)).map(mapProviderCostRow);
    const returnRow = await findActiveReturnForDelivery(ctx, delivery.id);
    const { getEffectivePermissions } = await import("../access-control/authorize");
    const grants = await getEffectivePermissions(ctx, { actor: workforce });
    return Object.freeze({
      delivery: Object.freeze({
        ...delivery,
        revision: delivery.revision,
      }),
      activeAssignment: assignmentRow ? mapAssignmentRow(assignmentRow) : null,
      trackingUrl,
      providerCosts: Object.freeze(costs),
      activeReturn: returnRow ? mapReturnRow(returnRow) : null,
      permittedCommands: computePermittedCommands(delivery, grants),
    });
  });
}

export function toWorkforceDeliveryTransport(
  detail: WorkforceDeliveryDetail,
): Record<string, unknown> {
  return {
    delivery: {
      ...detail.delivery,
      revision: detail.delivery.revision.toString(),
    },
    activeAssignment: detail.activeAssignment,
    trackingUrl: detail.trackingUrl,
    providerCosts: detail.providerCosts.map((c) => ({
      ...c,
      amountPaise: c.amountPaise.toString(),
    })),
    activeReturn: detail.activeReturn,
    permittedCommands: detail.permittedCommands,
  };
}

export async function arrangeDelivery(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = parseArrangeDeliveryInput(input);
  await authorizeForOrder(persistence, workforce, parsed.orderId, "delivery.dispatch");
  return createDelivery(persistence, parsed, options);
}

export async function workforceBeginManualBooking(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.book");
  return beginManualBooking(persistence, input, options);
}

export async function workforceConfirmManualBooking(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.book");
  return confirmManualBooking(persistence, input, options);
}

export async function workforceResolveManualBookingFailure(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.book");
  return resolveManualBookingFailure(persistence, input, options);
}

export async function workforceResolveManualBookingCancellation(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.cancel");
  return resolveManualBookingCancellation(persistence, input, options);
}

export async function workforceUpdateTrackingReference(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.book");
  return updateTrackingReference(persistence, input, options);
}

export async function workforceRecordAssignment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<{ delivery: Delivery; assignmentKey: string }> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.assign");
  return recordAssignment(persistence, input, options);
}

export async function workforceConfirmPickup(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.pickup");
  return confirmPickup(persistence, input, options);
}

export async function workforceConfirmDelivery(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
) {
  return confirmDeliveryWithFulfilCoordination(persistence, actor, input, options);
}

export async function workforceReportDeliveryFailure(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.fail");
  return failDelivery(persistence, input, options);
}

export async function workforceCancelDelivery(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
): Promise<Delivery> {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  const { delivery } = await authorizeForDelivery(
    persistence,
    workforce,
    deliveryId,
    "delivery.cancel",
  );
  if (delivery.status === "REQUESTED") {
    return cancelDelivery(persistence, input, {
      ...options,
      provider: disabledDeliveryProvider,
    });
  }
  const body = typeof input === "object" && input !== null
    ? (input as Record<string, unknown>)
    : {};
  return resolveManualBookingCancellation(persistence, {
    ...body,
    inactiveBookingConfirmed: true,
  }, options);
}

export async function workforceBeginReturn(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
) {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.return");
  return beginReturn(persistence, input, options);
}

export async function workforceAdvanceReturn(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
) {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const returnId = parsed.returnId;
  if (typeof returnId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "returnId is required.");
  }
  const row = await persistence.withContext(async (ctx) => {
    const { findReturnById } = await import("./repository");
    const found = await findReturnById(ctx, returnId);
    if (!found) {
      throw new DeliveryError("DELIVERY_RETURN_NOT_FOUND", "Delivery return not found.");
    }
    return found;
  });
  const deliveryRow = await persistence.withContext(async (ctx) => {
    const found = await findDeliveryById(ctx, row.deliveryId);
    if (!found) {
      throw new DeliveryError("DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    return found;
  });
  await authorizeForOrder(persistence, workforce, deliveryRow.orderId, "delivery.return");
  return advanceReturn(persistence, input, options);
}

export async function workforceRecordProviderCost(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: DeliveryOperationOptions = {},
) {
  const workforce = requireDeliveryWorkforceActor(actor);
  const parsed = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const deliveryId = parsed.deliveryId;
  if (typeof deliveryId !== "string") {
    throw new DeliveryError("DELIVERY_INVALID_INPUT", "deliveryId is required.");
  }
  await authorizeForDelivery(persistence, workforce, deliveryId, "delivery.cost.record");
  return recordProviderCostFact(persistence, input, options);
}

export async function actorCanReadDeliveryCosts(
  persistence: Persistence,
  actor: DeliveryWorkforceActor,
  orderId: string,
): Promise<boolean> {
  try {
    await authorizeForOrder(persistence, actor, orderId, "delivery.cost.record");
    return true;
  } catch {
    return false;
  }
}

export { requireDeliveryCapability, requireDeliveryWorkforceActor };
