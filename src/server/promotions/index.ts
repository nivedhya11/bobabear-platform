/**
 * Server-only promotions / coupons boundary (IMP-016).
 */
import "server-only";

export {
  PromotionAdminError,
  PromotionFatalError,
  PromotionNotFoundError,
  PromotionValidationError,
} from "./errors";

export { insertPromotionAuditEvent } from "./audit";
export type { InsertPromotionAuditEventInput } from "./audit";

export {
  getBrandPromotionPolicyFlags,
  requireCouponsRead,
  requirePromotionManageForScope,
  requirePromotionsRead,
  requirePromotionsActivate,
  requireCouponsManageForPromotionScope,
  requirePromotionsAuditRead,
} from "./authorize-promotions";

export { getBrandPromotionPolicy, updateBrandPromotionPolicy } from "./policy";

export {
  createPromotionDraft,
  updatePromotionDraft,
  deletePromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
  activatePromotion,
  retirePromotion,
  getPromotion,
  getPromotionForActor,
  listPromotions,
  parseExpectedPromotionRevision,
} from "./promotions";

export {
  createCouponDraft,
  updateCouponDraft,
  deleteCouponDraft,
  activateCoupon,
  disableCoupon,
  enableCoupon,
  retireCoupon,
  getCoupon,
  findCouponByCanonicalCode,
  listCoupons,
  parseExpectedCouponRevision,
} from "./coupons";

export {
  inspectBrandCoupon,
  inspectBrandPromotion,
  listBrandPromotionAuditEvents,
  listBrandPromotions,
  listPromotionCoupons,
} from "./commercial-reads";

export { previewCouponConsequence, previewPromotionConsequence } from "./consequence-preview";
export type { CouponConsequencePreview, PromotionConsequencePreview } from "./consequence-preview";

export {
  loadApplicableAutomaticPromotions,
  loadSubmittedCoupon,
  resolveOutletHierarchy,
  hydratePromotionDefinition,
} from "./load-for-evaluation";
