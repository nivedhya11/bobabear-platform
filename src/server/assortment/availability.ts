/**
 * Outlet Variant / Modifier-Option operational availability (IMP-014).
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  isAvailabilityState,
  type AvailabilityState,
} from "../../shared/assortment";
import {
  outletModifierOptionAvailabilityTable,
  outletVariantAvailabilityTable,
} from "../../platform/database/schema/assortment";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findModifierOptionById } from "../catalog/modifiers";
import { findVariantById } from "../catalog/variants";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
  assertUuid,
  normalizeOptionalNote,
  normalizeOptionalReasonCode,
} from "./assert-role";
import { insertAssortmentAuditEvent } from "./audit";
import {
  requireAvailabilityManage,
  requireAvailabilityRead,
} from "./authorize-assortment";
import { AssortmentNotFoundError, AssortmentValidationError } from "./errors";
import type {
  GetModifierOptionAvailabilityInput,
  GetVariantAvailabilityInput,
  ModifierOptionAvailabilityRecord,
  SetModifierOptionAvailabilityInput,
  SetVariantAvailabilityInput,
  VariantAvailabilityRecord,
} from "./types";

function effectiveAvailabilityState(
  persisted: AvailabilityState | null,
  unavailableUntil: Date | null,
  now: Date,
): AvailabilityState {
  if (persisted === null) return "available";
  if (
    persisted === "temporarily_unavailable" &&
    unavailableUntil !== null &&
    unavailableUntil.getTime() <= now.getTime()
  ) {
    return "available";
  }
  return persisted;
}

function validateAvailabilityWrite(
  state: AvailabilityState,
  unavailableUntil: Date | null | undefined,
): Date | null {
  if (!isAvailabilityState(state)) {
    throw new AssortmentValidationError({ message: "Invalid availability state." });
  }
  if (state === "available" || state === "sold_out") {
    if (unavailableUntil !== undefined && unavailableUntil !== null) {
      throw new AssortmentValidationError({
        message: `${state} requires unavailableUntil to be null.`,
      });
    }
    return null;
  }
  // temporarily_unavailable — unavailableUntil may be null (indefinite) or a future timestamp
  if (unavailableUntil === undefined) return null;
  if (unavailableUntil !== null && !(unavailableUntil instanceof Date)) {
    throw new AssortmentValidationError({
      message: "unavailableUntil must be a Date or null.",
    });
  }
  return unavailableUntil;
}

function rowToVariantRecord(
  row: typeof outletVariantAvailabilityTable.$inferSelect | null,
  outletId: string,
  variantId: string,
  brandId: string,
  organizationId: string,
  territoryId: string,
  now: Date,
): VariantAvailabilityRecord {
  if (!row) {
    return {
      id: null,
      outletId,
      variantId,
      brandId,
      organizationId,
      territoryId,
      persistedState: null,
      effectiveState: "available",
      unavailableUntil: null,
      reasonCode: null,
      note: null,
      updatedAt: null,
    };
  }
  const persistedState = row.state as AvailabilityState;
  const unavailableUntil = row.unavailableUntil ? new Date(row.unavailableUntil) : null;
  return {
    id: row.id,
    outletId: row.outletId,
    variantId: row.variantId,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    persistedState,
    effectiveState: effectiveAvailabilityState(persistedState, unavailableUntil, now),
    unavailableUntil,
    reasonCode: row.reasonCode,
    note: row.note,
    updatedAt: new Date(row.updatedAt),
  };
}

function rowToModifierRecord(
  row: typeof outletModifierOptionAvailabilityTable.$inferSelect | null,
  outletId: string,
  modifierOptionId: string,
  brandId: string,
  organizationId: string,
  territoryId: string,
  now: Date,
): ModifierOptionAvailabilityRecord {
  if (!row) {
    return {
      id: null,
      outletId,
      modifierOptionId,
      brandId,
      organizationId,
      territoryId,
      persistedState: null,
      effectiveState: "available",
      unavailableUntil: null,
      reasonCode: null,
      note: null,
      updatedAt: null,
    };
  }
  const persistedState = row.state as AvailabilityState;
  const unavailableUntil = row.unavailableUntil ? new Date(row.unavailableUntil) : null;
  return {
    id: row.id,
    outletId: row.outletId,
    modifierOptionId: row.modifierOptionId,
    brandId: row.brandId,
    organizationId: row.organizationId,
    territoryId: row.territoryId,
    persistedState,
    effectiveState: effectiveAvailabilityState(persistedState, unavailableUntil, now),
    unavailableUntil,
    reasonCode: row.reasonCode,
    note: row.note,
    updatedAt: new Date(row.updatedAt),
  };
}

/** Trusted internal effective-state helper (no authorization). */
export function interpretEffectiveAvailability(
  persisted: AvailabilityState | null,
  unavailableUntil: Date | null,
  now: Date,
): AvailabilityState {
  return effectiveAvailabilityState(persisted, unavailableUntil, now);
}

