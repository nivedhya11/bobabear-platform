/**
 * Customer-visible notification wording (IMP-036H AC-036H-029 / AF-036H-11).
 *
 * Derives fulfilment-aware summary text from sealed Checkout Snapshot
 * fulfilmentMode. Does not invent Meta WhatsApp templates or new channels —
 * this is the platform's customer-visible content authority for semantic types
 * that already produce content under the IMP-033 foundation.
 */
import type { NotificationSemanticType } from "./constants";

export type CustomerVisibleNotificationContentInput = Readonly<{
  semanticType: NotificationSemanticType;
  fulfilmentMode: "DELIVERY" | "PICKUP";
  pickupLocationDisplayName?: string | null;
  /** Sealed timing. Absent or ASAP keeps existing wording. */
  fulfilmentTiming?: "ASAP" | "SCHEDULED";
  /** Outlet-local window label from the sealed Snapshot. */
  scheduledWindowLabel?: string | null;
  scheduledTimeZone?: string | null;
}>;

export type CustomerVisibleNotificationContent = Readonly<{
  summary: string;
  /** True when summary must not claim rider / delivery-in-progress. */
  forbidsRiderOrDeliveryProgressClaims: boolean;
}>;

const RIDER_OR_DELIVERY_PROGRESS_PATTERN =
  /\b(rider|out for delivery|on the way|delivery is on the way|arriving)\b/i;

/**
 * Render customer-visible wording for an order lifecycle notification.
 *
 * Delivery-progress types (OUT_FOR_DELIVERY / DELIVERED) are Delivery-only;
 * calling them with PICKUP fails closed.
 */
export function renderCustomerVisibleNotificationContent(
  input: CustomerVisibleNotificationContentInput,
): CustomerVisibleNotificationContent {
  const { semanticType, fulfilmentMode, pickupLocationDisplayName } = input;
  const timingSentence = scheduledTimingSentence(input);

  if (
    (semanticType === "OUT_FOR_DELIVERY" || semanticType === "DELIVERED") &&
    fulfilmentMode === "PICKUP"
  ) {
    throw new Error(
      `Notification semantic ${semanticType} is not permitted for PICKUP fulfilment.`,
    );
  }

  let summary: string;
  switch (semanticType) {
    case "ORDER_RECEIVED":
      summary =
        fulfilmentMode === "PICKUP"
          ? "Your Pickup order has been received."
          : "Your order has been received.";
      break;
    case "PAYMENT_CONFIRMED":
      summary =
        fulfilmentMode === "PICKUP"
          ? "Payment confirmed for your Pickup order."
          : "Payment confirmed for your order.";
      break;
    case "ORDER_ACCEPTED":
      if (fulfilmentMode === "PICKUP") {
        const location =
          typeof pickupLocationDisplayName === "string" &&
          pickupLocationDisplayName.trim().length > 0
            ? pickupLocationDisplayName.trim()
            : null;
        summary = location
          ? `Your Pickup order has been accepted. Pickup from ${location}.`
          : "Your Pickup order has been accepted.";
      } else {
        summary = "Your order has been accepted.";
      }
      break;
    case "ORDER_CANCELLED":
      summary =
        fulfilmentMode === "PICKUP"
          ? "Your Pickup order has been cancelled."
          : "Your order has been cancelled.";
      break;
    case "OUT_FOR_DELIVERY":
      summary = "Your order is out for delivery.";
      break;
    case "DELIVERED":
      summary = "Your order has been delivered.";
      break;
    default: {
      const _exhaustive: never = semanticType;
      throw new Error(`Unsupported notification semantic: ${_exhaustive}`);
    }
  }

  if (timingSentence && semanticType !== "OUT_FOR_DELIVERY" && semanticType !== "DELIVERED") {
    summary = `${summary}${timingSentence}`;
  }

  const forbidsRiderOrDeliveryProgressClaims = fulfilmentMode === "PICKUP";
  if (
    forbidsRiderOrDeliveryProgressClaims &&
    RIDER_OR_DELIVERY_PROGRESS_PATTERN.test(summary)
  ) {
    throw new Error(
      "Pickup notification summary must not claim rider or delivery progress.",
    );
  }

  return Object.freeze({
    summary,
    forbidsRiderOrDeliveryProgressClaims,
  });
}

function scheduledTimingSentence(
  input: CustomerVisibleNotificationContentInput,
): string | null {
  if (input.fulfilmentTiming !== "SCHEDULED") return null;
  const label = input.scheduledWindowLabel?.trim();
  if (!label) return null;
  const zone = input.scheduledTimeZone?.trim();
  const zoneSuffix = zone ? ` (${zone})` : "";
  if (input.fulfilmentMode === "PICKUP") {
    return ` Scheduled pickup window ${label}${zoneSuffix}.`;
  }
  return ` Arrival / fulfilment window ${label}${zoneSuffix}.`;
}

export function summaryClaimsRiderOrDeliveryProgress(summary: string): boolean {
  return RIDER_OR_DELIVERY_PROGRESS_PATTERN.test(summary);
}
