/**
 * OutletPickupProfile persistence (IMP-036H).
 * Ops transport + conflict semantics: tranche E.
 */

import { and, eq } from "drizzle-orm";

import { outletPickupProfilesTable } from "../../platform/database/schema/organizations";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
} from "../organization/assert-role";
import { lockOutletScheduledFulfilmentAuthority } from "../scheduled-fulfilment/foundations";
import {
  OrganizationConflictError,
  OrganizationValidationError,
} from "../organization/errors";

export type OutletPickupProfileRow =
  typeof outletPickupProfilesTable.$inferSelect;

export type OutletPickupProfile = Readonly<{
  outletId: string;
  enabled: boolean;
  displayName: string;
  addressLine1: string;
  addressLine2: string | null;
  locality: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude: string | null;
  longitude: string | null;
  instructions: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OutletPickupProfileUpsertInput = Readonly<{
  outletId: string;
  enabled: boolean;
  displayName: string;
  addressLine1: string;
  addressLine2?: string | null;
  locality?: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  latitude?: string | null;
  longitude?: string | null;
  instructions: string;
  /** Optimistic concurrency; omit on create. */
  expectedRevision?: number;
  now?: Date;
}>;

function mapRow(row: OutletPickupProfileRow): OutletPickupProfile {
  return Object.freeze({
    outletId: row.outletId,
    enabled: row.enabled,
    displayName: row.displayName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    locality: row.locality,
    city: row.city,
    stateCode: row.stateCode,
    postalCode: row.postalCode,
    latitude: row.latitude,
    longitude: row.longitude,
    instructions: row.instructions,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function loadOutletPickupProfileByOutletId(
  context: PersistenceQueryContext,
  outletId: string,
): Promise<OutletPickupProfile | null> {
  assertApplicationRole(context, "loadOutletPickupProfileByOutletId");
  const rows = await context.db
    .select()
    .from(outletPickupProfilesTable)
    .where(eq(outletPickupProfilesTable.outletId, outletId))
    .limit(1);
  const row = rows[0];
  return row ? mapRow(row) : null;
}

/**
 * Insert or update with expectedRevision stub.
 * Create when no row exists (expectedRevision must be omitted or 0).
 * Update when expectedRevision matches current revision.
 */
export async function upsertOutletPickupProfile(
  context: PersistenceTransactionContext,
  input: OutletPickupProfileUpsertInput,
): Promise<OutletPickupProfile> {
  assertTransactionContext(context, "upsertOutletPickupProfile");
  await lockOutletScheduledFulfilmentAuthority(context, input.outletId);
  const now = input.now ?? new Date();
  const existing = await loadOutletPickupProfileByOutletId(context, input.outletId);

  if (existing === null) {
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== 0
    ) {
      throw new OrganizationValidationError({
        message:
          "OutletPickupProfile create expects expectedRevision to be omitted or 0.",
      });
    }
    await context.db.insert(outletPickupProfilesTable).values({
      outletId: input.outletId,
      enabled: input.enabled,
      displayName: input.displayName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      locality: input.locality ?? null,
      city: input.city,
      stateCode: input.stateCode,
      postalCode: input.postalCode,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      instructions: input.instructions,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    const created = await loadOutletPickupProfileByOutletId(context, input.outletId);
    if (!created) {
      throw new OrganizationValidationError({
        message: "OutletPickupProfile insert failed to reload.",
      });
    }
    return created;
  }

  if (
    input.expectedRevision === undefined ||
    input.expectedRevision !== existing.revision
  ) {
    throw new OrganizationConflictError({
      message: "OutletPickupProfile revision conflict.",
    });
  }

  const updated = await context.db
    .update(outletPickupProfilesTable)
    .set({
      enabled: input.enabled,
      displayName: input.displayName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      locality: input.locality ?? null,
      city: input.city,
      stateCode: input.stateCode,
      postalCode: input.postalCode,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      instructions: input.instructions,
      revision: existing.revision + 1,
      updatedAt: now,
    })
    .where(
      and(
        eq(outletPickupProfilesTable.outletId, input.outletId),
        eq(outletPickupProfilesTable.revision, existing.revision),
      ),
    )
    .returning();

  const row = updated[0];
  if (!row) {
    throw new OrganizationConflictError({
      message: "OutletPickupProfile revision conflict.",
    });
  }
  return mapRow(row);
}
