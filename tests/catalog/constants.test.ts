import { describe, expect, it } from "vitest";

import {
  CATALOG_LIFECYCLE_STATUSES,
  DIETARY_TAG_KINDS,
  PRODUCT_KINDS,
  isCatalogLifecycleStatus,
  isDietaryTagKind,
  isModifierGroupRequired,
  isProductKind,
} from "../../src/shared/catalog";

describe("catalog shared constants", () => {
  it("exposes locked lifecycle, kind, and dietary unions", () => {
    expect(CATALOG_LIFECYCLE_STATUSES).toEqual(["draft", "active", "retired"]);
    expect(PRODUCT_KINDS).toEqual(["standard", "bundle"]);
    expect(DIETARY_TAG_KINDS).toEqual(["dietary", "allergen"]);
  });

  it("validates discriminants and required-modifier derivation", () => {
    expect(isCatalogLifecycleStatus("draft")).toBe(true);
    expect(isCatalogLifecycleStatus("published")).toBe(false);
    expect(isProductKind("standard")).toBe(true);
    expect(isProductKind("combo")).toBe(false);
    expect(isDietaryTagKind("allergen")).toBe(true);
    expect(isDietaryTagKind("spicy")).toBe(false);
    expect(isModifierGroupRequired(0)).toBe(false);
    expect(isModifierGroupRequired(1)).toBe(true);
  });
});