export async function getVariantAvailability(
  context: PersistenceQueryContext,
  input: GetVariantAvailabilityInput,
): Promise<VariantAvailabilityRecord> {
  assertApplicationRole(context, "getVariantAvailability");
  const outletId = assertUuid(input.outletId, "outletId");
  const variantId = assertUuid(input.variantId, "variantId");
  const outlet = await requireAvailabilityRead(context, input.actor, outletId);
  const now = input.now ?? new Date();

  const rows = await context.db
    .select()
    .from(outletVariantAvailabilityTable)
    .where(
      and(
        eq(outletVariantAvailabilityTable.outletId, outletId),
        eq(outletVariantAvailabilityTable.variantId, variantId),
      ),
    )
    .limit(1);

  return rowToVariantRecord(
    rows[0] ?? null,
    outletId,
    variantId,
    outlet!.brandId,
    outlet!.organizationId,
    outlet!.territoryId,
    now,
  );
}

export async function setVariantAvailability(
  context: PersistenceTransactionContext,
  input: SetVariantAvailabilityInput,
): Promise<VariantAvailabilityRecord> {
  assertTransactionContext(context, "setVariantAvailability");
  const outletId = assertUuid(input.outletId, "outletId");
  const variantId = assertUuid(input.variantId, "variantId");
  const outlet = await requireAvailabilityManage(context, input.actor, outletId);
  const principal = requireWorkforcePrincipal(input.actor);

  const variant = await findVariantById(context, variantId);
  if (!variant) throw new AssortmentNotFoundError("variant");
  if (variant.brandId !== outlet!.brandId) {
    throw new AssortmentValidationError({
      message: "variant must belong to the outlet brand.",
    });
  }

  const unavailableUntil = validateAvailabilityWrite(input.state, input.unavailableUntil);
  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const note = normalizeOptionalNote(input.note);
  const now = new Date();

  const existing = await context.db
    .select()
    .from(outletVariantAvailabilityTable)
    .where(
      and(
        eq(outletVariantAvailabilityTable.outletId, outletId),
        eq(outletVariantAvailabilityTable.variantId, variantId),
      ),
    )
    .limit(1);

  let id: string;
  if (existing[0]) {
    id = existing[0].id;
    await context.db
      .update(outletVariantAvailabilityTable)
      .set({
        state: input.state,
        unavailableUntil,
        reasonCode,
        note,
        updatedByWorkforceUserId: principal.workforceUserId,
        updatedAt: now,
      })
      .where(eq(outletVariantAvailabilityTable.id, id));
  } else {
    id = randomUUID();
    await context.db.insert(outletVariantAvailabilityTable).values({
      id,
      brandId: outlet!.brandId,
      organizationId: outlet!.organizationId,
      territoryId: outlet!.territoryId,
      outletId,
      variantId,
      state: input.state,
      unavailableUntil,
      reasonCode,
      note,
      updatedByWorkforceUserId: principal.workforceUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "availability.variant_changed",
    brandId: outlet!.brandId,
    territoryId: outlet!.territoryId,
    organizationId: outlet!.organizationId,
    outletId,
    targetType: "variant",
    targetId: variantId,
    metadata: { state: input.state, availabilityId: id },
    occurredAt: now,
  });

  const rows = await context.db
    .select()
    .from(outletVariantAvailabilityTable)
    .where(eq(outletVariantAvailabilityTable.id, id))
    .limit(1);
  return rowToVariantRecord(
    rows[0] ?? null,
    outletId,
    variantId,
    outlet!.brandId,
    outlet!.organizationId,
    outlet!.territoryId,
    now,
  );
}

export async function getModifierOptionAvailability(
  context: PersistenceQueryContext,
  input: GetModifierOptionAvailabilityInput,
): Promise<ModifierOptionAvailabilityRecord> {
  assertApplicationRole(context, "getModifierOptionAvailability");
  const outletId = assertUuid(input.outletId, "outletId");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  const outlet = await requireAvailabilityRead(context, input.actor, outletId);
  const now = input.now ?? new Date();

  const rows = await context.db
    .select()
    .from(outletModifierOptionAvailabilityTable)
    .where(
      and(
        eq(outletModifierOptionAvailabilityTable.outletId, outletId),
        eq(outletModifierOptionAvailabilityTable.modifierOptionId, modifierOptionId),
      ),
    )
    .limit(1);

  return rowToModifierRecord(
    rows[0] ?? null,
    outletId,
    modifierOptionId,
    outlet!.brandId,
    outlet!.organizationId,
    outlet!.territoryId,
    now,
  );
}

export async function setModifierOptionAvailability(
  context: PersistenceTransactionContext,
  input: SetModifierOptionAvailabilityInput,
): Promise<ModifierOptionAvailabilityRecord> {
  assertTransactionContext(context, "setModifierOptionAvailability");
  const outletId = assertUuid(input.outletId, "outletId");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  const outlet = await requireAvailabilityManage(context, input.actor, outletId);
  const principal = requireWorkforcePrincipal(input.actor);

  const option = await findModifierOptionById(context, modifierOptionId);
  if (!option) throw new AssortmentNotFoundError("modifier_option");
  if (option.brandId !== outlet!.brandId) {
    throw new AssortmentValidationError({
      message: "modifier option must belong to the outlet brand.",
    });
  }

  const unavailableUntil = validateAvailabilityWrite(input.state, input.unavailableUntil);
  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const note = normalizeOptionalNote(input.note);
  const now = new Date();

  const existing = await context.db
    .select()
    .from(outletModifierOptionAvailabilityTable)
    .where(
      and(
        eq(outletModifierOptionAvailabilityTable.outletId, outletId),
        eq(outletModifierOptionAvailabilityTable.modifierOptionId, modifierOptionId),
      ),
    )
    .limit(1);

  let id: string;
  if (existing[0]) {
    id = existing[0].id;
    await context.db
      .update(outletModifierOptionAvailabilityTable)
      .set({
        state: input.state,
        unavailableUntil,
        reasonCode,
        note,
        updatedByWorkforceUserId: principal.workforceUserId,
        updatedAt: now,
      })
      .where(eq(outletModifierOptionAvailabilityTable.id, id));
  } else {
    id = randomUUID();
    await context.db.insert(outletModifierOptionAvailabilityTable).values({
      id,
      brandId: outlet!.brandId,
      organizationId: outlet!.organizationId,
      territoryId: outlet!.territoryId,
      outletId,
      modifierOptionId,
      state: input.state,
      unavailableUntil,
      reasonCode,
      note,
      updatedByWorkforceUserId: principal.workforceUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "availability.modifier_option_changed",
    brandId: outlet!.brandId,
    territoryId: outlet!.territoryId,
    organizationId: outlet!.organizationId,
    outletId,
    targetType: "modifier_option",
    targetId: modifierOptionId,
    metadata: { state: input.state, availabilityId: id },
    occurredAt: now,
  });

  const rows = await context.db
    .select()
    .from(outletModifierOptionAvailabilityTable)
    .where(eq(outletModifierOptionAvailabilityTable.id, id))
    .limit(1);
  return rowToModifierRecord(
    rows[0] ?? null,
    outletId,
    modifierOptionId,
    outlet!.brandId,
    outlet!.organizationId,
    outlet!.territoryId,
    now,
  );
}

/** Trusted internal read without authorization (eligibility resolvers). */
export async function loadEffectiveVariantAvailabilityState(
  context: PersistenceQueryContext,
  outletId: string,
  variantId: string,
  now: Date,
): Promise<AvailabilityState> {
  const rows = await context.db
    .select()
    .from(outletVariantAvailabilityTable)
    .where(
      and(
        eq(outletVariantAvailabilityTable.outletId, outletId),
        eq(outletVariantAvailabilityTable.variantId, variantId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return "available";
  return effectiveAvailabilityState(
    row.state as AvailabilityState,
    row.unavailableUntil ? new Date(row.unavailableUntil) : null,
    now,
  );
}

export async function loadEffectiveModifierOptionAvailabilityState(
  context: PersistenceQueryContext,
  outletId: string,
  modifierOptionId: string,
  now: Date,
): Promise<AvailabilityState> {
  const rows = await context.db
    .select()
    .from(outletModifierOptionAvailabilityTable)
    .where(
      and(
        eq(outletModifierOptionAvailabilityTable.outletId, outletId),
        eq(outletModifierOptionAvailabilityTable.modifierOptionId, modifierOptionId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return "available";
  return effectiveAvailabilityState(
    row.state as AvailabilityState,
    row.unavailableUntil ? new Date(row.unavailableUntil) : null,
    now,
  );
}
