/**
 * Cart domain mutations and reads (IMP-020).
 *
 * Public surface: getActiveCart, addCartLine, setCartLineQuantity,
 * updateCartLineConfiguration, removeCartLine, clearCart,
 * applyCartCoupon, removeCartCoupon. Claim/reconcile/evaluate live in
 * sibling modules.
 */

import { normalizeCouponCode } from "../../shared/promotions";
import {
  CartError,
  assertUuid,
  canonicalConfigurationsEqual,
  parseAddCartLineInput,
  parseApplyCartCouponInput,
  parseClearCartInput,
  parseRemoveCartCouponInput,
  parseRemoveCartLineInput,
  parseSetCartLineQuantityInput,
  parseUpdateCartLineConfigurationInput,
  requireGuestCartTtlMs,
  type Cart,
  type CartMutationResult,
  type CartPolicy,
} from "../../shared/cart";
import type { Persistence } from "../persistence/types";
import { findCouponByCanonicalCode } from "../promotions/coupons";
import { requireCustomerActor, type CustomerActor } from "./actor";
import { cartLineToCanonicalConfiguration } from "./canonicalize-config";
import { systemCartClock, type CartClock } from "./clock";
import {
  generateGuestCartToken,
  guestVerifiersEqual,
  hashGuestToken,
} from "./guest-credential";
import {
  deleteAllCartLines,
  deleteCartLines,
  findCustomerCartRow,
  findGuestCartRowByVerifier,
  insertCartLineWithConfiguration,
  insertCustomerCart,
  insertGuestCart,
  loadCartAggregate,
  lockCartForUpdate,
  lockCartLinesAscending,
  lockCustomerAuthUserForUpdate,
  replaceCartLineConfiguration,
  setCartLineQuantityRow,
  updateCartHeader,
  type CartRow,
} from "./repository";
import { validateCartLineStructure } from "./validate-structure";

export type CartAccess =
  | Readonly<{
      kind: "customer";
      actor: CustomerActor;
      brandId: string;
    }>
  | Readonly<{
      kind: "guest";
      brandId: string;
      /** Required for existing-guest operations; omit only for first material add. */
      guestToken?: string;
    }>;

export type CartOperationOptions = Readonly<{
  clock?: CartClock;
  policy?: CartPolicy;
}>;

function assertBrandId(brandId: string): string {
  return assertUuid(brandId, "brandId");
}

function isGuestExpired(row: CartRow, now: Date): boolean {
  return row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
}

function assertRevisionMatch(row: CartRow, expectedRevision: bigint): void {
  if (row.revision !== expectedRevision) {
    throw new CartError(
      "CART_CONFLICT",
      "Cart revision does not match expectedRevision.",
      { field: "expectedRevision" },
    );
  }
}

async function resolveExistingCartRow(
  persistence: Persistence,
  access: CartAccess,
  now: Date,
): Promise<CartRow | null> {
  if (access.kind === "customer") {
    requireCustomerActor(access.actor);
    return persistence.withContext((ctx) =>
      findCustomerCartRow(ctx, access.actor.authUserId, access.brandId),
    );
  }
  if (!access.guestToken) return null;
  const verifier = hashGuestToken(access.guestToken);
  const row = await persistence.withContext((ctx) =>
    findGuestCartRowByVerifier(ctx, verifier, access.brandId),
  );
  if (!row) return null;
  if (!guestVerifiersEqual(row.guestCredentialVerifier!, access.guestToken)) {
    return null;
  }
  if (isGuestExpired(row, now)) {
    throw new CartError("CART_EXPIRED", "Guest Cart has expired.");
  }
  return row;
}

export async function getActiveCart(
  persistence: Persistence,
  access: CartAccess,
  options: CartOperationOptions = {},
): Promise<Cart | null> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const row = await resolveExistingCartRow(persistence, access, now);
  if (!row) return null;
  return persistence.withContext((ctx) => loadCartAggregate(ctx, row));
}

