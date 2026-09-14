/**
 * Typed Admin client contracts for IMP-036F F6A commercial composition.
 * F6B UI consumes these; this module does not build the commercial workspace.
 */
import { adminRequest } from "./http";

export type CompositionProjectionState =
  | "available"
  | "unavailable_to_inspect"
  | "insufficient_authorized_context"
  | "not_applicable";

export type ComposedSection<T> = Readonly<{
  state: CompositionProjectionState;
  permission: string;
  data: T | null;
  explanation: string;
}>;

export type CommercialInspectionResponse = Readonly<{
  ok: true;
  brandId: string;
  variantId: string;
  productId: string | null;
  outletId: string | null;
  catalog: ComposedSection<unknown>;
  menu: ComposedSection<unknown>;
  assortment: ComposedSection<unknown>;
  availability: ComposedSection<unknown>;
  operating: ComposedSection<unknown>;
  pricing: ComposedSection<unknown>;
  promotions: ComposedSection<unknown>;
  deliveryTariff: ComposedSection<unknown>;
  taxCharges: ComposedSection<unknown>;
  mediaReference: ComposedSection<{ imagePath: string | null; source: string }>;
  authoritiesRemainDistinct: true;
  diagnosisIsSourceOfTruth: false;
}>;

export type DiagnosisSignal = Readonly<{
  key: string;
  authority: string;
  subject: Readonly<{
    brandId: string;
    variantId: string;
    productId: string | null;
    outletId: string | null;
  }>;
  outcome: string;
  explanation: string;
  actionableContext: string | null;
  authoritative: boolean;
}>;

export type SellabilityDiagnosisResponse = Readonly<{
  ok: true;
  brandId: string;
  variantId: string;
  productId: string | null;
  outletId: string;
  signals: readonly DiagnosisSignal[];
  diagnosisIsSourceOfTruth: false;
  newSellabilityDomain: false;
  underlyingAuthoritiesRemainAuthoritative: true;
}>;

export type VerificationOutcome =
  | "VERIFIED_MATCH"
  | "VERIFIED_MISMATCH"
  | "PARTIAL_VERIFICATION"
  | "INSUFFICIENT_CONTEXT";

export type CustomerVerificationResponse = Readonly<{
  ok: true;
  brandId: string;
  variantId: string;
  outletId: string;
  outcome: VerificationOutcome;
  explanation: string;
  customerMenu: unknown;
  pricing: unknown;
  promotions: unknown;
  deliveryTariff: unknown;
  realtimePushRequired: false;
  formStateTrusted: false;
  subsequentReadValid: true;
}>;

export type CommercialActivityResponse = Readonly<{
  ok: true;
  brandId: string;
  events: readonly unknown[];
  omittedDomains: readonly unknown[];
  mutableCommercialAuditAuthority: false;
}>;

export function fetchCommercialInspection(brandId: string, variantId: string) {
  return adminRequest<CommercialInspectionResponse>(
    `/api/admin/v1/brands/${brandId}/commercial/variants/${variantId}/inspection`,
  );
}

export function fetchCommercialOutletInspection(
  brandId: string,
  variantId: string,
  outletId: string,
) {
  return adminRequest<CommercialInspectionResponse>(
    `/api/admin/v1/brands/${brandId}/commercial/variants/${variantId}/outlets/${outletId}/inspection`,
  );
}

export function postSellabilityDiagnosis(
  brandId: string,
  variantId: string,
  body: Readonly<{
    outletId: string;
    customerLocation?: { latitude: string; longitude: string } | null;
  }>,
) {
  return adminRequest<SellabilityDiagnosisResponse>(
    `/api/admin/v1/brands/${brandId}/commercial/variants/${variantId}/diagnosis`,
    { method: "POST", body },
  );
}

export function postCustomerCommercialVerification(
  brandId: string,
  variantId: string,
  body: Readonly<{
    outletId: string;
    destinationCoordinates?: { latitude: string; longitude: string } | null;
    orderSubtotalPaise?: string | null;
  }>,
) {
  return adminRequest<CustomerVerificationResponse>(
    `/api/admin/v1/brands/${brandId}/commercial/variants/${variantId}/verification`,
    { method: "POST", body },
  );
}

export function fetchCommercialActivity(brandId: string) {
  return adminRequest<CommercialActivityResponse>(
    `/api/admin/v1/brands/${brandId}/commercial/activity`,
  );
}
