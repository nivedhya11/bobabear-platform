/**
 * Delivery persistence primitives (IMP-031 / ARCH-G24).
 *
 * Lock Delivery FOR UPDATE for material mutations. Never hold locks across
 * provider I/O.
 */
import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  deliveriesTable,
  deliveryAssignmentsTable,
  deliveryProviderCostsTable,
  deliveryProviderObservationsTable,
  deliveryProviderReferencesTable,
  deliveryReturnsTable,
} from "../../platform/database/schema/delivery";
import { ordersTable } from "../../platform/database/schema/order";
import type {
  Delivery,
  DeliveryAssignment,
  DeliveryExecutionStatus,
  DeliveryObservationDisposition,
  DeliveryObservationMeaning,
  DeliveryObservationSource,
  DeliveryProviderCost,
  DeliveryProviderCostKind,
  DeliveryProviderObservation,
  DeliveryProviderReference,
  DeliveryReturn,
  DeliveryReturnStatus,
} from "../../shared/delivery";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type DeliveryRow = typeof deliveriesTable.$inferSelect;
export type DeliveryAssignmentRow = typeof deliveryAssignmentsTable.$inferSelect;
export type DeliveryObservationRow =
  typeof deliveryProviderObservationsTable.$inferSelect;
export type DeliveryReturnRow = typeof deliveryReturnsTable.$inferSelect;
export type DeliveryProviderCostRow =
  typeof deliveryProviderCostsTable.$inferSelect;
export type OrderLifecycleRow = Readonly<{
  id: string;
  status: string;
  revision: bigint;
  updatedAt: Date;
}>;

export function newDeliveryId(): string {
  return randomUUID();
}

export function newDeliveryAssignmentId(): string {
  return randomUUID();
}

export function newDeliveryObservationId(): string {
  return randomUUID();
}

export function newDeliveryReferenceId(): string {
  return randomUUID();
}

export function newDeliveryReturnId(): string {
  return randomUUID();
}

export function newDeliveryProviderCostId(): string {
  return randomUUID();
}

export function newBookingCorrelationId(): string {
  return randomUUID();
}

export function mapDeliveryRow(row: DeliveryRow): Delivery {
  return Object.freeze({
    id: row.id,
    orderId: row.orderId,
    priorDeliveryId: row.priorDeliveryId,
    requestFingerprint: row.requestFingerprint,
    status: row.status as DeliveryExecutionStatus,
    revision: row.revision,
    bookingCorrelationId: row.bookingCorrelationId,
    externalBookingReference: row.externalBookingReference,
    provider: row.provider,
    handoffReference: row.handoffReference,
    proofReference: row.proofReference,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    cancellationCode: row.cancellationCode,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedAt: row.requestedAt,
    bookingOutcomeUnknownAt: row.bookingOutcomeUnknownAt,
    bookedAt: row.bookedAt,
    pickedUpAt: row.pickedUpAt,
    deliveredAt: row.deliveredAt,
    failedAt: row.failedAt,
    cancelledAt: row.cancelledAt,
  });
}

export function mapAssignmentRow(row: DeliveryAssignmentRow): DeliveryAssignment {
  return Object.freeze({
    id: row.id,
    deliveryId: row.deliveryId,
    provider: row.provider,
    assignmentKey: row.assignmentKey,
    courierReference: row.courierReference,
    observedAt: row.observedAt,
    createdAt: row.createdAt,
    supersededAt: row.supersededAt,
  });
}

export function mapObservationRow(
  row: DeliveryObservationRow,
): DeliveryProviderObservation {
  return Object.freeze({
    id: row.id,
    deliveryId: row.deliveryId,
    provider: row.provider,
    observationSource: row.observationSource as DeliveryObservationSource,
    observationKey: row.observationKey,
    providerEventId: row.providerEventId,
    normalizedMeaning: row.normalizedMeaning as DeliveryObservationMeaning,
    disposition: row.disposition as DeliveryObservationDisposition,
    payloadDigest: row.payloadDigest,
    observedAt: row.observedAt,
    createdAt: row.createdAt,
  });
}

export function mapReturnRow(row: DeliveryReturnRow): DeliveryReturn {
  return Object.freeze({
    id: row.id,
    deliveryId: row.deliveryId,
    status: row.status as DeliveryReturnStatus,
    reason: row.reason,
    returnDestination: row.returnDestination,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedAt: row.requestedAt,
    returningAt: row.returningAt,
    returnedAt: row.returnedAt,
    returnFailedAt: row.returnFailedAt,
  });
}

