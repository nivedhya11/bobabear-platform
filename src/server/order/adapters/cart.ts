/**
 * Narrow Cart → Order port (IMP-023).
 *
 * Delegates revision-guarded whole-Cart finalization to Cart-owned semantics.
 */

import type { OrderCartFinalizationDisposition } from "../../../shared/order";
import { finalizeCartAfterOrderMaterialization } from "../../cart/finalize-after-order";
import {
  findCartRowById,
  lockCartForUpdate,
} from "../../cart/repository";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "../assert-role";

export async function peekCartRevision(
  context: PersistenceQueryContext,
  cartId: string,
): Promise<bigint | null> {
  assertApplicationRole(context, "peekCartRevision");
  const row = await findCartRowById(context, cartId);
  return row?.revision ?? null;
}

export async function lockCartForOrder(
  context: PersistenceTransactionContext,
  cartId: string,
): Promise<Readonly<{ cartId: string; revision: bigint }> | null> {
  assertTransactionContext(context, "lockCartForOrder");
  const row = await lockCartForUpdate(context, cartId);
  if (!row) return null;
  return Object.freeze({ cartId: row.id, revision: row.revision });
}

export async function finalizeCartForOrder(
  context: PersistenceTransactionContext,
  input: {
    cartId: string;
    expectedSourceCartRevision: bigint;
    now: Date;
  },
): Promise<OrderCartFinalizationDisposition> {
  assertTransactionContext(context, "finalizeCartForOrder");
  return finalizeCartAfterOrderMaterialization(context, input);
}
