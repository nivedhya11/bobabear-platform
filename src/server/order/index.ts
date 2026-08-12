/**
 * Server-only Order domain boundary (IMP-023).
 *
 * Public Order HTTP exposure is intentionally disabled in this slice —
 * domain module only. Reuses Cart CustomerActor and access-control
 * WorkforcePrincipal; never mints authority from raw IDs.
 */
import "server-only";

export { OrderError } from "../../shared/order";
export type {
  CustomerOrderDetail,
  CustomerOrderSummary,
  Order,
  OrderMaterializationResult,
  OrderMutationResult,
  OrderPolicy,
  OrderRecoveryBatchResult,
  WorkforceOrderDetail,
  WorkforceOrderSummary,
} from "../../shared/order";

export {
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
} from "../cart/actor";

export {
  requireWorkforcePrincipal,
  type WorkforcePrincipal,
} from "../access-control/principal";

export {
  requireOrderWorkforceActor,
  type WorkforceActor,
} from "./authorize";

export {
  systemOrderClock,
  fixedOrderClock,
  type OrderClock,
} from "./clock";

export {
  cryptoOrderNumberGenerator,
  fixedOrderNumberGenerator,
  generateOrderNumber,
  type OrderNumberGenerator,
} from "./order-number";

export {
  materializeOrderForCompletedCheckout,
  type MaterializeOrderOptions,
} from "./materialize";

export {
  recoverMissingOrdersBatch,
  findCompletedCheckoutsMissingOrder,
  type RecoverMissingOrdersOptions,
} from "./recovery";

export { acceptOrder, fulfilOrder, cancelOrder } from "./lifecycle";

export { getCustomerOrder, listCustomerOrders } from "./customer-reads";

export { getWorkforceOrder, searchWorkforceOrders } from "./workforce-reads";

// Intentionally NOT re-exported:
// createOrder / updateOrder / setOrderStatus / repositories /
// actor mint factories / raw-ID authority constructors.