export function mapProviderCostRow(
  row: DeliveryProviderCostRow,
): DeliveryProviderCost {
  return Object.freeze({
    id: row.id,
    deliveryId: row.deliveryId,
    kind: row.kind as DeliveryProviderCostKind,
    amountPaise: row.amountPaise,
    currency: "INR",
    provider: row.provider,
    note: row.note,
    createdAt: row.createdAt,
  });
}

export async function findOrderLifecycleById(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<OrderLifecycleRow | null> {
  assertApplicationRole(context, "findOrderLifecycleById");
  const rows = await context.db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      revision: ordersTable.revision,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDeliveryById(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<DeliveryRow | null> {
  assertApplicationRole(context, "findDeliveryById");
  const rows = await context.db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, deliveryId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findDeliveryByOrderAndFingerprint(
  context: PersistenceQueryContext,
  orderId: string,
  requestFingerprint: string,
): Promise<DeliveryRow | null> {
  assertApplicationRole(context, "findDeliveryByOrderAndFingerprint");
  const rows = await context.db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.orderId, orderId),
        eq(deliveriesTable.requestFingerprint, requestFingerprint),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findActiveDeliveryForOrder(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<DeliveryRow | null> {
  assertApplicationRole(context, "findActiveDeliveryForOrder");
  const rows = await context.db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.orderId, orderId),
        inArray(deliveriesTable.status, [
          "REQUESTED",
          "BOOKING_OUTCOME_UNKNOWN",
          "BOOKED",
          "PICKED_UP",
        ]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function lockDeliveryForUpdate(
  context: PersistenceTransactionContext,
  deliveryId: string,
): Promise<DeliveryRow | null> {
  assertTransactionContext(context, "lockDeliveryForUpdate");
  const rows = await context.db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, deliveryId))
    .for("update");
  return rows[0] ?? null;
}

export async function lockOrderForDelivery(
  context: PersistenceTransactionContext,
  orderId: string,
): Promise<OrderLifecycleRow | null> {
  assertTransactionContext(context, "lockOrderForDelivery");
  const rows = await context.db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      revision: ordersTable.revision,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .for("update");
  return rows[0] ?? null;
}

export async function insertDelivery(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    orderId: string;
    priorDeliveryId: string | null;
    requestFingerprint: string;
    now: Date;
  },
): Promise<DeliveryRow> {
  assertTransactionContext(context, "insertDelivery");
  const rows = await context.db
    .insert(deliveriesTable)
    .values({
      id: input.id,
      orderId: input.orderId,
      priorDeliveryId: input.priorDeliveryId,
      requestFingerprint: input.requestFingerprint,
      status: "REQUESTED",
      revision: BigInt(1),
      bookingCorrelationId: null,
      externalBookingReference: null,
      provider: null,
      handoffReference: null,
      proofReference: null,
      failureCode: null,
      failureReason: null,
      cancellationCode: null,
      cancellationReason: null,
      createdAt: input.now,
      updatedAt: input.now,
      requestedAt: input.now,
      bookingOutcomeUnknownAt: null,
      bookedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      failedAt: null,
      cancelledAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function updateDeliveryRow(
  context: PersistenceTransactionContext,
  deliveryId: string,
  patch: Partial<DeliveryRow>,
): Promise<DeliveryRow> {
  assertTransactionContext(context, "updateDeliveryRow");
  const rows = await context.db
    .update(deliveriesTable)
    .set(patch)
    .where(eq(deliveriesTable.id, deliveryId))
    .returning();
  return rows[0]!;
}

export async function insertAssignment(
  context: PersistenceTransactionContext,
  input: {
    id?: string;
    deliveryId: string;
    provider: string;
    assignmentKey: string;
    courierReference: string | null;
    observedAt: Date;
    createdAt: Date;
  },
): Promise<DeliveryAssignmentRow> {
  assertTransactionContext(context, "insertAssignment");
  const rows = await context.db
    .insert(deliveryAssignmentsTable)
    .values({
      id: input.id ?? newDeliveryAssignmentId(),
      deliveryId: input.deliveryId,
      provider: input.provider,
      assignmentKey: input.assignmentKey,
      courierReference: input.courierReference,
      observedAt: input.observedAt,
      createdAt: input.createdAt,
      supersededAt: null,
    })
    .onConflictDoNothing()
    .returning();
  if (rows[0]) return rows[0];
  const existing = await context.db
    .select()
    .from(deliveryAssignmentsTable)
    .where(
      and(
        eq(deliveryAssignmentsTable.deliveryId, input.deliveryId),
        eq(deliveryAssignmentsTable.assignmentKey, input.assignmentKey),
      ),
    )
    .limit(1);
  return existing[0]!;
}

export async function supersedeOpenAssignments(
  context: PersistenceTransactionContext,
  deliveryId: string,
  exceptAssignmentKey: string,
  now: Date,
): Promise<void> {
  assertTransactionContext(context, "supersedeOpenAssignments");
  await context.db
    .update(deliveryAssignmentsTable)
    .set({ supersededAt: now })
    .where(
      and(
        eq(deliveryAssignmentsTable.deliveryId, deliveryId),
        isNull(deliveryAssignmentsTable.supersededAt),
        ne(deliveryAssignmentsTable.assignmentKey, exceptAssignmentKey),
      ),
    );
}

export async function listAssignmentsForDelivery(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<readonly DeliveryAssignmentRow[]> {
  assertApplicationRole(context, "listAssignmentsForDelivery");
  return context.db
    .select()
    .from(deliveryAssignmentsTable)
    .where(eq(deliveryAssignmentsTable.deliveryId, deliveryId))
    .orderBy(asc(deliveryAssignmentsTable.createdAt));
}

export async function insertObservation(
  context: PersistenceTransactionContext,
  input: {
    id?: string;
    deliveryId: string;
    provider: string;
    observationSource: DeliveryObservationSource;
    observationKey: string;
    providerEventId: string | null;
    normalizedMeaning: DeliveryObservationMeaning;
    disposition: DeliveryObservationDisposition;
    payloadDigest: string | null;
    observedAt: Date;
    createdAt: Date;
  },
): Promise<{ row: DeliveryObservationRow; inserted: boolean }> {
  assertTransactionContext(context, "insertObservation");
  const rows = await context.db
    .insert(deliveryProviderObservationsTable)
    .values({
      id: input.id ?? newDeliveryObservationId(),
      deliveryId: input.deliveryId,
      provider: input.provider,
      observationSource: input.observationSource,
      observationKey: input.observationKey,
      providerEventId: input.providerEventId,
      normalizedMeaning: input.normalizedMeaning,
      disposition: input.disposition,
      payloadDigest: input.payloadDigest,
      observedAt: input.observedAt,
      createdAt: input.createdAt,
    })
    .onConflictDoNothing()
    .returning();
  if (rows[0]) return { row: rows[0], inserted: true };
  const existing = await context.db
    .select()
    .from(deliveryProviderObservationsTable)
    .where(
      and(
        eq(deliveryProviderObservationsTable.provider, input.provider),
        eq(
          deliveryProviderObservationsTable.observationSource,
          input.observationSource,
        ),
        eq(
          deliveryProviderObservationsTable.observationKey,
          input.observationKey,
        ),
      ),
    )
    .limit(1);
  return { row: existing[0]!, inserted: false };
}

export async function insertProviderReferences(
  context: PersistenceTransactionContext,
  deliveryId: string,
  provider: string,
  references: readonly Readonly<{ kind: string; value: string }>[],
  createdAt: Date,
): Promise<void> {
  assertTransactionContext(context, "insertProviderReferences");
  for (const reference of references) {
    await context.db
      .insert(deliveryProviderReferencesTable)
      .values({
        id: newDeliveryReferenceId(),
        deliveryId,
        provider,
        referenceKind: reference.kind,
        referenceValue: reference.value,
        createdAt,
      })
      .onConflictDoNothing({
        target: [
          deliveryProviderReferencesTable.provider,
          deliveryProviderReferencesTable.referenceKind,
          deliveryProviderReferencesTable.referenceValue,
        ],
      });
  }
}

export async function listProviderReferences(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<readonly DeliveryProviderReference[]> {
  assertApplicationRole(context, "listProviderReferences");
  const rows = await context.db
    .select()
    .from(deliveryProviderReferencesTable)
    .where(eq(deliveryProviderReferencesTable.deliveryId, deliveryId))
    .orderBy(asc(deliveryProviderReferencesTable.createdAt));
  return rows.map((row) =>
    Object.freeze({
      id: row.id,
      deliveryId: row.deliveryId,
      provider: row.provider,
      referenceKind: row.referenceKind,
      referenceValue: row.referenceValue,
      createdAt: row.createdAt,
    }),
  );
}

export async function insertReturn(
  context: PersistenceTransactionContext,
  input: {
    id: string;
    deliveryId: string;
    reason: string;
    returnDestination: string;
    now: Date;
  },
): Promise<DeliveryReturnRow> {
  assertTransactionContext(context, "insertReturn");
  const rows = await context.db
    .insert(deliveryReturnsTable)
    .values({
      id: input.id,
      deliveryId: input.deliveryId,
      status: "RETURN_REQUESTED",
      reason: input.reason,
      returnDestination: input.returnDestination,
      failureReason: null,
      createdAt: input.now,
      updatedAt: input.now,
      requestedAt: input.now,
      returningAt: null,
      returnedAt: null,
      returnFailedAt: null,
    })
    .returning();
  return rows[0]!;
}

export async function findReturnById(
  context: PersistenceQueryContext,
  returnId: string,
): Promise<DeliveryReturnRow | null> {
  assertApplicationRole(context, "findReturnById");
  const rows = await context.db
    .select()
    .from(deliveryReturnsTable)
    .where(eq(deliveryReturnsTable.id, returnId))
    .limit(1);
  return rows[0] ?? null;
}

export async function lockReturnForUpdate(
  context: PersistenceTransactionContext,
  returnId: string,
): Promise<DeliveryReturnRow | null> {
  assertTransactionContext(context, "lockReturnForUpdate");
  const rows = await context.db
    .select()
    .from(deliveryReturnsTable)
    .where(eq(deliveryReturnsTable.id, returnId))
    .for("update");
  return rows[0] ?? null;
}

export async function updateReturnRow(
  context: PersistenceTransactionContext,
  returnId: string,
  patch: Partial<DeliveryReturnRow>,
): Promise<DeliveryReturnRow> {
  assertTransactionContext(context, "updateReturnRow");
  const rows = await context.db
    .update(deliveryReturnsTable)
    .set(patch)
    .where(eq(deliveryReturnsTable.id, returnId))
    .returning();
  return rows[0]!;
}

export async function findActiveReturnForDelivery(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<DeliveryReturnRow | null> {
  assertApplicationRole(context, "findActiveReturnForDelivery");
  const rows = await context.db
    .select()
    .from(deliveryReturnsTable)
    .where(
      and(
        eq(deliveryReturnsTable.deliveryId, deliveryId),
        inArray(deliveryReturnsTable.status, ["RETURN_REQUESTED", "RETURNING"]),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertProviderCost(
  context: PersistenceTransactionContext,
  input: {
    id?: string;
    deliveryId: string;
    kind: DeliveryProviderCostKind;
    amountPaise: bigint;
    currency: "INR";
    provider: string | null;
    note: string | null;
    createdAt: Date;
  },
): Promise<DeliveryProviderCostRow> {
  assertTransactionContext(context, "insertProviderCost");
  const rows = await context.db
    .insert(deliveryProviderCostsTable)
    .values({
      id: input.id ?? newDeliveryProviderCostId(),
      deliveryId: input.deliveryId,
      kind: input.kind,
      amountPaise: input.amountPaise,
      currency: input.currency,
      provider: input.provider,
      note: input.note,
      createdAt: input.createdAt,
    })
    .returning();
  return rows[0]!;
}

export async function listProviderCosts(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<readonly DeliveryProviderCostRow[]> {
  assertApplicationRole(context, "listProviderCosts");
  return context.db
    .select()
    .from(deliveryProviderCostsTable)
    .where(eq(deliveryProviderCostsTable.deliveryId, deliveryId))
    .orderBy(asc(deliveryProviderCostsTable.createdAt));
}

export async function listObservationsForDelivery(
  context: PersistenceQueryContext,
  deliveryId: string,
): Promise<readonly DeliveryObservationRow[]> {
  assertApplicationRole(context, "listObservationsForDelivery");
  return context.db
    .select()
    .from(deliveryProviderObservationsTable)
    .where(eq(deliveryProviderObservationsTable.deliveryId, deliveryId))
    .orderBy(desc(deliveryProviderObservationsTable.createdAt));
}

export async function updateObservationDisposition(
  context: PersistenceTransactionContext,
  observationId: string,
  disposition: DeliveryObservationDisposition,
): Promise<DeliveryObservationRow> {
  assertTransactionContext(context, "updateObservationDisposition");
  const rows = await context.db
    .update(deliveryProviderObservationsTable)
    .set({ disposition })
    .where(eq(deliveryProviderObservationsTable.id, observationId))
    .returning();
  return rows[0]!;
}
