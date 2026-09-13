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
  attachDraftModifierPrice,
  attachDraftVariantPrice,
  createDraftPriceBook,
  findOverlappingActivePriceBooks,
  loadOutletsInPriceBookScope,
  parseExpectedPriceBookRevision,
  retirePriceBook,
  rowToBook,
} from "./price-books";
export type {
  AttachModifierPriceInput,
  AttachVariantPriceInput,
  CreateDraftPriceBookInput,
  PriceBookRecord,
} from "./price-books";

export {
  resolveBrandVariantPrice,
  resolveBundleOptionPriceDelta,
  resolveModifierDisplayPriceDeltas,
  resolveModifierPriceDelta,
  resolveOutletVariantPrice,
} from "./resolve-price";
export type { ModifierDisplayPriceKey } from "./resolve-price";

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

export { inspectBrandPriceBook, listBrandPriceBooks } from "./commercial-reads";
export type {
  PriceBookInspection,
  PriceBookModifierPriceRow,
  PriceBookVariantPriceRow,
} from "./commercial-reads";

export { previewPriceBookConsequence } from "./consequence-preview";
export type {
  PriceBookConsequencePreview,
  PricingPreviewBlocker,
} from "./consequence-preview";
