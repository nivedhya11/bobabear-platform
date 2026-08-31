/**
 * Customer Delivery projection (IMP-032).
 */
import "server-only";

import {
  findActiveAssignmentForDelivery,
  findLatestDeliveryForOrder,
  findTrackingUrlForDelivery,
  mapDeliveryRow,
} from "./repository";
import {
  projectCustomerDeliveryStatusLabel,
  tryCustomerTrackingUrl,
  type CustomerDeliveryProjection,
} from "../../shared/delivery";
import type { PersistenceQueryContext } from "../persistence/types";

export async function buildCustomerDeliveryProjection(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<CustomerDeliveryProjection | null> {
  const row = await findLatestDeliveryForOrder(context, orderId);
  if (!row) return null;

  const delivery = mapDeliveryRow(row);
  const assignment = await findActiveAssignmentForDelivery(context, delivery.id);
  const trackingRaw = await findTrackingUrlForDelivery(context, delivery.id);
  return Object.freeze({
    statusLabel: projectCustomerDeliveryStatusLabel({
      status: delivery.status,
      hasActiveAssignment: assignment !== null,
    }),
    providerDisplayName: delivery.provider,
    trackingUrl: tryCustomerTrackingUrl(trackingRaw),
    lastUpdatedAt: delivery.updatedAt,
  });
}
