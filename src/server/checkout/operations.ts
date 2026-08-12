/**
 * Checkout start / get / cancel operations (IMP-021).
 */

import {
  CheckoutError,
  isLogicallyExpired,
  parseCancelCheckoutInput,
  parseGetActiveCheckoutInput,
  parseStartCheckoutInput,
  requireCheckoutTtlMs,
  type Checkout,
  type CheckoutPolicy,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import {
  requireCustomerActor,
  type CustomerActor,
} from "../cart/actor";
import { lockAndVerifyCustomerCart } from "./adapters/cart";
import { systemCheckoutClock, type CheckoutClock } from "./clock";
import { isUniqueViolation } from "./assert-role";
import {
  findActiveNonTerminalForCart,
  findCheckoutRowById,
  insertDraftCheckout,
  loadCheckoutAggregate,
  lockCheckoutForUpdate,
  markCheckoutCancelled,
  markCheckoutExpired,
  newCheckoutId,
} from "./repository";

export type CheckoutOperationOptions = Readonly<{
  clock?: CheckoutClock;
  policy?: CheckoutPolicy;
}>;

function assertOwnedUsableCheckout(
  row: Awaited<ReturnType<typeof findCheckoutRowById>>,
  actor: CustomerActor,
  now: Date,
): boolean {
  if (!row) return false;
  if (row.customerAuthUserId !== actor.authUserId) return false;
  if (
    row.status !== "DRAFT" &&
    row.status !== "READY_FOR_PAYMENT" &&
    row.status !== "PAYMENT_PENDING"
  ) {
    return false;
  }
  // PAYMENT_PENDING is not auto-expired by pre-payment TTL.
  if (row.status === "PAYMENT_PENDING") return true;
  if (isLogicallyExpired(row.expiresAt, now)) return false;
  return true;
}

export async function getActiveCheckout(
  persistence: Persistence,
  actor: unknown,
  input: unknown = {},
  options: CheckoutOperationOptions = {},
): Promise<Checkout | null> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const parsed = parseGetActiveCheckoutInput(input);

  return persistence.withContext(async (ctx) => {
    let row = null;
    if (parsed.cartId !== undefined) {
      row = await findActiveNonTerminalForCart(ctx, parsed.cartId);
    } else if (parsed.checkoutId !== undefined) {
      row = await findCheckoutRowById(ctx, parsed.checkoutId);
    }
    if (!assertOwnedUsableCheckout(row, customer, now)) return null;
    return loadCheckoutAggregate(ctx, row!);
  });
}

export async function startCheckout(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const ttlMs = requireCheckoutTtlMs(options.policy);
  const parsed = parseStartCheckoutInput(input);

  try {
    return await persistence.transaction(async (tx) => {
      const { cart } = await lockAndVerifyCustomerCart(
        tx,
        customer,
        parsed.cartId,
      );

      let existing = await findActiveNonTerminalForCart(tx, cart.id);
      if (existing) {
        await lockCheckoutForUpdate(tx, existing.id);
        existing = await findCheckoutRowById(tx, existing.id);
      }

      if (existing && existing.customerAuthUserId === customer.authUserId) {
        if (
          existing.status !== "PAYMENT_PENDING" &&
          isLogicallyExpired(existing.expiresAt, now)
        ) {
          await markCheckoutExpired(tx, existing, now);
          existing = null;
        } else if (
          existing.status === "DRAFT" ||
          existing.status === "READY_FOR_PAYMENT" ||
          existing.status === "PAYMENT_PENDING"
        ) {
          return loadCheckoutAggregate(tx, existing);
        }
      }

      const inserted = await insertDraftCheckout(tx, {
        id: newCheckoutId(),
        customerAuthUserId: customer.authUserId,
        brandId: cart.brandId,
        cartId: cart.id,
        sourceCartRevision: cart.revision,
        expiresAt: new Date(now.getTime() + ttlMs),
        now,
      });
      return loadCheckoutAggregate(tx, inserted);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await persistence.withContext((ctx) =>
        findActiveNonTerminalForCart(ctx, parsed.cartId),
      );
      if (
        existing &&
        assertOwnedUsableCheckout(existing, customer, now)
      ) {
        return persistence.withContext((ctx) =>
          loadCheckoutAggregate(ctx, existing),
        );
      }
    }
    throw error;
  }
}

export async function cancelCheckout(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<Checkout> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const parsed = parseCancelCheckoutInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockCheckoutForUpdate(tx, parsed.checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    if (row.status === "PAYMENT_PENDING") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "PAYMENT_PENDING Checkout cannot be cancelled in this slice.",
      );
    }
    if (row.status !== "DRAFT" && row.status !== "READY_FOR_PAYMENT") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Checkout cannot be cancelled from its current status.",
      );
    }
    if (isLogicallyExpired(row.expiresAt, now)) {
      throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
    }
    if (row.revision !== parsed.expectedCheckoutRevision) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }

    const cancelled = await markCheckoutCancelled(tx, row, now);
    return loadCheckoutAggregate(tx, cancelled);
  });
}
