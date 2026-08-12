/**
 * Narrow Checkout → Order port (IMP-023).
 *
 * Provides trusted completed-Checkout provenance for materialization and
 * projections. No caller-built snapshot objects.
 */

import { eq } from "drizzle-orm";

import {
  checkoutSnapshotsTable,
  checkoutsTable,
} from "../../../platform/database/schema/checkout";
import type { CheckoutSnapshot } from "../../../shared/checkout";
import {
  findCheckoutRowById,
  loadActiveSnapshot,
  lockCheckoutForUpdate,
  type CheckoutRow,
  type CheckoutSnapshotRow,
} from "../../checkout/repository";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "../assert-role";

export type OrderCheckoutProvenance = Readonly<{
  checkoutId: string;
  customerAuthUserId: string;
  brandId: string;
  cartId: string;
  status: string;
  activeSnapshotId: string | null;
  sourceCartRevision: bigint;
  revision: bigint;
}>;

export type OrderSnapshotProvenance = Readonly<{
  snapshotId: string;
  checkoutId: string;
  sourceCartRevision: bigint;
  selectedOutletId: string;
  grandTotalPaise: bigint;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  label: string | null;
}>;

export async function peekCheckoutForOrder(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<OrderCheckoutProvenance | null> {
  assertApplicationRole(context, "peekCheckoutForOrder");
  const row = await findCheckoutRowById(context, checkoutId);
  if (!row) return null;
  return mapCheckoutProvenance(row);
}

export async function lockCheckoutForOrder(
  context: PersistenceTransactionContext,
  checkoutId: string,
): Promise<OrderCheckoutProvenance | null> {
  assertTransactionContext(context, "lockCheckoutForOrder");
  const row = await lockCheckoutForUpdate(context, checkoutId);
  if (!row) return null;
  return mapCheckoutProvenance(row);
}

export async function loadSnapshotRowForOrder(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<OrderSnapshotProvenance | null> {
  assertApplicationRole(context, "loadSnapshotRowForOrder");
  const rows = await context.db
    .select()
    .from(checkoutSnapshotsTable)
    .where(eq(checkoutSnapshotsTable.id, snapshotId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return mapSnapshotProvenance(row);
}

export async function loadFullSnapshotForOrder(
  context: PersistenceQueryContext,
  snapshotId: string,
): Promise<CheckoutSnapshot | null> {
  assertApplicationRole(context, "loadFullSnapshotForOrder");
  return loadActiveSnapshot(context, snapshotId);
}

export async function loadCheckoutBrandId(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<string | null> {
  assertApplicationRole(context, "loadCheckoutBrandId");
  const rows = await context.db
    .select({ brandId: checkoutsTable.brandId })
    .from(checkoutsTable)
    .where(eq(checkoutsTable.id, checkoutId))
    .limit(1);
  return rows[0]?.brandId ?? null;
}

function mapCheckoutProvenance(row: CheckoutRow): OrderCheckoutProvenance {
  return Object.freeze({
    checkoutId: row.id,
    customerAuthUserId: row.customerAuthUserId,
    brandId: row.brandId,
    cartId: row.cartId,
    status: row.status,
    activeSnapshotId: row.activeSnapshotId,
    sourceCartRevision: row.sourceCartRevision,
    revision: row.revision,
  });
}

function mapSnapshotProvenance(row: CheckoutSnapshotRow): OrderSnapshotProvenance {
  return Object.freeze({
    snapshotId: row.id,
    checkoutId: row.checkoutId,
    sourceCartRevision: row.sourceCartRevision,
    selectedOutletId: row.selectedOutletId,
    grandTotalPaise: row.grandTotalPaise,
    currency: row.currency,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    landmark: row.landmark,
    locality: row.locality,
    city: row.city,
    stateCode: row.stateCode,
    postalCode: row.postalCode,
    label: row.label,
  });
}
