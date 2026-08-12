/**
 * Narrow Customer Profile repository (IMP-017).
 * Ownership resolution by auth-user ID only — no directory/search APIs.
 */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  customerProfilesTable,
} from "../../platform/database/schema/customer-profiles";
import type { CanonicalCustomerProfileFields, CustomerProfile } from "../../shared/customer-profiles";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

type ProfileRow = typeof customerProfilesTable.$inferSelect;

function toCustomerProfile(row: ProfileRow): CustomerProfile {
  return Object.freeze({
    id: row.id,
    givenName: row.givenName,
    familyName: row.familyName ?? null,
    email: row.email ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function findProfileByCustomerAuthUserId(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
): Promise<CustomerProfile | null> {
  assertApplicationRole(context, "findProfileByCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerProfilesTable)
    .where(eq(customerProfilesTable.customerAuthUserId, customerAuthUserId))
    .limit(1);
  const row = rows[0];
  return row ? toCustomerProfile(row) : null;
}

/** Internal: load row including ownership id (never exposed on public read model). */
export async function findProfileRowByCustomerAuthUserId(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
): Promise<(ProfileRow & { profile: CustomerProfile }) | null> {
  assertApplicationRole(context, "findProfileRowByCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerProfilesTable)
    .where(eq(customerProfilesTable.customerAuthUserId, customerAuthUserId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, profile: toCustomerProfile(row) };
}

export async function insertCustomerProfile(
  context: PersistenceTransactionContext,
  input: {
    customerAuthUserId: string;
    fields: CanonicalCustomerProfileFields;
    now?: Date;
  },
): Promise<CustomerProfile> {
  assertTransactionContext(context, "insertCustomerProfile");
  const now = input.now ?? new Date();
  const id = randomUUID();
  await context.db.insert(customerProfilesTable).values({
    id,
    customerAuthUserId: input.customerAuthUserId,
    givenName: input.fields.givenName,
    familyName: input.fields.familyName,
    email: input.fields.email,
    createdAt: now,
    updatedAt: now,
  });
  return Object.freeze({
    id,
    givenName: input.fields.givenName,
    familyName: input.fields.familyName,
    email: input.fields.email,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCustomerProfileById(
  context: PersistenceTransactionContext,
  input: {
    profileId: string;
    fields: CanonicalCustomerProfileFields;
    now?: Date;
  },
): Promise<CustomerProfile> {
  assertTransactionContext(context, "updateCustomerProfileById");
  const now = input.now ?? new Date();
  const updated = await context.db
    .update(customerProfilesTable)
    .set({
      givenName: input.fields.givenName,
      familyName: input.fields.familyName,
      email: input.fields.email,
      updatedAt: now,
    })
    .where(eq(customerProfilesTable.id, input.profileId))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new Error("CUSTOMER_PROFILE_NOT_FOUND");
  }
  return toCustomerProfile(row);
}

export async function deleteCustomerProfileById(
  context: PersistenceTransactionContext,
  profileId: string,
): Promise<boolean> {
  assertTransactionContext(context, "deleteCustomerProfileById");
  const deleted = await context.db
    .delete(customerProfilesTable)
    .where(eq(customerProfilesTable.id, profileId))
    .returning({ id: customerProfilesTable.id });
  return deleted.length > 0;
}
