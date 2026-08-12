/**
 * Shared constants for Customer Profiles (IMP-017).
 */

export const CUSTOMER_PROFILE_AUDIT_ACTIONS = [
  "profile_created",
  "profile_updated",
  "profile_deleted",
] as const;

export type CustomerProfileAuditAction =
  (typeof CUSTOMER_PROFILE_AUDIT_ACTIONS)[number];

export const CUSTOMER_PROFILE_AFFECTED_FIELD_NAMES = [
  "given_name",
  "family_name",
  "email",
] as const;

export type CustomerProfileAffectedFieldName =
  (typeof CUSTOMER_PROFILE_AFFECTED_FIELD_NAMES)[number];

export const CUSTOMER_PROFILE_GIVEN_NAME_MIN_LENGTH = 1;
export const CUSTOMER_PROFILE_GIVEN_NAME_MAX_LENGTH = 100;
export const CUSTOMER_PROFILE_FAMILY_NAME_MAX_LENGTH = 100;
export const CUSTOMER_PROFILE_EMAIL_MAX_LENGTH = 254;

export const CUSTOMER_PROFILE_CREATE_INPUT_FIELDS = [
  "givenName",
  "familyName",
  "email",
] as const;

export const CUSTOMER_PROFILE_UPDATE_INPUT_FIELDS = [
  "givenName",
  "familyName",
  "email",
] as const;

export const CUSTOMER_PROFILE_ERROR_CODES = [
  "CUSTOMER_AUTH_REQUIRED",
  "CUSTOMER_PROFILE_ALREADY_EXISTS",
  "CUSTOMER_PROFILE_NOT_FOUND",
  "CUSTOMER_PROFILE_ACCESS_DENIED",
  "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED",
  "CUSTOMER_PROFILE_GIVEN_NAME_INVALID",
  "CUSTOMER_PROFILE_FAMILY_NAME_INVALID",
  "CUSTOMER_PROFILE_EMAIL_INVALID",
  "CUSTOMER_PROFILE_FIELD_NOT_ALLOWED",
  "CUSTOMER_PROFILE_INPUT_INVALID",
  "CUSTOMER_PROFILE_PERSISTENCE_ERROR",
  "CUSTOMER_PROFILE_AUDIT_ERROR",
] as const;

export type CustomerProfileErrorCode =
  (typeof CUSTOMER_PROFILE_ERROR_CODES)[number];
