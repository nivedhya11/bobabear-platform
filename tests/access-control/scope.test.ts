/**
 * Pure unit tests for IMP-011 scope matching (no database).
 */
import { describe, expect, it } from "vitest";

import {
  accessScopeToProtectedResource,
  assignmentCoversResource,
  membershipToAccessScope,
  resourceHomeScope,
  scopeIsAncestorOrEqual,
} from "../../src/server/access-control/scope";
import type { AccessScope, ProtectedResource } from "../../src/server/access-control/types";

const brandId = "11111111-1111-1111-1111-111111111111";
const brandId2 = "22222222-2222-2222-2222-222222222222";
const orgA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const orgB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const terrA = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const terrB = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const outletA = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const outletB = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const legalA = "99999999-9999-9999-9999-999999999999";

const platform: AccessScope = { scopeType: "platform" };
const brandScope: AccessScope = { scopeType: "brand", brandId };
const orgScopeA: AccessScope = {
  scopeType: "organization",
  brandId,
  organizationId: orgA,
};
const terrScopeA: AccessScope = { scopeType: "territory", brandId, territoryId: terrA };
const outletScopeA: AccessScope = {
  scopeType: "outlet",
  brandId,
  organizationId: orgA,
  territoryId: terrA,
  outletId: outletA,
};
const outletScopeB: AccessScope = {
  scopeType: "outlet",
  brandId,
  organizationId: orgB,
  territoryId: terrB,
  outletId: outletB,
};

const outletResourceA: ProtectedResource = {
  type: "outlet",
  brandId,
  organizationId: orgA,
  territoryId: terrA,
  outletId: outletA,
};
const outletResourceB: ProtectedResource = {
  type: "outlet",
  brandId,
  organizationId: orgB,
  territoryId: terrB,
  outletId: outletB,
};
const legalResourceA: ProtectedResource = {
  type: "legal_entity",
  brandId,
  organizationId: orgA,
  legalEntityId: legalA,
};

describe("membershipToAccessScope", () => {
  it("accepts well-shaped rows and rejects mismatched nullability", () => {
    expect(
      membershipToAccessScope({
        scopeType: "platform",
        brandId: null,
        organizationId: null,
        territoryId: null,
        outletId: null,
      }),
    ).toEqual(platform);

    expect(
      membershipToAccessScope({
        scopeType: "brand",
        brandId,
        organizationId: null,
        territoryId: null,
        outletId: null,
      }),
    ).toEqual(brandScope);

    expect(
      membershipToAccessScope({
        scopeType: "brand",
        brandId,
        organizationId: orgA,
        territoryId: null,
        outletId: null,
      }),
    ).toBeNull();

    expect(
      membershipToAccessScope({
        scopeType: "outlet",
        brandId,
        organizationId: orgA,
        territoryId: terrA,
        outletId: null,
      }),
    ).toBeNull();
  });
});

describe("resourceHomeScope", () => {
  it("maps legal_entity to organization home scope", () => {
    expect(resourceHomeScope(legalResourceA)).toEqual(orgScopeA);
  });

  it("maps outlet to exact outlet scope", () => {
    expect(resourceHomeScope(outletResourceA)).toEqual(outletScopeA);
  });
});

describe("scopeIsAncestorOrEqual / assignmentCoversResource", () => {
  it("platform descendants cover every resource", () => {
    expect(scopeIsAncestorOrEqual(platform, outletResourceA)).toBe(true);
    expect(assignmentCoversResource(platform, "descendants", { type: "platform" })).toBe(true);
    expect(assignmentCoversResource(platform, "descendants", legalResourceA)).toBe(true);
  });

  it("brand descendants cover same-brand resources and deny other brands", () => {
    expect(assignmentCoversResource(brandScope, "descendants", outletResourceA)).toBe(true);
    expect(
      assignmentCoversResource(brandScope, "descendants", {
        type: "brand",
        brandId: brandId2,
      }),
    ).toBe(false);
  });

  it("organization descendants cover legal entities and outlets in that org only", () => {
    expect(assignmentCoversResource(orgScopeA, "descendants", legalResourceA)).toBe(true);
    expect(assignmentCoversResource(orgScopeA, "descendants", outletResourceA)).toBe(true);
    expect(assignmentCoversResource(orgScopeA, "descendants", outletResourceB)).toBe(false);
    expect(
      assignmentCoversResource(orgScopeA, "descendants", {
        type: "organization",
        brandId,
        organizationId: orgB,
      }),
    ).toBe(false);
  });

  it("territory descendants cover outlets in that territory only", () => {
    expect(assignmentCoversResource(terrScopeA, "descendants", outletResourceA)).toBe(true);
    expect(assignmentCoversResource(terrScopeA, "descendants", outletResourceB)).toBe(false);
  });

  it("exact inheritance requires home-scope equality (sibling outlets DENY)", () => {
    expect(assignmentCoversResource(outletScopeA, "exact", outletResourceA)).toBe(true);
    expect(assignmentCoversResource(outletScopeA, "exact", outletResourceB)).toBe(false);
    expect(assignmentCoversResource(outletScopeB, "exact", outletResourceA)).toBe(false);
    expect(assignmentCoversResource(brandScope, "exact", outletResourceA)).toBe(false);
    expect(assignmentCoversResource(orgScopeA, "exact", legalResourceA)).toBe(true);
  });
});

describe("accessScopeToProtectedResource", () => {
  it("round-trips assignment scopes to protected resources", () => {
    expect(accessScopeToProtectedResource(platform)).toEqual({ type: "platform" });
    expect(accessScopeToProtectedResource(outletScopeA)).toEqual(outletResourceA);
  });
});
