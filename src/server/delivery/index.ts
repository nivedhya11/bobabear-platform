/**
 * Server-only Delivery domain boundary (IMP-031 Boundary C).
 *
 * No HTTP routes. No webhook inbox. No concrete provider adapters.
 * No automatic Order fulfilment.
 */
import "server-only";

export { DeliveryError } from "../../shared/delivery";
export type {
  Delivery,
  DeliveryAssignment,
  DeliveryProviderCost,
  DeliveryProviderObservation,
  DeliveryReturn,
  NormalizedDeliveryBookingEvidence,
  RecordProviderObservationResult,
} from "../../shared/delivery";

export { systemDeliveryClock, fixedDeliveryClock, type DeliveryClock } from "./clock";

export {
  createDelivery,
  beginBooking,
  recordBookingOutcome,
  reconcileAmbiguousBooking,
  recordProviderObservation,
  recordAssignment,
  confirmPickup,
  recordProofAndDeliver,
  failDelivery,
  cancelDelivery,
  beginReturn,
  advanceReturn,
  recordProviderCostFact,
  getDelivery,
  getOrderLifecycleSnapshot,
  allocateBookingCorrelationId,
  type DeliveryOperationOptions,
} from "./operations";

export {
  createFakeDeliveryProvider,
  disabledDeliveryProvider,
  type DeliveryProvider,
  type FakeDeliveryProvider,
  type FakeDeliveryBookingOutcome,
} from "./provider";
