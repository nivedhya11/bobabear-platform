/**
 * Customer pickup-options read (IMP-036H-B).
 *
 * Ownership-exact: only the Checkout owner may list options for that Checkout.
 * Returns customer-safe fields only (no hierarchy / legal entity / operating dump).
 */

import {
  CheckoutError,
  isLogicallyExpired,
  assertUuid,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "../cart/actor";
import { findCartRowById, loadCartAggregate } from "../cart/repository";
import { systemCheckoutClock } from "./clock";
import type { CheckoutOperationOptions } from "./operations";
import {
  listEligiblePickupOutletsForCheckout,
  type EligiblePickupOutlet,
} from "./pickup-eligibility";
import { findCheckoutRowById } from "./repository";

export type ListPickupOptionsResult = Readonly<{
  outlets: readonly EligiblePickupOutlet[];
  selectionPolicy: "UNAVAILABLE" | "AUTO_SELECT" | "CUSTOMER_SELECT";
}>;

export async function listCheckoutPickupOptions(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<ListPickupOptionsResult> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();

  const obj =
    typeof input === "object" && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  if (!obj || !("checkoutId" in obj)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "checkoutId is required.",
      { field: "checkoutId" },
    );
  }
  const checkoutId = assertUuid(obj.checkoutId, "checkoutId");

  return persistence.withContext(async (ctx) => {
    const row = await findCheckoutRowById(ctx, checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    if (
      row.status === "COMPLETED" ||
      row.status === "CANCELLED" ||
      row.status === "EXPIRED"
    ) {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Cannot list pickup options on a terminal Checkout.",
      );
    }
    if (isLogicallyExpired(row.expiresAt, now)) {
      throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
    }

    const cartRow = await findCartRowById(ctx, row.cartId);
    if (!cartRow || cartRow.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    const cart = await loadCartAggregate(ctx, cartRow);
    const outlets = await listEligiblePickupOutletsForCheckout(ctx, {
      brandId: row.brandId,
      cart,
      now,
    });

    const selectionPolicy =
      outlets.length === 0
        ? ("UNAVAILABLE" as const)
        : outlets.length === 1
          ? ("AUTO_SELECT" as const)
          : ("CUSTOMER_SELECT" as const);

    return Object.freeze({ outlets, selectionPolicy });
  });
}
