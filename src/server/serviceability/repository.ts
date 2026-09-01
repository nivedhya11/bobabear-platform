/**
 * Serviceability persistence primitives (IMP-019).
 * Repositories do not decide RBAC, routing winners, or business no-op semantics.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { outletsTable } from "../../platform/database/schema/organizations";
import {
  outletServiceabilityConfigsTable,
  outletServiceabilityPinsTable,
} from "../../platform/database/schema/serviceability";
import type {
  ServiceabilityCandidate,
  ServiceabilityDistancePolicy,
} from "../../shared/serviceability";
import {
  isDistancePolicyConfigured,
} from "../../shared/serviceability";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type ServiceabilityConfigRow = Readonly<{
  outletId: string;
  routingPriority: number;
  revision: bigint;
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
}>;

function readDistancePolicy(row: Readonly<{
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
}>): ServiceabilityDistancePolicy | null {
  if (
    !isDistancePolicyConfigured({
      serviceOriginLatitude: row.serviceOriginLatitude,
      serviceOriginLongitude: row.serviceOriginLongitude,
      maxServiceDistanceMeters: row.maxServiceDistanceMeters,
    })
  ) {
    return null;
  }
  return Object.freeze({
    serviceOriginLatitude: row.serviceOriginLatitude!,
    serviceOriginLongitude: row.serviceOriginLongitude!,
    maxServiceDistanceMeters: row.maxServiceDistanceMeters!,
  });
}

function mapConfigRow(row: Readonly<{
  outletId: string;
  routingPriority: number;
  revision: bigint;
  serviceOriginLatitude: string | null;
  serviceOriginLongitude: string | null;
  maxServiceDistanceMeters: number | null;
}>): ServiceabilityConfigRow {
  return Object.freeze({
    outletId: row.outletId,
    routingPriority: row.routingPriority,
    revision: row.revision,
    serviceOriginLatitude: row.serviceOriginLatitude,
    serviceOriginLongitude: row.serviceOriginLongitude,
    maxServiceDistanceMeters: row.maxServiceDistanceMeters,
  });
}

export async function lockOutletForServiceabilityMutation(
  context: PersistenceTransactionContext,
  outletId: string,
): Promise<void> {
  assertTransactionContext(context, "lockOutletForServiceabilityMutation");
  await context.db
    .select({ id: outletsTable.id })
    .from(outletsTable)
    .where(eq(outletsTable.id, outletId))
    .for("update");
}

export async function findServiceabilityConfig(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<ServiceabilityConfigRow | null> {
  assertApplicationRole(context, "findServiceabilityConfig");
  const rows = await context.db
    .select({
      outletId: outletServiceabilityConfigsTable.outletId,
      routingPriority: outletServiceabilityConfigsTable.routingPriority,
      revision: outletServiceabilityConfigsTable.revision,
      serviceOriginLatitude: outletServiceabilityConfigsTable.serviceOriginLatitude,
      serviceOriginLongitude: outletServiceabilityConfigsTable.serviceOriginLongitude,
      maxServiceDistanceMeters: outletServiceabilityConfigsTable.maxServiceDistanceMeters,
    })
    .from(outletServiceabilityConfigsTable)
    .where(eq(outletServiceabilityConfigsTable.outletId, outletId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return mapConfigRow({
    outletId: row.outletId,
    routingPriority: row.routingPriority,
    revision: row.revision,
    serviceOriginLatitude: row.serviceOriginLatitude,
    serviceOriginLongitude: row.serviceOriginLongitude,
    maxServiceDistanceMeters: row.maxServiceDistanceMeters,
  });
}

export async function lockServiceabilityConfigForUpdate(
  context: PersistenceTransactionContext,
  outletId: string,
): Promise<ServiceabilityConfigRow | null> {
  assertTransactionContext(context, "lockServiceabilityConfigForUpdate");
  const rows = await context.db
    .select({
      outletId: outletServiceabilityConfigsTable.outletId,
      routingPriority: outletServiceabilityConfigsTable.routingPriority,
      revision: outletServiceabilityConfigsTable.revision,
      serviceOriginLatitude: outletServiceabilityConfigsTable.serviceOriginLatitude,
      serviceOriginLongitude: outletServiceabilityConfigsTable.serviceOriginLongitude,
      maxServiceDistanceMeters: outletServiceabilityConfigsTable.maxServiceDistanceMeters,
    })
    .from(outletServiceabilityConfigsTable)
    .where(eq(outletServiceabilityConfigsTable.outletId, outletId))
    .for("update");
  const row = rows[0];
  if (!row) return null;
  return mapConfigRow({
    outletId: row.outletId,
    routingPriority: row.routingPriority,
    revision: row.revision,
    serviceOriginLatitude: row.serviceOriginLatitude,
    serviceOriginLongitude: row.serviceOriginLongitude,
    maxServiceDistanceMeters: row.maxServiceDistanceMeters,
  });
}

export async function listServiceabilityPins(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<readonly string[]> {
  assertApplicationRole(context, "listServiceabilityPins");
  const rows = await context.db
    .select({ postalCode: outletServiceabilityPinsTable.postalCode })
    .from(outletServiceabilityPinsTable)
    .where(eq(outletServiceabilityPinsTable.outletId, outletId))
    .orderBy(asc(outletServiceabilityPinsTable.postalCode));
  return Object.freeze(rows.map((r) => r.postalCode));
}

export async function insertServiceabilityConfig(
  context: PersistenceTransactionContext,
  input: {
    outletId: string;
    routingPriority: number;
    revision: bigint;
  },
): Promise<void> {
  assertTransactionContext(context, "insertServiceabilityConfig");
  await context.db.insert(outletServiceabilityConfigsTable).values({
    outletId: input.outletId,
    routingPriority: input.routingPriority,
    revision: input.revision,
  });
}

export async function updateServiceabilityConfig(
  context: PersistenceTransactionContext,
  input: {
    outletId: string;
    routingPriority: number;
    revision: bigint;
    serviceOriginLatitude?: string | null;
    serviceOriginLongitude?: string | null;
    maxServiceDistanceMeters?: number | null;
  },
): Promise<void> {
  assertTransactionContext(context, "updateServiceabilityConfig");
  await context.db
    .update(outletServiceabilityConfigsTable)
    .set({
      routingPriority: input.routingPriority,
      revision: input.revision,
      ...(input.serviceOriginLatitude !== undefined
        ? { serviceOriginLatitude: input.serviceOriginLatitude }
        : {}),
      ...(input.serviceOriginLongitude !== undefined
        ? { serviceOriginLongitude: input.serviceOriginLongitude }
        : {}),
      ...(input.maxServiceDistanceMeters !== undefined
        ? { maxServiceDistanceMeters: input.maxServiceDistanceMeters }
        : {}),
    })
    .where(eq(outletServiceabilityConfigsTable.outletId, input.outletId));
}

export async function insertServiceabilityPins(
  context: PersistenceTransactionContext,
  outletId: string,
  postalCodes: readonly string[],
): Promise<void> {
  assertTransactionContext(context, "insertServiceabilityPins");
  if (postalCodes.length === 0) return;
  await context.db.insert(outletServiceabilityPinsTable).values(
    postalCodes.map((postalCode) => ({
      outletId,
      postalCode,
    })),
  );
}

export async function deleteServiceabilityPins(
  context: PersistenceTransactionContext,
  outletId: string,
  postalCodes: readonly string[],
): Promise<void> {
  assertTransactionContext(context, "deleteServiceabilityPins");
  if (postalCodes.length === 0) return;
  await context.db
    .delete(outletServiceabilityPinsTable)
    .where(
      and(
        eq(outletServiceabilityPinsTable.outletId, outletId),
        inArray(outletServiceabilityPinsTable.postalCode, [...postalCodes]),
      ),
    );
}

export async function deleteAllServiceabilityPins(
  context: PersistenceTransactionContext,
  outletId: string,
): Promise<void> {
  assertTransactionContext(context, "deleteAllServiceabilityPins");
  await context.db
    .delete(outletServiceabilityPinsTable)
    .where(eq(outletServiceabilityPinsTable.outletId, outletId));
}

/**
 * Brand-scoped geographic candidates for a PIN, ordered by
 * routing_priority ASC, outlet_id ASC.
 */
