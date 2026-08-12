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
} from "./coupons";

export {
  loadApplicableAutomaticPromotions,
  loadSubmittedCoupon,
  resolveOutletHierarchy,
  hydratePromotionDefinition,
} from "./load-for-evaluation";
