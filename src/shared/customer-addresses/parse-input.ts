/**
 * Strict Customer Address mutation input parsing (IMP-018).
 * Unknown / forbidden fields fail closed — never silently ignored.
 */

import {
  CUSTOMER_ADDRESS_CREATE_INPUT_FIELDS,
  CUSTOMER_ADDRESS_UPDATE_INPUT_FIELDS,
} from "./constants";
import {
  canonicalizeAddressText,
  canonicalizeCoordinates,
  canonicalizePostalCode,
  canonicalizeRecipientPhone,
  canonicalizeStateCode,
} from "./canonicalize";
import { CustomerAddressError } from "./errors";
import type {
  CanonicalCustomerAddressFields,
  CustomerAddressCoordinates,
  CustomerAddressCreateInput,
  CustomerAddressUpdateInput,
} from "./types";
import type { CustomerAddressAffectedFieldName } from "./constants";

const FORBIDDEN_MUTATION_FIELDS = new Set([
  "id",
  "addressId",
  "customerId",
  "customerAuthUserId",
  "ownerId",
  "authUserId",
  "createdAt",
  "updatedAt",
  "customerProfileId",
  "profileId",
  "brandId",
  "territoryId",
  "organizationId",
  "outletId",
  "country",
  "countryCode",
  "isDefault",
  "serviceable",
  "isServiceable",
  "serviceabilityStatus",
  "deliveryZoneId",
  "assignedOutletId",
  "nearestOutletId",
  "deliveryFee",
  "distance",
  "distanceKm",
  "geocoderProvider",
  "geocodeConfidence",
  "coordinatesVerified",
  "lastUsedAt",
  "orderCount",
  "marketingOptIn",
  "loyaltyTier",
  "actorId",
  "changedFields",
  "affectedFields",
  "status",
  "deletedAt",
  "isDeleted",
]);

function assertPlainObject(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_INPUT_INVALID",
      "Address input must be a plain object.",
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
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_FIELD_NOT_ALLOWED",
        `Field "${key}" is not allowed on Address mutation input.`,
        key,
      );
    }
  }
}

function assertRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_INPUT_INVALID",
      `${field} must be a string.`,
      field,
    );
  }
  return value;
}

function assertOptionalStringOrNull(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_INPUT_INVALID",
      `${field} must be a string or null.`,
      field,
    );
  }
  return value;
}

function assertOptionalCoordinates(
  value: unknown,
): CustomerAddressCoordinates | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must be null or { latitude, longitude }.",
      "coordinates",
    );
  }
  const record = value as Record<string, unknown>;
  if (!("latitude" in record) || !("longitude" in record)) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates must include both latitude and longitude.",
      "coordinates",
    );
  }
  for (const key of Object.keys(record)) {
    if (key !== "latitude" && key !== "longitude") {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_COORDINATES_INVALID",
        "coordinates must include both latitude and longitude only.",
        "coordinates",
      );
    }
  }
  if (typeof record.latitude !== "string" || typeof record.longitude !== "string") {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
      "coordinates members must be decimal strings.",
      "coordinates",
    );
  }
  return Object.freeze({
    latitude: record.latitude,
    longitude: record.longitude,
  });
}

export function parseCreateCustomerAddressInput(
  input: unknown,
): CustomerAddressCreateInput {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, CUSTOMER_ADDRESS_CREATE_INPUT_FIELDS);

  if (!("recipientName" in record) || record.recipientName === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID",
      "recipientName is required.",
      "recipientName",
    );
  }
  if (!("recipientPhone" in record) || record.recipientPhone === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID",
      "recipientPhone is required.",
      "recipientPhone",
    );
  }
  if (!("addressLine1" in record) || record.addressLine1 === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_LINE1_REQUIRED",
      "addressLine1 is required.",
      "addressLine1",
    );
  }
  if (!("city" in record) || record.city === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_CITY_INVALID",
      "city is required.",
      "city",
    );
  }
  if (!("stateCode" in record) || record.stateCode === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_STATE_CODE_INVALID",
      "stateCode is required.",
      "stateCode",
    );
  }
  if (!("postalCode" in record) || record.postalCode === undefined) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID",
      "postalCode is required.",
      "postalCode",
    );
  }

  let makeDefault: boolean | undefined;
  if ("makeDefault" in record && record.makeDefault !== undefined) {
    if (typeof record.makeDefault !== "boolean") {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_INPUT_INVALID",
        "makeDefault must be a boolean.",
        "makeDefault",
      );
    }
    makeDefault = record.makeDefault;
  }

  return Object.freeze({
    recipientName: assertRequiredString(record.recipientName, "recipientName"),
    recipientPhone: assertRequiredString(record.recipientPhone, "recipientPhone"),
    addressLine1: assertRequiredString(record.addressLine1, "addressLine1"),
    addressLine2: assertOptionalStringOrNull(record.addressLine2, "addressLine2"),
    landmark: assertOptionalStringOrNull(record.landmark, "landmark"),
    locality: assertOptionalStringOrNull(record.locality, "locality"),
    city: assertRequiredString(record.city, "city"),
    stateCode: assertRequiredString(record.stateCode, "stateCode"),
    postalCode: assertRequiredString(record.postalCode, "postalCode"),
    coordinates: assertOptionalCoordinates(record.coordinates),
    label: assertOptionalStringOrNull(record.label, "label"),
    ...(makeDefault !== undefined ? { makeDefault } : {}),
  });
}

