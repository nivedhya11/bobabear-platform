/**
 * Cart persistence primitives (IMP-020).
 *
 * Lock order (ordinary): Cart FOR UPDATE → lines by id ASC → children.
 * Ownership ops: lock customer_auth_users FOR UPDATE first, then carts by id ASC.
 */

import { and, asc, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { customerAuthUsers } from "../../platform/database/schema/customer-auth";
import {
  cartLineBundleModifierSelectionsTable,
  cartLineBundleSelectionsTable,
  cartLineModifierSelectionsTable,
  cartLinesTable,
  cartLineUnitsTable,
  cartsTable,
} from "../../platform/database/schema/cart";
import type {
  CanonicalCartLineConfiguration,
  Cart,
  CartBundleSelection,
  CartLine,
  CartModifierSelection,
} from "../../shared/cart";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type CartRow = typeof cartsTable.$inferSelect;

export async function lockCustomerAuthUserForUpdate(
  context: PersistenceTransactionContext,
  customerAuthUserId: string,
): Promise<void> {
  assertTransactionContext(context, "lockCustomerAuthUserForUpdate");
  const rows = await context.db
    .select({ id: customerAuthUsers.id })
    .from(customerAuthUsers)
    .where(eq(customerAuthUsers.id, customerAuthUserId))
    .for("update");
  if (rows.length === 0) {
    // Treat missing auth user as not found at ownership boundary.
    return;
  }
}

export async function lockCartForUpdate(
  context: PersistenceTransactionContext,
  cartId: string,
): Promise<CartRow | null> {
  assertTransactionContext(context, "lockCartForUpdate");
  const rows = await context.db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.id, cartId))
    .for("update");
  return rows[0] ?? null;
}

