/**
 * Saved Address adapter for Checkout (IMP-021).
 * Miss maps to non-leaking CHECKOUT_INVALID_INPUT.
 */

import type { CustomerAddress } from "../../../shared/customer-addresses";
import { CheckoutError, type CheckoutDestination } from "../../../shared/checkout";
import type { PersistenceQueryContext } from "../../persistence/types";
import type { CustomerActor } from "../../cart/actor";
import { requireCustomerActor } from "../../cart/actor";
import { findAddressByIdAndCustomerAuthUserId } from "../../customer-addresses/repository";
import { assertApplicationRole } from "../assert-role";

export async function resolveOwnedSavedAddressAsDestination(
  context: PersistenceQueryContext,
  actor: CustomerActor,
  savedAddressId: string,
): Promise<CheckoutDestination> {
  assertApplicationRole(context, "resolveOwnedSavedAddressAsDestination");
  requireCustomerActor(actor);
  const address = await findAddressByIdAndCustomerAuthUserId(
    context,
    savedAddressId,
    actor.authUserId,
  );
  if (!address) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "Destination address is invalid.",
      { field: "savedAddressId" },
    );
  }
  return addressToDestination(address);
}

export function addressToDestination(
  address: CustomerAddress,
): CheckoutDestination {
  return Object.freeze({
    destinationKind: "SAVED_ADDRESS" as const,
    sourceSavedAddressId: address.id,
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    landmark: address.landmark,
    locality: address.locality,
    city: address.city,
    stateCode: address.stateCode,
    postalCode: address.postalCode,
    coordinates: address.coordinates,
    label: address.label,
  });
}