export async function addCartLine(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<CartMutationResult> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  const brandId = assertBrandId(access.brandId);
  const parsed = parseAddCartLineInput(input);

  return persistence.transaction(async (tx) => {
    let row: CartRow | null = null;
    let guestToken: string | undefined;
    let createdInThisMutation = false;

    if (access.kind === "customer") {
      const actor = requireCustomerActor(access.actor);
      await lockCustomerAuthUserForUpdate(tx, actor.authUserId);
      row = await findCustomerCartRow(tx, actor.authUserId, brandId);
      if (row) {
        const locked = await lockCartForUpdate(tx, row.id);
        if (!locked) throw new CartError("CART_NOT_FOUND", "Cart not found.");
        row = locked;
        if (parsed.expectedRevision === null) {
          throw new CartError(
            "CART_INVALID_INPUT",
            "expectedRevision is required for an existing Cart.",
            { field: "expectedRevision" },
          );
        }
        assertRevisionMatch(row, parsed.expectedRevision);
      } else {
        if (parsed.expectedRevision !== null) {
          throw new CartError(
            "CART_CONFLICT",
            "expectedRevision was provided but no Cart exists.",
            { field: "expectedRevision" },
          );
        }
        row = await insertCustomerCart(tx, {
          brandId,
          customerAuthUserId: actor.authUserId,
          now,
        });
        createdInThisMutation = true;
      }
    } else {
      if (access.guestToken) {
        const verifier = hashGuestToken(access.guestToken);
        const found = await findGuestCartRowByVerifier(tx, verifier, brandId);
        if (!found) {
          throw new CartError("CART_NOT_FOUND", "Cart not found.");
        }
        const locked = await lockCartForUpdate(tx, found.id);
        if (!locked) throw new CartError("CART_NOT_FOUND", "Cart not found.");
        row = locked;
        if (
          !guestVerifiersEqual(
            row.guestCredentialVerifier!,
            access.guestToken,
          )
        ) {
          throw new CartError("CART_NOT_FOUND", "Cart not found.");
        }
        if (isGuestExpired(row, now)) {
          throw new CartError("CART_EXPIRED", "Guest Cart has expired.");
        }
        if (parsed.expectedRevision === null) {
          throw new CartError(
            "CART_INVALID_INPUT",
            "expectedRevision is required for an existing Cart.",
            { field: "expectedRevision" },
          );
        }
        assertRevisionMatch(row, parsed.expectedRevision);
      } else {
        if (parsed.expectedRevision !== null) {
          throw new CartError(
            "CART_CONFLICT",
            "expectedRevision was provided but no Cart exists.",
            { field: "expectedRevision" },
          );
        }
        const ttlMs = requireGuestCartTtlMs(options.policy);
        const cred = generateGuestCartToken();
        guestToken = cred.rawToken;
        row = await insertGuestCart(tx, {
          brandId,
          guestCredentialVerifier: cred.verifierHex,
          expiresAt: new Date(now.getTime() + ttlMs),
          now,
        });
        createdInThisMutation = true;
      }
    }

    await validateCartLineStructure(tx, brandId, parsed.configuration);
    await lockCartLinesAscending(tx, row.id);
    const cart = await loadCartAggregate(tx, row);

    const equivalent = cart.lines.find((line) =>
      canonicalConfigurationsEqual(
        cartLineToCanonicalConfiguration(line),
        parsed.configuration,
      ),
    );

    if (equivalent) {
      const nextQty = equivalent.quantity + parsed.quantity;
      if (!Number.isSafeInteger(nextQty) || nextQty <= 0) {
        throw new CartError(
          "CART_INVALID_INPUT",
          "Line quantity overflow.",
          { field: "quantity" },
        );
      }
      await setCartLineQuantityRow(tx, equivalent.id, nextQty);
    } else {
      await insertCartLineWithConfiguration(tx, {
        cartId: row.id,
        configuration: parsed.configuration,
        quantity: parsed.quantity,
      });
    }

    // Lazy create + first line is one logical mutation: revision stays at 1.
    const nextRevision = createdInThisMutation
      ? row.revision
      : row.revision + BigInt(1);
    const header: {
      cartId: string;
      revision: bigint;
      updatedAt: Date;
      expiresAt?: Date;
    } = {
      cartId: row.id,
      revision: nextRevision,
      updatedAt: now,
    };
    if (access.kind === "guest") {
      const ttlMs = requireGuestCartTtlMs(options.policy);
      header.expiresAt = new Date(now.getTime() + ttlMs);
    }
    await updateCartHeader(tx, header);

    const refreshed = await lockCartForUpdate(tx, row.id);
    const result = await loadCartAggregate(tx, refreshed!);
    return guestToken
      ? Object.freeze({ cart: result, guestToken })
      : Object.freeze({ cart: result });
  });
}

