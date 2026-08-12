/**
 * Read-only Cart adapter for Checkout (IMP-021).
 * Never mutates Cart.
 */

import type { Cart } from "../../../shared/cart";
import { CheckoutError } from "../../../shared/checkout";
import type {
  Persistence,
  PersistenceTransactionContext,
} from "../../persistence/types";
import type { CustomerActor } from "../../cart/actor";
import { requireCustomerActor } from "../../cart/actor";
import {
  findCartRowById,
  loadCartAggregate,
  lockCartForUpdate,
  type CartRow,
} from "../../cart/repository";

export async function loadCustomerOwnedCartById(
  persistence: Persistence,
  actor: CustomerActor,
  cartId: string,
): Promise<Cart | null> {
  requireCustomerActor(actor);
  return persistence.withContext(async (ctx) => {
    const row = await findCartRowById(ctx, cartId);
    if (!row) return null;
    if (row.customerAuthUserId !== actor.authUserId) return null;
    if (row.guestCredentialVerifier !== null) return null;
    return loadCartAggregate(ctx, row);
  });
}

export async function lockAndVerifyCustomerCart(
  tx: PersistenceTransactionContext,
  actor: CustomerActor,
  cartId: string,
): Promise<{ row: CartRow; cart: Cart }> {
  requireCustomerActor(actor);
  const row = await lockCartForUpdate(tx, cartId);
  if (!row || row.customerAuthUserId !== actor.authUserId) {
    throw new CheckoutError("CHECKOUT_NOT_FOUND", "Cart not found.");
  }
  if (row.guestCredentialVerifier !== null || row.customerAuthUserId === null) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "Checkout requires a customer-owned Cart.",
      { field: "cartId" },
    );
  }
  const cart = await loadCartAggregate(tx, row);
  if (cart.lines.length === 0) {
    throw new CheckoutError(
      "CHECKOUT_EMPTY_CART",
      "Checkout requires a non-empty Cart.",
    );
  }
  return { row, cart };
}
