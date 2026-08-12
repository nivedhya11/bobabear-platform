/**
 * Assortment / availability / operating input and result types (IMP-014).
 */
import type {
  AssortmentDecision,
  AssortmentRuleStatus,
  AssortmentScopeType,
  AssortmentTargetType,
  AvailabilityState,
  DayOfWeek,
  EffectiveOutletState,
  EligibilityDecisionCode,
  OutletControlState,
} from "../../shared/assortment";

export type AssortmentActorInput = Readonly<{
  readonly actor: unknown;
}>;

export type AssortmentRule = Readonly<{
  id: string;
  brandId: string;
  scopeType: AssortmentScopeType;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  targetType: AssortmentTargetType;
  productId: string | null;
  variantId: string | null;
  modifierOptionId: string | null;
  decision: AssortmentDecision;
  status: AssortmentRuleStatus;
  reasonCode: string | null;
  createdByWorkforceUserId: string | null;
  retiredByWorkforceUserId: string | null;
  createdAt: Date;
  retiredAt: Date | null;
}>;

export type IncludeBrandVariantInput = AssortmentActorInput &
  Readonly<{
    brandId: string;
    variantId: string;
    reasonCode?: string | null;
  }>;

export type ExcludeAtScopeInput = AssortmentActorInput &
  Readonly<{
    brandId: string;
    scopeType: AssortmentScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
    reasonCode?: string | null;
  }>;

export type ExcludeProductAtScopeInput = ExcludeAtScopeInput &
  Readonly<{ productId: string }>;

export type ExcludeVariantAtScopeInput = ExcludeAtScopeInput &
  Readonly<{ variantId: string }>;

export type ExcludeModifierOptionAtScopeInput = ExcludeAtScopeInput &
  Readonly<{ modifierOptionId: string }>;

export type RetireAssortmentRuleInput = AssortmentActorInput &
  Readonly<{
    ruleId: string;
  }>;

export type AssortmentEligibilityResult = Readonly<{
  eligible: boolean;
  code: EligibilityDecisionCode;
}>;

export type VariantAvailabilityRecord = Readonly<{
  id: string | null;
  outletId: string;
  variantId: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  persistedState: AvailabilityState | null;
  effectiveState: AvailabilityState;
  unavailableUntil: Date | null;
  reasonCode: string | null;
  note: string | null;
  updatedAt: Date | null;
}>;

export type ModifierOptionAvailabilityRecord = Readonly<{
  id: string | null;
  outletId: string;
  modifierOptionId: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  persistedState: AvailabilityState | null;
  effectiveState: AvailabilityState;
  unavailableUntil: Date | null;
  reasonCode: string | null;
  note: string | null;
  updatedAt: Date | null;
}>;

export type SetVariantAvailabilityInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    variantId: string;
    state: AvailabilityState;
    unavailableUntil?: Date | null;
    reasonCode?: string | null;
    note?: string | null;
  }>;

export type SetModifierOptionAvailabilityInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    modifierOptionId: string;
    state: AvailabilityState;
    unavailableUntil?: Date | null;
    reasonCode?: string | null;
    note?: string | null;
  }>;

export type GetVariantAvailabilityInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    variantId: string;
    now?: Date;
  }>;

export type GetModifierOptionAvailabilityInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    modifierOptionId: string;
    now?: Date;
  }>;

export type OperatingIntervalInput = Readonly<{
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
}>;

export type OutletOperatingProfile = Readonly<{
  id: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  outletId: string;
  timezone: string;
  controlState: OutletControlState;
  pausedUntil: Date | null;
  reasonCode: string | null;
  note: string | null;
  updatedByWorkforceUserId: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type OutletOperatingInterval = Readonly<{
  id: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  outletId: string;
  dayOfWeek: DayOfWeek;
  startMinute: number;
  endMinute: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ConfigureOutletOperatingProfileInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    timezone: string;
    reasonCode?: string | null;
    note?: string | null;
  }>;

export type ReplaceOutletOperatingScheduleInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    intervals: readonly OperatingIntervalInput[];
  }>;

export type OutletControlMutationInput = AssortmentActorInput &
  Readonly<{
    outletId: string;
    pausedUntil?: Date | null;
    reasonCode?: string | null;
    note?: string | null;
  }>;

export type ResolveOperatingStateInput = Readonly<{
  outletId: string;
  context: Readonly<{ now: Date }>;
}>;

export type ResolveOutletOperatingStateResult = Readonly<{
  effectiveState: EffectiveOutletState;
  code: EligibilityDecisionCode;
  timezone: string | null;
  controlState: OutletControlState | null;
}>;

export type ResolveEligibilityContext = Readonly<{ now: Date }>;

export type ResolveOutletVariantAvailabilityInput = Readonly<{
  variantId: string;
  outletId: string;
  context: ResolveEligibilityContext;
}>;

export type ResolveOutletProductAvailabilityInput = Readonly<{
  productId: string;
  outletId: string;
  context: ResolveEligibilityContext;
}>;

export type ResolveModifierOptionAvailabilityInput = Readonly<{
  modifierOptionId: string;
  variantId: string;
  outletId: string;
  context: ResolveEligibilityContext;
}>;

export type EligibilityDecision = Readonly<{
  eligible: boolean;
  code: EligibilityDecisionCode;
}>;