export async function setCartLineQuantity(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const parsed = parseSetCartLineQuantityInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    await lockCartLinesAscending(tx, row.id);
    const cart = await loadCartAggregate(tx, row);
    const line = cart.lines.find((l) => l.id === parsed.cartLineId);
    if (!line) {
      throw new CartError("CART_LINE_NOT_FOUND", "Cart line not found.");
    }
    if (line.quantity === parsed.quantity) {
      return cart; // no-op
    }
    await setCartLineQuantityRow(tx, line.id, parsed.quantity);
    await bumpMaterialMutation(tx, row, access, now, options.policy);
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

export async function updateCartLineConfiguration(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  const brandId = assertBrandId(access.brandId);
  const parsed = parseUpdateCartLineConfigurationInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    await lockCartLinesAscending(tx, row.id);
    const cart = await loadCartAggregate(tx, row);
    const line = cart.lines.find((l) => l.id === parsed.cartLineId);
    if (!line) {
      throw new CartError("CART_LINE_NOT_FOUND", "Cart line not found.");
    }

    const currentConfig = cartLineToCanonicalConfiguration(line);
    if (canonicalConfigurationsEqual(currentConfig, parsed.configuration)) {
      return cart; // no-op
    }

    await validateCartLineStructure(tx, brandId, parsed.configuration);

    const equivalent = cart.lines.find(
      (l) =>
        l.id !== line.id &&
        canonicalConfigurationsEqual(
          cartLineToCanonicalConfiguration(l),
          parsed.configuration,
        ),
    );

    if (equivalent) {
      const nextQty = equivalent.quantity + line.quantity;
      if (!Number.isSafeInteger(nextQty) || nextQty <= 0) {
        throw new CartError(
          "CART_INVALID_INPUT",
          "Line quantity overflow.",
          { field: "quantity" },
        );
      }
      await setCartLineQuantityRow(tx, equivalent.id, nextQty);
      await deleteCartLines(tx, [line.id]);
    } else {
      await replaceCartLineConfiguration(tx, line.id, parsed.configuration);
    }

    await bumpMaterialMutation(tx, row, access, now, options.policy);
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

export async function removeCartLine(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const parsed = parseRemoveCartLineInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    await lockCartLinesAscending(tx, row.id);
    const cart = await loadCartAggregate(tx, row);
    const line = cart.lines.find((l) => l.id === parsed.cartLineId);
    if (!line) {
      throw new CartError("CART_LINE_NOT_FOUND", "Cart line not found.");
    }
    await deleteCartLines(tx, [line.id]);
    await bumpMaterialMutation(tx, row, access, now, options.policy);
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

export async function clearCart(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const parsed = parseClearCartInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    await lockCartLinesAscending(tx, row.id);
    const cart = await loadCartAggregate(tx, row);
    if (cart.lines.length === 0 && cart.manualCouponCode === null) {
      return cart; // no-op
    }
    await deleteAllCartLines(tx, row.id);
    await updateCartHeader(tx, {
      cartId: row.id,
      revision: row.revision + BigInt(1),
      updatedAt: now,
      manualCouponCode: null,
      ...(access.kind === "guest"
        ? {
            expiresAt: new Date(
              now.getTime() + requireGuestCartTtlMs(options.policy),
            ),
          }
        : {}),
    });
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

export async function applyCartCoupon(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const parsed = parseApplyCartCouponInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    let canonical: string;
    try {
      canonical = normalizeCouponCode(parsed.couponCode);
    } catch {
      throw new CartError(
        "CART_COUPON_UNKNOWN",
        "Coupon code is not recognized.",
        { field: "couponCode" },
      );
    }
    const coupon = await findCouponByCanonicalCode(tx, canonical);
    if (!coupon) {
      throw new CartError(
        "CART_COUPON_UNKNOWN",
        "Coupon code is not recognized.",
        { field: "couponCode" },
      );
    }
    if (row.manualCouponCode === canonical) {
      const cart = await loadCartAggregate(tx, row);
      return cart; // no-op
    }
    await updateCartHeader(tx, {
      cartId: row.id,
      revision: row.revision + BigInt(1),
      updatedAt: now,
      manualCouponCode: canonical,
      ...(access.kind === "guest"
        ? {
            expiresAt: new Date(
              now.getTime() + requireGuestCartTtlMs(options.policy),
            ),
          }
        : {}),
    });
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

export async function removeCartCoupon(
  persistence: Persistence,
  access: CartAccess,
  input: unknown,
  options: CartOperationOptions = {},
): Promise<Cart> {
  const clock = options.clock ?? systemCartClock;
  const now = clock.now();
  assertBrandId(access.brandId);
  const parsed = parseRemoveCartCouponInput(input);

  return persistence.transaction(async (tx) => {
    const row = await lockAuthorizedCart(tx, access, now, parsed.expectedRevision);
    if (row.manualCouponCode === null) {
      return loadCartAggregate(tx, row); // no-op
    }
    await updateCartHeader(tx, {
      cartId: row.id,
      revision: row.revision + BigInt(1),
      updatedAt: now,
      manualCouponCode: null,
      ...(access.kind === "guest"
        ? {
            expiresAt: new Date(
              now.getTime() + requireGuestCartTtlMs(options.policy),
            ),
          }
        : {}),
    });
    const refreshed = await lockCartForUpdate(tx, row.id);
    return loadCartAggregate(tx, refreshed!);
  });
}

async function lockAuthorizedCart(
  tx: Parameters<Parameters<Persistence["transaction"]>[0]>[0],
  access: CartAccess,
  now: Date,
  expectedRevision: bigint,
): Promise<CartRow> {
  if (access.kind === "customer") {
    const actor = requireCustomerActor(access.actor);
    const found = await findCustomerCartRow(tx, actor.authUserId, access.brandId);
    if (!found) throw new CartError("CART_NOT_FOUND", "Cart not found.");
    const locked = await lockCartForUpdate(tx, found.id);
    if (!locked) throw new CartError("CART_NOT_FOUND", "Cart not found.");
    assertRevisionMatch(locked, expectedRevision);
    return locked;
  }
  if (!access.guestToken) {
    throw new CartError("CART_NOT_FOUND", "Cart not found.");
  }
  const verifier = hashGuestToken(access.guestToken);
  const found = await findGuestCartRowByVerifier(tx, verifier, access.brandId);
  if (!found) throw new CartError("CART_NOT_FOUND", "Cart not found.");
  const locked = await lockCartForUpdate(tx, found.id);
  if (!locked) throw new CartError("CART_NOT_FOUND", "Cart not found.");
  if (!guestVerifiersEqual(locked.guestCredentialVerifier!, access.guestToken)) {
    throw new CartError("CART_NOT_FOUND", "Cart not found.");
  }
  if (isGuestExpired(locked, now)) {
    throw new CartError("CART_EXPIRED", "Guest Cart has expired.");
  }
  assertRevisionMatch(locked, expectedRevision);
  return locked;
}

async function bumpMaterialMutation(
  tx: Parameters<Parameters<Persistence["transaction"]>[0]>[0],
  row: CartRow,
  access: CartAccess,
  now: Date,
  policy: CartPolicy | undefined,
): Promise<void> {
  await updateCartHeader(tx, {
    cartId: row.id,
    revision: row.revision + BigInt(1),
    updatedAt: now,
    ...(access.kind === "guest"
      ? { expiresAt: new Date(now.getTime() + requireGuestCartTtlMs(policy)) }
      : {}),
  });
}
