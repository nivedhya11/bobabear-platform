/**
 * Guest Cart claim and guest↔customer reconciliation (IMP-020).
 *
 * Lock order:
 * 1. customer_auth_users FOR UPDATE
 * 2. carts by id ASC
 * 3. lines as needed
 */

import {
  CartError,
  assertUuid,
  canonicalConfigurationsEqual,
  parseExpectedRevision,
  parseReconciliationResolution,
  type Cart,
  type CartPolicy,
  type CartReconciliationResolution,
} from "../../shared/cart";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor, type CustomerActor } from "./actor";
import { cartLineToCanonicalConfiguration } from "./canonicalize-config";
import { systemCartClock, type CartClock } from "./clock";
import { guestVerifiersEqual, hashGuestToken } from "./guest-credential";
import {
  deleteCartById,
  deleteCartLines,
  findCustomerCartRow,
  findGuestCartRowByVerifier,
  insertCartLineWithConfiguration,
  moveCartLineUnits,
  loadCartAggregate,
  lockCartLinesAscending,
  lockCartsByIdsAscending,
  lockCustomerAuthUserForUpdate,
  setCartLineQuantityRow,
  updateCartHeader,
  type CartRow,
} from "./repository";

export type ClaimGuestCartInput = Readonly<{
  guestToken: string;
  brandId: string;
  expectedGuestRevision: bigint;
}>;

export type ReconcileGuestCartInput = Readonly<{
  guestToken: string;
  brandId: string;
  expectedGuestRevision: bigint;
  expectedCustomerRevision: bigint;
  resolution?: CartReconciliationResolution;
}>;

function isGuestExpired(row: CartRow, now: Date): boolean {
  return row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
}

function parseClaimInput(raw: unknown): ClaimGuestCartInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new CartError("CART_INVALID_INPUT", "claimGuestCart input invalid.");
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (
      ![
        "guestToken",
        "brandId",
        "expectedGuestRevision",
      ].includes(key)
    ) {
      throw new CartError(
        "CART_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
      );
    }
  }
  if (typeof obj.guestToken !== "string" || obj.guestToken.length === 0) {
    throw new CartError("CART_INVALID_INPUT", "guestToken is required.", {
      field: "guestToken",
    });
  }
  return Object.freeze({
    guestToken: obj.guestToken,
    brandId: assertUuid(obj.brandId, "brandId"),
    expectedGuestRevision: parseExpectedRevision(obj.expectedGuestRevision),
  });
}

function parseReconcileInput(raw: unknown): ReconcileGuestCartInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new CartError(
      "CART_INVALID_INPUT",
      "reconcileGuestCartWithCustomer input invalid.",
    );
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (
      ![
        "guestToken",
        "brandId",
        "expectedGuestRevision",
        "expectedCustomerRevision",
        "resolution",
      ].includes(key)
    ) {
      throw new CartError(
        "CART_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
      );
    }
  }
  if (typeof obj.guestToken !== "string" || obj.guestToken.length === 0) {
    throw new CartError("CART_INVALID_INPUT", "guestToken is required.", {
      field: "guestToken",
    });
  }
  return Object.freeze({
    guestToken: obj.guestToken,
    brandId: assertUuid(obj.brandId, "brandId"),
    expectedGuestRevision: parseExpectedRevision(obj.expectedGuestRevision),
    expectedCustomerRevision: parseExpectedRevision(
      obj.expectedCustomerRevision,
    ),
    resolution: parseReconciliationResolution(obj.resolution),
  });
}

/**
 * Convert guest Cart to customer Cart when no customer Cart exists.
 * Same cartId survives.
 */
export async function claimGuestCart(
  persistence: Persistence,
  actor: CustomerActor,
  input: unknown,
  options: { clock?: CartClock; policy?: CartPolicy } = {},
): Promise<Cart> {
  const customer = requireCustomerActor(actor);
  const parsed = parseClaimInput(input);
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();

  return persistence.transaction(async (tx) => {
    await lockCustomerAuthUserForUpdate(tx, customer.authUserId);

    const existingCustomer = await findCustomerCartRow(
      tx,
      customer.authUserId,
      parsed.brandId,
    );
    if (existingCustomer) {
      throw new CartError(
        "CART_RECONCILIATION_CONFLICT",
        "Customer already has a Cart for this Brand; use reconcileGuestCartWithCustomer.",
        {
          resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"],
        },
      );
    }

    const verifier = hashGuestToken(parsed.guestToken);
    const guest = await findGuestCartRowByVerifier(
      tx,
      verifier,
      parsed.brandId,
    );
    if (!guest) {
      throw new CartError("CART_NOT_FOUND", "Cart not found.");
    }

    const [locked] = await lockCartsByIdsAscending(tx, [guest.id]);
    if (!locked) throw new CartError("CART_NOT_FOUND", "Cart not found.");
    if (
      !guestVerifiersEqual(
        locked.guestCredentialVerifier!,
        parsed.guestToken,
      )
    ) {
      throw new CartError("CART_NOT_FOUND", "Cart not found.");
    }
    if (isGuestExpired(locked, now)) {
      throw new CartError("CART_EXPIRED", "Guest Cart has expired.");
    }
    if (locked.revision !== parsed.expectedGuestRevision) {
      throw new CartError(
        "CART_CONFLICT",
        "Guest Cart revision does not match.",
        { field: "expectedGuestRevision" },
      );
    }

    await updateCartHeader(tx, {
      cartId: locked.id,
      revision: locked.revision + BigInt(1),
      updatedAt: now,
      customerAuthUserId: customer.authUserId,
      guestCredentialVerifier: null,
      expiresAt: null,
    });

    const refreshed = (await lockCartsByIdsAscending(tx, [locked.id]))[0]!;
    return loadCartAggregate(tx, refreshed);
  });
}

