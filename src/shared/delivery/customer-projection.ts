/**
 * Customer-safe Delivery status projection (IMP-032 §11).
 */
import type { DeliveryExecutionStatus } from "./constants";

export const CUSTOMER_DELIVERY_STATUS_LABELS = [
  "Arranging delivery",
  "Delivery booked",
  "Rider assigned",
  "Out for delivery",
  "Delivered",
  "Delivery issue",
  "Delivery cancelled",
] as const;

export type CustomerDeliveryStatusLabel =
  (typeof CUSTOMER_DELIVERY_STATUS_LABELS)[number];

export function projectCustomerDeliveryStatusLabel(input: {
  status: DeliveryExecutionStatus;
  hasActiveAssignment: boolean;
}): CustomerDeliveryStatusLabel {
  switch (input.status) {
    case "REQUESTED":
    case "BOOKING_OUTCOME_UNKNOWN":
      return "Arranging delivery";
    case "BOOKED":
      return input.hasActiveAssignment ? "Rider assigned" : "Delivery booked";
    case "PICKED_UP":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "FAILED":
      return "Delivery issue";
    case "CANCELLED":
      return "Delivery cancelled";
    default: {
      const _exhaustive: never = input.status;
      return _exhaustive;
    }
  }
}

export type CustomerDeliveryProjection = Readonly<{
  statusLabel: CustomerDeliveryStatusLabel;
  providerDisplayName: string | null;
  trackingUrl: string | null;
  lastUpdatedAt: Date;
}>;
