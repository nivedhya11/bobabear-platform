/**
 * Typed Admin client for Brand Assortment commercial authoring (IMP-036F F6B).
 */
import { adminRequest } from "./http";

export type AssortmentRule = Readonly<{
  id: string;
  brandId: string;
  scopeType: "brand" | "territory" | "organization" | "outlet";
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  targetType: "product" | "variant" | "modifier_option";
  productId: string | null;
  variantId: string | null;
  modifierOptionId: string | null;
  decision: "include" | "exclude";
  status: "active" | "retired";
  reasonCode: string | null;
  revision: string;
  createdAt: string;
  retiredAt: string | null;
}>;

export type AssortmentVariantInspection = Readonly<{
  brandId: string;
  variantId: string;
  includeRule: AssortmentRule | null;
  relatedRules: readonly AssortmentRule[];
  outletConsequences: readonly Readonly<{
    outletId: string;
    intendedByAssortment: boolean;
    assortmentCode: string;
    availabilityIsSeparate: true;
  }>[];
  availabilityIsSeparate: true;
}>;

function brandAssortment(brandId: string) {
  return `/api/admin/v1/brands/${brandId}/assortment`;
}

export function listAssortmentRules(brandId: string) {
  return adminRequest<{ ok: true; rules: AssortmentRule[] }>(`${brandAssortment(brandId)}/rules`);
}

export function inspectAssortmentVariant(brandId: string, variantId: string) {
  return adminRequest<{ ok: true; inspection: AssortmentVariantInspection }>(
    `${brandAssortment(brandId)}/variants/${variantId}`,
  );
}

export function previewAssortmentConsequence(
  brandId: string,
  body: Readonly<{
    mutationType: "include_variant" | "exclude" | "retire_rule";
    variantId?: string;
    productId?: string;
    modifierOptionId?: string;
    scopeType?: "brand" | "territory" | "organization" | "outlet";
    territoryId?: string;
    organizationId?: string;
    outletId?: string;
    ruleId?: string;
  }>,
) {
  return adminRequest<{
    ok: true;
    preview: Readonly<{
      mutationType: string;
      brandId: string;
      expectedRuleRevision: string | null;
      currentRule: AssortmentRule | null;
      proposed: Readonly<{ decision: string; status: string }>;
      availabilityRemainsSeparate: true;
      outletConsequences: readonly unknown[];
      customerOrderabilityImplication: string;
      validationBlockers: readonly string[];
      wouldChangeAssortmentIntent: boolean;
    }>;
  }>(`${brandAssortment(brandId)}/consequence-preview`, { method: "POST", body });
}

export function includeAssortmentVariant(
  brandId: string,
  body: Readonly<{
    variantId: string;
    expectedRuleRevision: string | null;
    reasonCode?: string | null;
  }>,
) {
  return adminRequest<{ ok: true; rule: AssortmentRule }>(
    `${brandAssortment(brandId)}/include-variant`,
    { method: "POST", body },
  );
}

export function excludeAssortmentTarget(
  brandId: string,
  body: Readonly<{
    scopeType: "brand" | "territory" | "organization" | "outlet";
    expectedRuleRevision: string | null;
    variantId?: string;
    productId?: string;
    modifierOptionId?: string;
    territoryId?: string;
    organizationId?: string;
    outletId?: string;
    reasonCode?: string | null;
  }>,
) {
  return adminRequest<{ ok: true; rule: AssortmentRule }>(`${brandAssortment(brandId)}/exclude`, {
    method: "POST",
    body,
  });
}

export function retireAssortmentRule(
  brandId: string,
  ruleId: string,
  body: Readonly<{ expectedRuleRevision: string | null }>,
) {
  return adminRequest<{ ok: true; rule: AssortmentRule }>(
    `${brandAssortment(brandId)}/rules/${ruleId}/retire`,
    { method: "POST", body },
  );
}
