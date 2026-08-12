/**
 * Order persistence primitives (IMP-023).
 *
 * Not exported as domain CRUD. Lock helpers use FOR UPDATE.
 */

import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  checkoutSnapshotsTable,
  checkoutsTable,
} from "../../platform/database/schema/checkout";
import { ordersTable } from "../../platform/database/schema/order";
import type {
  Order,
  OrderCancellationReasonCode,
  OrderPaymentProvenanceKind,
  OrderStatus,
} from "../../shared/order";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type OrderRow = typeof ordersTable.$inferSelect;

export function newOrderId(): string {
  return randomUUID();
}

export function mapOrderRow(row: OrderRow): Order {
  return Object.freeze({
    id: row.id,
    orderNumber: row.orderNumber,
    checkoutId: row.checkoutId,
    checkoutSnapshotId: row.checkoutSnapshotId,
    paymentProvenanceKind:
      row.paymentProvenanceKind as OrderPaymentProvenanceKind,
    paymentId: row.paymentId,
    status: row.status as OrderStatus,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    acceptedAt: row.acceptedAt,
    acceptedByWorkforceUserId: row.acceptedByWorkforceUserId,
    fulfilledAt: row.fulfilledAt,
    fulfilledByWorkforceUserId: row.fulfilledByWorkforceUserId,
    cancelledAt: row.cancelledAt,
    cancelledByWorkforceUserId: row.cancelledByWorkforceUserId,
    cancellationReasonCode:
      row.cancellationReasonCode as OrderCancellationReasonCode | null,
  });
}

export async function findOrderById(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<OrderRow | null> {
  assertApplicationRole(context, "findOrderById");
  const rows = await context.db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findOrderByCheckoutId(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<OrderRow | null> {
  assertApplicationRole(context, "findOrderByCheckoutId");
  const rows = await context.db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.checkoutId, checkoutId))
    .limit(1);
  return rows[0] ?? null;
}

export async function lockOrderForUpdate(
  context: PersistenceTransactionContext,
  orderId: string,
): Promise<OrderRow | null> {
  assertTransactionContext(context, "lockOrderForUpdate");
  const rows = await context.db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .for("update");
  return rows[0] ?? null;
}

export async function insertPlacedOrder(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    orderNumber: string;
    checkoutId: string;
    checkoutSnapshotId: string;
    paymentProvenanceKind: OrderPaymentProvenanceKind;
    paymentId: string | null;
    now: Date;
  },
): Promise<OrderRow> {
  assertTransactionContext(context, "insertPlacedOrder");
  const rows = await context.db
    .insert(ordersTable)
    .values({
      id: input.id,
      orderNumber: input.orderNumber,
      checkoutId: input.checkoutId,
      checkoutSnapshotId: input.checkoutSnapshotId,
      paymentProvenanceKind: input.paymentProvenanceKind,
      paymentId: input.paymentId,
      status: "PLACED",
      revision: BigInt(1),
      createdAt: input.now,
      updatedAt: input.now,
      acceptedAt: null,
      acceptedByWorkforceUserId: null,
      fulfilledAt: null,
      fulfilledByWorkforceUserId: null,
      cancelledAt: null,
      cancelledByWorkforceUserId: null,
      cancellationReasonCode: null,
    })
    .returning();
  return rows[0]!;
}

