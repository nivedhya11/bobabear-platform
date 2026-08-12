/**
 * Strict Cart input parsing (IMP-020).
 * Unknown top-level and nested fields fail closed.
 */

import {
  CART_ADD_LINE_INPUT_FIELDS,
  CART_BUNDLE_SELECTION_INPUT_FIELDS,
  CART_MODIFIER_SELECTION_INPUT_FIELDS,
  CART_RECONCILIATION_RESOLUTIONS,
  type CartReconciliationResolution,
} from "./constants";
import {
  assertUuid,
  canonicalizeLineConfiguration,
  parseExpectedRevision,
  parsePositiveIntegerQuantity,
} from "./canonicalize";
import { CartError } from "./errors";
import type {
  CanonicalCartLineConfiguration,
  CartLineConfigurationInput,
} from "./types";

function assertPlainObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CartError(
      "CART_INVALID_INPUT",
      `${field} must be an object.`,
      { field },
    );
  }
  return value as Record<string, unknown>;
}

function rejectUnknownFields(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new CartError(
        "CART_INVALID_INPUT",
        `Unknown field "${key}" is not allowed.`,
        { field },
      );
    }
  }
}

function parseModifierSelection(
  raw: unknown,
  field: string,
): {
  variantModifierGroupId: string;
  modifierGroupOptionId: string;
  quantity: number;
} {
  const obj = assertPlainObject(raw, field);
  rejectUnknownFields(obj, CART_MODIFIER_SELECTION_INPUT_FIELDS, field);
  return {
    variantModifierGroupId: assertUuid(
      obj.variantModifierGroupId,
      "variantModifierGroupId",
    ),
    modifierGroupOptionId: assertUuid(
      obj.modifierGroupOptionId,
      "modifierGroupOptionId",
    ),
    quantity: parsePositiveIntegerQuantity(obj.quantity, "quantity"),
  };
}

function parseBundleSelection(
  raw: unknown,
  field: string,
): {
  bundleGroupOptionId: string;
  quantity: number;
  modifiers?: ReturnType<typeof parseModifierSelection>[];
} {
  const obj = assertPlainObject(raw, field);
  rejectUnknownFields(obj, CART_BUNDLE_SELECTION_INPUT_FIELDS, field);
  let modifiers: ReturnType<typeof parseModifierSelection>[] | undefined;
  if (obj.modifiers !== undefined) {
    if (!Array.isArray(obj.modifiers)) {
      throw new CartError(
        "CART_INVALID_INPUT",
        "modifiers must be an array.",
        { field: "modifiers" },
      );
    }
    modifiers = obj.modifiers.map((m, i) =>
      parseModifierSelection(m, `modifiers[${i}]`),
    );
  }
  return {
    bundleGroupOptionId: assertUuid(
      obj.bundleGroupOptionId,
      "bundleGroupOptionId",
    ),
    quantity: parsePositiveIntegerQuantity(obj.quantity, "quantity"),
    modifiers,
  };
}

export function parseLineConfigurationInput(
  raw: unknown,
): CartLineConfigurationInput {
  if (raw === undefined || raw === null) {
    return Object.freeze({ modifiers: [], bundleSelections: [] });
  }
  const obj = assertPlainObject(raw, "configuration");
  rejectUnknownFields(obj, ["modifiers", "bundleSelections"], "configuration");
  let modifiers: ReturnType<typeof parseModifierSelection>[] | undefined;
  let bundleSelections: ReturnType<typeof parseBundleSelection>[] | undefined;
  if (obj.modifiers !== undefined) {
    if (!Array.isArray(obj.modifiers)) {
      throw new CartError(
        "CART_INVALID_INPUT",
        "modifiers must be an array.",
        { field: "modifiers" },
      );
    }
    modifiers = obj.modifiers.map((m, i) =>
      parseModifierSelection(m, `modifiers[${i}]`),
    );
  }
  if (obj.bundleSelections !== undefined) {
    if (!Array.isArray(obj.bundleSelections)) {
      throw new CartError(
        "CART_INVALID_INPUT",
        "bundleSelections must be an array.",
        { field: "bundleSelections" },
      );
    }
    bundleSelections = obj.bundleSelections.map((s, i) =>
      parseBundleSelection(s, `bundleSelections[${i}]`),
    );
  }
  return Object.freeze({ modifiers, bundleSelections });
}

export type ParsedAddCartLineInput = Readonly<{
  variantId: string;
  quantity: number;
  configuration: CanonicalCartLineConfiguration;
  expectedRevision: bigint | null;
}>;

