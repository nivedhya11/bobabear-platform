/**
 * Narrow Customer Address repository (IMP-018).
 * Ownership resolution by address ID + auth-user ID — no directory/search APIs.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  customerAddressesTable,
} from "../../platform/database/schema/customer-addresses";
import { customerAuthUsers } from "../../platform/database/schema/customer-auth";
import {
  CustomerAddressError,
  normalizeStoredCoordinate,
  type CanonicalCustomerAddressFields,
  type CustomerAddress,
  type IndiaSubdivisionCode,
} from "../../shared/customer-addresses";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

type AddressRow = typeof customerAddressesTable.$inferSelect;

function toCustomerAddress(row: AddressRow): CustomerAddress {
  const coordinates =
    row.latitude == null || row.longitude == null
      ? null
      : Object.freeze({
          latitude: normalizeStoredCoordinate(String(row.latitude)),
          longitude: normalizeStoredCoordinate(String(row.longitude)),
        });

  return Object.freeze({
    id: row.id,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 ?? null,
    landmark: row.landmark ?? null,
    locality: row.locality ?? null,
    city: row.city,
    stateCode: row.stateCode as IndiaSubdivisionCode,
    postalCode: row.postalCode,
    coordinates,
    label: row.label ?? null,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function fieldsFromRow(row: AddressRow): CanonicalCustomerAddressFields {
  const address = toCustomerAddress(row);
  return Object.freeze({
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    landmark: address.landmark,
    locality: address.locality,
    city: address.city,
    stateCode: address.stateCode,
    postalCode: address.postalCode,
    coordinates: address.coordinates,
    label: address.label,
  });
}

/**
 * Acquire the per-customer mutation lock (canonical lock order step 1).
 * Must be the first statement in every Address write transaction.
 */
export async function lockCustomerAuthUserForAddressMutation(
  context: PersistenceTransactionContext,
  customerAuthUserId: string,
): Promise<void> {
  assertTransactionContext(context, "lockCustomerAuthUserForAddressMutation");
  const rows = await context.db
    .select({ id: customerAuthUsers.id })
    .from(customerAuthUsers)
    .where(eq(customerAuthUsers.id, customerAuthUserId))
    .for("update");
  if (rows.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer-auth identity is required.",
    );
  }
}