export async function updateOrderLifecycle(
  context: PersistenceTransactionContext,
  orderId: string,
  patch: {
    status: OrderStatus;
    revision: bigint;
    updatedAt: Date;
    acceptedAt?: Date | null;
    acceptedByWorkforceUserId?: string | null;
    fulfilledAt?: Date | null;
    fulfilledByWorkforceUserId?: string | null;
    cancelledAt?: Date | null;
    cancelledByWorkforceUserId?: string | null;
    cancellationReasonCode?: OrderCancellationReasonCode | null;
  },
): Promise<OrderRow> {
  assertTransactionContext(context, "updateOrderLifecycle");
  const rows = await context.db
    .update(ordersTable)
    .set({
      status: patch.status,
      revision: patch.revision,
      updatedAt: patch.updatedAt,
      ...(patch.acceptedAt !== undefined
        ? { acceptedAt: patch.acceptedAt }
        : {}),
      ...(patch.acceptedByWorkforceUserId !== undefined
        ? { acceptedByWorkforceUserId: patch.acceptedByWorkforceUserId }
        : {}),
      ...(patch.fulfilledAt !== undefined
        ? { fulfilledAt: patch.fulfilledAt }
        : {}),
      ...(patch.fulfilledByWorkforceUserId !== undefined
        ? { fulfilledByWorkforceUserId: patch.fulfilledByWorkforceUserId }
        : {}),
      ...(patch.cancelledAt !== undefined
        ? { cancelledAt: patch.cancelledAt }
        : {}),
      ...(patch.cancelledByWorkforceUserId !== undefined
        ? { cancelledByWorkforceUserId: patch.cancelledByWorkforceUserId }
        : {}),
      ...(patch.cancellationReasonCode !== undefined
        ? { cancellationReasonCode: patch.cancellationReasonCode }
        : {}),
    })
    .where(eq(ordersTable.id, orderId))
    .returning();
  return rows[0]!;
}

export type CustomerOrderListRow = Readonly<{
  order: OrderRow;
  brandId: string;
  customerAuthUserId: string;
  selectedOutletId: string;
  grandTotalPaise: bigint;
  currency: string;
}>;

export async function listOrdersForCustomer(
  context: PersistenceQueryContext,
  input: {
    customerAuthUserId: string;
    limit: number;
    cursor?: Readonly<{ createdAt: Date; id: string }>;
  },
): Promise<CustomerOrderListRow[]> {
  assertApplicationRole(context, "listOrdersForCustomer");

  const conditions = [
    eq(checkoutsTable.customerAuthUserId, input.customerAuthUserId),
  ];
  if (input.cursor) {
    conditions.push(
      or(
        lt(ordersTable.createdAt, input.cursor.createdAt),
        and(
          eq(ordersTable.createdAt, input.cursor.createdAt),
          lt(ordersTable.id, input.cursor.id),
        ),
      )!,
    );
  }

  const rows = await context.db
    .select({
      order: ordersTable,
      brandId: checkoutsTable.brandId,
      customerAuthUserId: checkoutsTable.customerAuthUserId,
      selectedOutletId: checkoutSnapshotsTable.selectedOutletId,
      grandTotalPaise: checkoutSnapshotsTable.grandTotalPaise,
      currency: checkoutSnapshotsTable.currency,
    })
    .from(ordersTable)
    .innerJoin(checkoutsTable, eq(ordersTable.checkoutId, checkoutsTable.id))
    .innerJoin(
      checkoutSnapshotsTable,
      eq(ordersTable.checkoutSnapshotId, checkoutSnapshotsTable.id),
    )
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
    .limit(input.limit);

  return rows.map((r) =>
    Object.freeze({
      order: r.order,
      brandId: r.brandId,
      customerAuthUserId: r.customerAuthUserId,
      selectedOutletId: r.selectedOutletId,
      grandTotalPaise: r.grandTotalPaise,
      currency: r.currency,
    }),
  );
}

export type WorkforceOrderListRow = CustomerOrderListRow;

