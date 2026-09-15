export type CommercialSectionId =
  | "offering"
  | "menu"
  | "assortment"
  | "pricing"
  | "promotions"
  | "delivery"
  | "review"
  | "verify"
  | "activity";

export type CommercialContext = Readonly<{
  brandId: string;
  brandName: string;
  productId: string | null;
  productLabel: string | null;
  variantId: string | null;
  variantLabel: string | null;
  outletId: string | null;
  outletLabel: string | null;
  menuId: string | null;
}>;

export type CommercialCapabilities = Readonly<{
  catalogRead: boolean;
  catalogManage: boolean;
  menuRead: boolean;
  menuManage: boolean;
  assortmentRead: boolean;
  assortmentManage: boolean;
  pricingRead: boolean;
  pricingManage: boolean;
  promotionsRead: boolean;
  promotionsManage: boolean;
  promotionsActivate: boolean;
  couponsRead: boolean;
  couponsManage: boolean;
}>;

export function resolveCommercialCapabilities(
  caps: Record<string, boolean>,
): CommercialCapabilities {
  return {
    catalogRead: caps["catalog.read"] === true,
    catalogManage: caps["catalog.manage"] === true,
    menuRead: caps["menu.read"] === true,
    menuManage: caps["menu.manage"] === true,
    assortmentRead: caps["assortment.read"] === true,
    assortmentManage: caps["assortment.manage"] === true,
    pricingRead: caps["pricing.read"] === true,
    pricingManage: caps["pricing.manage"] === true,
    promotionsRead: caps["promotions.read"] === true,
    promotionsManage: caps["promotions.manage"] === true,
    promotionsActivate: caps["promotions.activate"] === true,
    couponsRead: caps["coupons.read"] === true,
    couponsManage: caps["coupons.manage"] === true,
  };
}

export function hasAnyCommercialRead(c: CommercialCapabilities): boolean {
  return (
    c.catalogRead ||
    c.menuRead ||
    c.assortmentRead ||
    c.pricingRead ||
    c.promotionsRead ||
    c.couponsRead
  );
}

export function hasAnyCommercialManage(c: CommercialCapabilities): boolean {
  return (
    c.catalogManage ||
    c.menuManage ||
    c.assortmentManage ||
    c.pricingManage ||
    c.promotionsManage ||
    c.promotionsActivate ||
    c.couponsManage
  );
}
