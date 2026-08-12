/**
 * Public entry point for Assortment and Operational Availability (IMP-014).
 *
 * Framework-independent domain services. No public HTTP routes.
 */
import "server-only";

export {
  AssortmentBootstrapError,
  AssortmentConflictError,
  AssortmentInvalidStateError,
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "./errors";
export type { AssortmentErrorCode } from "./errors";

export type {
  AssortmentEligibilityResult,
  AssortmentRule,
  ConfigureOutletOperatingProfileInput,
  EligibilityDecision,
  ExcludeModifierOptionAtScopeInput,
  ExcludeProductAtScopeInput,
  ExcludeVariantAtScopeInput,
  GetModifierOptionAvailabilityInput,
  GetVariantAvailabilityInput,
  IncludeBrandVariantInput,
  ModifierOptionAvailabilityRecord,
  OperatingIntervalInput,
  OutletControlMutationInput,
  OutletOperatingInterval,
  OutletOperatingProfile,
  ReplaceOutletOperatingScheduleInput,
  ResolveModifierOptionAvailabilityInput,
  ResolveOperatingStateInput,
  ResolveOutletOperatingStateResult,
  ResolveOutletProductAvailabilityInput,
  ResolveOutletVariantAvailabilityInput,
  RetireAssortmentRuleInput,
  SetModifierOptionAvailabilityInput,
  SetVariantAvailabilityInput,
  VariantAvailabilityRecord,
} from "./types";

export {
  excludeModifierOptionAtScope,
  excludeProductAtScope,
  excludeVariantAtScope,
  findAssortmentRuleById,
  includeBrandVariant,
  retireAssortmentRule,
} from "./rules";

export {
  getEffectiveModifierOptionAssortment,
  getEffectiveVariantAssortment,
  loadOutletAncestry,
} from "./assortment-reads";

export {
  getModifierOptionAvailability,
  getVariantAvailability,
  setModifierOptionAvailability,
  setVariantAvailability,
} from "./availability";

export {
  configureOutletOperatingProfile,
  findOutletOperatingProfile,
  listOutletOperatingIntervals,
  pauseOutlet,
  replaceOutletOperatingSchedule,
  resumeOutlet,
  suspendOutlet,
  unsuspendOutlet,
  validateOperatingSchedule,
} from "./operating";

export { resolveOutletOperatingState } from "./resolve-operating";

export {
  resolveModifierOptionAvailability,
  resolveOutletProductAvailability,
  resolveOutletVariantAvailability,
} from "./resolve-eligibility";

// Bootstrap / verify load the static menu-import inventory (including
// `src/data/menu.json`). They remain available as dedicated modules for
// tooling and tests (`./bootstrap`, `./verify`) but are intentionally not
// re-exported from this runtime barrel so customer-commerce and other
// HTTP/runtime consumers cannot pull build-time Menu bootstrap into the
// compiled ESM graph.

export {
  requireAssortmentManage,
  requireAssortmentRead,
  requireAvailabilityManage,
  requireAvailabilityRead,
  requireOperatingScheduleManage,
  requireOperatingScheduleRead,
  requireOperatingStatePause,
  requireOperatingStateRead,
  requireOperatingStateSuspend,
} from "./authorize-assortment";

export { insertAssortmentAuditEvent } from "./audit";
