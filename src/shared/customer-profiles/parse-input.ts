/**
 * Strict Customer Profile mutation input parsing (IMP-017).
 * Unknown / forbidden fields fail closed — never silently ignored.
 */

import {
  CUSTOMER_PROFILE_CREATE_INPUT_FIELDS,
  CUSTOMER_PROFILE_UPDATE_INPUT_FIELDS,
} from "./constants";
import {
  canonicalizeCustomerEmail,
  canonicalizeCustomerName,
} from "./canonicalize";
import { CustomerProfileError } from "./errors";
import type {
  CanonicalCustomerProfileFields,
  CustomerProfileCreateInput,
  CustomerProfileUpdateInput,
} from "./types";

const FORBIDDEN_MUTATION_FIELDS = new Set([
  "authUserId",
  "customerId",
  "customerAuthUserId",
  "profileId",
  "id",
  "phone",
  "phoneNumber",
  "mobile",
  "mobileNumber",
  "createdAt",
  "updatedAt",
  "actorId",
  "brandId",
  "marketingOptIn",
  "loyaltyTier",
  "changedFields",
  "affectedFields",
  "status",
  "deletedAt",
]);

function assertPlainObject(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_INPUT_INVALID",
      "Profile input must be a plain object.",
    );
  }
  return input as Record<string, unknown>;
}

function assertAllowedKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_MUTATION_FIELDS.has(key) || !allowedSet.has(key)) {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_FIELD_NOT_ALLOWED",
        `Field "${key}" is not allowed on Profile mutation input.`,
        key,
      );
    }
  }
}

function assertOptionalStringOrNull(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_INPUT_INVALID",
      `${field} must be a string or null.`,
      field,
    );
  }
  return value;
}

export function parseCreateCustomerProfileInput(
  input: unknown,
): CustomerProfileCreateInput {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, CUSTOMER_PROFILE_CREATE_INPUT_FIELDS);

  if (!("givenName" in record) || record.givenName === undefined) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
      "givenName is required.",
      "givenName",
    );
  }
  if (typeof record.givenName !== "string") {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_GIVEN_NAME_INVALID",
      "givenName must be a string.",
      "givenName",
    );
  }

  const familyName = assertOptionalStringOrNull(record.familyName, "familyName");
  const email = assertOptionalStringOrNull(record.email, "email");

  return Object.freeze({
    givenName: record.givenName,
    ...(familyName !== undefined ? { familyName } : {}),
    ...(email !== undefined ? { email } : {}),
  });
}

export function parseUpdateCustomerProfileInput(
  input: unknown,
): CustomerProfileUpdateInput {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, CUSTOMER_PROFILE_UPDATE_INPUT_FIELDS);

  const givenName = assertOptionalStringOrNull(record.givenName, "givenName");
  if (givenName === null) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
      "givenName cannot be cleared; delete the Profile instead.",
      "givenName",
    );
  }

  const familyName = assertOptionalStringOrNull(record.familyName, "familyName");
  const email = assertOptionalStringOrNull(record.email, "email");

  if (
    givenName === undefined &&
    familyName === undefined &&
    email === undefined
  ) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_INPUT_INVALID",
      "Update input must include at least one Profile field.",
    );
  }

  return Object.freeze({
    ...(givenName !== undefined ? { givenName } : {}),
    ...(familyName !== undefined ? { familyName } : {}),
    ...(email !== undefined ? { email } : {}),
  });
}

export function canonicalizeCreateFields(
  input: CustomerProfileCreateInput,
): CanonicalCustomerProfileFields {
  const givenName = canonicalizeCustomerName(input.givenName, "givenName");
  if (givenName === null) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
      "givenName is required.",
      "givenName",
    );
  }

  // Omitted or null familyName on create → null.
  const familyName =
    input.familyName === undefined || input.familyName === null
      ? null
      : canonicalizeCustomerName(input.familyName, "familyName");

  const email =
    input.email === undefined
      ? null
      : canonicalizeCustomerEmail(input.email);

  return Object.freeze({
    givenName,
    familyName,
    email,
  });
}

export function mergeAndCanonicalizeUpdate(
  current: CanonicalCustomerProfileFields,
  input: CustomerProfileUpdateInput,
): CanonicalCustomerProfileFields {
  let givenName = current.givenName;
  if (input.givenName !== undefined) {
    if (input.givenName === null) {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
        "givenName cannot be cleared; delete the Profile instead.",
        "givenName",
      );
    }
    const next = canonicalizeCustomerName(input.givenName, "givenName");
    if (next === null) {
      throw new CustomerProfileError(
        "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
        "givenName is required.",
        "givenName",
      );
    }
    givenName = next;
  }

  let familyName = current.familyName;
  if (input.familyName !== undefined) {
    familyName =
      input.familyName === null
        ? null
        : canonicalizeCustomerName(input.familyName, "familyName");
  }

  let email = current.email;
  if (input.email !== undefined) {
    email = canonicalizeCustomerEmail(input.email);
  }

  return Object.freeze({ givenName, familyName, email });
}

export function profileFieldsEqual(
  a: CanonicalCustomerProfileFields,
  b: CanonicalCustomerProfileFields,
): boolean {
  return (
    a.givenName === b.givenName &&
    a.familyName === b.familyName &&
    a.email === b.email
  );
}

export function materialChangedFieldNames(
  before: CanonicalCustomerProfileFields,
  after: CanonicalCustomerProfileFields,
): Array<"given_name" | "family_name" | "email"> {
  const changed: Array<"given_name" | "family_name" | "email"> = [];
  if (before.givenName !== after.givenName) changed.push("given_name");
  if (before.familyName !== after.familyName) changed.push("family_name");
  if (before.email !== after.email) changed.push("email");
  return changed;
}

/** Server-derived create presence list (fields that were present/non-null). */
export function createAffectedFieldNames(
  fields: CanonicalCustomerProfileFields,
): Array<"given_name" | "family_name" | "email"> {
  const names: Array<"given_name" | "family_name" | "email"> = ["given_name"];
  if (fields.familyName !== null) names.push("family_name");
  if (fields.email !== null) names.push("email");
  return names;
}
