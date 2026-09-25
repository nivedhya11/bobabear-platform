/**
 * IMP-036I Tranche 1 domain persistence.
 *
 * Brand policy, Outlet lead profile, and future full-day closure.
 * No eligibility engine, HTTP surface, or scheduler.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  brandScheduledFulfilmentPoliciesTable,
  outletOperatingDateExceptionsTable,
  outletSchedulingProfilesTable,
} from "../../platform/database/schema/scheduled-fulfilment";
import {
  DEFAULT_DELIVERY_CANCELLATION_CUTOFF_MINUTES,
  DEFAULT_PICKUP_CANCELLATION_CUTOFF_MINUTES,
  SCHEDULED_CANCELLATION_CUTOFF_MAX_MINUTES,
  SCHEDULED_CANCELLATION_CUTOFF_MIN_MINUTES,
} from "../../shared/checkout";
import {
  assertApplicationRole,
  assertTransactionContext,
  isUniqueViolation,
} from "../organization/assert-role";
import type {
  Persistence,
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";

export type ScheduledFulfilmentErrorCode =
  | "STALE_REVISION"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT";

export class ScheduledFulfilmentError extends Error {
  readonly code: ScheduledFulfilmentErrorCode;
  readonly field: string | null;

  constructor(
    code: ScheduledFulfilmentErrorCode,
    message: string,
    field: string | null = null,
  ) {
    super(message);
    this.name = "ScheduledFulfilmentError";
    this.code = code;
    this.field = field;
  }
}

export type EffectiveBrandScheduledFulfilmentPolicy = Readonly<{
  brandId: string;
  pickupCancellationCutoffMinutes: number;
  deliveryCancellationCutoffMinutes: number;
  revision: bigint;
  source: "PRODUCT_DEFAULT" | "EXPLICIT_ROW";
}>;

export type OutletSchedulingProfile = Readonly<{
  outletId: string;
  pickupMinLeadMinutes: number;
  deliveryMinLeadMinutes: number;
  revision: bigint;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OutletOperatingDateException = Readonly<{
  id: string;
  outletId: string;
  localDate: string;
  exceptionKind: "CLOSED_FULL_DAY";
  note: string | null;
  revision: bigint;
  createdAt: Date;
  updatedAt: Date;
}>;

function assertCutoff(value: number, field: string): void {
  if (
    !Number.isInteger(value) ||
    value < SCHEDULED_CANCELLATION_CUTOFF_MIN_MINUTES ||
    value > SCHEDULED_CANCELLATION_CUTOFF_MAX_MINUTES
  ) {
    throw new ScheduledFulfilmentError(
      "INVALID_INPUT",
      `${field} must be an integer from 0 through 240.`,
      field,
    );
  }
}

function assertPositiveLead(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ScheduledFulfilmentError(
      "INVALID_INPUT",
      `${field} must be an integer greater than 0.`,
      field,
    );
  }
}

function staleRevision(): never {
  throw new ScheduledFulfilmentError(
    "STALE_REVISION",
    "Expected revision does not match the current scheduled-fulfilment row.",
  );
}

export async function resolveBrandScheduledFulfilmentPolicy(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<EffectiveBrandScheduledFulfilmentPolicy> {
  assertApplicationRole(context, "resolveBrandScheduledFulfilmentPolicy");
  const rows = await context.db
    .select()
    .from(brandScheduledFulfilmentPoliciesTable)
    .where(eq(brandScheduledFulfilmentPoliciesTable.brandId, brandId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      brandId,
      pickupCancellationCutoffMinutes: DEFAULT_PICKUP_CANCELLATION_CUTOFF_MINUTES,
      deliveryCancellationCutoffMinutes: DEFAULT_DELIVERY_CANCELLATION_CUTOFF_MINUTES,
      revision: BigInt(0),
      source: "PRODUCT_DEFAULT",
    };
  }
  return {
    brandId,
    pickupCancellationCutoffMinutes: row.pickupCancellationCutoffMinutes,
    deliveryCancellationCutoffMinutes: row.deliveryCancellationCutoffMinutes,
    revision: row.revision,
    source: "EXPLICIT_ROW",
  };
}

export async function updateBrandScheduledFulfilmentPolicy(
  persistence: Persistence,
  input: Readonly<{
    brandId: string;
    expectedRevision: bigint;
    pickupCancellationCutoffMinutes: number;
    deliveryCancellationCutoffMinutes: number;
    now?: Date;
  }>,
): Promise<EffectiveBrandScheduledFulfilmentPolicy> {
  assertCutoff(input.pickupCancellationCutoffMinutes, "pickupCancellationCutoffMinutes");
  assertCutoff(
    input.deliveryCancellationCutoffMinutes,
    "deliveryCancellationCutoffMinutes",
  );
  const now = input.now ?? new Date();
  return persistence.transaction(async (tx) => {
    try {
      assertTransactionContext(tx, "updateBrandScheduledFulfilmentPolicy");
      const current = await resolveBrandScheduledFulfilmentPolicy(tx, input.brandId);
      if (current.revision !== input.expectedRevision) {
        staleRevision();
      }
      if (input.expectedRevision === BigInt(0)) {
        await tx.db.insert(brandScheduledFulfilmentPoliciesTable).values({
          brandId: input.brandId,
          pickupCancellationCutoffMinutes: input.pickupCancellationCutoffMinutes,
          deliveryCancellationCutoffMinutes: input.deliveryCancellationCutoffMinutes,
          revision: BigInt(1),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const updated = await tx.db
          .update(brandScheduledFulfilmentPoliciesTable)
          .set({
            pickupCancellationCutoffMinutes: input.pickupCancellationCutoffMinutes,
            deliveryCancellationCutoffMinutes: input.deliveryCancellationCutoffMinutes,
            revision: input.expectedRevision + BigInt(1),
            updatedAt: now,
          })
          .where(
            and(
              eq(brandScheduledFulfilmentPoliciesTable.brandId, input.brandId),
              eq(brandScheduledFulfilmentPoliciesTable.revision, input.expectedRevision),
            ),
          )
          .returning({ brandId: brandScheduledFulfilmentPoliciesTable.brandId });
        if (!updated[0]) staleRevision();
      }
      const resolved = await resolveBrandScheduledFulfilmentPolicy(tx, input.brandId);
      if (resolved.source !== "EXPLICIT_ROW") staleRevision();
      return resolved;
    } catch (error) {
      if (error instanceof ScheduledFulfilmentError) throw error;
      if (isUniqueViolation(error)) staleRevision();
      throw error;
    }
  });
}

export async function loadOutletSchedulingProfile(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<OutletSchedulingProfile | null> {
  assertApplicationRole(context, "loadOutletSchedulingProfile");
  const rows = await context.db
    .select()
    .from(outletSchedulingProfilesTable)
    .where(eq(outletSchedulingProfilesTable.outletId, outletId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    outletId: row.outletId,
    pickupMinLeadMinutes: row.pickupMinLeadMinutes,
    deliveryMinLeadMinutes: row.deliveryMinLeadMinutes,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function saveOutletSchedulingProfile(
  persistence: Persistence,
  input: Readonly<{
    outletId: string;
    pickupMinLeadMinutes: number;
    deliveryMinLeadMinutes: number;
    /** Omit or 0 to create the first row. Later saves must match the stored revision. */
    expectedRevision?: bigint;
    now?: Date;
  }>,
): Promise<OutletSchedulingProfile> {
  assertPositiveLead(input.pickupMinLeadMinutes, "pickupMinLeadMinutes");
  assertPositiveLead(input.deliveryMinLeadMinutes, "deliveryMinLeadMinutes");
  const now = input.now ?? new Date();
  const expected = input.expectedRevision ?? BigInt(0);
  return persistence.transaction(async (tx) => {
    try {
      assertTransactionContext(tx, "saveOutletSchedulingProfile");
      const existing = await loadOutletSchedulingProfile(tx, input.outletId);
      if (existing === null) {
        if (expected !== BigInt(0)) staleRevision();
        await tx.db.insert(outletSchedulingProfilesTable).values({
          outletId: input.outletId,
          pickupMinLeadMinutes: input.pickupMinLeadMinutes,
          deliveryMinLeadMinutes: input.deliveryMinLeadMinutes,
          revision: BigInt(1),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        if (existing.revision !== expected) staleRevision();
        const updated = await tx.db
          .update(outletSchedulingProfilesTable)
          .set({
            pickupMinLeadMinutes: input.pickupMinLeadMinutes,
            deliveryMinLeadMinutes: input.deliveryMinLeadMinutes,
            revision: existing.revision + BigInt(1),
            updatedAt: now,
          })
          .where(
            and(
              eq(outletSchedulingProfilesTable.outletId, input.outletId),
              eq(outletSchedulingProfilesTable.revision, expected),
            ),
          )
          .returning({ outletId: outletSchedulingProfilesTable.outletId });
        if (!updated[0]) staleRevision();
      }
      const saved = await loadOutletSchedulingProfile(tx, input.outletId);
      if (!saved) {
        throw new ScheduledFulfilmentError(
          "NOT_FOUND",
          "Outlet scheduling profile was not persisted.",
        );
      }
      return saved;
    } catch (error) {
      if (error instanceof ScheduledFulfilmentError) throw error;
      if (isUniqueViolation(error)) staleRevision();
      throw error;
    }
  });
}

export async function insertOutletOperatingDateException(
  context: PersistenceTransactionContext,
  input: Readonly<{
    outletId: string;
    localDate: string;
    exceptionKind: string;
    note?: string | null;
    now?: Date;
  }>,
): Promise<OutletOperatingDateException> {
  assertTransactionContext(context, "insertOutletOperatingDateException");
  if (input.exceptionKind !== "CLOSED_FULL_DAY") {
    throw new ScheduledFulfilmentError(
      "INVALID_INPUT",
      "exceptionKind must be CLOSED_FULL_DAY.",
      "exceptionKind",
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    throw new ScheduledFulfilmentError(
      "INVALID_INPUT",
      "localDate must be an ISO calendar date.",
      "localDate",
    );
  }
  const now = input.now ?? new Date();
  try {
    const rows = await context.db
      .insert(outletOperatingDateExceptionsTable)
      .values({
        id: randomUUID(),
        outletId: input.outletId,
        localDate: input.localDate,
        exceptionKind: "CLOSED_FULL_DAY",
        note: input.note ?? null,
        revision: BigInt(1),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new ScheduledFulfilmentError(
        "NOT_FOUND",
        "Outlet operating date exception was not persisted.",
      );
    }
    return {
      id: row.id,
      outletId: row.outletId,
      localDate: row.localDate,
      exceptionKind: "CLOSED_FULL_DAY",
      note: row.note,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    if (error instanceof ScheduledFulfilmentError) throw error;
    if (isUniqueViolation(error)) {
      throw new ScheduledFulfilmentError(
        "CONFLICT",
        "An operating-date exception already exists for this Outlet and local date.",
        "localDate",
      );
    }
    throw error;
  }
}
