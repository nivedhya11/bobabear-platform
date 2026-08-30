/**
 * Delivery provider port (IMP-031).
 *
 * Provider-neutral — no gateway SDK, credentials, or webhook verification.
 * Concrete adapters and Dehradun operating-mode selection are deferred.
 */

import type { NormalizedDeliveryBookingEvidence } from "../../../shared/delivery";

export type DeliveryProviderCreateBookingInput = Readonly<{
  deliveryId: string;
  orderId: string;
  bookingCorrelationId: string;
  requestFingerprint: string;
}>;

export type DeliveryProviderQueryBookingInput = Readonly<{
  bookingCorrelationId: string;
  provider: string;
  externalBookingReference?: string | null;
}>;

export type DeliveryProviderCancelBookingInput = Readonly<{
  bookingCorrelationId: string;
  provider: string;
  externalBookingReference?: string | null;
}>;

export type DeliveryProvider = Readonly<{
  readonly name: string;
  createBooking(
    input: DeliveryProviderCreateBookingInput,
  ): Promise<NormalizedDeliveryBookingEvidence>;
  queryBooking(
    input: DeliveryProviderQueryBookingInput,
  ): Promise<NormalizedDeliveryBookingEvidence>;
  cancelBooking(
    input: DeliveryProviderCancelBookingInput,
  ): Promise<NormalizedDeliveryBookingEvidence>;
}>;
