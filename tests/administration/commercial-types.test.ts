import { describe, expect, it } from "vitest";

import {
  hasAnyCommercialManage,
  hasAnyCommercialRead,
  resolveCommercialCapabilities,
  type CommercialCapabilities,
} from "../../src/components/administration/commercial/commercial-types";

const none: CommercialCapabilities = {
  catalogRead: false,
  catalogManage: false,
  menuRead: false,
  menuManage: false,
  assortmentRead: false,
  assortmentManage: false,
  pricingRead: false,
  pricingManage: false,
  promotionsRead: false,
  promotionsManage: false,
  promotionsActivate: false,
  couponsRead: false,
  couponsManage: false,
};

describe("resolveCommercialCapabilities", () => {
  it("maps known capability keys and ignores unknown keys", () => {
    expect(
      resolveCommercialCapabilities({
        "catalog.read": true,
        "menu.manage": true,
        "promotions.activate": true,
        "access.membership.read": true,
      }),
    ).toEqual({
      ...none,
      catalogRead: true,
      menuManage: true,
      promotionsActivate: true,
    });
  });

  it("requires exact true boolean", () => {
    expect(
      resolveCommercialCapabilities({
        "catalog.read": true,
        "catalog.manage": false,
        "menu.read": "true" as unknown as boolean,
      }),
    ).toEqual({
      ...none,
      catalogRead: true,
    });
  });
});

describe("hasAnyCommercialRead / hasAnyCommercialManage", () => {
  it("detects any read capability", () => {
    expect(hasAnyCommercialRead(none)).toBe(false);
    expect(hasAnyCommercialRead({ ...none, couponsRead: true })).toBe(true);
    expect(hasAnyCommercialRead({ ...none, pricingRead: true })).toBe(true);
  });

  it("detects any manage/activate capability", () => {
    expect(hasAnyCommercialManage(none)).toBe(false);
    expect(hasAnyCommercialManage({ ...none, promotionsActivate: true })).toBe(true);
    expect(hasAnyCommercialManage({ ...none, assortmentManage: true })).toBe(true);
  });
});
