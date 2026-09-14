/**
 * IMP-036F F6A — commercial inspection / diagnosis / verification projection types.
 *
 * Composition-result labels only — not commercial lifecycle states.
 * DIAGNOSIS_IS_SOURCE_OF_TRUTH = NO
 */
import "server-only";

export const COMPOSITION_PROJECTION_STATES = [
  "available",
  "unavailable_to_inspect",
  "insufficient_authorized_context",
  "not_applicable",
] as const;

export type CompositionProjectionState = (typeof COMPOSITION_PROJECTION_STATES)[number];

export type ComposedSection<T> = Readonly<{
  state: CompositionProjectionState;
  permission: string;
  data: T | null;
  explanation: string;
}>;

export const DIAGNOSIS_SIGNAL_KEYS = [
  "CATALOG_LIFECYCLE",
  "CATALOG_PUBLICATION",
  "MENU_PLACEMENT",
  "MENU_EFFECTIVE_VISIBILITY",
  "ASSORTMENT",
  "AVAILABILITY",
  "PRICING_COMPLETENESS",
  "PROMOTION_APPLICABILITY",
  "OUTLET_OPERATING_STATE",
  "OUTLET_HOURS",
  "SERVICEABILITY",
] as const;

export type DiagnosisSignalKey = (typeof DIAGNOSIS_SIGNAL_KEYS)[number];

export type DiagnosisSignalOutcome =
  | "pass"
  | "block"
  | "info"
  | "unavailable_to_inspect"
  | "insufficient_authorized_context"
  | "not_applicable";

export type DiagnosisSignal = Readonly<{
  key: DiagnosisSignalKey;
  authority: string;
  subject: Readonly<{
    brandId: string;
    variantId: string;
    productId: string | null;
    outletId: string | null;
  }>;
  outcome: DiagnosisSignalOutcome;
  explanation: string;
  actionableContext: string | null;
  authoritative: boolean;
}>;

export const VERIFICATION_OUTCOMES = [
  "VERIFIED_MATCH",
  "VERIFIED_MISMATCH",
  "PARTIAL_VERIFICATION",
  "INSUFFICIENT_CONTEXT",
] as const;

export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export type CommercialActivityDomain =
  | "catalog"
  | "menu"
  | "assortment"
  | "pricing"
  | "promotions"
  | "delivery_tariff";

export type CommercialActivityEvent = Readonly<{
  domain: CommercialActivityDomain;
  id: string;
  occurredAt: string;
  actorWorkforceUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  brandId: string | null;
  outletId: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;
