/**
 * Strict Checkout input parsing (IMP-021).
 * Unknown top-level and nested fields fail closed, including __proto__.
 */

import {
  canonicalizeAddressText,
  canonicalizeCoordinates,
  canonicalizeCreateFields,
  canonicalizePostalCode,
  canonicalizeRecipientPhone,
  canonicalizeStateCode,
  parseCreateCustomerAddressInput,
} from "../customer-addresses";
import {
  CHECKOUT_CANCEL_INPUT_FIELDS,
  CHECKOUT_COORDINATES_INPUT_FIELDS,
  CHECKOUT_DESTINATION_INPUT_FIELDS,
  CHECKOUT_EVALUATE_INPUT_FIELDS,
  CHECKOUT_GET_ACTIVE_INPUT_FIELDS,
  CHECKOUT_ID_REVISION_INPUT_FIELDS,
  CHECKOUT_ONE_TIME_ADDRESS_DESTINATION_FIELDS,
  CHECKOUT_PREPARE_INPUT_FIELDS,
  CHECKOUT_SAVED_ADDRESS_DESTINATION_FIELDS,
  CHECKOUT_START_INPUT_FIELDS,
} from "./constants";
import {
  assertUuid,
  parseExpectedCheckoutRevision,
} from "./canonicalize";
import { CheckoutError } from "./errors";
import type {
  CheckoutDestinationInput,
  OneTimeAddressDestinationInput,
  SavedAddressDestinationInput,
} from "./types";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function assertPlainObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      `${field} must be an object.`,
      { field },
    );
  }
  return value as Record<string, unknown>;
}

function rejectUnknownAndForbiddenFields(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key) || !allowed.includes(key)) {
      throw new CheckoutError(
        "CHECKOUT_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
        { field },
      );
    }
  }
}

function rejectForbiddenRecursively(value: unknown, field: string): void {
  if (typeof value !== "object" || value === null) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      rejectForbiddenRecursively(value[i], `${field}[${i}]`);
    }
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new CheckoutError(
        "CHECKOUT_INVALID_INPUT",
        `Forbidden field "${key}" is not allowed.`,
        { field },
      );
    }
    rejectForbiddenRecursively(obj[key], `${field}.${key}`);
  }
}

export type ParsedStartCheckoutInput = Readonly<{
  cartId: string;
}>;

export function parseStartCheckoutInput(input: unknown): ParsedStartCheckoutInput {
  const obj = assertPlainObject(input, "input");
  rejectForbiddenRecursively(obj, "input");
  rejectUnknownAndForbiddenFields(obj, CHECKOUT_START_INPUT_FIELDS, "input");
  return Object.freeze({
    cartId: assertUuid(obj.cartId, "cartId"),
  });
}

export type ParsedGetActiveCheckoutInput = Readonly<{
  cartId?: string;
  checkoutId?: string;
}>;

export function parseGetActiveCheckoutInput(
  input: unknown,
): ParsedGetActiveCheckoutInput {
  if (input === undefined || input === null) {
    return Object.freeze({});
  }
  const obj = assertPlainObject(input, "input");
  rejectForbiddenRecursively(obj, "input");
  rejectUnknownAndForbiddenFields(obj, CHECKOUT_GET_ACTIVE_INPUT_FIELDS, "input");
  const cartId =
    obj.cartId === undefined ? undefined : assertUuid(obj.cartId, "cartId");
  const checkoutId =
    obj.checkoutId === undefined
      ? undefined
      : assertUuid(obj.checkoutId, "checkoutId");
  if (cartId === undefined && checkoutId === undefined) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "cartId or checkoutId is required.",
    );
  }
  return Object.freeze({
    ...(cartId !== undefined ? { cartId } : {}),
    ...(checkoutId !== undefined ? { checkoutId } : {}),
  });
}

function parseIdRevision(
  input: unknown,
  allowed: readonly string[],
): { checkoutId: string; expectedCheckoutRevision: bigint } {
  const obj = assertPlainObject(input, "input");
  rejectForbiddenRecursively(obj, "input");
  rejectUnknownAndForbiddenFields(obj, allowed, "input");
  if (!("checkoutId" in obj) || !("expectedCheckoutRevision" in obj)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "checkoutId and expectedCheckoutRevision are required.",
    );
  }
  return {
    checkoutId: assertUuid(obj.checkoutId, "checkoutId"),
    expectedCheckoutRevision: parseExpectedCheckoutRevision(
      obj.expectedCheckoutRevision,
    ),
  };
}

export type ParsedCheckoutIdRevisionInput = Readonly<{
  checkoutId: string;
  expectedCheckoutRevision: bigint;
}>;

export function parseEvaluateCheckoutInput(
  input: unknown,
): ParsedCheckoutIdRevisionInput {
  return Object.freeze(
    parseIdRevision(input, CHECKOUT_EVALUATE_INPUT_FIELDS),
  );
}