export async function searchOrdersForWorkforce(
  context: PersistenceQueryContext,
  input: {
    limit: number;
    orderNumber?: string;
    status?: OrderStatus;
    createdFrom?: Date;
    createdTo?: Date;
    brandId?: string;
    outletId?: string;
    /** When set, restrict to these outlet ids (authorized scope). Empty = no rows. */
    permittedOutletIds: readonly string[] | null;
    cursor?: Readonly<{ createdAt: Date; id: string }>;
  },
): Promise<WorkforceOrderListRow[]> {
  assertApplicationRole(context, "searchOrdersForWorkforce");

  if (input.permittedOutletIds !== null && input.permittedOutletIds.length === 0) {
    return [];
  }

  const conditions = [];
  if (input.orderNumber) {
    conditions.push(eq(ordersTable.orderNumber, input.orderNumber));
  }
  if (input.status) {
    conditions.push(eq(ordersTable.status, input.status));
  }
  if (input.createdFrom) {
    conditions.push(gte(ordersTable.createdAt, input.createdFrom));
  }
  if (input.createdTo) {
    conditions.push(lte(ordersTable.createdAt, input.createdTo));
  }
  if (input.brandId) {
    conditions.push(eq(checkoutsTable.brandId, input.brandId));
  }
  if (input.outletId) {
    conditions.push(
      eq(checkoutSnapshotsTable.selectedOutletId, input.outletId),
    );
  }
  if (input.permittedOutletIds !== null) {
    conditions.push(
      inArray(
        checkoutSnapshotsTable.selectedOutletId,
        [...input.permittedOutletIds],
      ),
    );
  }
  if (input.cursor) {
    conditions.push(
      or(
        lt(ordersTable.createdAt, input.cursor.createdAt),
        and(
          eq(ordersTable.createdAt, input.cursor.createdAt),
          lt(ordersTable.id, input.cursor.id),
        ),
      )!,
    );
  }

  const rows = await context.db
    .select({
      order: ordersTable,
      brandId: checkoutsTable.brandId,
      customerAuthUserId: checkoutsTable.customerAuthUserId,
      selectedOutletId: checkoutSnapshotsTable.selectedOutletId,
      grandTotalPaise: checkoutSnapshotsTable.grandTotalPaise,
      currency: checkoutSnapshotsTable.currency,
    })
    .from(ordersTable)
    .innerJoin(checkoutsTable, eq(ordersTable.checkoutId, checkoutsTable.id))
    .innerJoin(
      checkoutSnapshotsTable,
      eq(ordersTable.checkoutSnapshotId, checkoutSnapshotsTable.id),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
    .limit(input.limit);

  return rows.map((r) =>
    Object.freeze({
      order: r.order,
      brandId: r.brandId,
      customerAuthUserId: r.customerAuthUserId,
      selectedOutletId: r.selectedOutletId,
      grandTotalPaise: r.grandTotalPaise,
      currency: r.currency,
    }),
  );
}

export async function findCompletedCheckoutsMissingOrder(
  context: PersistenceQueryContext,
  input: {
    limit: number;
    cursor?: Readonly<{ lastCheckoutUpdatedAt: Date; lastCheckoutId: string }>;
  },
): Promise<
  ReadonlyArray<
    Readonly<{
      checkoutId: string;
      updatedAt: Date;
    }>
  >
> {
  assertApplicationRole(context, "findCompletedCheckoutsMissingOrder");

  const conditions = [
    eq(checkoutsTable.status, "COMPLETED"),
    isNull(ordersTable.id),
  ];
  if (input.cursor) {
    conditions.push(
      or(
        gt(checkoutsTable.updatedAt, input.cursor.lastCheckoutUpdatedAt),
        and(
          eq(checkoutsTable.updatedAt, input.cursor.lastCheckoutUpdatedAt),
          gt(checkoutsTable.id, input.cursor.lastCheckoutId),
        ),
      )!,
    );
  }

  const rows = await context.db
    .select({
      checkoutId: checkoutsTable.id,
      updatedAt: checkoutsTable.updatedAt,
    })
    .from(checkoutsTable)
    .leftJoin(ordersTable, eq(ordersTable.checkoutId, checkoutsTable.id))
    .where(and(...conditions))
    .orderBy(asc(checkoutsTable.updatedAt), asc(checkoutsTable.id))
    .limit(input.limit);

  return rows.map((r) =>
    Object.freeze({ checkoutId: r.checkoutId, updatedAt: r.updatedAt }),
  );
}