/**
 * Customer Cart survives; guest Cart is deleted. Lines coalesce.
 * Coupon conflict requires KEEP_GUEST | KEEP_CUSTOMER.
 */
export async function reconcileGuestCartWithCustomer(
  persistence: Persistence,
  actor: CustomerActor,
  input: unknown,
  options: { clock?: CartClock; policy?: CartPolicy } = {},
): Promise<Cart> {
  const customer = requireCustomerActor(actor);
  const parsed = parseReconcileInput(input);
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();

  return persistence.transaction(async (tx) => {
    await lockCustomerAuthUserForUpdate(tx, customer.authUserId);

    const customerCart = await findCustomerCartRow(
      tx,
      customer.authUserId,
      parsed.brandId,
    );
    if (!customerCart) {
      throw new CartError(
        "CART_NOT_FOUND",
        "Customer Cart not found; use claimGuestCart.",
      );
    }

    const verifier = hashGuestToken(parsed.guestToken);
    const guestCart = await findGuestCartRowByVerifier(
      tx,
      verifier,
      parsed.brandId,
    );
    if (!guestCart) {
      throw new CartError("CART_NOT_FOUND", "Cart not found.");
    }

    const locked = await lockCartsByIdsAscending(tx, [
      customerCart.id,
      guestCart.id,
    ]);
    const lockedCustomer = locked.find((r) => r.id === customerCart.id);
    const lockedGuest = locked.find((r) => r.id === guestCart.id);
    if (!lockedCustomer || !lockedGuest) {
      throw new CartError("CART_NOT_FOUND", "Cart not found.");
    }
    if (
      !guestVerifiersEqual(
        lockedGuest.guestCredentialVerifier!,
        parsed.guestToken,
      )
    ) {
      throw new CartError("CART_NOT_FOUND", "Cart not found.");
    }
    if (isGuestExpired(lockedGuest, now)) {
      throw new CartError("CART_EXPIRED", "Guest Cart has expired.");
    }
    if (lockedGuest.revision !== parsed.expectedGuestRevision) {
      throw new CartError(
        "CART_CONFLICT",
        "Guest Cart revision does not match.",
        { field: "expectedGuestRevision" },
      );
    }
    if (lockedCustomer.revision !== parsed.expectedCustomerRevision) {
      throw new CartError(
        "CART_CONFLICT",
        "Customer Cart revision does not match.",
        { field: "expectedCustomerRevision" },
      );
    }

    let survivingCoupon = lockedCustomer.manualCouponCode;
    const guestCoupon = lockedGuest.manualCouponCode;
    if (
      guestCoupon !== null &&
      survivingCoupon !== null &&
      guestCoupon !== survivingCoupon
    ) {
      if (!parsed.resolution) {
        throw new CartError(
          "CART_RECONCILIATION_CONFLICT",
          "Guest and customer Carts have different coupons.",
          { resolutionOptions: ["KEEP_GUEST", "KEEP_CUSTOMER"] },
        );
      }
      survivingCoupon =
        parsed.resolution === "KEEP_GUEST" ? guestCoupon : survivingCoupon;
    } else if (survivingCoupon === null && guestCoupon !== null) {
      survivingCoupon = guestCoupon;
    }

    await lockCartLinesAscending(tx, lockedCustomer.id);
    await lockCartLinesAscending(tx, lockedGuest.id);

    const customerAgg = await loadCartAggregate(tx, lockedCustomer);
    const guestAgg = await loadCartAggregate(tx, lockedGuest);

    for (const guestLine of guestAgg.lines) {
      const guestConfig = cartLineToCanonicalConfiguration(guestLine);
      const match = customerAgg.lines.find((l) =>
        canonicalConfigurationsEqual(
          cartLineToCanonicalConfiguration(l),
          guestConfig,
        ),
      );
      if (match) {
        const nextQty = match.quantity + guestLine.quantity;
        if (!Number.isSafeInteger(nextQty) || nextQty <= 0) {
          throw new CartError(
            "CART_INVALID_INPUT",
            "Line quantity overflow during reconciliation.",
          );
        }
        await setCartLineQuantityRow(tx, match.id, nextQty);
        await moveCartLineUnits(tx, { fromCartId: lockedGuest.id, fromLineId: guestLine.id, toCartId: lockedCustomer.id, toLineId: match.id });
      } else {
        const lineId = await insertCartLineWithConfiguration(tx, {
          cartId: lockedCustomer.id,
          configuration: guestConfig,
          quantity: guestLine.quantity,
        });
        await moveCartLineUnits(tx, { fromCartId: lockedGuest.id, fromLineId: guestLine.id, toCartId: lockedCustomer.id, toLineId: lineId });
      }
    }

    // Drop guest lines before deleting guest cart (cascade would also work).
    await deleteCartLines(
      tx,
      guestAgg.lines.map((l) => l.id),
    );
    await deleteCartById(tx, lockedGuest.id);

    await updateCartHeader(tx, {
      cartId: lockedCustomer.id,
      revision: lockedCustomer.revision + BigInt(1),
      updatedAt: now,
      manualCouponCode: survivingCoupon,
    });

    const refreshed = (
      await lockCartsByIdsAscending(tx, [lockedCustomer.id])
    )[0]!;
    return loadCartAggregate(tx, refreshed);
  });
}