export function parseUpdateCustomerAddressInput(
  input: unknown,
): CustomerAddressUpdateInput {
  const record = assertPlainObject(input);
  // makeDefault / isDefault are forbidden on generic update (caught via allowed keys).
  assertAllowedKeys(record, CUSTOMER_ADDRESS_UPDATE_INPUT_FIELDS);

  const recipientName = assertOptionalStringOrNull(record.recipientName, "recipientName");
  if (recipientName === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID",
      "recipientName cannot be cleared.",
      "recipientName",
    );
  }
  const recipientPhone = assertOptionalStringOrNull(record.recipientPhone, "recipientPhone");
  if (recipientPhone === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID",
      "recipientPhone cannot be cleared.",
      "recipientPhone",
    );
  }
  const addressLine1 = assertOptionalStringOrNull(record.addressLine1, "addressLine1");
  if (addressLine1 === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_LINE1_REQUIRED",
      "addressLine1 cannot be cleared.",
      "addressLine1",
    );
  }
  const city = assertOptionalStringOrNull(record.city, "city");
  if (city === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_CITY_INVALID",
      "city cannot be cleared.",
      "city",
    );
  }
  const stateCode = assertOptionalStringOrNull(record.stateCode, "stateCode");
  if (stateCode === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_STATE_CODE_INVALID",
      "stateCode cannot be cleared.",
      "stateCode",
    );
  }
  const postalCode = assertOptionalStringOrNull(record.postalCode, "postalCode");
  if (postalCode === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID",
      "postalCode cannot be cleared.",
      "postalCode",
    );
  }

  const addressLine2 = assertOptionalStringOrNull(record.addressLine2, "addressLine2");
  const landmark = assertOptionalStringOrNull(record.landmark, "landmark");
  const locality = assertOptionalStringOrNull(record.locality, "locality");
  const label = assertOptionalStringOrNull(record.label, "label");
  const coordinates = assertOptionalCoordinates(record.coordinates);

  if (
    recipientName === undefined &&
    recipientPhone === undefined &&
    addressLine1 === undefined &&
    addressLine2 === undefined &&
    landmark === undefined &&
    locality === undefined &&
    city === undefined &&
    stateCode === undefined &&
    postalCode === undefined &&
    coordinates === undefined &&
    label === undefined
  ) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_INPUT_INVALID",
      "Update input must include at least one Address field.",
    );
  }

  return Object.freeze({
    ...(recipientName !== undefined ? { recipientName } : {}),
    ...(recipientPhone !== undefined ? { recipientPhone } : {}),
    ...(addressLine1 !== undefined ? { addressLine1 } : {}),
    ...(addressLine2 !== undefined ? { addressLine2 } : {}),
    ...(landmark !== undefined ? { landmark } : {}),
    ...(locality !== undefined ? { locality } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(stateCode !== undefined ? { stateCode } : {}),
    ...(postalCode !== undefined ? { postalCode } : {}),
    ...(coordinates !== undefined ? { coordinates } : {}),
    ...(label !== undefined ? { label } : {}),
  });
}

export function canonicalizeCreateFields(
  input: CustomerAddressCreateInput,
): CanonicalCustomerAddressFields {
  const recipientName = canonicalizeAddressText(input.recipientName, "recipientName");
  if (recipientName === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID",
      "recipientName is required.",
      "recipientName",
    );
  }
  const addressLine1 = canonicalizeAddressText(input.addressLine1, "addressLine1");
  if (addressLine1 === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_LINE1_REQUIRED",
      "addressLine1 is required.",
      "addressLine1",
    );
  }
  const city = canonicalizeAddressText(input.city, "city");
  if (city === null) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_CITY_INVALID",
      "city is required.",
      "city",
    );
  }

  return Object.freeze({
    recipientName,
    recipientPhone: canonicalizeRecipientPhone(input.recipientPhone),
    addressLine1,
    addressLine2:
      input.addressLine2 === undefined || input.addressLine2 === null
        ? null
        : canonicalizeAddressText(input.addressLine2, "addressLine2"),
    landmark:
      input.landmark === undefined || input.landmark === null
        ? null
        : canonicalizeAddressText(input.landmark, "landmark"),
    locality:
      input.locality === undefined || input.locality === null
        ? null
        : canonicalizeAddressText(input.locality, "locality"),
    city,
    stateCode: canonicalizeStateCode(input.stateCode),
    postalCode: canonicalizePostalCode(input.postalCode),
    coordinates:
      input.coordinates === undefined
        ? null
        : canonicalizeCoordinates(input.coordinates),
    label:
      input.label === undefined || input.label === null
        ? null
        : canonicalizeAddressText(input.label, "label"),
  });
}

