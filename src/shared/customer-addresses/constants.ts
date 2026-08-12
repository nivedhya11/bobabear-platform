/**
 * Shared constants for Saved Customer Addresses (IMP-018).
 */

export const CUSTOMER_ADDRESS_AUDIT_ACTIONS = [
  "address_created",
  "address_updated",
  "address_deleted",
  "address_default_set",
  "address_default_cleared",
] as const;

export type CustomerAddressAuditAction =
  (typeof CUSTOMER_ADDRESS_AUDIT_ACTIONS)[number];

/** Content field names that may appear in address_created / address_updated audit. */
export const CUSTOMER_ADDRESS_AFFECTED_FIELD_NAMES = [
  "recipient_name",
  "recipient_phone",
  "address_line_1",
  "address_line_2",
  "landmark",
  "locality",
  "city",
  "state_code",
  "postal_code",
  "coordinates",
  "label",
] as const;

export type CustomerAddressAffectedFieldName =
  (typeof CUSTOMER_ADDRESS_AFFECTED_FIELD_NAMES)[number];

export const CUSTOMER_ADDRESS_RECIPIENT_NAME_MIN_LENGTH = 1;
export const CUSTOMER_ADDRESS_RECIPIENT_NAME_MAX_LENGTH = 100;
export const CUSTOMER_ADDRESS_LINE_1_MIN_LENGTH = 1;
export const CUSTOMER_ADDRESS_LINE_1_MAX_LENGTH = 200;
export const CUSTOMER_ADDRESS_LINE_2_MAX_LENGTH = 200;
export const CUSTOMER_ADDRESS_LANDMARK_MAX_LENGTH = 150;
export const CUSTOMER_ADDRESS_LOCALITY_MAX_LENGTH = 120;
export const CUSTOMER_ADDRESS_CITY_MIN_LENGTH = 1;
export const CUSTOMER_ADDRESS_CITY_MAX_LENGTH = 100;
export const CUSTOMER_ADDRESS_LABEL_MAX_LENGTH = 50;

export const CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS = 7;

export const CUSTOMER_ADDRESS_CREATE_INPUT_FIELDS = [
  "recipientName",
  "recipientPhone",
  "addressLine1",
  "addressLine2",
  "landmark",
  "locality",
  "city",
  "stateCode",
  "postalCode",
  "coordinates",
  "label",
  "makeDefault",
] as const;

export const CUSTOMER_ADDRESS_UPDATE_INPUT_FIELDS = [
  "recipientName",
  "recipientPhone",
  "addressLine1",
  "addressLine2",
  "landmark",
  "locality",
  "city",
  "stateCode",
  "postalCode",
  "coordinates",
  "label",
] as const;

export const CUSTOMER_ADDRESS_ERROR_CODES = [
  "CUSTOMER_AUTH_REQUIRED",
  "CUSTOMER_ADDRESS_NOT_FOUND",
  "CUSTOMER_ADDRESS_INPUT_INVALID",
  "CUSTOMER_ADDRESS_FIELD_NOT_ALLOWED",
  "CUSTOMER_ADDRESS_RECIPIENT_NAME_INVALID",
  "CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID",
  "CUSTOMER_ADDRESS_LINE1_REQUIRED",
  "CUSTOMER_ADDRESS_LINE1_INVALID",
  "CUSTOMER_ADDRESS_LINE2_INVALID",
  "CUSTOMER_ADDRESS_LANDMARK_INVALID",
  "CUSTOMER_ADDRESS_LOCALITY_INVALID",
  "CUSTOMER_ADDRESS_CITY_INVALID",
  "CUSTOMER_ADDRESS_STATE_CODE_INVALID",
  "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID",
  "CUSTOMER_ADDRESS_COORDINATES_INVALID",
  "CUSTOMER_ADDRESS_LABEL_INVALID",
  "CUSTOMER_ADDRESS_PERSISTENCE_ERROR",
  "CUSTOMER_ADDRESS_AUDIT_ERROR",
] as const;

export type CustomerAddressErrorCode =
  (typeof CUSTOMER_ADDRESS_ERROR_CODES)[number];
