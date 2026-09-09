/**
 * Request-scoped outlet eligibility composition for Customer Menu projection.
 *
 * Preloads outlet-wide ancestry / operating / assortment / availability authority
 * once, then reuses IMP-014 decision semantics without a second policy engine.
 */
import "server-only";

import type { AvailabilityState } from "../../shared/assortment";
import type { PersistenceQueryContext } from "../persistence/types";
import {
  loadActiveBrandVariantIncludes,
  loadOutletAncestry,
  loadOutletExclusionIndex,
  type OutletAncestry,
  type OutletExclusionIndex,
} from "./assortment-reads";
import { loadEffectiveVariantAvailabilityStates } from "./availability";
import {
  resolveOutletVariantAvailability,
  type OutletVariantEligibilityPreload,
} from "./resolve-eligibility";
import { resolveOutletOperatingState } from "./resolve-operating";
import type {
  EligibilityDecision,
  ResolveOutletOperatingStateResult,
} from "./types";

export type OutletEligibilitySession = Readonly<{
  ancestry: OutletAncestry;
  operating: ResolveOutletOperatingStateResult;
  now: Date;
  includedVariantIds: ReadonlySet<string>;
  variantAvailability: ReadonlyMap<string, AvailabilityState>;
  exclusions: OutletExclusionIndex;
  preload: OutletVariantEligibilityPreload;
  /** Resolve one variant using preloaded outlet-common authority. */
  resolveVariant(variantId: string): Promise<EligibilityDecision>;
  opsAvailability(variantId: string): AvailabilityState;
}>;

/**
 * Create a menu-projection session that loads outlet-common inputs once.
 */
export async function createOutletEligibilitySession(
  context: PersistenceQueryContext,
  input: Readonly<{
    outletId: string;
    variantIds: readonly string[];
    now: Date;
  }>,
): Promise<OutletEligibilitySession> {
  const ancestry = await loadOutletAncestry(context, input.outletId);
  const operating = await resolveOutletOperatingState(context, {
    outletId: input.outletId,
    context: { now: input.now },
  });
  const [includedVariantIds, variantAvailability, exclusions] = await Promise.all([
    loadActiveBrandVariantIncludes(context, ancestry.brandId, input.variantIds),
    loadEffectiveVariantAvailabilityStates(
      context,
      input.outletId,
      input.variantIds,
      input.now,
    ),
    loadOutletExclusionIndex(context, ancestry),
  ]);

  const preload: OutletVariantEligibilityPreload = {
    ancestry,
    operating,
    includedVariantIds,
    variantAvailability,
    exclusions,
  };

  const decisionCache = new Map<string, Promise<EligibilityDecision>>();

  return {
    ancestry,
    operating,
    now: input.now,
    includedVariantIds,
    variantAvailability,
    exclusions,
    preload,
    opsAvailability(variantId: string): AvailabilityState {
      return variantAvailability.get(variantId) ?? "available";
    },
    resolveVariant(variantId: string): Promise<EligibilityDecision> {
      const cached = decisionCache.get(variantId);
      if (cached) return cached;

      const pending = resolveOutletVariantAvailability(
        context,
        {
          variantId,
          outletId: input.outletId,
          context: { now: input.now },
        },
        preload,
      );
      decisionCache.set(variantId, pending);
      return pending;
    },
  };
}