export function parseCancelCheckoutInput(
  input: unknown,
): ParsedCheckoutIdRevisionInput {
  return Object.freeze(parseIdRevision(input, CHECKOUT_CANCEL_INPUT_FIELDS));
}

export function parsePrepareCheckoutForPaymentInput(
  input: unknown,
): ParsedCheckoutIdRevisionInput {
  return Object.freeze(parseIdRevision(input, CHECKOUT_PREPARE_INPUT_FIELDS));
}

export function parseClearCheckoutDestinationInput(
  input: unknown,
): ParsedCheckoutIdRevisionInput {
  return Object.freeze(
    parseIdRevision(input, CHECKOUT_ID_REVISION_INPUT_FIELDS),
  );
}

function parseSavedAddressDestination(
  raw: Record<string, unknown>,
): SavedAddressDestinationInput {
  rejectUnknownAndForbiddenFields(
    raw,
    CHECKOUT_SAVED_ADDRESS_DESTINATION_FIELDS,
    "destination",
  );
  return Object.freeze({
    kind: "SAVED_ADDRESS" as const,
    savedAddressId: assertUuid(raw.savedAddressId, "savedAddressId"),
  });
}

function parseOneTimeAddressDestination(
  raw: Record<string, unknown>,
): OneTimeAddressDestinationInput {
  rejectUnknownAndForbiddenFields(
    raw,
    CHECKOUT_ONE_TIME_ADDRESS_DESTINATION_FIELDS,
    "destination",
  );
  // Reuse address create field validation shapes via customer-addresses helpers.
  const createShaped = {
    recipientName: raw.recipientName,
    recipientPhone: raw.recipientPhone,
    addressLine1: raw.addressLine1,
    addressLine2: raw.addressLine2,
    landmark: raw.landmark,
    locality: raw.locality,
    city: raw.city,
    stateCode: raw.stateCode,
    postalCode: raw.postalCode,
    coordinates: raw.coordinates,
    label: raw.label,
  };
  // Strict unknown-field rejection already done; validate coordinates keys.
  if (raw.coordinates !== undefined && raw.coordinates !== null) {
    const coords = assertPlainObject(raw.coordinates, "coordinates");
    rejectUnknownAndForbiddenFields(
      coords,
      CHECKOUT_COORDINATES_INPUT_FIELDS,
      "coordinates",
    );
  }
  let parsed;
  try {
    parsed = parseCreateCustomerAddressInput(createShaped);
  } catch (error) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      error instanceof Error ? error.message : "Invalid one-time destination.",
      { field: "destination" },
    );
  }
  const canonical = canonicalizeCreateFields(parsed);
  return Object.freeze({
    kind: "ONE_TIME_ADDRESS" as const,
    recipientName: canonical.recipientName,
    recipientPhone: canonical.recipientPhone,
    addressLine1: canonical.addressLine1,
    addressLine2: canonical.addressLine2,
    landmark: canonical.landmark,
    locality: canonical.locality,
    city: canonical.city,
    stateCode: canonical.stateCode,
    postalCode: canonical.postalCode,
    coordinates: canonical.coordinates,
    label: canonical.label,
  });
}

export type ParsedSetCheckoutDestinationInput = Readonly<{
  checkoutId: string;
  expectedCheckoutRevision: bigint;
  destination: CheckoutDestinationInput;
}>;

export function parseSetCheckoutDestinationInput(
  input: unknown,
): ParsedSetCheckoutDestinationInput {
  const obj = assertPlainObject(input, "input");
  rejectForbiddenRecursively(obj, "input");
  rejectUnknownAndForbiddenFields(obj, CHECKOUT_DESTINATION_INPUT_FIELDS, "input");
  if (!("destination" in obj)) {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      "destination is required.",
      { field: "destination" },
    );
  }
  const destinationObj = assertPlainObject(obj.destination, "destination");
  if (destinationObj.kind !== "SAVED_ADDRESS" && destinationObj.kind !== "ONE_TIME_ADDRESS") {
    throw new CheckoutError(
      "CHECKOUT_INVALID_INPUT",
      'destination.kind must be "SAVED_ADDRESS" or "ONE_TIME_ADDRESS".',
      { field: "destination.kind" },
    );
  }
  const destination =
    destinationObj.kind === "SAVED_ADDRESS"
      ? parseSavedAddressDestination(destinationObj)
      : parseOneTimeAddressDestination(destinationObj);

  return Object.freeze({
    checkoutId: assertUuid(obj.checkoutId, "checkoutId"),
    expectedCheckoutRevision: parseExpectedCheckoutRevision(
      obj.expectedCheckoutRevision,
    ),
    destination,
  });
}

// Re-export address helpers used by destination adapter (typed convenience).
export {
  canonicalizeAddressText,
  canonicalizeCoordinates,
  canonicalizePostalCode,
  canonicalizeRecipientPhone,
  canonicalizeStateCode,
};
