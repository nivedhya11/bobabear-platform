/**
 * Shared Customer Addresses boundary (IMP-018) — safe for browser and server.
 */

export {
  CUSTOMER_ADDRESS_AUDIT_ACTIONS,
  CUSTOMER_ADDRESS_AFFECTED_FIELD_NAMES,
  CUSTOMER_ADDRESS_CREATE_INPUT_FIELDS,
  CUSTOMER_ADDRESS_UPDATE_INPUT_FIELDS,
  CUSTOMER_ADDRESS_ERROR_CODES,
  CUSTOMER_ADDRESS_RECIPIENT_NAME_MIN_LENGTH,
  CUSTOMER_ADDRESS_RECIPIENT_NAME_MAX_LENGTH,
  CUSTOMER_ADDRESS_LINE_1_MIN_LENGTH,
  CUSTOMER_ADDRESS_LINE_1_MAX_LENGTH,
  CUSTOMER_ADDRESS_LINE_2_MAX_LENGTH,
  CUSTOMER_ADDRESS_LANDMARK_MAX_LENGTH,
  CUSTOMER_ADDRESS_LOCALITY_MAX_LENGTH,
  CUSTOMER_ADDRESS_CITY_MIN_LENGTH,
  CUSTOMER_ADDRESS_CITY_MAX_LENGTH,
  CUSTOMER_ADDRESS_LABEL_MAX_LENGTH,
  CUSTOMER_ADDRESS_COORDINATE_FRACTIONAL_DIGITS,
  type CustomerAddressAffectedFieldName,
  type CustomerAddressAuditAction,
  type CustomerAddressErrorCode,
} from "./constants";

export { CustomerAddressError } from "./errors";

export type {
  CanonicalCustomerAddressFields,
  CustomerAddress,
  CustomerAddressCoordinates,
  CustomerAddressCreateInput,
  CustomerAddressUpdateInput,
} from "./types";

export {
  INDIA_SUBDIVISIONS,
  INDIA_SUBDIVISION_CODES,
  getIndiaSubdivision,
  getIndiaSubdivisionName,
  isIndiaSubdivisionCode,
  type IndiaSubdivision,
  type IndiaSubdivisionCode,
} from "./india-states";

export {
  canonicalizeAddressText,
  canonicalizeCoordinates,
  canonicalizePostalCode,
  canonicalizeRecipientPhone,
  canonicalizeStateCode,
  compareDecimalStrings,
  normalizeStoredCoordinate,
} from "./canonicalize";

export {
  addressFieldsEqual,
  canonicalizeCreateFields,
  coordinatesEqual,
  createAffectedFieldNames,
  materialChangedFieldNames,
  mergeAndCanonicalizeUpdate,
  parseCreateCustomerAddressInput,
  parseUpdateCustomerAddressInput,
} from "./parse-input";