export async function findServiceabilityCandidates(
  context: PersistenceQueryContext,
  input: { brandId: string; postalCode: string },
): Promise<readonly ServiceabilityCandidate[]> {
  assertApplicationRole(context, "findServiceabilityCandidates");
  const rows = await context.db
    .select({
      outletId: outletServiceabilityPinsTable.outletId,
      routingPriority: outletServiceabilityConfigsTable.routingPriority,
      serviceOriginLatitude: outletServiceabilityConfigsTable.serviceOriginLatitude,
      serviceOriginLongitude: outletServiceabilityConfigsTable.serviceOriginLongitude,
      maxServiceDistanceMeters: outletServiceabilityConfigsTable.maxServiceDistanceMeters,
    })
    .from(outletServiceabilityPinsTable)
    .innerJoin(
      outletServiceabilityConfigsTable,
      eq(
        outletServiceabilityPinsTable.outletId,
        outletServiceabilityConfigsTable.outletId,
      ),
    )
    .innerJoin(
      outletsTable,
      eq(outletServiceabilityPinsTable.outletId, outletsTable.id),
    )
    .where(
      and(
        eq(outletServiceabilityPinsTable.postalCode, input.postalCode),
        eq(outletsTable.brandId, input.brandId),
      ),
    )
    .orderBy(
      asc(outletServiceabilityConfigsTable.routingPriority),
      asc(outletServiceabilityPinsTable.outletId),
    );

  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        outletId: row.outletId,
        routingPriority: row.routingPriority,
        distancePolicy: readDistancePolicy({
          serviceOriginLatitude: row.serviceOriginLatitude,
          serviceOriginLongitude: row.serviceOriginLongitude,
          maxServiceDistanceMeters: row.maxServiceDistanceMeters,
        }),
      }),
    ),
  );
}

/** Used by tests to prove coherent snapshot reads share one transaction. */
export async function countPinsForOutlet(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<number> {
  assertApplicationRole(context, "countPinsForOutlet");
  const rows = await context.db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(outletServiceabilityPinsTable)
    .where(eq(outletServiceabilityPinsTable.outletId, outletId));
  return Number(rows[0]?.count ?? 0);
}
