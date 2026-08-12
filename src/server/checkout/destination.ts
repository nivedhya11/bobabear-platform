/**
 * Checkout destination mutations (IMP-021).
 */

import {
  CheckoutError,
  destinationsEqual,
  isLogicallyExpired,
  parseClearCheckoutDestinationInput,
  parseSetCheckoutDestinationInput,
  type Checkout,
  type CheckoutDestination,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "../cart/actor";
import { resolveOwnedSavedAddressAsDestination } from "./adapters/addresses";
import { systemCheckoutClock } from "./clock";
import type { CheckoutOperationOptions } from "./operations";
import {
  bumpCheckoutRevisionAfterDestinationChange,
  clearDestination,
  findDestinationByCheckoutId,
  loadCheckoutAggregate,
  lockCheckoutForUpdate,
  mapDestinationRow,
  upsertDestination,
} from "./repository";

function assertMutablePrePayment(
  status: string,
  expiresAt: Date,
  now: Date,
): void {
  if (status === "PAYMENT_PENDING") {
    throw new CheckoutError(
      "CHECKOUT_STATE_CONFLICT",
      "Destination cannot change while PAYMENT_PENDING.",
    );
  }
  if (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  ) {
    throw new CheckoutError(
      "CHECKOUT_STATE_CONFLICT",
      "Destination cannot change on a terminal Checkout.",
    );
  }
  if (isLogicallyExpired(expiresAt, now)) {
    throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
  }
}

export async function setCheckoutDestination(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const parsed = parseSetCheckoutDestinationInput(input);

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

    let next: CheckoutDestination;
    if (parsed.destination.kind === "SAVED_ADDRESS") {
      next = await resolveOwnedSavedAddressAsDestination(
        tx,
        customer,
        parsed.destination.savedAddressId,
      );
    } else {
      next = Object.freeze({
        destinationKind: "ONE_TIME_ADDRESS" as const,
        sourceSavedAddressId: null,
        recipientName: parsed.destination.recipientName,
        recipientPhone: parsed.destination.recipientPhone,
        addressLine1: parsed.destination.addressLine1,
        addressLine2: parsed.destination.addressLine2 ?? null,
        landmark: parsed.destination.landmark ?? null,
        locality: parsed.destination.locality ?? null,
        city: parsed.destination.city,
        stateCode: parsed.destination.stateCode,
        postalCode: parsed.destination.postalCode,
        coordinates: parsed.destination.coordinates ?? null,
        label: parsed.destination.label ?? null,
      });
    }

    const existingRow = await findDestinationByCheckoutId(tx, row.id);
    if (existingRow) {
      const current = mapDestinationRow(existingRow);
      if (destinationsEqual(current, next)) {
        return loadCheckoutAggregate(tx, row);
      }
    }

    await upsertDestination(tx, row.id, next, now);
    const clearReady = row.status === "READY_FOR_PAYMENT";
    const updated = await bumpCheckoutRevisionAfterDestinationChange(
      tx,
      row,
      now,
      clearReady,
    );
    return loadCheckoutAggregate(tx, updated);
  });
}

export async function clearCheckoutDestination(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const parsed = parseClearCheckoutDestinationInput(input);

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

    const existing = await findDestinationByCheckoutId(tx, row.id);
    if (!existing) {
      return loadCheckoutAggregate(tx, row);
    }

    await clearDestination(tx, row.id);
    const updated = await bumpCheckoutRevisionAfterDestinationChange(
      tx,
      row,
      now,
      row.status === "READY_FOR_PAYMENT",
    );
    return loadCheckoutAggregate(tx, updated);
  });
}