export function mergeAndCanonicalizeUpdate(
  current: CanonicalCustomerAddressFields,
  input: CustomerAddressUpdateInput,
): CanonicalCustomerAddressFields {
  const recipientName =
    input.recipientName === undefined
      ? current.recipientName
      : (() => {
          const next = canonicalizeAddressText(input.recipientName, "recipientName");
          if (next === null) {
            throw new CustomerAddressError(
              "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID",
              "recipientName is required.",
              "recipientName",
            );
          }
          return next;
        })();

  const recipientPhone =
    input.recipientPhone === undefined
      ? current.recipientPhone
      : canonicalizeRecipientPhone(input.recipientPhone);

  const addressLine1 =
    input.addressLine1 === undefined
      ? current.addressLine1
      : (() => {
          const next = canonicalizeAddressText(input.addressLine1, "addressLine1");
          if (next === null) {
            throw new CustomerAddressError(
              "CUSTOMER_ADDRESS_LINE1_REQUIRED",
              "addressLine1 is required.",
              "addressLine1",
            );
          }
          return next;
        })();

  const addressLine2 =
    input.addressLine2 === undefined
      ? current.addressLine2
      : input.addressLine2 === null
        ? null
        : canonicalizeAddressText(input.addressLine2, "addressLine2");

  const landmark =
    input.landmark === undefined
      ? current.landmark
      : input.landmark === null
        ? null
        : canonicalizeAddressText(input.landmark, "landmark");

  const locality =
    input.locality === undefined
      ? current.locality
      : input.locality === null
        ? null
        : canonicalizeAddressText(input.locality, "locality");

  const city =
    input.city === undefined
      ? current.city
      : (() => {
          const next = canonicalizeAddressText(input.city, "city");
          if (next === null) {
            throw new CustomerAddressError(
              "CUSTOMER_ADDRESS_CITY_INVALID",
              "city is required.",
              "city",
            );
          }
          return next;
        })();

  const stateCode =
    input.stateCode === undefined
      ? current.stateCode
      : canonicalizeStateCode(input.stateCode);

  const postalCode =
    input.postalCode === undefined
      ? current.postalCode
      : canonicalizePostalCode(input.postalCode);

  const coordinates =
    input.coordinates === undefined
      ? current.coordinates
      : canonicalizeCoordinates(input.coordinates);

  const label =
    input.label === undefined
      ? current.label
      : input.label === null
        ? null
        : canonicalizeAddressText(input.label, "label");

  return Object.freeze({
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2,
    landmark,
    locality,
    city,
    stateCode,
    postalCode,
    coordinates,
    label,
  });
}

export function coordinatesEqual(
  a: CustomerAddressCoordinates | null,
  b: CustomerAddressCoordinates | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

export function addressFieldsEqual(
  a: CanonicalCustomerAddressFields,
  b: CanonicalCustomerAddressFields,
): boolean {
  return (
    a.recipientName === b.recipientName &&
    a.recipientPhone === b.recipientPhone &&
    a.addressLine1 === b.addressLine1 &&
    a.addressLine2 === b.addressLine2 &&
    a.landmark === b.landmark &&
    a.locality === b.locality &&
    a.city === b.city &&
    a.stateCode === b.stateCode &&
    a.postalCode === b.postalCode &&
    coordinatesEqual(a.coordinates, b.coordinates) &&
    a.label === b.label
  );
}

export function materialChangedFieldNames(
  before: CanonicalCustomerAddressFields,
  after: CanonicalCustomerAddressFields,
): CustomerAddressAffectedFieldName[] {
  const changed: CustomerAddressAffectedFieldName[] = [];
  if (before.recipientName !== after.recipientName) changed.push("recipient_name");
  if (before.recipientPhone !== after.recipientPhone) changed.push("recipient_phone");
  if (before.addressLine1 !== after.addressLine1) changed.push("address_line_1");
  if (before.addressLine2 !== after.addressLine2) changed.push("address_line_2");
  if (before.landmark !== after.landmark) changed.push("landmark");
  if (before.locality !== after.locality) changed.push("locality");
  if (before.city !== after.city) changed.push("city");
  if (before.stateCode !== after.stateCode) changed.push("state_code");
  if (before.postalCode !== after.postalCode) changed.push("postal_code");
  if (!coordinatesEqual(before.coordinates, after.coordinates)) {
    changed.push("coordinates");
  }
  if (before.label !== after.label) changed.push("label");
  return changed;
}

/** Server-derived create presence list (fields persisted with meaningful values). */
export function createAffectedFieldNames(
  fields: CanonicalCustomerAddressFields,
): CustomerAddressAffectedFieldName[] {
  const names: CustomerAddressAffectedFieldName[] = [
    "recipient_name",
    "recipient_phone",
    "address_line_1",
    "city",
    "state_code",
    "postal_code",
  ];
  if (fields.addressLine2 !== null) names.push("address_line_2");
  if (fields.landmark !== null) names.push("landmark");
  if (fields.locality !== null) names.push("locality");
  if (fields.coordinates !== null) names.push("coordinates");
  if (fields.label !== null) names.push("label");
  return names;
}
