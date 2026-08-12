/**
 * Canonical Cart configuration equality helpers (IMP-020).
 *
 * Quantity is NOT part of line identity. Input-array ordering does not
 * affect equality for unordered modifier selections.
 */

import { CartError } from "./errors";
import type {
  CanonicalCartBundleSelection,
  CanonicalCartLineConfiguration,
  CanonicalCartModifierSelection,
  CartBundleSelectionInput,
  CartLineConfigurationInput,
  CartModifierSelectionInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new CartError(
      "CART_INVALID_INPUT",
      `${field} must be a UUID.`,
      { field },
    );
  }
  return value;
}

export function parsePositiveIntegerQuantity(
  raw: unknown,
  field: string,
): number {
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw <= 0 ||
    !Number.isSafeInteger(raw)
  ) {
    throw new CartError(
      "CART_INVALID_INPUT",
      `${field} must be a positive integer.`,
      { field },
    );
  }
  return raw;
}

export function parseExpectedRevision(raw: unknown): bigint {
  if (typeof raw !== "bigint" || raw <= BigInt(0)) {
    throw new CartError(
      "CART_INVALID_INPUT",
      "expectedRevision must be a positive bigint.",
      { field: "expectedRevision" },
    );
  }
  return raw;
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonicalizeModifiers(
  modifiers: readonly CartModifierSelectionInput[] | undefined,
): readonly CanonicalCartModifierSelection[] {
  const list = [...(modifiers ?? [])].map((m) => {
    const variantModifierGroupId = assertUuid(
      m.variantModifierGroupId,
      "variantModifierGroupId",
    );
    const modifierGroupOptionId = assertUuid(
      m.modifierGroupOptionId,
      "modifierGroupOptionId",
    );
    const quantity = parsePositiveIntegerQuantity(m.quantity, "quantity");
    return Object.freeze({
      variantModifierGroupId,
      modifierGroupOptionId,
      quantity,
    });
  });
  list.sort((a, b) => {
    const g = compareId(a.variantModifierGroupId, b.variantModifierGroupId);
    if (g !== 0) return g;
    const o = compareId(a.modifierGroupOptionId, b.modifierGroupOptionId);
    if (o !== 0) return o;
    return a.quantity - b.quantity;
  });
  // Deduplicate exact same group+option — reject ambiguous duplicates.
  for (let i = 1; i < list.length; i++) {
    if (
      list[i]!.variantModifierGroupId === list[i - 1]!.variantModifierGroupId &&
      list[i]!.modifierGroupOptionId === list[i - 1]!.modifierGroupOptionId
    ) {
      throw new CartError(
        "CART_CONFIGURATION_INVALID",
        "Duplicate modifier selection for the same group option.",
        { field: "modifiers" },
      );
    }
  }
  return Object.freeze(list);
}

function canonicalizeBundleSelections(
  selections: readonly CartBundleSelectionInput[] | undefined,
): readonly CanonicalCartBundleSelection[] {
  const list = [...(selections ?? [])].map((s) => {
    const bundleGroupOptionId = assertUuid(
      s.bundleGroupOptionId,
      "bundleGroupOptionId",
    );
    const quantity = parsePositiveIntegerQuantity(s.quantity, "quantity");
    const modifiers = canonicalizeModifiers(s.modifiers);
    return Object.freeze({
      bundleGroupOptionId,
      quantity,
      modifiers,
    });
  });
  list.sort((a, b) => {
    const o = compareId(a.bundleGroupOptionId, b.bundleGroupOptionId);
    if (o !== 0) return o;
    return a.quantity - b.quantity;
  });
  for (let i = 1; i < list.length; i++) {
    if (list[i]!.bundleGroupOptionId === list[i - 1]!.bundleGroupOptionId) {
      throw new CartError(
        "CART_CONFIGURATION_INVALID",
        "Duplicate bundle selection for the same group option.",
        { field: "bundleSelections" },
      );
    }
  }
  return Object.freeze(list);
}

export function canonicalizeLineConfiguration(
  variantId: string,
  configuration: CartLineConfigurationInput | undefined,
): CanonicalCartLineConfiguration {
  return Object.freeze({
    variantId: assertUuid(variantId, "variantId"),
    modifiers: canonicalizeModifiers(configuration?.modifiers),
    bundleSelections: canonicalizeBundleSelections(
      configuration?.bundleSelections,
    ),
  });
}

function modifiersEqual(
  a: readonly CanonicalCartModifierSelection[],
  b: readonly CanonicalCartModifierSelection[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]!.variantModifierGroupId !== b[i]!.variantModifierGroupId ||
      a[i]!.modifierGroupOptionId !== b[i]!.modifierGroupOptionId ||
      a[i]!.quantity !== b[i]!.quantity
    ) {
      return false;
    }
  }
  return true;
}

function bundleSelectionsEqual(
  a: readonly CanonicalCartBundleSelection[],
  b: readonly CanonicalCartBundleSelection[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]!.bundleGroupOptionId !== b[i]!.bundleGroupOptionId ||
      a[i]!.quantity !== b[i]!.quantity ||
      !modifiersEqual(a[i]!.modifiers, b[i]!.modifiers)
    ) {
      return false;
    }
  }
  return true;
}

export function canonicalConfigurationsEqual(
  a: CanonicalCartLineConfiguration,
  b: CanonicalCartLineConfiguration,
): boolean {
  return (
    a.variantId === b.variantId &&
    modifiersEqual(a.modifiers, b.modifiers) &&
    bundleSelectionsEqual(a.bundleSelections, b.bundleSelections)
  );
}

export function requireGuestCartTtlMs(policy: { guestCartTtlMs?: number } | undefined): number {
  const ttl = policy?.guestCartTtlMs;
  if (
    typeof ttl !== "number" ||
    !Number.isFinite(ttl) ||
    ttl <= 0
  ) {
    throw new CartError(
      "CART_POLICY_INVALID",
      "guestCartTtlMs must be a positive finite number for guest Cart mutations.",
      { field: "guestCartTtlMs" },
    );
  }
  return ttl;
}
