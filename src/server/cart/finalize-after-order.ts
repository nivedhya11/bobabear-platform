/**
 * Cart finalization after Order materialization (IMP-023).
 *
 * Clears lines + coupon and bumps revision once when the Cart revision still
 * matches the Checkout snapshot's sourceCartRevision. No CustomerActor.
 * Replay-safe: callers must not invoke when Order already existed.
 */

import type { OrderCartFinalizationDisposition } from "../../shared/order";
import type { PersistenceTransactionContext } from "../persistence/types";
import {
  deleteAllCartLines,
  findCartRowById,
  lockCartForUpdate,
  lockCartLinesAscending,
  updateCartHeader,
} from "./repository";
import { assertTransactionContext } from "./assert-role";

export async function finalizeCartAfterOrderMaterialization(
  context: PersistenceTransactionContext,
  input: {
    cartId: string;
    expectedSourceCartRevision: bigint;
    now: Date;
  },
): Promise<OrderCartFinalizationDisposition> {
  assertTransactionContext(context, "finalizeCartAfterOrderMaterialization");

  const existing = await findCartRowById(context, input.cartId);
  if (!existing) {
    return "PRESERVED_UNAVAILABLE";
  }

  const locked = await lockCartForUpdate(context, input.cartId);
  if (!locked) {
    return "PRESERVED_UNAVAILABLE";
  }

  if (locked.revision !== input.expectedSourceCartRevision) {
    return "PRESERVED_CHANGED";
  }

  await lockCartLinesAscending(context, locked.id);
  await deleteAllCartLines(context, locked.id);
  await updateCartHeader(context, {
    cartId: locked.id,
    revision: locked.revision + BigInt(1),
    updatedAt: input.now,
    manualCouponCode: null,
  });

  return "CLEARED";
}
