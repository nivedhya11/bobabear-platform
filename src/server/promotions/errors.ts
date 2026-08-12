/**
 * Secret-safe promotion server errors (IMP-016).
 * Re-exports shared admin/fatal errors plus thin wrappers.
 */
export {
  PromotionAdminError,
  PromotionFatalError,
  PromotionNotFoundError,
  PromotionValidationError,
} from "../../shared/promotions/errors";