export async function lockCartsByIdsAscending(
  context: PersistenceTransactionContext,
  cartIds: readonly string[],
): Promise<CartRow[]> {
  assertTransactionContext(context, "lockCartsByIdsAscending");
  const unique = [...new Set(cartIds)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (unique.length === 0) return [];
  const rows = await context.db
    .select()
    .from(cartsTable)
    .where(inArray(cartsTable.id, unique))
    .orderBy(asc(cartsTable.id))
    .for("update");
  return rows;
}

export async function lockCartLinesAscending(
  context: PersistenceTransactionContext,
  cartId: string,
): Promise<(typeof cartLinesTable.$inferSelect)[]> {
  assertTransactionContext(context, "lockCartLinesAscending");
  return context.db
    .select()
    .from(cartLinesTable)
    .where(eq(cartLinesTable.cartId, cartId))
    .orderBy(asc(cartLinesTable.id))
    .for("update");
}

export async function findCustomerCartRow(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
  brandId: string,
): Promise<CartRow | null> {
  assertApplicationRole(context, "findCustomerCartRow");
  const rows = await context.db
    .select()
    .from(cartsTable)
    .where(
      and(
        eq(cartsTable.customerAuthUserId, customerAuthUserId),
        eq(cartsTable.brandId, brandId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findCartRowById(
  context: PersistenceQueryContext,
  cartId: string,
): Promise<CartRow | null> {
  assertApplicationRole(context, "findCartRowById");
  const rows = await context.db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.id, cartId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findGuestCartRowByVerifier(
  context: PersistenceQueryContext,
  verifierHex: string,
  brandId: string,
): Promise<CartRow | null> {
  assertApplicationRole(context, "findGuestCartRowByVerifier");
  const rows = await context.db
    .select()
    .from(cartsTable)
    .where(
      and(
        eq(cartsTable.guestCredentialVerifier, verifierHex),
        eq(cartsTable.brandId, brandId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadLinesForCart(
  context: PersistenceQueryContext,
  cartId: string,
): Promise<readonly CartLine[]> {
  const lineRows = await context.db
    .select()
    .from(cartLinesTable)
    .where(eq(cartLinesTable.cartId, cartId))
    .orderBy(asc(cartLinesTable.id));

  if (lineRows.length === 0) return Object.freeze([]);

  const lineIds = lineRows.map((l) => l.id);
  const modRows = await context.db
    .select()
    .from(cartLineModifierSelectionsTable)
    .where(inArray(cartLineModifierSelectionsTable.cartLineId, lineIds));

  const bundleRows = await context.db
    .select()
    .from(cartLineBundleSelectionsTable)
    .where(inArray(cartLineBundleSelectionsTable.cartLineId, lineIds))
    .orderBy(asc(cartLineBundleSelectionsTable.id));

  const bundleIds = bundleRows.map((b) => b.id);
  const nestedModRows =
    bundleIds.length === 0
      ? []
      : await context.db
          .select()
          .from(cartLineBundleModifierSelectionsTable)
          .where(
            inArray(
              cartLineBundleModifierSelectionsTable.cartLineBundleSelectionId,
              bundleIds,
            ),
          );

  const modsByLine = new Map<string, CartModifierSelection[]>();
  for (const m of modRows) {
    const list = modsByLine.get(m.cartLineId) ?? [];
    list.push(
      Object.freeze({
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
      }),
    );
    modsByLine.set(m.cartLineId, list);
  }

  const nestedByBundle = new Map<
    string,
    CartBundleSelection["modifiers"][number][]
  >();
  for (const m of nestedModRows) {
    const list = nestedByBundle.get(m.cartLineBundleSelectionId) ?? [];
    list.push(
      Object.freeze({
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
      }),
    );
    nestedByBundle.set(m.cartLineBundleSelectionId, list);
  }

  const bundlesByLine = new Map<string, CartBundleSelection[]>();
  for (const b of bundleRows) {
    const list = bundlesByLine.get(b.cartLineId) ?? [];
    list.push(
      Object.freeze({
        id: b.id,
        bundleGroupOptionId: b.bundleGroupOptionId,
        quantity: b.quantity,
        modifiers: Object.freeze(nestedByBundle.get(b.id) ?? []),
      }),
    );
    bundlesByLine.set(b.cartLineId, list);
  }

  return Object.freeze(
    lineRows.map((line) =>
      Object.freeze({
        id: line.id,
        variantId: line.variantId,
        quantity: line.quantity,
        modifiers: Object.freeze(modsByLine.get(line.id) ?? []),
        bundleSelections: Object.freeze(bundlesByLine.get(line.id) ?? []),
      }),
    ),
  );
}

export function toCartView(row: CartRow, lines: readonly CartLine[]): Cart {
  const ownerMode: Cart["ownerMode"] =
    row.customerAuthUserId !== null ? "customer" : "guest";
  return Object.freeze({
    id: row.id,
    brandId: row.brandId,
    ownerMode,
    revision: row.revision,
    manualCouponCode: row.manualCouponCode ?? null,
    expiresAt: row.expiresAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lines,
  });
}

export async function loadCartAggregate(
  context: PersistenceQueryContext,
  row: CartRow,
): Promise<Cart> {
  assertApplicationRole(context, "loadCartAggregate");
  const lines = await loadLinesForCart(context, row.id);
  return toCartView(row, lines);
}

export async function insertCustomerCart(
  context: PersistenceTransactionContext,
  input: {
    brandId: string;
    customerAuthUserId: string;
    now: Date;
  },
): Promise<CartRow> {
  assertTransactionContext(context, "insertCustomerCart");
  const id = randomUUID();
  const rows = await context.db
    .insert(cartsTable)
    .values({
      id,
      brandId: input.brandId,
      customerAuthUserId: input.customerAuthUserId,
      guestCredentialVerifier: null,
      manualCouponCode: null,
      revision: BigInt(1),
      expiresAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  return rows[0]!;
}

export async function insertGuestCart(
  context: PersistenceTransactionContext,
  input: {
    brandId: string;
    guestCredentialVerifier: string;
    expiresAt: Date;
    now: Date;
  },
): Promise<CartRow> {
  assertTransactionContext(context, "insertGuestCart");
  const id = randomUUID();
  const rows = await context.db
    .insert(cartsTable)
    .values({
      id,
      brandId: input.brandId,
      customerAuthUserId: null,
      guestCredentialVerifier: input.guestCredentialVerifier,
      manualCouponCode: null,
      revision: BigInt(1),
      expiresAt: input.expiresAt,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  return rows[0]!;
}

export async function updateCartHeader(
  context: PersistenceTransactionContext,
  input: {
    cartId: string;
    revision: bigint;
    updatedAt: Date;
    expiresAt?: Date | null;
    manualCouponCode?: string | null;
    customerAuthUserId?: string | null;
    guestCredentialVerifier?: string | null;
  },
): Promise<void> {
  assertTransactionContext(context, "updateCartHeader");
  const patch: Partial<CartRow> = {
    revision: input.revision,
    updatedAt: input.updatedAt,
  };
  if ("expiresAt" in input) patch.expiresAt = input.expiresAt ?? null;
  if ("manualCouponCode" in input) {
    patch.manualCouponCode = input.manualCouponCode ?? null;
  }
  if ("customerAuthUserId" in input) {
    patch.customerAuthUserId = input.customerAuthUserId ?? null;
  }
  if ("guestCredentialVerifier" in input) {
    patch.guestCredentialVerifier = input.guestCredentialVerifier ?? null;
  }
  await context.db
    .update(cartsTable)
    .set(patch)
    .where(eq(cartsTable.id, input.cartId));
}

export async function insertCartLineWithConfiguration(
  context: PersistenceTransactionContext,
  input: {
    cartId: string;
    configuration: CanonicalCartLineConfiguration;
    quantity: number;
  },
): Promise<string> {
  assertTransactionContext(context, "insertCartLineWithConfiguration");
  const lineId = randomUUID();
  await context.db.insert(cartLinesTable).values({
    id: lineId,
    cartId: input.cartId,
    variantId: input.configuration.variantId,
    quantity: input.quantity,
  });
  await writeLineConfiguration(context, lineId, input.configuration);
  return lineId;
}

export async function replaceCartLineConfiguration(
  context: PersistenceTransactionContext,
  lineId: string,
  configuration: CanonicalCartLineConfiguration,
): Promise<void> {
  assertTransactionContext(context, "replaceCartLineConfiguration");
  await deleteLineChildren(context, [lineId]);
  await context.db
    .update(cartLinesTable)
    .set({ variantId: configuration.variantId })
    .where(eq(cartLinesTable.id, lineId));
  await writeLineConfiguration(context, lineId, configuration);
}

export async function setCartLineQuantityRow(
  context: PersistenceTransactionContext,
  lineId: string,
  quantity: number,
): Promise<void> {
  assertTransactionContext(context, "setCartLineQuantityRow");
  await context.db
    .update(cartLinesTable)
    .set({ quantity })
    .where(eq(cartLinesTable.id, lineId));
}

export async function appendCartLineUnits(
  context: PersistenceTransactionContext,
  input: { cartId: string; cartLineId: string; quantity: number },
): Promise<void> {
  assertTransactionContext(context, "appendCartLineUnits");
  if (input.quantity === 0) return;
  await context.db.insert(cartLineUnitsTable).values(
    Array.from({ length: input.quantity }, () => ({
      cartId: input.cartId,
      cartLineId: input.cartLineId,
    })),
  );
}

export async function deleteNewestUnitForLine(
  context: PersistenceTransactionContext,
  lineId: string,
): Promise<void> {
  assertTransactionContext(context, "deleteNewestUnitForLine");
  const [unit] = await context.db
    .select({ ordinal: cartLineUnitsTable.ordinal })
    .from(cartLineUnitsTable)
    .where(eq(cartLineUnitsTable.cartLineId, lineId))
    .orderBy(desc(cartLineUnitsTable.ordinal))
    .limit(1)
    .for("update");
  if (!unit) throw new Error("D-371 invariant violation: Cart line has no active unit.");
  await context.db.delete(cartLineUnitsTable).where(eq(cartLineUnitsTable.ordinal, unit.ordinal));
}

export async function deleteNewestUnitForVariant(
  context: PersistenceTransactionContext,
  cartId: string,
  variantId: string,
): Promise<string | null> {
  assertTransactionContext(context, "deleteNewestUnitForVariant");
  const [unit] = await context.db
    .select({ ordinal: cartLineUnitsTable.ordinal, cartLineId: cartLineUnitsTable.cartLineId })
    .from(cartLineUnitsTable)
    .innerJoin(cartLinesTable, eq(cartLineUnitsTable.cartLineId, cartLinesTable.id))
    .where(and(eq(cartLineUnitsTable.cartId, cartId), eq(cartLinesTable.variantId, variantId)))
    .orderBy(desc(cartLineUnitsTable.ordinal))
    .limit(1)
    .for("update");
  if (!unit) return null;
  await context.db.delete(cartLineUnitsTable).where(eq(cartLineUnitsTable.ordinal, unit.ordinal));
  return unit.cartLineId;
}

export async function moveCartLineUnits(
  context: PersistenceTransactionContext,
  input: { fromCartId: string; fromLineId: string; toCartId: string; toLineId: string },
): Promise<void> {
  assertTransactionContext(context, "moveCartLineUnits");
  await context.db
    .update(cartLineUnitsTable)
    .set({ cartId: input.toCartId, cartLineId: input.toLineId })
    .where(and(eq(cartLineUnitsTable.cartId, input.fromCartId), eq(cartLineUnitsTable.cartLineId, input.fromLineId)));
}

export async function deleteCartLines(
  context: PersistenceTransactionContext,
  lineIds: readonly string[],
): Promise<void> {
  assertTransactionContext(context, "deleteCartLines");
  if (lineIds.length === 0) return;
  // Children cascade from cart_lines delete.
  await context.db
    .delete(cartLinesTable)
    .where(inArray(cartLinesTable.id, [...lineIds]));
}

export async function deleteAllCartLines(
  context: PersistenceTransactionContext,
  cartId: string,
): Promise<void> {
  assertTransactionContext(context, "deleteAllCartLines");
  await context.db
    .delete(cartLinesTable)
    .where(eq(cartLinesTable.cartId, cartId));
}

export async function deleteCartById(
  context: PersistenceTransactionContext,
  cartId: string,
): Promise<void> {
  assertTransactionContext(context, "deleteCartById");
  await context.db.delete(cartsTable).where(eq(cartsTable.id, cartId));
}

export async function deleteExpiredGuestCarts(
  context: PersistenceTransactionContext,
  now: Date,
  limit = 100,
): Promise<number> {
  assertTransactionContext(context, "deleteExpiredGuestCarts");
  const rows = await context.db
    .select({ id: cartsTable.id })
    .from(cartsTable)
    .where(
      and(isNotNull(cartsTable.expiresAt), lt(cartsTable.expiresAt, now)),
    )
    .orderBy(asc(cartsTable.expiresAt))
    .limit(limit)
    .for("update");
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.id);
  await context.db.delete(cartsTable).where(inArray(cartsTable.id, ids));
  return ids.length;
}

async function deleteLineChildren(
  context: PersistenceTransactionContext,
  lineIds: readonly string[],
): Promise<void> {
  if (lineIds.length === 0) return;
  const bundleRows = await context.db
    .select({ id: cartLineBundleSelectionsTable.id })
    .from(cartLineBundleSelectionsTable)
    .where(inArray(cartLineBundleSelectionsTable.cartLineId, [...lineIds]));
  const bundleIds = bundleRows.map((b) => b.id);
  if (bundleIds.length > 0) {
    await context.db
      .delete(cartLineBundleModifierSelectionsTable)
      .where(
        inArray(
          cartLineBundleModifierSelectionsTable.cartLineBundleSelectionId,
          bundleIds,
        ),
      );
  }
  await context.db
    .delete(cartLineBundleSelectionsTable)
    .where(inArray(cartLineBundleSelectionsTable.cartLineId, [...lineIds]));
  await context.db
    .delete(cartLineModifierSelectionsTable)
    .where(inArray(cartLineModifierSelectionsTable.cartLineId, [...lineIds]));
}

async function writeLineConfiguration(
  context: PersistenceTransactionContext,
  lineId: string,
  configuration: CanonicalCartLineConfiguration,
): Promise<void> {
  if (configuration.modifiers.length > 0) {
    await context.db.insert(cartLineModifierSelectionsTable).values(
      configuration.modifiers.map((m) => ({
        cartLineId: lineId,
        variantModifierGroupId: m.variantModifierGroupId,
        modifierGroupOptionId: m.modifierGroupOptionId,
        quantity: m.quantity,
      })),
    );
  }
  for (const sel of configuration.bundleSelections) {
    const bundleSelectionId = randomUUID();
    await context.db.insert(cartLineBundleSelectionsTable).values({
      id: bundleSelectionId,
      cartLineId: lineId,
      bundleGroupOptionId: sel.bundleGroupOptionId,
      quantity: sel.quantity,
    });
    if (sel.modifiers.length > 0) {
      await context.db.insert(cartLineBundleModifierSelectionsTable).values(
        sel.modifiers.map((m) => ({
          cartLineBundleSelectionId: bundleSelectionId,
          variantModifierGroupId: m.variantModifierGroupId,
          modifierGroupOptionId: m.modifierGroupOptionId,
          quantity: m.quantity,
        })),
      );
    }
  }
}
