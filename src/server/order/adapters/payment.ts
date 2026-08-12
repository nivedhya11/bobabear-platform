/**
 * Narrow Payment → Order port (IMP-023).
 *
 * Read-only local authority for positive/zero materialization checks.
 * No provider calls. No Payment mutation.
 */

import { eq } from "drizzle-orm";

import { paymentsTable } from "../../../platform/database/schema/payment";
import {
  findPaymentBySnapshotId,
  lockPaymentForUpdate,
  type PaymentRow,
} from "../../payment/repository";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "../assert-role";

export type OrderPaymentProvenance = Readonly<{
  paymentId: string;
  checkoutId: string;
  checkoutSnapshotId: string;
  status: string;
}>;

export async function findSucceededPaymentForSnapshot(
  context: PersistenceQueryContext,
  checkoutSnapshotId: string,
): Promise<OrderPaymentProvenance | null> {
  assertApplicationRole(context, "findSucceededPaymentForSnapshot");
  const row = await findPaymentBySnapshotId(context, checkoutSnapshotId);
  if (!row) return null;
  return mapPayment(row);
}

export async function lockPaymentForOrder(
  context: PersistenceTransactionContext,
  paymentId: string,
): Promise<OrderPaymentProvenance | null> {
  assertTransactionContext(context, "lockPaymentForOrder");
  const row = await lockPaymentForUpdate(context, paymentId);
  if (!row) return null;
  return mapPayment(row);
}

export async function paymentExistsForSnapshot(
  context: PersistenceQueryContext,
  checkoutSnapshotId: string,
): Promise<boolean> {
  assertApplicationRole(context, "paymentExistsForSnapshot");
  const rows = await context.db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(eq(paymentsTable.checkoutSnapshotId, checkoutSnapshotId))
    .limit(1);
  return rows.length > 0;
}

function mapPayment(row: PaymentRow): OrderPaymentProvenance {
  return Object.freeze({
    paymentId: row.id,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    status: row.status,
  });
}
