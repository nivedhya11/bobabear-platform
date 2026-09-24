/**
 * Checkout fulfilment mode + pickup outlet mutations (IMP-036H-B).
 */

import {
  CheckoutError,
  isLogicallyExpired,
  parseSetCheckoutFulfilmentInput,
  type Checkout,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "../cart/actor";
import { systemCheckoutClock } from "./clock";
import type { CheckoutOperationOptions } from "./operations";
import {
  bumpCheckoutRevisionAfterFulfilmentChange,
  loadCheckoutAggregate,
  lockCheckoutForUpdate,
} from "./repository";

function assertMutablePrePayment(
  status: string,
  expiresAt: Date,
  now: Date,
): void {
  if (status === "PAYMENT_PENDING") {
    throw new CheckoutError(
      "CHECKOUT_STATE_CONFLICT",
      "Fulfilment cannot change while PAYMENT_PENDING.",
    );
  }
  if (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  ) {
    throw new CheckoutError(
      "CHECKOUT_STATE_CONFLICT",
      "Fulfilment cannot change on a terminal Checkout.",
    );
  }
  if (isLogicallyExpired(expiresAt, now)) {
    throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
  }
}

/**
 * Set fulfilment mode and optional pickup outlet.
 *
 * - DELIVERY: clears pickupOutletId.
 * - PICKUP: may set mode without outlet on early DRAFT; evaluate/prepare require
 *   an eligible outlet (PICKUP_OUTLET_REQUIRED).
 * - Destination may remain as draft convenience on PICKUP and is never sealed
 *   into a Pickup snapshot.
 * - Mode or outlet change advances revision and invalidates READY → DRAFT.
 */
export async function setCheckoutFulfilment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const parsed = parseSetCheckoutFulfilmentInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockCheckoutForUpdate(tx, parsed.checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    assertMutablePrePayment(row.status, row.expiresAt, now);
    if (row.revision !== parsed.expectedCheckoutRevision) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }

    const currentMode = (row.fulfilmentMode ?? "DELIVERY") as
      | "DELIVERY"
      | "PICKUP";
    const currentOutletId = row.pickupOutletId ?? null;

    let nextMode = parsed.fulfilmentMode;
    let nextOutletId: string | null;

    if (nextMode === "DELIVERY") {
      nextOutletId = null;
    } else if (parsed.pickupOutletId !== undefined) {
      nextOutletId = parsed.pickupOutletId;
    } else {
      nextOutletId = currentOutletId;
    }

    if (currentMode === nextMode && currentOutletId === nextOutletId) {
      return loadCheckoutAggregate(tx, row);
    }

    const clearReady = row.status === "READY_FOR_PAYMENT";
    const updated = await bumpCheckoutRevisionAfterFulfilmentChange(
      tx,
      row,
      now,
      clearReady,
      {
        fulfilmentMode: nextMode,
        pickupOutletId: nextOutletId,
      },
    );
    return loadCheckoutAggregate(tx, updated);
  });
}