export async function listAddressesByCustomerAuthUserId(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
): Promise<CustomerAddress[]> {
  assertApplicationRole(context, "listAddressesByCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerAddressesTable)
    .where(eq(customerAddressesTable.customerAuthUserId, customerAuthUserId))
    .orderBy(
      desc(customerAddressesTable.isDefault),
      asc(customerAddressesTable.createdAt),
      asc(customerAddressesTable.id),
    );
  return rows.map(toCustomerAddress);
}

export async function findAddressByIdAndCustomerAuthUserId(
  context: PersistenceQueryContext,
  addressId: string,
  customerAuthUserId: string,
): Promise<CustomerAddress | null> {
  assertApplicationRole(context, "findAddressByIdAndCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerAddressesTable)
    .where(
      and(
        eq(customerAddressesTable.id, addressId),
        eq(customerAddressesTable.customerAuthUserId, customerAuthUserId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? toCustomerAddress(row) : null;
}

/** Internal row load including ownership (never exposed on public read model). */
export async function findAddressRowByIdAndCustomerAuthUserId(
  context: PersistenceQueryContext,
  addressId: string,
  customerAuthUserId: string,
): Promise<(AddressRow & { address: CustomerAddress; fields: CanonicalCustomerAddressFields }) | null> {
  assertApplicationRole(context, "findAddressRowByIdAndCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerAddressesTable)
    .where(
      and(
        eq(customerAddressesTable.id, addressId),
        eq(customerAddressesTable.customerAuthUserId, customerAuthUserId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, address: toCustomerAddress(row), fields: fieldsFromRow(row) };
}

export async function findDefaultAddressByCustomerAuthUserId(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
): Promise<(AddressRow & { address: CustomerAddress }) | null> {
  assertApplicationRole(context, "findDefaultAddressByCustomerAuthUserId");
  const rows = await context.db
    .select()
    .from(customerAddressesTable)
    .where(
      and(
        eq(customerAddressesTable.customerAuthUserId, customerAuthUserId),
        eq(customerAddressesTable.isDefault, true),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, address: toCustomerAddress(row) };
}

export async function insertCustomerAddress(
  context: PersistenceTransactionContext,
  input: {
    customerAuthUserId: string;
    fields: CanonicalCustomerAddressFields;
    isDefault: boolean;
    now?: Date;
  },
): Promise<CustomerAddress> {
  assertTransactionContext(context, "insertCustomerAddress");
  const now = input.now ?? new Date();
  const id = randomUUID();
  await context.db.insert(customerAddressesTable).values({
    id,
    customerAuthUserId: input.customerAuthUserId,
    recipientName: input.fields.recipientName,
    recipientPhone: input.fields.recipientPhone,
    addressLine1: input.fields.addressLine1,
    addressLine2: input.fields.addressLine2,
    landmark: input.fields.landmark,
    locality: input.fields.locality,
    city: input.fields.city,
    stateCode: input.fields.stateCode,
    postalCode: input.fields.postalCode,
    latitude: input.fields.coordinates?.latitude ?? null,
    longitude: input.fields.coordinates?.longitude ?? null,
    label: input.fields.label,
    isDefault: input.isDefault,
    createdAt: now,
    updatedAt: now,
  });
  return Object.freeze({
    id,
    ...input.fields,
    isDefault: input.isDefault,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCustomerAddressContentById(
  context: PersistenceTransactionContext,
  input: {
    addressId: string;
    customerAuthUserId: string;
    fields: CanonicalCustomerAddressFields;
    now?: Date;
  },
): Promise<CustomerAddress> {
  assertTransactionContext(context, "updateCustomerAddressContentById");
  const now = input.now ?? new Date();
  const updated = await context.db
    .update(customerAddressesTable)
    .set({
      recipientName: input.fields.recipientName,
      recipientPhone: input.fields.recipientPhone,
      addressLine1: input.fields.addressLine1,
      addressLine2: input.fields.addressLine2,
      landmark: input.fields.landmark,
      locality: input.fields.locality,
      city: input.fields.city,
      stateCode: input.fields.stateCode,
      postalCode: input.fields.postalCode,
      latitude: input.fields.coordinates?.latitude ?? null,
      longitude: input.fields.coordinates?.longitude ?? null,
      label: input.fields.label,
      updatedAt: now,
    })
    .where(
      and(
        eq(customerAddressesTable.id, input.addressId),
        eq(customerAddressesTable.customerAuthUserId, input.customerAuthUserId),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }
  return toCustomerAddress(row);
}

export async function updateCustomerAddressDefaultState(
  context: PersistenceTransactionContext,
  input: {
    addressId: string;
    customerAuthUserId: string;
    isDefault: boolean;
    now?: Date;
  },
): Promise<CustomerAddress> {
  assertTransactionContext(context, "updateCustomerAddressDefaultState");
  const now = input.now ?? new Date();
  const updated = await context.db
    .update(customerAddressesTable)
    .set({
      isDefault: input.isDefault,
      updatedAt: now,
    })
    .where(
      and(
        eq(customerAddressesTable.id, input.addressId),
        eq(customerAddressesTable.customerAuthUserId, input.customerAuthUserId),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }
  return toCustomerAddress(row);
}

export async function deleteCustomerAddressByIdAndCustomerAuthUserId(
  context: PersistenceTransactionContext,
  addressId: string,
  customerAuthUserId: string,
): Promise<boolean> {
  assertTransactionContext(context, "deleteCustomerAddressByIdAndCustomerAuthUserId");
  const deleted = await context.db
    .delete(customerAddressesTable)
    .where(
      and(
        eq(customerAddressesTable.id, addressId),
        eq(customerAddressesTable.customerAuthUserId, customerAuthUserId),
      ),
    )
    .returning({ id: customerAddressesTable.id });
  return deleted.length > 0;
}

/** Test/diagnostic helper — not part of the public Address surface. */
export async function countAddressesForCustomer(
  context: PersistenceQueryContext,
  customerAuthUserId: string,
): Promise<number> {
  assertApplicationRole(context, "countAddressesForCustomer");
  const rows = await context.db
    .select({ count: sql<string>`count(*)::text` })
    .from(customerAddressesTable)
    .where(eq(customerAddressesTable.customerAuthUserId, customerAuthUserId));
  return Number(rows[0]?.count ?? "0");
}
