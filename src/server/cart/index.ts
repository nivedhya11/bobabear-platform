/**
 * Server-only Cart domain boundary (IMP-020).
 *
 * Public Cart HTTP exposure is intentionally disabled in this slice —
 * domain module only (same pattern as customer-profiles).
 */
import "server-only";

export { CartError } from "../../shared/cart";
export type {
  Cart,
  CartEvaluationResult,
  CartLine,
  CartMutationResult,
  CartPolicy,
} from "../../shared/cart";

export {
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
} from "./actor";

// Actor minting requires a non-forgeable TrustedCustomerAuthIdentity from
// customer-auth session validation (./auth-adapter). Ordinary Cart consumers
// must not turn a freely constructed user id into Cart authority.

export { systemCartClock, fixedCartClock, type CartClock } from "./clock";

export {
  generateGuestCartToken,
  hashGuestToken,
  guestVerifiersEqual,
} from "./guest-credential";

export {
  getActiveCart,
  addCartLine,
  setCartLineQuantity,
  updateCartLineConfiguration,
  removeCartLine,
  clearCart,
  decrementLatestCartVariant,
  applyCartCoupon,
  removeCartCoupon,
  type CartAccess,
  type CartOperationOptions,
} from "./operations";

export {
  claimGuestCart,
  reconcileGuestCartWithCustomer,
} from "./claim";

export { evaluateCart } from "./evaluate";

export { deleteExpiredGuestCarts } from "./repository";

/** Order materialization Cart finalization (IMP-023) — revision-guarded clear. */
export { finalizeCartAfterOrderMaterialization } from "./finalize-after-order";
