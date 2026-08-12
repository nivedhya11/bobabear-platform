/**
 * Shared Customer Profiles boundary (IMP-017) — safe for browser and server.
 */

export {
  CUSTOMER_PROFILE_AUDIT_ACTIONS,
  CUSTOMER_PROFILE_AFFECTED_FIELD_NAMES,
  CUSTOMER_PROFILE_CREATE_INPUT_FIELDS,
  CUSTOMER_PROFILE_UPDATE_INPUT_FIELDS,
  CUSTOMER_PROFILE_ERROR_CODES,
  CUSTOMER_PROFILE_EMAIL_MAX_LENGTH,
  CUSTOMER_PROFILE_FAMILY_NAME_MAX_LENGTH,
  CUSTOMER_PROFILE_GIVEN_NAME_MAX_LENGTH,
  CUSTOMER_PROFILE_GIVEN_NAME_MIN_LENGTH,
  type CustomerProfileAffectedFieldName,
  type CustomerProfileAuditAction,
  type CustomerProfileErrorCode,
} from "./constants";

export { CustomerProfileError } from "./errors";

export type {
  CanonicalCustomerProfileFields,
  CustomerProfile,
  CustomerProfileCreateInput,
  CustomerProfileUpdateInput,
} from "./types";

export {
  canonicalizeCustomerEmail,
  canonicalizeCustomerName,
} from "./canonicalize";

export {
  canonicalizeCreateFields,
  createAffectedFieldNames,
  materialChangedFieldNames,
  mergeAndCanonicalizeUpdate,
  parseCreateCustomerProfileInput,
  parseUpdateCustomerProfileInput,
  profileFieldsEqual,
} from "./parse-input";
