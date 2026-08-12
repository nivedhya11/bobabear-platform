/**
 * Public entry point for Pricing, Charges and Tax (IMP-015).
 *
 * Framework-independent domain services. No public HTTP routes.
 */
import "server-only";

export {
  PricingBootstrapError,
  PricingConflictError,
  PricingInvalidStateError,
  PricingNotFoundError,
  PricingResolutionError,
  PricingValidationError,
} from "./errors";
export type { PricingErrorCode } from "./errors";

export { insertPricingTaxAuditEvent } from "./audit";
export type { InsertPricingTaxAuditEventInput } from "./audit";

export {
  requireChargesManage,
  requireChargesRead,
  requireOutletPricingManage,
  requirePricingAuditRead,
  requirePricingManage,
  requirePricingRead,
  requireTaxManage,
  requireTaxRead,
} from "./authorize-pricing";

export {
  activatePriceBook,
  attachDraftVariantPrice,
  createDraftPriceBook,
  retirePriceBook,
} from "./price-books";
export type {
  AttachVariantPriceInput,
  CreateDraftPriceBookInput,
} from "./price-books";

export {
  resolveBundleOptionPriceDelta,
  resolveModifierPriceDelta,
  resolveOutletVariantPrice,
} from "./resolve-price";

export {
  allocateLargestRemainder,
  assignOutletTaxProfile,
  calculateTax,
  createLegalEntityTaxProfile,
  isStructurallyValidGstin,
  isUnionTerritoryStateCode,
} from "./tax";

export { buildDirectPricingQuote } from "./quote";
export type { BuildDirectPricingQuoteInput } from "./quote";

export {
  bootstrapExistingMenuPricing,
  collectStaticMenuPrices,
  deriveExistingMenuVariantPrices,
} from "./bootstrap";
export type {
  ExistingMenuPricingArtifact,
  PricingBootstrapResult,
} from "./bootstrap";

export { verifyExistingMenuPricing } from "./verify";
export type { PricingVerifyResult } from "./verify";
