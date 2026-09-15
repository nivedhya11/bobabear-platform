/**
 * Typed Admin client for Pricing + delivery tariff authoring (IMP-036F F6B).
 */
import { adminRequest } from "./http";

export type PriceBook = Readonly<{
  id: string;
  brandId: string;
  scopeType: "brand" | "territory" | "organization" | "outlet";
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  code: string;
  name: string;
  salesChannel: "direct";
  currency: "INR";
  taxInclusionMode: "exclusive" | "inclusive";
  effectiveFrom: string;
  effectiveTo: string | null;
  lifecycleStatus: "draft" | "active" | "retired";
  revision: string;
}>;

export type VariantPriceRow = Readonly<{
  id: string;
  variantId: string;
  amountPaise: string;
  taxCategoryId: string;
  allowTerritoryOverride: boolean;
  allowOrganizationOverride: boolean;
  allowOutletOverride: boolean;
  floorPaise: string | null;
  ceilingPaise: string | null;
}>;

export type PriceBookInspection = Readonly<{
  priceBook: PriceBook;
  variantPrices: readonly VariantPriceRow[];
  modifierPrices: readonly unknown[];
  customerEffective: readonly Readonly<{
    variantId: string;
    outletId: string;
    amountPaise: string | null;
    code: string;
  }>[];
}>;

export type DeliveryFeeBand = Readonly<{
  maxDistanceMeters: number;
  amountPaise: number;
}>;

export type DeliveryTariff = Readonly<{
  outletId: string;
  brandId: string;
  expectedTariffConfigRevision: string;
  deliveryFeeBands: readonly DeliveryFeeBand[];
  freeDeliverySubtotalThresholdPaise: string | null;
  geographicServiceability: Readonly<{
    routingPriority: number | null;
    serviceOriginLatitude: string | null;
    serviceOriginLongitude: string | null;
    maxServiceDistanceMeters: number | null;
  }>;
}>;

function brandPricing(brandId: string) {
  return `/api/admin/v1/brands/${brandId}/pricing`;
}

export function listPriceBooks(brandId: string) {
  return adminRequest<{ ok: true; priceBooks: PriceBook[] }>(`${brandPricing(brandId)}/price-books`);
}

export function getPriceBook(brandId: string, priceBookId: string) {
  return adminRequest<{ ok: true; inspection: PriceBookInspection }>(
    `${brandPricing(brandId)}/price-books/${priceBookId}`,
  );
}

export function createPriceBook(
  brandId: string,
  body: Readonly<{
    scopeType: "brand" | "territory" | "organization" | "outlet";
    code: string;
    name: string;
    effectiveFrom: string;
    territoryId?: string;
    organizationId?: string;
    outletId?: string;
    taxInclusionMode?: "exclusive" | "inclusive";
    effectiveTo?: string | null;
    currency?: "INR";
  }>,
) {
  return adminRequest<{ ok: true; priceBook: Readonly<{ id: string; revision: string }> }>(
    `${brandPricing(brandId)}/price-books`,
    { method: "POST", body },
  );
}

export function attachVariantPrice(
  brandId: string,
  priceBookId: string,
  body: Readonly<{
    expectedPriceBookRevision: string;
    variantId: string;
    amountPaise: string;
    taxCategoryId: string;
    allowTerritoryOverride?: boolean;
    allowOrganizationOverride?: boolean;
    allowOutletOverride?: boolean;
    floorPaise?: string;
    ceilingPaise?: string;
  }>,
) {
  return adminRequest<{
    ok: true;
    variantPrice: Readonly<{ id: string }>;
    priceBookRevision: string;
  }>(`${brandPricing(brandId)}/price-books/${priceBookId}/variant-prices`, {
    method: "POST",
    body,
  });
}

export function previewPriceBookActivation(brandId: string, priceBookId: string) {
  return adminRequest<{
    ok: true;
    preview: Readonly<{
      priceBookId: string;
      brandId: string;
      expectedPriceBookRevision: string;
      scopeType: string;
      currency: "INR";
      effectiveFrom: string;
      effectiveTo: string | null;
      lifecycleStatus: string;
      variantPriceChanges: readonly Readonly<{
        variantId: string;
        outletId: string;
        currentAmountPaise: string | null;
        proposedAmountPaise: string | null;
      }>[];
      customerMonetaryConsequence: string;
      wouldChangeCustomerPricing: boolean;
      overlapBlockers: readonly string[];
      referenceBlockers: readonly string[];
    }>;
  }>(`${brandPricing(brandId)}/price-books/${priceBookId}/consequence-preview`, {
    method: "POST",
    body: {},
  });
}

export function activatePriceBook(
  brandId: string,
  priceBookId: string,
  body: Readonly<{ expectedPriceBookRevision: string }>,
) {
  return adminRequest<{ ok: true; revision: string }>(
    `${brandPricing(brandId)}/price-books/${priceBookId}/activate`,
    { method: "POST", body },
  );
}

export function getDeliveryTariff(brandId: string, outletId: string) {
  return adminRequest<{ ok: true; tariff: DeliveryTariff }>(
    `${brandPricing(brandId)}/outlets/${outletId}/delivery-tariff`,
  );
}

export function previewDeliveryTariff(
  brandId: string,
  outletId: string,
  body: Readonly<{
    deliveryFeeBands: readonly DeliveryFeeBand[];
    freeDeliverySubtotalThresholdPaise: string | null;
  }>,
) {
  return adminRequest<{
    ok: true;
    preview: Readonly<{
      outletId: string;
      brandId: string;
      expectedTariffConfigRevision: string;
      currentBands: readonly DeliveryFeeBand[];
      proposedBands: readonly DeliveryFeeBand[];
      currentFreeDeliverySubtotalThresholdPaise: string | null;
      proposedFreeDeliverySubtotalThresholdPaise: string | null;
      customerMonetaryImplication: string;
      wouldChangeCustomerDeliveryPrice: boolean;
      geographicServiceabilityUnchanged: true;
    }>;
  }>(`${brandPricing(brandId)}/outlets/${outletId}/delivery-tariff/consequence-preview`, {
    method: "POST",
    body,
  });
}

export function updateDeliveryTariff(
  brandId: string,
  outletId: string,
  body: Readonly<{
    expectedTariffConfigRevision: string;
    deliveryFeeBands: readonly DeliveryFeeBand[];
    freeDeliverySubtotalThresholdPaise: string | null;
  }>,
) {
  return adminRequest<{ ok: true; revision: string }>(
    `${brandPricing(brandId)}/outlets/${outletId}/delivery-tariff`,
    { method: "POST", body },
  );
}
