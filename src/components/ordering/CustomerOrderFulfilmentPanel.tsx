"use client";

/**
 * Shared pickup / delivery fulfilment presentation for customer order surfaces.
 */

import {
  fulfilmentModeLabel,
  pickupAddressLines,
} from "@/components/ordering/pickup-location-presentation";
import type { CommerceOrderDetail } from "@/lib/customer-commerce";

export function CustomerOrderFulfilmentPanel(props: {
  order: Pick<
    CommerceOrderDetail,
    "fulfilmentMode" | "destination" | "pickupLocation" | "delivery"
  >;
  /** When true, suppress delivery tracking block (Pickup path). */
  showDeliveryTracking?: boolean;
}) {
  const { order } = props;
  const showDeliveryTracking = props.showDeliveryTracking !== false;
  const isPickup = order.fulfilmentMode === "PICKUP";

  return (
    <div className="flex flex-col gap-3" data-testid="order-fulfilment">
      <p
        data-testid="order-fulfilment-mode"
        className="font-body text-[14px] font-semibold text-[var(--text-primary)]"
      >
        {isPickup ? "Pickup · Collect from BOBA Bear" : fulfilmentModeLabel("DELIVERY")}
      </p>

      {isPickup && order.pickupLocation ? (
        <div
          data-testid="order-pickup-location"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          <p className="font-semibold text-[var(--text-primary)]">
            {order.pickupLocation.displayName}
          </p>
          {pickupAddressLines(order.pickupLocation).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {order.pickupLocation.instructions ? (
            <p className="mt-1 text-[var(--text-primary)]">
              <span className="font-semibold">Instructions: </span>
              {order.pickupLocation.instructions}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isPickup && order.destination ? (
        <div
          data-testid="order-delivery-destination"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          <p>{order.destination.recipientName}</p>
          <p>{order.destination.addressLine1}</p>
          <p>
            {order.destination.city} {order.destination.postalCode}
          </p>
        </div>
      ) : null}

      {!isPickup && showDeliveryTracking && order.delivery ? (
        <section
          className="rounded-md border border-[var(--border-subtle)] p-4"
          data-testid="order-delivery"
        >
          <h2 className="font-body text-[15px] font-semibold">Delivery</h2>
          <p data-testid="order-delivery-status">{order.delivery.statusLabel}</p>
          {order.delivery.providerDisplayName ? (
            <p className="text-[13px] text-[var(--text-secondary)]">
              via {order.delivery.providerDisplayName}
            </p>
          ) : null}
          {order.delivery.trackingUrl ? (
            <p className="mt-2">
              <a
                href={order.delivery.trackingUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="order-delivery-track"
              >
                Track delivery
              </a>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
