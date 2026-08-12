/**
 * Shared assortment / operational-availability constants (IMP-014).
 */

export const ASSORTMENT_SCOPE_TYPES = [
  "brand",
  "territory",
  "organization",
  "outlet",
] as const;
export type AssortmentScopeType = (typeof ASSORTMENT_SCOPE_TYPES)[number];

export const ASSORTMENT_TARGET_TYPES = [
  "product",
  "variant",
  "modifier_option",
] as const;
export type AssortmentTargetType = (typeof ASSORTMENT_TARGET_TYPES)[number];

export const ASSORTMENT_DECISIONS = ["include", "exclude"] as const;
export type AssortmentDecision = (typeof ASSORTMENT_DECISIONS)[number];

export const ASSORTMENT_RULE_STATUSES = ["active", "retired"] as const;
export type AssortmentRuleStatus = (typeof ASSORTMENT_RULE_STATUSES)[number];

export const AVAILABILITY_STATES = [
  "available",
  "temporarily_unavailable",
  "sold_out",
] as const;
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];

export const OUTLET_CONTROL_STATES = ["accepting", "paused", "suspended"] as const;
export type OutletControlState = (typeof OUTLET_CONTROL_STATES)[number];

export const EFFECTIVE_OUTLET_STATES = [
  "accepting",
  "paused",
  "suspended",
  "closed_by_schedule",
] as const;
export type EffectiveOutletState = (typeof EFFECTIVE_OUTLET_STATES)[number];

/** Sunday = 0 … Saturday = 6 (local wall-clock day in the outlet timezone). */
export const DAY_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAY_OF_WEEK)[number];

export const OPERATING_INTERVAL_START_MINUTE_MIN = 0;
export const OPERATING_INTERVAL_START_MINUTE_MAX = 1439;
export const OPERATING_INTERVAL_END_MINUTE_MIN = 1;
export const OPERATING_INTERVAL_END_MINUTE_MAX = 1440;

export const ASSORTMENT_AUDIT_ACTIONS = [
  "assortment.brand_variant_included",
  "assortment.rule_excluded",
  "assortment.rule_retired",
  "availability.variant_changed",
  "availability.modifier_option_changed",
  "outlet.operating_state_changed",
  "outlet.operating_schedule_changed",
  "assortment.existing_menu_bootstrapped",
] as const;
export type AssortmentAuditAction = (typeof ASSORTMENT_AUDIT_ACTIONS)[number];

export const ELIGIBILITY_DECISION_CODES = [
  "AVAILABLE",
  "CATALOG_INACTIVE",
  "ASSORTMENT_NOT_INCLUDED",
  "ASSORTMENT_EXCLUDED_BRAND",
  "ASSORTMENT_EXCLUDED_TERRITORY",
  "ASSORTMENT_EXCLUDED_ORGANIZATION",
  "ASSORTMENT_EXCLUDED_OUTLET",
  "OUTLET_INACTIVE",
  "OPERATING_CONFIGURATION_MISSING",
  "OUTLET_PAUSED",
  "OUTLET_SUSPENDED",
  "OUTLET_CLOSED_BY_SCHEDULE",
  "VARIANT_TEMPORARILY_UNAVAILABLE",
  "VARIANT_SOLD_OUT",
  "MODIFIER_CONFIGURATION_UNAVAILABLE",
  "BUNDLE_COMPONENT_UNAVAILABLE",
  "DENIED",
  "ERROR",
] as const;
export type EligibilityDecisionCode = (typeof ELIGIBILITY_DECISION_CODES)[number];

export const ASSORTMENT_BOOTSTRAP_ERROR_CODES = [
  "BOOTSTRAP_CONFLICT",
  "SOURCE_DRIFT",
  "validation",
] as const;
export type AssortmentBootstrapErrorCode =
  (typeof ASSORTMENT_BOOTSTRAP_ERROR_CODES)[number];

export function isAssortmentScopeType(value: string): value is AssortmentScopeType {
  return (ASSORTMENT_SCOPE_TYPES as readonly string[]).includes(value);
}

export function isAssortmentTargetType(value: string): value is AssortmentTargetType {
  return (ASSORTMENT_TARGET_TYPES as readonly string[]).includes(value);
}

export function isAssortmentDecision(value: string): value is AssortmentDecision {
  return (ASSORTMENT_DECISIONS as readonly string[]).includes(value);
}

export function isAvailabilityState(value: string): value is AvailabilityState {
  return (AVAILABILITY_STATES as readonly string[]).includes(value);
}

export function isOutletControlState(value: string): value is OutletControlState {
  return (OUTLET_CONTROL_STATES as readonly string[]).includes(value);
}

export function isDayOfWeek(value: number): value is DayOfWeek {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function isAssortmentAuditAction(value: string): value is AssortmentAuditAction {
  return (ASSORTMENT_AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function isEligibilityDecisionCode(
  value: string,
): value is EligibilityDecisionCode {
  return (ELIGIBILITY_DECISION_CODES as readonly string[]).includes(value);
}

/** True when `timezone` is a Node/Intl-recognized IANA timezone identifier. */
export function isValidIanaTimezone(timezone: string): boolean {
  if (typeof timezone !== "string" || timezone.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone.trim() });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAY_TO_DAY: Readonly<Record<string, DayOfWeek>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Convert an absolute instant to local wall-clock day-of-week and minute-of-day
 * in the given IANA timezone (Sunday = 0).
 */
export function getLocalWallClockParts(
  now: Date,
  timeZone: string,
): { readonly dayOfWeek: DayOfWeek; readonly minuteOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  let weekday: string | undefined;
  let hour: number | undefined;
  let minute: number | undefined;
  for (const part of parts) {
    if (part.type === "weekday") weekday = part.value;
    if (part.type === "hour") hour = Number(part.value);
    if (part.type === "minute") minute = Number(part.value);
  }

  const dayOfWeek = weekday ? WEEKDAY_TO_DAY[weekday] : undefined;
  if (
    dayOfWeek === undefined ||
    hour === undefined ||
    minute === undefined ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError("Unable to resolve local wall-clock parts for timezone.");
  }

  return { dayOfWeek, minuteOfDay: hour * 60 + minute };
}