export function parseAddCartLineInput(raw: unknown): ParsedAddCartLineInput {
  const obj = assertPlainObject(raw, "addCartLine");
  rejectUnknownFields(obj, CART_ADD_LINE_INPUT_FIELDS, "addCartLine");
  const variantId = assertUuid(obj.variantId, "variantId");
  const quantity = parsePositiveIntegerQuantity(obj.quantity, "quantity");
  const configuration = canonicalizeLineConfiguration(
    variantId,
    parseLineConfigurationInput({
      modifiers: obj.modifiers,
      bundleSelections: obj.bundleSelections,
    }),
  );
  const expectedRevision =
    obj.expectedRevision === undefined || obj.expectedRevision === null
      ? null
      : parseExpectedRevision(obj.expectedRevision);
  return Object.freeze({
    variantId,
    quantity,
    configuration,
    expectedRevision,
  });
}

export function parseSetCartLineQuantityInput(raw: unknown): Readonly<{
  cartLineId: string;
  quantity: number;
  expectedRevision: bigint;
}> {
  const obj = assertPlainObject(raw, "setCartLineQuantity");
  rejectUnknownFields(
    obj,
    ["cartLineId", "quantity", "expectedRevision"],
    "setCartLineQuantity",
  );
  return Object.freeze({
    cartLineId: assertUuid(obj.cartLineId, "cartLineId"),
    quantity: parsePositiveIntegerQuantity(obj.quantity, "quantity"),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseUpdateCartLineConfigurationInput(raw: unknown): Readonly<{
  cartLineId: string;
  configuration: CanonicalCartLineConfiguration;
  expectedRevision: bigint;
  variantId: string;
}> {
  const obj = assertPlainObject(raw, "updateCartLineConfiguration");
  rejectUnknownFields(
    obj,
    ["cartLineId", "variantId", "modifiers", "bundleSelections", "expectedRevision"],
    "updateCartLineConfiguration",
  );
  const variantId = assertUuid(obj.variantId, "variantId");
  return Object.freeze({
    cartLineId: assertUuid(obj.cartLineId, "cartLineId"),
    variantId,
    configuration: canonicalizeLineConfiguration(
      variantId,
      parseLineConfigurationInput({
        modifiers: obj.modifiers,
        bundleSelections: obj.bundleSelections,
      }),
    ),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseRemoveCartLineInput(raw: unknown): Readonly<{
  cartLineId: string;
  expectedRevision: bigint;
}> {
  const obj = assertPlainObject(raw, "removeCartLine");
  rejectUnknownFields(
    obj,
    ["cartLineId", "expectedRevision"],
    "removeCartLine",
  );
  return Object.freeze({
    cartLineId: assertUuid(obj.cartLineId, "cartLineId"),
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseClearCartInput(raw: unknown): Readonly<{
  expectedRevision: bigint;
}> {
  const obj = assertPlainObject(raw, "clearCart");
  rejectUnknownFields(obj, ["expectedRevision"], "clearCart");
  return Object.freeze({
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseApplyCartCouponInput(raw: unknown): Readonly<{
  couponCode: string;
  expectedRevision: bigint;
}> {
  const obj = assertPlainObject(raw, "applyCartCoupon");
  rejectUnknownFields(
    obj,
    ["couponCode", "expectedRevision"],
    "applyCartCoupon",
  );
  if (typeof obj.couponCode !== "string" || obj.couponCode.trim().length === 0) {
    throw new CartError(
      "CART_INVALID_INPUT",
      "couponCode must be a non-empty string.",
      { field: "couponCode" },
    );
  }
  return Object.freeze({
    couponCode: obj.couponCode,
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseRemoveCartCouponInput(raw: unknown): Readonly<{
  expectedRevision: bigint;
}> {
  const obj = assertPlainObject(raw, "removeCartCoupon");
  rejectUnknownFields(obj, ["expectedRevision"], "removeCartCoupon");
  return Object.freeze({
    expectedRevision: parseExpectedRevision(obj.expectedRevision),
  });
}

export function parseReconciliationResolution(
  raw: unknown,
): CartReconciliationResolution | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (
    typeof raw !== "string" ||
    !(CART_RECONCILIATION_RESOLUTIONS as readonly string[]).includes(raw)
  ) {
    throw new CartError(
      "CART_INVALID_INPUT",
      "resolution must be KEEP_GUEST or KEEP_CUSTOMER.",
      { field: "resolution" },
    );
  }
  return raw as CartReconciliationResolution;
}
